import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../utils/api';
import type { Event, User, Transaction } from '../utils/api';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { 
  Plus, 
  Search, 
  Bell, 
  Receipt,
  CalendarRange,
  UserRound,
  CheckCircle2,
  Clock3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

export const Contributions: React.FC = () => {
  const { user, isTempTreasurer, defaultContributionAmount, updateDefaultContributionAmount } = useAuth();
  
  // Data lists
  const [events, setEvents] = useState<Event[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [transactionContributions, setTransactionContributions] = useState<Transaction[]>([]);
  const [isTxLoading, setIsTxLoading] = useState(true);
  const [historyUserId, setHistoryUserId] = useState('');
  const [historyStartMonth, setHistoryStartMonth] = useState('2026-06');
  const [historyEndMonth, setHistoryEndMonth] = useState('2026-12');
  const [historyEntries, setHistoryEntries] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  // Controls
  const [activeTab] = useState<'main' | 'event'>('main');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [search, setSearch] = useState('');
  // status filter removed per UI update

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Broadcast announcement form states
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [isTestEmail, setIsTestEmail] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Form states
  const [createTitle, setCreateTitle] = useState('');
  const [createAmount, setCreateAmount] = useState(String(defaultContributionAmount));
  const [createDueDate, setCreateDueDate] = useState('');
  const [createMonth, setCreateMonth] = useState('');
  const [createTargetUserId, setCreateTargetUserId] = useState('ALL'); // 'ALL' or specific student id
  const [createTargetUsername, setCreateTargetUsername] = useState('');
  const [createEventId, setCreateEventId] = useState('');
  const [createContributionScope, setCreateContributionScope] = useState<'main' | 'event'>('main');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAssignedEvent = (eventId: string | number | null | undefined) => {
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'TREASURER') return true;
    if (!eventId) return false;
    return events.some((e) => String(e.id) === String(eventId) && String(e.temporaryTreasurer?.id ?? e.temporaryTreasurerId) === String(user?.id));
  };

  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'TREASURER' || isTempTreasurer;
  const canAccessUserList = user?.role === 'SUPER_ADMIN' || user?.role === 'TREASURER' || isTempTreasurer;
  const hideContributionTargetSelect = user?.role === 'TREASURER' || isTempTreasurer;
  const assignedEvents = events.filter((event) => String(event.temporaryTreasurer?.id ?? event.temporaryTreasurerId) === String(user?.id));
  const canCreateMainFundContribution = user?.role === 'SUPER_ADMIN' || user?.role === 'TREASURER';
  const canCreateEventContribution = user?.role === 'SUPER_ADMIN' || user?.role === 'TREASURER' || (isTempTreasurer && selectedEventId && isAssignedEvent(selectedEventId));
  const canCreateContribution = canCreateMainFundContribution || canCreateEventContribution;
  const availableEventsForContribution = user?.role === 'SUPER_ADMIN' || user?.role === 'TREASURER'
    ? events
    : assignedEvents;

  const fetchData = async () => {
    try {
      // 1. Fetch Events
      const evRes = await apiService.events.getAll();
      const cleanEvents = Array.isArray(evRes.data) ? evRes.data : [];
      setEvents(cleanEvents);

      const visible = cleanEvents.filter((e: Event) => {
        if (user?.role === 'SUPER_ADMIN' || user?.role === 'TREASURER') return true;
        return String(e.temporaryTreasurer?.id ?? e.temporaryTreasurerId) === String(user?.id);
      });

      if (visible.length > 0 && !selectedEventId) {
        setSelectedEventId(String(visible[0].id));
      }

      // 2. Fetch users so treasurers/temp treasurers can resolve entered usernames to real IDs
      const uRes = await apiService.users.getAll();
      const cleanUsers = Array.isArray(uRes.data) ? uRes.data : [];
      setStudents(cleanUsers.filter((u: User) => u.role === 'USER'));
    } catch (e) {
      toast.error('Failed to load contributions setup.');
    }
  };

  const formatCurrency = (value: number | string | undefined) => `LKR ${Number(value || 0).toLocaleString('en-LK')}`;

  const fetchContributionTransactions = async () => {
    setIsTxLoading(true);
    try {
      const res = await apiService.transactions.getMainFund();
      const txs = Array.isArray(res.data) ? res.data : [];
      const contributionsOnly = txs.filter((tx) => String(tx.category || '').toLowerCase() === 'contribution');
      setTransactionContributions(contributionsOnly);
    } catch (err) {
      console.error('Failed to load contribution transaction records.', err);
    } finally {
      setIsTxLoading(false);
    }
  };

  const handleFetchUserContributionHistory = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!historyUserId.trim()) {
      toast.error('Please enter a user ID.');
      return;
    }

    if (!historyStartMonth || !historyEndMonth) {
      toast.error('Please select both months.');
      return;
    }

    if (historyStartMonth > historyEndMonth) {
      toast.error('Start month cannot be later than end month.');
      return;
    }

    setIsHistoryLoading(true);
    try {
      const res = await apiService.reports.getUserContributionDetails(historyUserId.trim(), historyStartMonth, historyEndMonth);
      const entries = Array.isArray(res.data) ? res.data : [];
      setHistoryEntries(entries);

      if (entries.length === 0) {
        toast.success('No contribution history found for this user in the selected range.');
      } else {
        toast.success(`Loaded ${entries.length} months of contribution history.`);
      }
    } catch (err) {
      console.error('Failed to load user contribution history.', err);
      toast.error('Failed to load contribution history for this user.');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([fetchData(), fetchContributionTransactions()]);
      } catch (err) {
        console.error(err);
      }
    };

    loadData();
  }, [activeTab, selectedEventId]);

  // Reset pagination when search queries, tabs, or event selections change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeTab, selectedEventId]);

  const handleSendReminder = async () => {
    const evId = activeTab === 'event' ? selectedEventId : 0;
    try {
      toast.loading('Sending email alerts...');
      await apiService.contributions.sendReminders(evId);
      toast.dismiss();
      toast.success('Defaulter reminders dispatched successfully.');
    } catch (e) {
      toast.dismiss();
      toast.error('Failed to send reminders.');
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastSubject || !broadcastBody) {
      toast.error('Please enter a subject and body.');
      return;
    }
    setIsBroadcasting(true);
    try {
      const evId = activeTab === 'event' ? selectedEventId : undefined;
      await apiService.contributions.sendBroadcastEmail(
        broadcastSubject,
        broadcastBody,
        isTestEmail,
        evId
      );
      toast.success(isTestEmail ? 'Test email dispatched successfully!' : 'Broadcast announcement dispatched to all members!');
      setIsBroadcastOpen(false);
      setBroadcastSubject('');
      setBroadcastBody('');
      setIsTestEmail(false);
    } catch (err: any) {
      toast.error('Failed to send broadcast email.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleInstantTestEmail = async () => {
    try {
      toast.loading('Sending test email...');
      await apiService.contributions.sendBroadcastEmail(
        'Test Email from Treasury Management System',
        'This is a test email sent to verify the email configuration. If you received this, your email settings are working perfectly.',
        true
      );
      toast.dismiss();
      toast.success(`Test email sent to ${user?.email || 'your email'}!`);
    } catch (e) {
      toast.dismiss();
      toast.error('Failed to send test email.');
    }
  };

  const handleCreateContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    const paymentMonth = createMonth || (createDueDate ? createDueDate.substring(0, 7) : '');
    if (!createTitle || !createAmount || !paymentMonth) {
      toast.error('Please enter the contribution title, amount, and payment month.');
      return;
    }

    const normalizedInput = createTargetUsername.trim().replace(/^@/, '');
    if (!canAccessUserList && !normalizedInput) {
      toast.error('Please enter the student userId.');
      return;
    }

    setIsSubmitting(true);
    try {
      const eventTarget = createContributionScope === 'event' ? createEventId || selectedEventId : null;
      const targetUserId = createTargetUserId !== 'ALL' ? createTargetUserId : '';
      let finalUserId = '';

      if (canAccessUserList) {
        finalUserId = targetUserId;
        if (!finalUserId && normalizedInput) {
          const matchedUser = students.find((u) => (u.username || '').toLowerCase() === normalizedInput.toLowerCase() || (u.fullName || '').toLowerCase() === normalizedInput.toLowerCase());
          finalUserId = matchedUser ? String(matchedUser.id) : normalizedInput;
        }
      } else if (normalizedInput) {
        const matchedUser = students.find((u) => (u.username || '').toLowerCase() === normalizedInput.toLowerCase() || (u.fullName || '').toLowerCase() === normalizedInput.toLowerCase());
        finalUserId = matchedUser ? String(matchedUser.id) : (/^\d+$/.test(normalizedInput) ? normalizedInput : normalizedInput);
      }

      const isBulkRequest = createTargetUserId === 'ALL' && canAccessUserList && !normalizedInput;
      const paymentMonth = createMonth || (createDueDate ? createDueDate.substring(0, 7) : '');
      if (!paymentMonth) {
        toast.error('Please select the payment month.');
        return;
      }

      const contributionPayload: any = {
        title: createTitle,
        amount: Number(createAmount),
        month: paymentMonth,
      };
      if (finalUserId) contributionPayload.userId = finalUserId;
      if (createDueDate) contributionPayload.dueDate = createDueDate;
      if (eventTarget) contributionPayload.eventId = eventTarget;

      if (isBulkRequest) {
        toast.info('Creating contributions for all batch members...');
        for (const std of students) {
          await apiService.contributions.create({
            ...contributionPayload,
            userId: std.id,
          } as any, { confirmPayment: true });
        }
      } else if (finalUserId) {
        await apiService.contributions.create(contributionPayload as any, { confirmPayment: true });
      } else {
        throw new Error('No user identified for the contribution request.');
      }

      toast.success('Contribution requested and payment confirmed successfully!');
      setIsCreateOpen(false);
      
      // Reset form
      setCreateTitle('');
      setCreateAmount('');
      setCreateDueDate('');
      setCreateMonth('');
      setCreateTargetUserId('ALL');
      setCreateTargetUsername('');
      
      fetchContributionTransactions();
    } catch (e) {
      toast.error('Failed to record contribution request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter list
  const filteredContributions = transactionContributions.filter((tx) => {
    const query = search.toLowerCase();
    const matchesSearch = 
      (tx.description || tx.title || '').toLowerCase().includes(query) ||
      (tx.category || '').toLowerCase().includes(query) ||
      (tx.recordedBy?.fullName || tx.recordedBy?.username || '').toLowerCase().includes(query);
    return matchesSearch;
  });

  // Pagination computations
  const totalPages = Math.ceil(filteredContributions.length / itemsPerPage);
  const paginatedContributions = filteredContributions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Ensure current page is valid when contributions update
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [filteredContributions.length, totalPages, currentPage]);

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Monthly Contributions
          </h1>
          <p className="text-sm text-gray-400">Manage monthly dues, payment confirmations and student contribution records.</p>
        </div>
        {canCreateContribution && (
          <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
            {/* Broadcast and test email buttons hidden for temp treasurers */}
            {(user?.role === 'SUPER_ADMIN' || user?.role === 'TREASURER') && (
              <>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 border-white/10 hover:border-brand-purple/20 bg-white/2"
                  onClick={() => setIsBroadcastOpen(true)}
                >
                  <Bell size={16} />
                  <span>Broadcast Email</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 border-white/10 hover:border-brand-purple/20 bg-white/2"
                  onClick={handleInstantTestEmail}
                >
                  <Bell size={16} />
                  <span>Send Test Email</span>
                </Button>
              </>
            )}
            {(user?.role === 'SUPER_ADMIN' || user?.role === 'TREASURER') && (
              <Button 
                variant="outline"
                className="flex items-center gap-2 text-brand-rose border-brand-rose/25 bg-brand-rose/5"
                onClick={handleSendReminder}
              >
                <Bell size={16} />
                <span>Prompt Reminders</span>
              </Button>
            )}
            {canCreateContribution && !isTempTreasurer && (
              <Button 
                className="flex items-center gap-2"
                onClick={() => {
                  const defaultScope = canCreateMainFundContribution ? 'main' : 'event';
                  setCreateContributionScope(defaultScope);
                  setCreateEventId(selectedEventId || '');
                  setCreateAmount(String(defaultContributionAmount));
                  const defaultMonth = new Date().toISOString().substring(0, 7);
                  setCreateMonth(defaultMonth);
                  setCreateDueDate('');
                  setIsCreateOpen(true);
                }}
              >
                <Plus size={18} />
                <span>Request Dues</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Roles and Tabs wrapper removed - locked to main dues */}

      {/* Filters Dashboard */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Input
            id="cont-search"
            placeholder="Search titles or member name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
            icon={<Search size={16} />}
          />
          <div />
          
          {/* Default Monthly Contribution Setting (Admins/Treasurers only) */}
          {(user?.role === 'SUPER_ADMIN' || user?.role === 'TREASURER') && activeTab === 'main' && (
            <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/2 px-4 py-2 text-left w-full sm:w-auto">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Default Monthly Dues:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={defaultContributionAmount}
                  onChange={(e) => updateDefaultContributionAmount(Number(e.target.value))}
                  className="w-16 rounded-lg px-2 py-1 text-xs glass-input"
                />
              </div>
            </div>
          )}
        </div>

        {canManage && activeTab === 'event' && (
          <div className="flex items-center gap-3 w-full sm:w-auto text-left">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Select Event:</span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full sm:w-56 rounded-xl px-4 py-2 text-sm glass-input"
            >
              {events
                .filter((ev) => {
                  if (user?.role === 'SUPER_ADMIN' || user?.role === 'TREASURER') return true;
                  return String(ev.temporaryTreasurer?.id) === String(user?.id) || String(ev.temporaryTreasurerId) === String(user?.id);
                })
                .map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* Hide Single User Contribution History for temp treasurers */}
      {(user?.role === 'SUPER_ADMIN' || user?.role === 'TREASURER') && (
        <Card className="border border-white/10 bg-linear-to-br from-white/5 to-white/2">
        <CardContent className="p-5 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-2 text-brand-purple">
                <UserRound size={16} />
                <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-400">Single User Contribution History</h2>
              </div>
              <p className="text-sm text-gray-400">Lookup a member’s monthly dues history by user ID and review the status for each month.</p>
            </div>
            <form onSubmit={handleFetchUserContributionHistory} className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
              <div className="w-full md:w-64">
                <Input
                  label="User ID"
                  id="history-user-id"
                  placeholder="e.g. db5e390f-edf4-43de-bf32-5926847aaa3b"
                  value={historyUserId}
                  onChange={(e) => setHistoryUserId(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="w-full sm:w-40">
                  <label className="mb-1 block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">From</label>
                  <input
                    type="month"
                    value={historyStartMonth}
                    onChange={(e) => setHistoryStartMonth(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm glass-input"
                  />
                </div>
                <div className="w-full sm:w-40">
                  <label className="mb-1 block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">To</label>
                  <input
                    type="month"
                    value={historyEndMonth}
                    onChange={(e) => setHistoryEndMonth(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm glass-input"
                  />
                </div>
              </div>
              <Button type="submit" isLoading={isHistoryLoading} className="self-end">
                <Search size={16} />
                <span>View History</span>
              </Button>
            </form>
          </div>

          {historyEntries.length > 0 ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/3 p-4 text-left">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-gray-500">Member</div>
                  <div className="mt-2 font-semibold text-white">{historyEntries[0]?.fullName || 'Member'}</div>
                  <div className="text-sm text-gray-400">@{historyEntries[0]?.username || historyUserId}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/3 p-4 text-left">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-gray-500">Total Amount</div>
                  <div className="mt-2 font-semibold text-brand-emerald">{formatCurrency(historyEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0))}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/3 p-4 text-left">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-gray-500">Status Summary</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full border border-brand-emerald/20 bg-brand-emerald/10 px-2.5 py-1 text-[11px] text-brand-emerald">
                      Paid: {historyEntries.filter((entry) => entry.paid || String(entry.status || '').toLowerCase() === 'paid').length}
                    </span>
                    <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-300">
                      Pending: {historyEntries.filter((entry) => !(entry.paid || String(entry.status || '').toLowerCase() === 'paid')).length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <Table>
                  <THead>
                    <TR>
                      <TH>Month</TH>
                      <TH>Amount</TH>
                      <TH>Status</TH>
                      <TH>Paid</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {historyEntries.map((entry) => {
                      const statusText = String(entry.status || 'UNKNOWN').toUpperCase();
                      const isPaid = Boolean(entry.paid || statusText === 'PAID');
                      return (
                        <TR key={`${entry.userId}-${entry.month}`}>
                          <TD className="font-semibold text-white">{entry.month}</TD>
                          <TD className="font-semibold text-brand-emerald">{formatCurrency(Number(entry.amount || 0))}</TD>
                          <TD>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                              statusText === 'PAID' || statusText === 'GENERATED'
                                ? 'border border-brand-emerald/20 bg-brand-emerald/10 text-brand-emerald'
                                : statusText === 'NOT GENERATED'
                                  ? 'border border-amber-400/20 bg-amber-400/10 text-amber-300'
                                  : 'border border-white/10 bg-white/5 text-gray-300'
                            }`}>
                              {statusText.replace(/_/g, ' ')}
                            </span>
                          </TD>
                          <TD>
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 text-brand-emerald">
                                <CheckCircle2 size={14} />
                                Yes
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-300">
                                <Clock3 size={14} />
                                No
                              </span>
                            )}
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/2 py-12 text-center">
              <CalendarRange size={30} className="mb-3 text-gray-500" />
              <p className="text-sm font-medium text-gray-400">Enter a user ID and select the range to view contribution history.</p>
            </div>
          )}
        </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isTxLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-purple border-t-transparent"></div>
              <span className="text-xs text-gray-400">Fetching contribution transactions...</span>
            </div>
          ) : filteredContributions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Receipt size={44} className="mb-3 text-gray-600" />
              <p className="text-sm font-medium text-gray-400">No contribution transactions found.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH className="hidden md:table-cell">Date</TH>
                      <TH>Description</TH>
                      <TH>Amount</TH>
                      <TH className="hidden sm:table-cell">Category</TH>
                      <TH className="hidden md:table-cell">Recorded By</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {paginatedContributions.map((tx) => (
                      <TR key={tx.id}>
                        <TD className="text-xs text-gray-400 font-medium hidden md:table-cell">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : tx.date}
                        </TD>
                        <TD>
                          <div className="font-semibold text-white text-sm">{tx.description || tx.title || 'Contribution'}</div>
                          <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                            <span className="text-[10px] bg-white/5 border border-white/5 rounded-full px-2 py-0.5 text-gray-400">
                              {tx.eventId ? `Event ${tx.eventId}` : 'Main Fund'}
                            </span>
                            <span className="text-[10px] bg-white/5 border border-white/5 rounded-full px-2 py-0.5 text-gray-400 sm:hidden">
                              {tx.category}
                            </span>
                            <span className="text-[10px] text-gray-500 md:hidden">
                              • {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : tx.date}
                            </span>
                            <span className="text-[10px] text-gray-500 md:hidden">
                              • By {tx.recordedBy?.fullName || tx.recordedBy?.username || 'System'}
                            </span>
                          </div>
                        </TD>
                        <TD className="font-bold text-sm text-brand-emerald">+{formatCurrency(tx.amount)}</TD>
                        <TD className="hidden sm:table-cell">
                          <span className="text-[10px] rounded-full bg-white/5 px-2 py-0.5 text-gray-400 border border-white/5">
                            {tx.category}
                          </span>
                        </TD>
                        <TD className="text-xs text-gray-400 hidden md:table-cell">{tx.recordedBy?.fullName || tx.recordedBy?.username || 'System'}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-white/5 bg-white/[0.01]">
                  <span className="text-xs text-gray-400">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredContributions.length)} of {filteredContributions.length} contributions
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-xl border border-white/5 text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                      aria-label="Previous Page"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-semibold text-gray-300 min-w-16 text-center">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-xl border border-white/5 text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                      aria-label="Next Page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* CREATE CONTRIBUTION DUES MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Contribution Request">
        <form onSubmit={handleCreateContribution} className="space-y-4 text-left">
          <Input
            label="Contribution Title"
            id="create-title"
            placeholder="e.g. Monthly Batch Fee - July"
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            required
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (LKR)"
              id="create-amount"
              type="number"
              placeholder="e.g. 2500"
              value={createAmount}
              onChange={(e) => setCreateAmount(e.target.value)}
              required
            />
            <Input
              label="Due Date (optional)"
              id="create-duedate"
              type="date"
              value={createDueDate}
              onChange={(e) => {
                setCreateDueDate(e.target.value);
                setCreateMonth(e.target.value ? e.target.value.substring(0, 7) : createMonth);
              }}
            />
          </div>
          <Input
            label="Payment Month"
            id="create-month"
            type="month"
            value={createMonth}
            onChange={(e) => setCreateMonth(e.target.value)}
            required
          />
          <p className="text-xs text-gray-400">Use the month for backend monthly contribution creation. Due date is optional.</p>

          {canCreateMainFundContribution && canCreateEventContribution && (
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Contribution Scope
              </label>
              <select
                value={createContributionScope}
                onChange={(e) => setCreateContributionScope(e.target.value as 'main' | 'event')}
                className="w-full rounded-xl px-3 py-1 text-sm glass-input"
              >
                <option value="main">Main Fund Monthly Contribution</option>
                <option value="event">Event Contribution</option>
              </select>
            </div>
          )}

          <div className="space-y-4">
            <Input
              label={hideContributionTargetSelect ? 'Target User ID' : 'Target User ID (optional)'}
              id="create-target-username"
              placeholder="e.g. cst24035"
              value={createTargetUsername}
              onChange={(e) => setCreateTargetUsername(e.target.value)}
              required={hideContributionTargetSelect}
            />
            {hideContributionTargetSelect ? (
              <p className="text-xs text-gray-400">
                Treasurer / temporary Treasurer cannot access the full member list. Enter the student userId directly.
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                You may optionally type a username to resolve the member, or choose from the list below.
              </p>
            )}
          </div>

          {!hideContributionTargetSelect && (
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Request From Target
              </label>
              <select
                value={createTargetUserId}
                onChange={(e) => setCreateTargetUserId(e.target.value)}
                className="w-full rounded-xl px-3 py-1 text-sm glass-input"
              >
                <option value="">None</option>
                {students.map((st) => (
                  <option key={st.id} value={st.id}>{st.fullName} (@{st.username})</option>
                ))}
              </select>
            </div>
          )}

          {createContributionScope === 'event' && (
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Associate with Event
              </label>
              <select
                value={createEventId}
                onChange={(e) => setCreateEventId(e.target.value)}
                className="w-full rounded-xl px-3 py-1 text-sm glass-input"
              >
                <option value="">-- Use Current Selection --</option>
                {availableEventsForContribution.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Request Dues
            </Button>
          </div>
        </form>
      </Modal>

      {/* BROADCAST ANNOUNCEMENT EMAIL MODAL */}
      <Modal isOpen={isBroadcastOpen} onClose={() => setIsBroadcastOpen(false)} title="Broadcast Announcement Email">
        <form onSubmit={handleSendBroadcast} className="space-y-4 text-left">
          <p className="text-xs text-gray-400 leading-relaxed">
            Send an email announcement to all {activeTab === 'event' ? 'event participants' : 'batch student members'}.
          </p>

          <Input
            label="Email Subject"
            id="broadcast-subject"
            placeholder="e.g. Graduation Gala Payment Deadline Update"
            value={broadcastSubject}
            onChange={(e) => setBroadcastSubject(e.target.value)}
            required
          />

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Email Body
            </label>
            <textarea
              placeholder="Write your email body message here..."
              value={broadcastBody}
              onChange={(e) => setBroadcastBody(e.target.value)}
              className="w-full min-h-30 rounded-xl px-4 py-2.5 text-sm glass-input"
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is-test-email"
              checked={isTestEmail}
              onChange={(e) => setIsTestEmail(e.target.checked)}
              className="rounded border-white/10 bg-white/5 text-brand-purple focus:ring-brand-purple"
            />
            <label htmlFor="is-test-email" className="text-xs text-gray-300 font-semibold cursor-pointer">
              Send as Test Email (only to yourself)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <Button type="button" variant="outline" onClick={() => setIsBroadcastOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isBroadcasting}>
              Send Announcement
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
