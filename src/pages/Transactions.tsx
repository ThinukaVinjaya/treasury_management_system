import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../utils/api';
import type { Transaction, Event } from '../utils/api';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { 
  Plus, 
  Trash2, 
  Search, 
  Filter, 
  FileImage, 
  Upload, 
  TrendingUp, 
  TrendingDown, 
  Coins,
  Receipt,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

export const Transactions: React.FC = () => {
  const { user, isTempTreasurer } = useAuth();
  
  // Transaction lists and configurations
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [activeTab] = useState<'main' | 'event'>('main');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filters
  const [search, setSearch] = useState('');
  // replace category filter with type filter (INCOME / EXPENSE / ALL)
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [activeReceiptUrl] = useState<string | null>(null);

  // Add Form state
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [formEventId, setFormEventId] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'TREASURER' || isTempTreasurer;

  const isAssignedEvent = (eventId: string | number | null | undefined) => {
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'TREASURER') return true;
    if (!eventId) return false;
    return events.some(e =>
      String(e.id) === String(eventId) &&
      (String(e.temporaryTreasurer?.id) === String(user?.id) || String(e.temporaryTreasurerId) === String(user?.id))
    );
  };

  const canModifyTransaction = (tx: Transaction) => {
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'TREASURER') return true;
    if (isTempTreasurer && tx.eventId && isAssignedEvent(tx.eventId)) return true;
    return false;
  };

  const canLogTransaction = 
    user?.role === 'SUPER_ADMIN' || 
    user?.role === 'TREASURER' || 
    (isTempTreasurer && selectedEventId && isAssignedEvent(selectedEventId));

  const formatCurrency = (value: number | string | undefined) => `LKR ${Number(value || 0).toLocaleString('en-LK')}`;

  const fetchEvents = async () => {
    try {
      const res = await apiService.events.getAll();
      const cleanEvents = Array.isArray(res.data) ? res.data : [];
      setEvents(cleanEvents);
      if (cleanEvents.length > 0 && !selectedEventId) {
        setSelectedEventId(String(cleanEvents[0].id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'main') {
        const res = await apiService.transactions.getMainFund();
        setTransactions(Array.isArray(res.data) ? res.data : []);
      } else if (activeTab === 'event' && selectedEventId) {
        const res = await apiService.transactions.getEventTransactions(selectedEventId);
        setTransactions(Array.isArray(res.data) ? res.data : []);
      } else {
        setTransactions([]);
      }
    } catch (err: any) {
      toast.error('Failed to load transaction ledger.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [activeTab, selectedEventId]);

  // Reset pagination when search filters, tabs, or event selections change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, activeTab, selectedEventId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      // Create local preview URL
      const url = URL.createObjectURL(file);
      setProofPreviewUrl(url);
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !description) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiService.transactions.create({
        amount: Number(amount),
        type,
        category,
        description,
        date,
        eventId: activeTab === 'event' ? formEventId || selectedEventId : null,
        proof: proofFile
      });

      toast.success('Transaction logged in ledger successfully!');
      setIsCreateOpen(false);
      
      // Reset form
      setAmount('');
      setCategory('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setProofFile(null);
      setProofPreviewUrl(null);
      
      fetchTransactions();
    } catch (err: any) {
      toast.error('Failed to register transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (id: string | number) => {
    if (!window.confirm('Delete this transaction? This action is irreversible.')) return;
    try {
      await apiService.transactions.delete(id);
      toast.success('Transaction deleted successfully.');
      fetchTransactions();
    } catch (err: any) {
      toast.error('Failed to delete transaction.');
    }
  };

  // Filter computations
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = 
      (tx.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (tx.category || '').toLowerCase().includes(search.toLowerCase()) ||
      (tx.recordedBy?.fullName || '').toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;

    return matchesSearch && matchesType;
  });

  // Pagination computations
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Ensure current page is valid when transactions update
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [filteredTransactions.length, totalPages, currentPage]);

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Transaction Ledger
          </h1>
          <p className="text-sm text-gray-400">Record and audit incomes, sponsors, and operational expenditures.</p>
        </div>
        {canLogTransaction && !isTempTreasurer && (
          <Button 
            className="flex items-center gap-2 self-start sm:self-auto"
            onClick={() => {
              setFormEventId(activeTab === 'event' ? selectedEventId : '');
              setIsCreateOpen(true);
            }}
          >
            <Plus size={18} />
            <span>Add Transaction</span>
          </Button>
        )}
      </div>

      {/* Tabs Menu removed - Main Batch Fund locked */}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Input
            id="search"
            placeholder="Search descriptions or recorders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
            icon={<Search size={16} />}
          />
          <div className="relative w-full sm:w-48">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'INCOME' | 'EXPENSE')}
              className="w-full rounded-xl px-3 py-1 text-sm glass-input appearance-none"
            >
              <option value="ALL">All Types</option>
              <option value="INCOME">INCOME</option>
              <option value="EXPENSE">EXPENSE</option>
            </select>
            <div className="absolute right-3.5 top-3.5 text-gray-500 pointer-events-none">
              <Filter size={14} />
            </div>
          </div>
        </div>

        {activeTab === 'event' && (
          <div className="flex items-center gap-3 w-full sm:w-auto text-left">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Select Event:</span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full sm:w-56 rounded-xl px-3 py-1 text-sm glass-input"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Ledger Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-purple border-t-transparent"></div>
              <span className="text-xs text-gray-400">Loading ledger logs...</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Coins size={44} className="mb-3 text-gray-600" />
              <p className="text-sm font-medium text-gray-400">No transactions recorded under this view.</p>
            </div>
          ) : (
            <>
              <Table>
                <THead>
                  <TR>
                    <TH className="hidden md:table-cell">Date</TH>
                    <TH>Category & Desc</TH>
                    <TH>Type</TH>
                    <TH>Amount</TH>
                    <TH className="hidden md:table-cell">Recorded By</TH>
                    <TH>Receipt</TH>
                    {canManage && <TH className="text-right">Action</TH>}
                  </TR>
                </THead>
                <TBody>
                  {paginatedTransactions.map((tx) => (
                    <TR key={tx.id}>
                      <TD className="text-xs text-gray-400 font-medium hidden md:table-cell">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : tx.date}
                      </TD>
                      <TD>
                        <div className="font-semibold text-white text-sm">{tx.description}</div>
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
                      <TD className="text-xs text-gray-400 hidden md:table-cell">{tx.recordedBy?.fullName || 'System'}</TD>
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
                          {canModifyTransaction(tx) ? (
                            <button
                              onClick={() => handleDeleteTransaction(tx.id)}
                              className="rounded-lg p-1.5 border border-white/5 hover:border-brand-rose/20 text-gray-400 hover:text-brand-rose hover:bg-brand-rose/5 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : (
                            <span className="text-xs text-gray-600">-</span>
                          )}
                        </TD>
                      )}
                    </TR>
                  ))}
                </TBody>
              </Table>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-white/5 bg-white/[0.01]">
                  <span className="text-xs text-gray-400">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
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

      {/* CREATE TRANSACTION MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Log New Transaction">
        <form onSubmit={handleCreateTransaction} className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (LKR)"
              id="tx-amount"
              type="number"
              placeholder="e.g. 2500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'INCOME' | 'EXPENSE')}
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
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            />
            <Input
              label="Date"
              id="tx-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <Input
            label="Description / Purpose"
            id="tx-desc"
            placeholder="What was this transaction for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          {activeTab === 'event' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Associate with Event
              </label>
              <select
                value={formEventId}
                onChange={(e) => setFormEventId(e.target.value)}
                className="w-full rounded-xl px-3 py-1 text-sm glass-input"
              >
                <option value="">-- Use Current Selection --</option>
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

          {/* Receipt Upload with Preview */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Upload Receipt Proof
            </label>
            <div className="relative flex flex-col items-center justify-center p-6 border border-dashed border-white/10 rounded-2xl bg-white/[0.01] hover:bg-white/[0.02] cursor-pointer group">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload size={24} className="text-gray-500 group-hover:text-brand-purple transition-colors mb-2" />
              <span className="text-xs text-gray-400 font-semibold group-hover:text-gray-200 transition-colors">
                {proofFile ? proofFile.name : 'Click or drag file to upload receipt'}
              </span>
              <span className="text-[10px] text-gray-600 mt-1">Accepts PNG, JPG (Max 5MB)</span>
            </div>

            {proofPreviewUrl && (
              <div className="mt-3 rounded-xl border border-white/5 p-2 bg-white/[0.02] relative">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Proof Image Preview:</p>
                <img 
                  src={proofPreviewUrl} 
                  alt="Receipt Preview" 
                  className="rounded-lg max-h-32 object-contain mx-auto"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Register Transaction
            </Button>
          </div>
        </form>
      </Modal>

      {/* RECEIPT PREVIEW MODAL */}
      <Modal isOpen={isReceiptOpen} onClose={() => setIsReceiptOpen(false)} title="Audit Receipt File">
        <div className="flex flex-col items-center justify-center space-y-4">
          {activeReceiptUrl ? (
            <>
              <div className="rounded-2xl overflow-hidden border border-white/10 max-w-full">
                <img
                  src={activeReceiptUrl}
                  alt="Audit Proof Receipt"
                  className="max-h-[60vh] object-contain max-w-full"
                />
              </div>
              <div className="flex gap-3 w-full">
                <a
                  href={activeReceiptUrl}
                  download="receipt.jpg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-xl py-2.5 text-xs text-center border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 font-semibold transition-all"
                >
                  Download Receipt
                </a>
              </div>
            </>
          ) : (
            <div className="py-8 flex flex-col items-center text-gray-500">
              <FileImage size={40} className="mb-2 text-gray-600" />
              <p className="text-sm">No receipt image is available for this ledger record.</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
