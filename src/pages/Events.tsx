import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService, getCurrentUserRole, getCurrentUserId } from '../utils/api';
import type { Event, User, EventSummary, Contribution, Transaction } from '../utils/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { 
  Plus, 
  Trash2, 
  UserCheck, 
  BarChart3, 
  FileDown, 
  Wallet,
  Search,
  Receipt,
  Clock,
  Edit2,
  TrendingUp,
  TrendingDown,
  Coins,
  UserCircle2,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';

export const Events: React.FC = () => {
  const { user, isTempTreasurer, tempTreasurerEventIds } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);

  const formatCurrency = (value: number | string | undefined) =>
    `LKR ${Number(value || 0).toLocaleString('en-LK')}`;

  const getContributionStudentLabel = (contribution: Contribution) => {
    if (contribution.user?.fullName) return contribution.user.fullName;
    if (contribution.user?.username) return contribution.user.username;
    if (contribution.userId) return String(contribution.userId);
    return 'Unknown member';
  };

  const getContributionTitle = (contribution: Contribution) => {
    return contribution.title || contribution.eventName || contribution.month || 'Contribution';
  };

  const getContributionDueDate = (contribution: Contribution) => {
    if (contribution.dueDate) return contribution.dueDate;
    if ((contribution as any).due_date) return (contribution as any).due_date;
    if (contribution.month) return `${contribution.month}-01`;
    return '-';
  };

  const getContributionStatus = (contribution: Contribution) => {
    if (contribution.isPaid !== undefined && contribution.isPaid !== null) {
      return contribution.isPaid ? 'PAID' : 'PENDING';
    }
    if ((contribution as any).is_paid !== undefined && (contribution as any).is_paid !== null) {
      return (contribution as any).is_paid ? 'PAID' : 'PENDING';
    }
    return contribution.status || 'PENDING';
  };

  const stripAtFromUsername = (input: string) => input.trim().replace(/^@/, '');

  const resolveUserIdFromInput = (input: string) => {
    const normalized = stripAtFromUsername(input).toLowerCase();
    if (!normalized) return '';

    let matchedUser = users.find((u) => (u.username || '').toLowerCase() === normalized);
    if (!matchedUser) {
      matchedUser = users.find((u) => (u.fullName || '').toLowerCase() === normalized);
    }
    if (!matchedUser && normalized.length > 2) {
      const fuzzyMatches = users.filter((u) =>
        (u.username || '').toLowerCase().includes(normalized) ||
        (u.fullName || '').toLowerCase().includes(normalized)
      );
      if (fuzzyMatches.length === 1) {
        matchedUser = fuzzyMatches[0];
      }
    }

    return matchedUser ? String(matchedUser.id) : '';
  };

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'contributions'>('overview');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTempTreasurerOpen, setIsTempTreasurerOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // Active event targets
  const [selectedEventId, setSelectedEventId] = useState<string | number | null>(null);
  const [summaryData, setSummaryData] = useState<EventSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [unpaidList, setUnpaidList] = useState<Contribution[]>([]);
  const [isUnpaidLoading, setIsUnpaidLoading] = useState(false);

  // Event creation form states
  const [eventName, setEventName] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventStartDate, setEventStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventEndDate, setEventEndDate] = useState('');
  const [selectedTempTreasurerId, setSelectedTempTreasurerId] = useState<string>('');

  // States for Event Transactions Tab
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txEventId, setTxEventId] = useState<string>('');
  const [txSearch, setTxSearch] = useState('');
  const [isTxCreateOpen, setIsTxCreateOpen] = useState(false);
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [txCategory, setTxCategory] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txProofFile, setTxProofFile] = useState<File | null>(null);
  const [txProofPreviewUrl, setTxProofPreviewUrl] = useState<string | null>(null);
  const [isTxSubmitting, setIsTxSubmitting] = useState(false);

  // States for Event Contributions Tab
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [contEventId, setContEventId] = useState<string>('');
  const [contSearch, setContSearch] = useState('');
  // contribution status filtering removed per UI update
  const [contStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [isContCreateOpen, setIsContCreateOpen] = useState(false);
  const [isContEditOpen, setIsContEditOpen] = useState(false);
  const [contTitle, setContTitle] = useState('');
  const [contAmount, setContAmount] = useState('25');
  const [contDueDate, setContDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [contTargetUserId, setContTargetUserId] = useState('ALL');
  const [contTargetUsername, setContTargetUsername] = useState('');
  const [editContId, setEditContId] = useState<string | number | null>(null);
  const [editContAmount, setEditContAmount] = useState('');
  const [editContMonth, setEditContMonth] = useState('');
  const [isContSubmitting, setIsContSubmitting] = useState(false);

  const selectedContributionEvent = events.find(e => String(e.id) === String(contEventId));
  const isCurrentTempTreasurer = selectedContributionEvent
    ? String(selectedContributionEvent.temporaryTreasurer?.id ?? selectedContributionEvent.temporaryTreasurerId) === String(user?.id)
    : false;
  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'TREASURER' || isCurrentTempTreasurer;
  const hideContributionTargetSelect = user?.role === 'TREASURER' || isCurrentTempTreasurer;

  const canAccessSummaryDownload = (eventId?: string | number | null) => {
    if (!eventId) return false;
    const role = getCurrentUserRole();
    const ev = events.find((event) => String(event.id) === String(eventId));
    const assignedTreasurerId = ev ? (ev.temporaryTreasurer?.id ?? ev.temporaryTreasurerId) : null;
    const isAssignedTemp = assignedTreasurerId && String(assignedTreasurerId) === String(getCurrentUserId());
    return role === 'TREASURER' || role === 'SUPER_ADMIN' || isAssignedTemp;
  };

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const res = await apiService.events.getAll();
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      toast.error('Failed to load events.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await apiService.users.getAll();
      const cleanUsers = Array.isArray(res.data) ? res.data : [];
      setUsers(cleanUsers.filter((u: User) => u.role !== 'SUPER_ADMIN'));
    } catch (err) {
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'TREASURER' || isCurrentTempTreasurer) {
      fetchUsers();
    }
  }, [user?.role, isCurrentTempTreasurer]);

  // Filter events for temporary treasurers - only show their assigned events
  const visibleEvents = isTempTreasurer && tempTreasurerEventIds.length > 0
    ? events.filter(e => tempTreasurerEventIds.includes(String(e.id)))
    : events;

  useEffect(() => {
    if (visibleEvents.length > 0) {
      if (!txEventId) setTxEventId(String(visibleEvents[0].id));
      if (!contEventId) setContEventId(String(visibleEvents[0].id));
    }
  }, [visibleEvents]);

  const fetchEventTransactions = async () => {
    if (!txEventId) {
      setTransactions([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiService.transactions.getEventTransactions(txEventId);
      setTransactions(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      toast.error('Failed to load event transactions.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEventContributions = async () => {
    if (!contEventId) {
      setContributions([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiService.contributions.getEventContributions(contEventId);
      setContributions(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      toast.error('Failed to load event contributions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchEventTransactions();
    }
  }, [activeTab, txEventId]);

  useEffect(() => {
    if (activeTab === 'contributions') {
      fetchEventContributions();
    }
  }, [activeTab, contEventId]);

  // Transaction tab action handlers
  const handleTxFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTxProofFile(file);
      const url = URL.createObjectURL(file);
      setTxProofPreviewUrl(url);
    }
  };

  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || !txCategory || !txDescription) {
      toast.error('All fields are required.');
      return;
    }
    setIsTxSubmitting(true);
    try {
      await apiService.transactions.create({
        amount: Number(txAmount),
        type: txType,
        category: txCategory,
        description: txDescription,
        date: txDate,
        eventId: txEventId,
        proof: txProofFile
      });
      toast.success('Transaction logged successfully!');
      setIsTxCreateOpen(false);
      setTxAmount('');
      setTxCategory('');
      setTxDescription('');
      setTxProofFile(null);
      setTxProofPreviewUrl(null);
      fetchEventTransactions();
    } catch (err) {
      toast.error('Failed to register transaction.');
    } finally {
      setIsTxSubmitting(false);
    }
  };

  const handleDeleteTx = async (id: string | number) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await apiService.transactions.delete(id);
      toast.success('Transaction deleted successfully.');
      fetchEventTransactions();
    } catch (err) {
      toast.error('Failed to delete transaction.');
    }
  };

  // Contributions tab action handlers
  const handleCreateCont = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contTitle || !contAmount || !contDueDate) {
      toast.error('All fields are required.');
      return;
    }
    if (hideContributionTargetSelect && !contTargetUsername.trim()) {
      toast.error('Target userId is required for Treasurer or temporary Treasurer users.');
      return;
    }

    const normalizedTargetInput = stripAtFromUsername(contTargetUsername);
    setIsContSubmitting(true);
    try {
      const isBulkRequest = contTargetUserId === 'ALL' && !hideContributionTargetSelect && !normalizedTargetInput;
      let resolvedUserId = hideContributionTargetSelect ? normalizedTargetInput : contTargetUserId;

      if (normalizedTargetInput) {
        const matchedUserId = resolveUserIdFromInput(normalizedTargetInput);
        if (matchedUserId) {
          resolvedUserId = matchedUserId;
        } else if (hideContributionTargetSelect) {
          resolvedUserId = normalizedTargetInput;
        }
      }

      const paymentMonth = contDueDate ? contDueDate.substring(0, 7) : new Date().toISOString().substring(0, 7);
      if (isBulkRequest) {
        toast.info('Creating contributions for all student members...');
        for (const std of users.filter(u => u.role === 'USER')) {
          await apiService.contributions.create({
            title: contTitle,
            amount: Number(contAmount),
            dueDate: contDueDate,
            month: paymentMonth,
            userId: std.id,
            eventId: contEventId
          }, { confirmPayment: true });
        }
      } else if (resolvedUserId) {
        await apiService.contributions.create({
          title: contTitle,
          amount: Number(contAmount),
          dueDate: contDueDate,
          month: paymentMonth,
          userId: resolvedUserId,
          eventId: contEventId
        }, { confirmPayment: true });
      } else {
        throw new Error('No matching user found for the supplied username.');
      }
      toast.success('Contribution request dispatched and payment confirmed!');
      setIsContCreateOpen(false);
      setContTitle('');
      setContAmount('25');
      setContDueDate(new Date().toISOString().split('T')[0]);
      setContTargetUserId('ALL');
      setContTargetUsername('');
      fetchEventContributions();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create contribution request.');
    } finally {
      setIsContSubmitting(false);
    }
  };

  const handleDeleteCont = async (id: string | number) => {
    if (!window.confirm('Delete this contribution record?')) return;
    try {
      await apiService.contributions.delete(id);
      toast.success('Record deleted.');
      fetchEventContributions();
    } catch (err) {
      toast.error('Failed to delete contribution record.');
    }
  };

  const handlePayCont = async (id: string | number) => {
    try {
      await apiService.contributions.payContribution(id);
      toast.success('Contribution marked as paid!');
      setContributions(prev => prev.map(c => c.id === id ? { ...c, status: 'PAID', isPaid: true, is_paid: true } : c));
      if (contStatusFilter === 'PENDING') {
        setContributions(prev => prev.filter(c => c.id !== id));
      }
      fetchEventContributions();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to verify payment.';
      toast.error(message);
    }
  };

  const openContCreateModal = () => {
    if (!contTitle) {
      setContTitle(`Event Contribution - ${events.find(e => String(e.id) === String(contEventId))?.name || 'Event'}`);
    }
    if (!contDueDate) {
      setContDueDate(new Date().toISOString().split('T')[0]);
    }
    setIsContCreateOpen(true);
  };

  const handleUpdateCont = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContId || !editContAmount || !editContMonth) return;
    setIsContSubmitting(true);
    try {
      const contribution = contributions.find((c) => c.id === editContId);
      const payload: any = {
        amount: Number(editContAmount),
        month: editContMonth,
      };
      if (contribution?.eventId !== undefined) {
        payload.eventId = String(contribution.eventId);
      }
      await apiService.contributions.update(editContId, payload);
      toast.success('Contribution updated successfully!');
      setIsContEditOpen(false);
      fetchEventContributions();
    } catch (err) {
      toast.error('Failed to update contribution.');
    } finally {
      setIsContSubmitting(false);
    }
  };

  const openEditContModal = (c: Contribution) => {
    setEditContId(c.id);
    setEditContAmount(String(c.amount));
    setEditContMonth(c.month || (c.dueDate ? c.dueDate.substring(0, 7) : '2026-06'));
    setIsContEditOpen(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !eventStartDate) {
      toast.error('Event Name and Start Date are required.');
      return;
    }
    
    try {
      await apiService.events.create({
        name: eventName,
        description: eventDesc,
        startDate: eventStartDate,
        endDate: eventEndDate || undefined,
      } as any);
      toast.success(`Event "${eventName}" created successfully!`);
      setIsCreateOpen(false);
      setEventName('');
      setEventDesc('');
      setEventStartDate(new Date().toISOString().split('T')[0]);
      setEventEndDate('');
      fetchEvents();
    } catch (err: any) {
      toast.error('Failed to create event.');
    }
  };

  const handleDeleteEvent = async (id: string | number) => {
    if (!window.confirm('Are you sure you want to delete this event? This will delete all associated transactions and contributions.')) return;
    try {
      await apiService.events.delete(id);
      toast.success('Event deleted successfully.');
      fetchEvents();
    } catch (err: any) {
      toast.error('Failed to delete event.');
    }
  };

  const openTempTreasurerModal = (event: Event) => {
    const currentTreasurerId = event.temporaryTreasurer?.id ?? event.temporaryTreasurerId;
    setSelectedEventId(event.id);
    setSelectedTempTreasurerId(currentTreasurerId ? String(currentTreasurerId) : '');
    setIsTempTreasurerOpen(true);
  };

  const handleAssignTempTreasurer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;

    try {
      // Resolve input: prefer direct user id when input looks like an id, otherwise try username
      const input = (selectedTempTreasurerId || '').trim();
      let targetUser = users.find(u => String(u.id) === input);
      let usernameToSend: string | null = null;

      if (targetUser) {
        usernameToSend = targetUser.username || null;
      } else if (input) {
        // Try to find by username
        const byUsername = users.find(u => (u.username || '').toLowerCase() === input.toLowerCase());
        if (byUsername) {
          targetUser = byUsername;
          usernameToSend = byUsername.username || null;
        } else if (/^[0-9a-fA-F-]{8,}$/.test(input)) {
          // Looks like an id but not present in local users list — send as id string to API
          usernameToSend = input;
        } else {
          // Treat input as username even if not found locally
          usernameToSend = input;
        }
      }

      await apiService.events.assignTemporaryTreasurer(selectedEventId, usernameToSend);

      setEvents(prev => prev.map(event =>
        String(event.id) === String(selectedEventId)
          ? {
              ...event,
              temporaryTreasurer: targetUser ?? null,
              temporaryTreasurerId: targetUser ? String(targetUser.id) : (usernameToSend || undefined),
            }
          : event
      ));

      toast.success('Temporary Treasurer updated successfully!');
      setIsTempTreasurerOpen(false);
    } catch (err: any) {
      console.error('Assign temporary treasurer failed', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to assign temporary treasurer.';
      toast.error(msg);
    }
  };

  const openSummaryModal = async (eventId: string | number) => {
    setSelectedEventId(eventId);
    setIsSummaryOpen(true);
    setIsSummaryLoading(true);
    setIsUnpaidLoading(true);
    try {
      const res = await apiService.events.getSummary(eventId);
      setSummaryData(res.data);
    } catch (err: any) {
      toast.error('Failed to load event financial summary.');
      setIsSummaryOpen(false);
      setIsSummaryLoading(false);
      return;
    } finally {
      setIsSummaryLoading(false);
    }

    try {
      // only load unpaid list for treasurers or the assigned temp treasurer
      const role = getCurrentUserRole();
      const ev = events.find(ev => String(ev.id) === String(eventId));
      const assignedTreasurerId = ev ? (ev.temporaryTreasurer?.id ?? ev.temporaryTreasurerId) : null;
      const isAssignedTemp = assignedTreasurerId && String(assignedTreasurerId) === String(getCurrentUserId());
      if (role === 'TREASURER' || role === 'SUPER_ADMIN' || isAssignedTemp) {
        const contRes = await apiService.contributions.getEventContributions(eventId);
        const cleanCont = Array.isArray(contRes.data) ? contRes.data : [];
        setUnpaidList(cleanCont.filter((c: Contribution) => c.status === 'PENDING'));
      } else {
        setUnpaidList([]);
      }
    } catch (err) {
      console.error('Failed to fetch event contributions for unpaid list', err);
    } finally {
      setIsUnpaidLoading(false);
    }
  };

  const handleDownloadSummaryReport = async () => {
    if (!selectedEventId || !canAccessSummaryDownload(selectedEventId)) {
      toast.error('You do not have permission to download this report.');
      return;
    }
    try {
      toast.loading('Generating summary PDF...');
      await apiService.events.downloadReport(selectedEventId, 'summary');
      toast.dismiss();
      toast.success('Event summary PDF downloaded successfully.');
    } catch (err: any) {
      toast.dismiss();
      toast.error('Failed to download event summary PDF.');
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Batch Events
          </h1>
          <p className="text-sm text-gray-400">Track allocations, balances, and assignments for your batch functions.</p>
        </div>
        {canManage && activeTab === 'overview' && (
          <Button 
            className="flex items-center gap-2 self-start sm:self-auto"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={18} />
            <span>Create Event</span>
          </Button>
        )}
        {canManage && activeTab === 'transactions' && (
          <Button 
            className="flex items-center gap-2 self-start sm:self-auto"
            onClick={() => setIsTxCreateOpen(true)}
          >
            <Plus size={18} />
            <span>Add Event Transaction</span>
          </Button>
        )}
        {canManage && activeTab === 'contributions' && (
          <Button 
            className="flex items-center gap-2 self-start sm:self-auto"
            onClick={openContCreateModal}
          >
            <Plus size={18} />
            <span>Request Event Dues</span>
          </Button>
        )}
      </div>

      {/* Tabs Switcher Menu */}
      <div className="flex border-b border-white/5 gap-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all duration-200
            ${activeTab === 'overview' 
              ? 'border-brand-purple text-white' 
              : 'border-transparent text-gray-400 hover:text-gray-200'
            }
          `}
        >
          All Events
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all duration-200
            ${activeTab === 'transactions' 
              ? 'border-brand-purple text-white' 
              : 'border-transparent text-gray-400 hover:text-gray-200'
            }
          `}
        >
          Event Transactions
        </button>
        {canManage && (
          <button
            onClick={() => setActiveTab('contributions')}
            className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all duration-200
              ${activeTab === 'contributions' 
                ? 'border-brand-purple text-white' 
                : 'border-transparent text-gray-400 hover:text-gray-200'
              }
            `}
          >
            Event Contributions
          </button>
        )}
      </div>

      {activeTab === 'overview' && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 rounded-2xl shimmer"></div>
              ))}
            </div>
          ) : visibleEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500 rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
              <Wallet size={48} className="mb-4 text-gray-600" />
              <h3 className="font-semibold text-lg text-gray-300">No Events Found</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm text-center">There are no batch events set up. Create one to begin tracking event contributions.</p>
            </div>
          ) : (
            /* Event Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleEvents.map((e) => (
                <Card key={e.id} className="relative flex flex-col justify-between overflow-hidden">
                  {/* Event Card Header Accent */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-purple to-brand-blue" />
                  
                  <CardHeader className="pb-3 text-left">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase
                        ${e.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : ''}
                        ${e.status === 'COMPLETED' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : ''}
                        ${e.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : ''}
                      `}>
                        {e.status}
                      </span>
                      
                      {canManage && (
                        <button 
                          onClick={() => handleDeleteEvent(e.id)}
                          className="rounded-lg p-1.5 border border-white/5 hover:border-brand-rose/20 text-gray-400 hover:text-brand-rose hover:bg-brand-rose/5 transition-all"
                          title="Delete Event"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <CardTitle className="mt-2 text-lg text-white truncate" title={e.name}>
                      {e.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 h-10 text-xs">
                      {e.description || 'No description provided.'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-2 text-left space-y-4">
                    <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Balance</span>
                        <span className="font-bold text-brand-emerald text-sm">{formatCurrency(e.totalBalance ?? e.balance ?? 0)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs rounded-xl border border-white/5 bg-white/[0.01] px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <UserCheck size={14} className="text-brand-purple" />
                            <span className="text-gray-400 font-semibold">Temp Treasurer:</span>
                          </div>
                          <span className="font-semibold text-white truncate max-w-[120px]">
                            {(() => {
                              const assignedTreasurer = e.temporaryTreasurer || users.find(u => String(u.id) === String(e.temporaryTreasurerId) || String(u.username) === String(e.temporaryTreasurerId));
                              if (assignedTreasurer) return `${assignedTreasurer.fullName} (@${assignedTreasurer.username})`;
                              if (e.temporaryTreasurerId) {
                                // show raw id/username from event details when no user object is available
                                const id = String(e.temporaryTreasurerId);
                                return id.startsWith('@') ? id : `@${id}`;
                              }
                              return 'None Assigned';
                            })()}
                          </span>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-3 gap-2 flex justify-end">
                    {canManage && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => openTempTreasurerModal(e)}
                      >
                        Assign Temp
                      </Button>
                    )}
                    {/* Temp treasurer and treasurers can download/view financials; regular users can view but not assign */}
                    <Button 
                      variant="primary" 
                      size="sm"
                      className={canManage ? 'flex-1 text-xs' : 'w-full text-xs'}
                      onClick={() => openSummaryModal(e.id)}
                    >
                      <BarChart3 size={14} className="mr-1.5" />
                      <span>Financials</span>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Input
                id="tx-search"
                placeholder="Search descriptions or categories..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="w-full sm:w-64"
                icon={<Search size={16} />}
              />
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto text-left">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Select Event:</span>
              <select
                value={txEventId}
                onChange={(e) => setTxEventId(e.target.value)}
                className="w-full sm:w-64 rounded-xl px-4 py-2 text-sm glass-input"
              >
                {visibleEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-purple border-t-transparent"></div>
                  <span className="text-xs text-gray-400">Loading ledger logs...</span>
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                  <Coins size={44} className="mb-3 text-gray-600" />
                  <p className="text-sm font-medium text-gray-400">No transactions recorded for this event.</p>
                </div>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Date</TH>
                      <TH>Category & Desc</TH>
                      <TH>Type</TH>
                      <TH>Amount</TH>
                      <TH>Recorded By</TH>
                      <TH>Receipt</TH>
                      {canManage && <TH className="text-right">Action</TH>}
                    </TR>
                  </THead>
                  <TBody>
                    {transactions
                      .filter(tx => 
                        (tx.description || '').toLowerCase().includes(txSearch.toLowerCase()) ||
                        (tx.category || '').toLowerCase().includes(txSearch.toLowerCase())
                      )
                      .map((tx) => (
                        <TR key={tx.id}>
                          <TD className="text-xs text-gray-400 font-medium">
                            {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : tx.date}
                          </TD>
                          <TD>
                            <div className="font-semibold text-white text-sm">{tx.description}</div>
                            <span className="text-[10px] bg-white/5 border border-white/5 rounded-full px-2 py-0.5 text-gray-400 mt-1 inline-block">
                              {tx.category}
                            </span>
                          </TD>
                          <TD>
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold
                              ${tx.type === 'INCOME' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' 
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                              }
                            `}>
                              {tx.type === 'INCOME' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                              {tx.type}
                            </span>
                          </TD>
                          <TD className={`font-bold text-sm ${tx.type === 'INCOME' ? 'text-brand-emerald' : 'text-brand-rose'}`}>
                            {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </TD>
                          <TD className="text-xs text-gray-400">{tx.recordedBy?.fullName || 'System'}</TD>
                          <TD>
                            {tx.proofUrl || tx.type === 'EXPENSE' ? (
                              <a
                                href={apiService.files.getReceiptUrl(String(tx.id))}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs font-semibold text-brand-purple hover:text-brand-purple/80 hover:underline transition-all"
                              >
                                <Receipt size={14} />
                                <span>View Proof</span>
                              </a>
                            ) : (
                              <span className="text-xs text-gray-600">None</span>
                            )}
                          </TD>
                          {canManage && (
                            <TD className="text-right">
                              <button
                                onClick={() => handleDeleteTx(tx.id)}
                                className="rounded-lg p-1.5 border border-white/5 hover:border-brand-rose/20 text-gray-400 hover:text-brand-rose hover:bg-brand-rose/5 transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </TD>
                          )}
                        </TR>
                      ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'contributions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Input
                id="cont-search"
                placeholder="Search member name or titles..."
                value={contSearch}
                onChange={(e) => setContSearch(e.target.value)}
                className="w-full sm:w-64"
                icon={<Search size={16} />}
              />
              {/* status filter removed - show all by default */}
              <div />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto text-left">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Select Event:</span>
              <select
                value={contEventId}
                onChange={(e) => setContEventId(e.target.value)}
                className="w-full sm:w-64 rounded-xl px-4 py-2 text-sm glass-input"
              >
                {visibleEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-purple border-t-transparent"></div>
                  <span className="text-xs text-gray-400">Loading contribution logs...</span>
                </div>
              ) : contributions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                  <Clock size={44} className="mb-3 text-gray-600" />
                  <p className="text-sm font-medium text-gray-400">No contribution logs found for this event.</p>
                </div>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Student</TH>
                      <TH>Title</TH>
                      <TH>Due Date</TH>
                      <TH>Amount</TH>
                      <TH className="text-right">Actions</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {contributions
                      .filter(c => {
                        const matchSearch = (c.user?.fullName || '').toLowerCase().includes(contSearch.toLowerCase()) || (c.title || '').toLowerCase().includes(contSearch.toLowerCase());
                        return matchSearch;
                      })
                      .map((c) => (
                        <TR key={c.id}>
                          <TD className="flex items-center gap-2">
                            <UserCircle2 size={24} className="text-gray-500 shrink-0" />
                            <div>
                              <div className="font-semibold text-white text-sm">{getContributionStudentLabel(c)}</div>
                              {c.user?.username && (
                                <span className="text-[10px] text-gray-400 block">@{c.user.username}</span>
                              )}
                            </div>
                          </TD>
                          <TD>
                            <div className="font-medium text-white text-sm">{getContributionTitle(c)}</div>
                          </TD>
                          <TD className="text-xs text-gray-400">{getContributionDueDate(c)}</TD>
                          <TD className="font-bold text-white text-sm">{formatCurrency(c.amount)}</TD>
                          <TD className="text-right">
                            <div className="flex justify-end gap-1.5">
                              {getContributionStatus(c) === 'PENDING' && canManage && (
                                <button
                                  onClick={() => handlePayCont(c.id)}
                                  className="rounded-lg px-2 py-1 text-[10px] font-semibold border border-brand-emerald/20 text-brand-emerald hover:bg-brand-emerald/10"
                                >
                                  Confirm Pay
                                </button>
                              )}
                              <button
                                onClick={() => openEditContModal(c)}
                                className="rounded-lg p-1.5 border border-white/5 hover:border-brand-purple/20 text-gray-400 hover:text-brand-purple hover:bg-brand-purple/5 transition-all"
                                title="Edit Contribution"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteCont(c.id)}
                                className="rounded-lg p-1.5 border border-white/5 hover:border-brand-rose/20 text-gray-400 hover:text-brand-rose hover:bg-brand-rose/5 transition-all"
                                title="Delete Record"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </TD>
                        </TR>
                      ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* CREATE EVENT MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Event">
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <Input 
            label="Event Name" 
            id="event-name"
            placeholder="e.g. Graduation Ball 2026"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            required
          />
          <Input 
            label="Description" 
            id="event-desc"
            placeholder="Brief overview of the event plans"
            value={eventDesc}
            onChange={(e) => setEventDesc(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Start Date" 
              id="event-startdate"
              type="date"
              value={eventStartDate}
              onChange={(e) => setEventStartDate(e.target.value)}
              required
            />
            <Input 
              label="End Date" 
              id="event-enddate"
              type="date"
              value={eventEndDate}
              onChange={(e) => setEventEndDate(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Create Event
            </Button>
          </div>
        </form>
      </Modal>

      {/* TEMP TREASURER ASSIGNMENT MODAL */}
      <Modal isOpen={isTempTreasurerOpen} onClose={() => setIsTempTreasurerOpen(false)} title="Assign Temporary Treasurer">
        <form onSubmit={handleAssignTempTreasurer} className="space-y-4 text-left">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
              User ID or Username
            </label>
            <Input
              id="temp-treasurer-input"
              placeholder="Enter user id (UUID) or username (e.g. cst24035 or jon_doe)"
              value={selectedTempTreasurerId}
              onChange={(e) => setSelectedTempTreasurerId(e.target.value)}
              className="w-full"
            />
            <div className="text-xs text-gray-400">Or pick from batch members below (selecting will fill the input)</div>
            <select
              value={users.find(u => String(u.id) === String(selectedTempTreasurerId)) ? selectedTempTreasurerId : ''}
              onChange={(e) => setSelectedTempTreasurerId(e.target.value)}
              className="w-full rounded-xl px-3 py-1 text-sm glass-input"
            >
              <option value="">-- Clear Selection --</option>
              {users.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.fullName} ({u.username}) - {u.role}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-500 mt-1">
              * Assigning a temporary treasurer grants them permission to upload transactions and coordinate collections for this specific event. You can paste a user id or username, or pick from the list.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <Button type="button" variant="outline" onClick={() => setIsTempTreasurerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Save Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* EVENT SUMMARY & REPORTS MODAL */}
      <Modal isOpen={isSummaryOpen} onClose={() => setIsSummaryOpen(false)} title="Event Financial Summary" size="lg">
        {isSummaryLoading || !summaryData ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-purple border-t-transparent"></div>
            <span className="text-xs text-gray-400">Loading ledger summaries...</span>
          </div>
        ) : (
          <div className="space-y-6 text-left">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Total Balance</span>
                <span className="text-lg font-bold text-white">{formatCurrency(summaryData.totalBalance ?? 0)}</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Total Income</span>
                <span className="text-lg font-bold text-brand-emerald">{formatCurrency(summaryData.totalIncome ?? 0)}</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Total Expense</span>
                <span className="text-lg font-bold text-brand-rose">{formatCurrency(summaryData.totalExpense ?? 0)}</span>
              </div>
              {(user?.role === 'SUPER_ADMIN' || user?.role === 'TREASURER' || isCurrentTempTreasurer) && (
                <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Total Contributions</span>
                  <span className="text-lg font-bold text-brand-blue">{formatCurrency(summaryData.totalContributions ?? 0)}</span>
                </div>
              )}
            </div>

            {/* Unpaid Members Checklist */}
            <div className="space-y-2 border-t border-white/5 pt-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Unpaid Members Checklist</h4>
              {isUnpaidLoading ? (
                <div className="py-4 flex justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-purple border-t-transparent"></div>
                </div>
              ) : unpaidList.length === 0 ? (
                <p className="text-xs text-gray-500 italic">All assigned contributions have been paid!</p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                  {unpaidList.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded-lg border border-white/5 bg-white/[0.005]">
                      <span className="text-xs text-gray-300 font-medium">{c.user?.fullName} ({c.user?.username})</span>
                      <span className="text-xs font-semibold text-brand-rose">{formatCurrency(c.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Export Section */}
            {canAccessSummaryDownload(selectedEventId) && (
              <div className="border-t border-white/5 pt-5 mt-6">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Download PDF Audit Document</h4>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1 flex items-center justify-center gap-2"
                    onClick={handleDownloadSummaryReport}
                  >
                    <FileDown size={16} />
                    <span>Download Event Summary PDF</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* LOG EVENT TRANSACTION MODAL */}
      <Modal isOpen={isTxCreateOpen} onClose={() => setIsTxCreateOpen(false)} title="Log Event Transaction">
        <form onSubmit={handleCreateTx} className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (LKR)"
              id="tx-amount"
              type="number"
              placeholder="e.g. 2500"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
              required
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Type
              </label>
              <select
                value={txType}
                onChange={(e) => setTxType(e.target.value as 'INCOME' | 'EXPENSE')}
                className="w-full rounded-xl px-3 py-1 text-sm glass-input"
              >
                <option value="INCOME">INCOME (Deposit)</option>
                <option value="EXPENSE">EXPENSE (Withdrawal)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Category"
              id="tx-cat"
              placeholder="e.g. Catering, Sponsor"
              value={txCategory}
              onChange={(e) => setTxCategory(e.target.value)}
              required
            />
            <Input
              label="Date"
              id="tx-date"
              type="date"
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              required
            />
          </div>

          <Input
            label="Description / Purpose"
            id="tx-desc"
            placeholder="What was this transaction for?"
            value={txDescription}
            onChange={(e) => setTxDescription(e.target.value)}
            required
          />

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Upload Receipt Proof
            </label>
            <div className="relative flex flex-col items-center justify-center p-6 border border-dashed border-white/10 rounded-2xl bg-white/[0.01] hover:bg-white/[0.02] cursor-pointer group">
              <input
                type="file"
                accept="image/*"
                onChange={handleTxFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload size={24} className="text-gray-500 group-hover:text-brand-purple transition-colors mb-2" />
              <span className="text-xs text-gray-400 font-semibold group-hover:text-gray-200 transition-colors">
                {txProofFile ? txProofFile.name : 'Click or drag file to upload receipt'}
              </span>
            </div>
            {txProofPreviewUrl && (
              <div className="mt-3 rounded-xl border border-white/5 p-2 bg-white/[0.02] text-center">
                <img 
                  src={txProofPreviewUrl} 
                  alt="Receipt Preview" 
                  className="rounded-lg max-h-32 object-contain mx-auto"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <Button type="button" variant="outline" onClick={() => setIsTxCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isTxSubmitting}>
              Register Transaction
            </Button>
          </div>
        </form>
      </Modal>

      {/* REQUEST EVENT DUES MODAL */}
      <Modal isOpen={isContCreateOpen} onClose={() => setIsContCreateOpen(false)} title="Request Event Dues">
        <form onSubmit={handleCreateCont} className="space-y-4 text-left">
          <Input
            label="Contribution Title"
            id="create-title"
            placeholder="e.g. Graduation Gala Entry"
            value={contTitle}
            onChange={(e) => setContTitle(e.target.value)}
            required
          />

          <Input
            label={hideContributionTargetSelect ? 'Target User ID' : 'Target User ID (optional fallback)'}
            id="create-target-username"
            placeholder="e.g. cst24035"
            value={contTargetUsername}
            onChange={(e) => setContTargetUsername(e.target.value)}
            required={hideContributionTargetSelect}
          />
          {hideContributionTargetSelect && (
            <p className="text-xs text-gray-400">As a Treasurer or temporary Treasurer, member list access is hidden. Enter the student userId directly.</p>
          )}
          
          {!hideContributionTargetSelect && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Request From Target
              </label>
              <select
                value={contTargetUserId}
                onChange={(e) => setContTargetUserId(e.target.value)}
                className="w-full rounded-xl px-3 py-1 text-sm glass-input"
              >
                <option value="">None</option>
                {users
                  .filter(u => u.role !== 'SUPER_ADMIN')
                  .map((st) => (
                    <option key={st.id} value={st.id}>{st.fullName} (@{st.username})</option>
                  ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (LKR)"
              id="create-amount"
              type="number"
              placeholder="e.g. 1500"
              value={contAmount}
              onChange={(e) => setContAmount(e.target.value)}
              required
            />
            <Input
              label="Due Date"
              id="create-duedate"
              type="date"
              value={contDueDate}
              onChange={(e) => setContDueDate(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <Button type="button" variant="outline" onClick={() => setIsContCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isContSubmitting}>
              Request Dues
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT EVENT CONTRIBUTION MODAL */}
      <Modal isOpen={isContEditOpen} onClose={() => setIsContEditOpen(false)} title="Edit Event Contribution">
        <form onSubmit={handleUpdateCont} className="space-y-4 text-left">
          <Input
            label="Amount (LKR)"
            id="edit-amount"
            type="number"
            placeholder="e.g. 1500"
            value={editContAmount}
            onChange={(e) => setEditContAmount(e.target.value)}
            required
          />
          <Input
            label="Month (YYYY-MM)"
            id="edit-month"
            placeholder="e.g. 2026-06"
            value={editContMonth}
            onChange={(e) => setEditContMonth(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <Button type="button" variant="outline" onClick={() => setIsContEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isContSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
