import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../utils/api';
import type { DashboardStats, Event } from '../utils/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CalendarDays, 
  FileSpreadsheet,
  ArrowUpRight,
  Users
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend
} from 'recharts';
import { toast } from 'sonner';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const canAccessReports = user?.role === 'SUPER_ADMIN' || user?.role === 'TREASURER';
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // include locally saved transactions (fallback) so newly created local entries show up
  const [localTransactions, setLocalTransactions] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('ts_local_transactions');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem('ts_local_transactions');
        setLocalTransactions(raw ? JSON.parse(raw) : []);
      } catch {
        setLocalTransactions([]);
      }
    };
    window.addEventListener('ts_local_transactions_updated', handler);
    return () => window.removeEventListener('ts_local_transactions_updated', handler);
  }, []);

  // main fund transactions fetched from the transactions page API
  const [mainFundFromApi, setMainFundFromApi] = useState<any[]>([]);

  const formatCurrency = (value: number | string | undefined) =>
    `LKR ${Number(value || 0).toLocaleString('en-LK')}`;

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const [statsRes, eventsRes, mainFundRes] = await Promise.all([
          apiService.dashboard.getStats(),
          apiService.events.getAll(),
          apiService.transactions.getMainFund(),
        ]);

        setStats(statsRes.data || {});
        setEvents(eventsRes.data || []);

        // Normalize main fund transactions from transactions API
        const mainFundData = mainFundRes?.data;
        const normalizedMainFund = Array.isArray(mainFundData)
          ? mainFundData
          : mainFundData?.content ?? mainFundData?.data ?? [];
        setMainFundFromApi(normalizedMainFund);
      } catch (err: any) {
        console.error('Failed to load dashboard data', err);
        toast.error('Failed to load dashboard data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (isLoading || !stats) {
    return (
      <div className="flex-1 p-6">
        <div className="text-center text-gray-400">Loading dashboard...</div>
      </div>
    );
  }
  // Render unified dashboard for all roles
  // derive main fund transactions and balance
  const statsRecentRaw = (stats as any).recentTransactions;
  const statsRecent = Array.isArray(statsRecentRaw) ? statsRecentRaw : statsRecentRaw?.content ?? [];

  // prefer main-fund transactions from transactions API; fall back to statsRecent
  const allTransactions = [
    ...localTransactions,
    ...(mainFundFromApi && mainFundFromApi.length ? mainFundFromApi : statsRecent),
  ];
  const mainFundTransactions = allTransactions
    .filter((t: any) => !t.eventId)
    .sort((a: any, b: any) => {
      const ta = a.createdAt || a.date || '';
      const tb = b.createdAt || b.date || '';
      return new Date(tb).getTime() - new Date(ta).getTime();
    });

  const recentMainFundTransactions = mainFundTransactions.slice(0, 5);

  const mainFundBalance = (stats as any).totalMainFundBalance ?? (stats as any).mainFundBalance ?? mainFundTransactions.reduce((acc: number, tx: any) => {
    const amt = Number(tx.amount || 0);
    return tx.type === 'INCOME' ? acc + amt : acc - amt;
  }, 0);

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Upper Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Treasury Dashboard
          </h1>
          <p className="text-sm text-gray-400">Overall monitoring of main funds, events, and collections.</p>
        </div>
        {canAccessReports && (
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={() => window.location.href = '/reports'}
            >
              <FileSpreadsheet size={16} />
              <span>Generate Report</span>
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-brand-blue bg-brand-blue/5 cursor-pointer" onClick={() => window.location.href = '/transactions'}>
          <CardContent className="pt-6 text-left">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Main Fund Balance</p>
                <h3 className="mt-1 font-display text-2xl font-bold text-white">
                  {formatCurrency(mainFundBalance)}
                </h3>
              </div>
              <div className="rounded-xl bg-brand-blue/10 p-3 text-brand-blue">
                <DollarSign size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-brand-emerald">
              <TrendingUp size={14} className="mr-1 animate-pulse" />
              <span>Healthy reserve</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-brand-purple bg-brand-purple/5">
          <CardContent className="pt-6 text-left">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Income</p>
                <h3 className="mt-1 font-display text-2xl font-bold text-white">
                  {formatCurrency((stats as any).totalIncome ?? 0)}
                </h3>
              </div>
              <div className="rounded-xl bg-brand-purple/10 p-3 text-brand-purple">
                <TrendingUp size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-gray-400">
              <span>Current period receipts</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-brand-emerald bg-brand-emerald/5">
          <CardContent className="pt-6 text-left">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Expense</p>
                <h3 className="mt-1 font-display text-2xl font-bold text-white">
                  {formatCurrency((stats as any).totalExpense ?? 0)}
                </h3>
              </div>
              <div className="rounded-xl bg-brand-emerald/10 p-3 text-brand-emerald">
                <TrendingDown size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-brand-emerald">
              <span>Operational spending</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-brand-rose bg-brand-rose/5">
          <CardContent className="pt-6 text-left">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Events</p>
                <h3 className="mt-1 font-display text-2xl font-bold text-white">
                  {(stats as any).totalEvents ?? 0}
                </h3>
              </div>
              <div className="rounded-xl bg-brand-rose/10 p-3 text-brand-rose">
                <CalendarDays size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-brand-rose">
              <span>Scheduled and active programs</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="text-left">
              <CardTitle>Cashflow Cash Ledger</CardTitle>
              <CardDescription>Monthly main fund income versus operational costs</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(stats as any).monthlyOverview || (stats as any).monthlyTrend || []}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      color: '#fff',
                      boxShadow: 'none',
                    }}
                    formatter={(value: any) => [`LKR ${Number(value || 0).toLocaleString('en-LK')}`, '']}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar name="Income" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar name="Expense" dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions & Collection alerts */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Institution Overview</CardTitle>
            <CardDescription>Key user and participation totals</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between text-left">
            <div className="space-y-4">
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-brand-blue/10 p-3 text-brand-blue">
                    <Users size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Registered Users</p>
                    <p className="mt-1 text-xl font-bold text-white">{(stats as any).totalUsers ?? 0}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-brand-purple/10 p-3 text-brand-purple">
                    <CalendarDays size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Active Events</p>
                    <p className="mt-1 text-xl font-bold text-white">{events.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Events Allocations */}
      <Card>
        <CardHeader className="text-left">
          <CardTitle>Active Events Allocations</CardTitle>
          <CardDescription>Budget progress and treasury allocations for active events</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <CalendarDays size={40} className="mb-3 text-gray-600" />
              <p className="text-sm font-medium text-gray-400">No active events found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(ev => {
                const balance = (ev as any).balance ?? (ev as any).totalBalance ?? 0;
                return (
                  <div key={(ev as any).id} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col justify-between text-left">
                    <div>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider mb-2
                        ${(ev as any).status === 'ACTIVE' ? 'bg-brand-emerald/10 text-brand-emerald' : 'bg-gray-500/10 text-gray-400'}
                      `}>
                        {(ev as any).status}
                      </span>
                      <h4 className="font-semibold text-sm text-white mb-1 truncate">{(ev as any).name}</h4>
                      <p className="text-xs text-gray-400 line-clamp-2 mb-4">{(ev as any).description}</p>
                    </div>
                    <div className="pt-2 border-t border-white/5 mt-auto">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Total Balance</span>
                        <span className="font-bold text-brand-emerald text-sm">{formatCurrency(balance)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Ledger Entries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="text-left">
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest ledger balance modifications</CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs flex items-center gap-1.5"
            onClick={() => window.location.href = '/transactions'}
          >
            <span>View Ledger</span>
            <ArrowUpRight size={14} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead>
                <tr className="border-b border-white/5 text-xs text-gray-400 uppercase tracking-wider bg-white/[0.02]">
                  <th className="p-4">Description</th>
                  <th className="p-4">Fund Type</th>
                  <th className="p-4 hidden md:table-cell">Recorded By</th>
                  <th className="p-4 hidden md:table-cell">Date</th>
                  <th className="p-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentMainFundTransactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-white/[0.01]">
                    <td className="p-4">
                      <div className="font-medium text-white">{tx.description}</div>
                      <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                        <span className="text-[10px] bg-white/5 border border-white/5 rounded-full px-2 py-0.5 text-gray-400">
                          {tx.category}
                        </span>
                        <span className="text-[10px] text-gray-500 md:hidden">
                          • {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : tx.date}
                        </span>
                        <span className="text-[10px] text-gray-500 md:hidden">
                          • By {tx.recordedBy?.fullName || tx.recordedBy?.username || 'System'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider
                        ${tx.eventId ? 'bg-brand-purple/10 text-brand-purple' : 'bg-brand-blue/10 text-brand-blue'}
                      `}>
                        {tx.eventName || 'Main Fund'}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-gray-400 hidden md:table-cell">{tx.recordedBy?.fullName || tx.recordedBy?.username || 'System'}</td>
                    <td className="p-4 text-xs text-gray-400 hidden md:table-cell">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : tx.date}
                    </td>
                    <td className={`p-4 font-bold text-right text-sm
                      ${tx.type === 'INCOME' ? 'text-brand-emerald' : 'text-brand-rose'}
                    `}>
                      {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Ledger and History (consolidated) - removed duplicate detailed panes; Recent Transactions shows top 5 entries above */}
    </div>
  );
};
