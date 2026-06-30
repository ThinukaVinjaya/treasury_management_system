import React, { useEffect, useState } from 'react';
import { apiService, api, downloadPDF } from '../utils/api';
import { Button } from '../components/ui/Button';
import { FileDown, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export const Reports: React.FC = () => {
  const [monthYear, setMonthYear] = useState('2026-06');
  const [startMonth, setStartMonth] = useState('2026-01');
  const [endMonth, setEndMonth] = useState('2026-12');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await apiService.users.getAll();
        const cleanUsers = Array.isArray(res.data) ? res.data : [];
        setStudents(cleanUsers.filter((u: any) => u.role === 'USER'));
      } catch (e) {
        console.error('Failed to fetch students list', e);
      }
    };
    fetchStudents();
  }, []);

  const downloadReportFile = async (url: string, filename: string, attempts = 3, timeoutMs = 600000) => {
    let lastError: any;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await api.get(url, {
          responseType: 'blob',
          timeout: timeoutMs,
          withCredentials: true,
          maxContentLength: 50 * 1024 * 1024,
          headers: {
            Accept: 'application/pdf,application/octet-stream,application/json',
          },
        });

        const blob = response.data;
        if (!blob || blob.size === 0) {
          throw new Error('The report endpoint returned no content.');
        }

        const headers = response.headers || {};
        const contentType = String(headers['content-type'] || headers['Content-Type'] || '').toLowerCase();
        const preview = await blob.text();
        const looksLikePdf = contentType.includes('pdf') || contentType.includes('octet-stream') || preview.includes('%PDF');

        if (!looksLikePdf) {
          let errorMessage = 'The server did not return a PDF file.';
          try {
            const errorJson = JSON.parse(preview);
            if (errorJson && errorJson.message) {
              errorMessage = errorJson.message;
            }
          } catch {
            if (preview && preview.length < 200) {
              errorMessage = preview;
            }
          }
          throw new Error(errorMessage);
        }

        downloadPDF(blob, filename);
        return;
      } catch (error: any) {
        lastError = error;
        const isRetryable = error?.code === 'ECONNABORTED' || error?.message?.includes('timeout') || error?.response?.status === 408 || error?.response?.status >= 500;
        if (attempt < attempts && isRetryable) {
          await new Promise((resolve) => setTimeout(resolve, 2500 * attempt));
          continue;
        }

        try {
          if (typeof window !== 'undefined') {
            const targetUrl = /^https?:\/\//i.test(url) ? url : `${window.location.origin}${url}`;
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
            return;
          }
        } catch {
          // ignore fallback errors and raise the original problem
        }

        throw error;
      }
    }

    throw lastError;
  };

  const downloadMonthlyPdf = async () => {
    setIsDownloading(true);
    try {
      const reportUrl = `/api/treasurer/reports/main-fund/monthly?monthYear=${encodeURIComponent(monthYear)}`;
      await downloadReportFile(reportUrl, `monthly-main-fund-${monthYear}.pdf`);
      toast.success('Monthly PDF downloaded.');
    } catch (e: any) {
      console.error('Failed to download monthly PDF', e);
      let errorMsg = 'Failed to download monthly PDF.';
      if (e.response?.data instanceof Blob) {
        try {
          const text = await e.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed && parsed.message) {
            errorMsg = parsed.message;
          }
        } catch {
          // ignore
        }
      } else if (e.message) {
        errorMsg = e.message;
      }
      toast.error(errorMsg);
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadContributionPdf = async () => {
    if (!startMonth || !endMonth) {
      toast.error('Please select both start and end months.');
      return;
    }

    if (startMonth > endMonth) {
      toast.error('Start month cannot be later than end month.');
      return;
    }

    setIsDownloading(true);
    try {
      let reportUrl = `/api/treasurer/reports/contributions/period?startMonth=${encodeURIComponent(startMonth)}&endMonth=${encodeURIComponent(endMonth)}`;
      if (selectedUserId) {
        reportUrl += `&userId=${encodeURIComponent(selectedUserId)}`;
      }
      await downloadReportFile(reportUrl, `contributions-${startMonth}-to-${endMonth}.pdf`, 3, 900000);
      toast.success('Contribution PDF downloaded.');
    } catch (e: any) {
      console.error('Failed to download contribution PDF', e);
      let errorMsg = 'Failed to download contribution PDF.';
      if (e.response?.data instanceof Blob) {
        try {
          const text = await e.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed && parsed.message) {
            errorMsg = parsed.message;
          }
        } catch {
          // ignore
        }
      } else if (e.message) {
        errorMsg = e.message;
      }
      toast.error(errorMsg);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Reports
          </h1>
          <p className="text-sm text-gray-400">Download the monthly main fund PDF or the contribution PDF for a selected period and user.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4 text-left">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Calendar size={18} className="text-brand-purple" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Select month</span>
              <input
                type="month"
                value={monthYear}
                onChange={(e) => setMonthYear(e.target.value)}
                className="rounded-xl px-4 py-2 text-sm glass-input w-full sm:w-48"
              />
            </div>
            <Button className="flex items-center gap-2 w-full sm:w-auto justify-center" onClick={downloadMonthlyPdf} disabled={isDownloading}>
              <FileDown size={18} />
              <span>Download this month PDF</span>
            </Button>
          </div>
        </div>

        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4 text-left">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <Calendar size={18} className="text-brand-purple" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">From</span>
              <input
                type="month"
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                className="rounded-xl px-3 py-1 text-sm glass-input w-full sm:w-40"
              />
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-left sm:text-right min-w-[20px]">To</span>
              <input
                type="month"
                value={endMonth}
                onChange={(e) => setEndMonth(e.target.value)}
                className="rounded-xl px-3 py-1 text-sm glass-input w-full sm:w-40"
              />
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">User</span>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="rounded-xl px-3 py-1 text-sm glass-input w-full sm:w-56"
              >
                <option value="">All users</option>
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.fullName} (@{st.username})
                  </option>
                ))}
              </select>
            </div>
            <Button className="flex items-center gap-2" onClick={downloadContributionPdf} disabled={isDownloading}>
              <FileDown size={18} />
              <span>Download contribution PDF</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
