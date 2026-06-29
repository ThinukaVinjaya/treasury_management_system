import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../utils/api';
import type { Contribution, Transaction, Event } from '../utils/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Shield, ShieldAlert, KeyRound, Receipt, UserRound, Search } from 'lucide-react';
import { toast } from 'sonner';

export const Profile: React.FC = () => {
  const { user, changePassword, mustChangePassword, getRoleDisplayText } = useAuth();
  
  // Password change states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFirstLoginNotice, setShowFirstLoginNotice] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword({ oldPassword, newPassword });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      // toast shown in context
    } finally {
      setIsSubmitting(false);
    }
  };

  // My contributions & transactions states
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isContribLoading, setIsContribLoading] = useState(false);
  const [contribScope, setContribScope] = useState<'monthly' | 'event'>('monthly');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [eventsList, setEventsList] = useState<Event[]>([]);
  const [contribSearch, setContribSearch] = useState('');

  const [myTransactions, setMyTransactions] = useState<Transaction[]>([]);
  const [isTxLoading, setIsTxLoading] = useState(false);

  useEffect(() => {
    const shouldShowNotice = sessionStorage.getItem('ts_first_login_notice') === '1' || Boolean(mustChangePassword || user?.mustChangePassword);
    if (shouldShowNotice) {
      setShowFirstLoginNotice(true);
      toast.warning('You need to update your password before continuing.', { duration: 8000 });
      sessionStorage.removeItem('ts_first_login_notice');
    }
  }, [mustChangePassword, user?.mustChangePassword]);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const res = await apiService.events.getAll();
        const list = Array.isArray(res.data) ? res.data : [];
        setEventsList(list as Event[]);
        if (list.length > 0 && !selectedEventId) setSelectedEventId(String((list as Event[])[0].id || ''));
      } catch (e) {
        // ignore
      }
    };

    const loadMyTransactions = async () => {
      setIsTxLoading(true);
      try {
        const res = await apiService.user.getMyTransactions();
        const txs = Array.isArray(res.data) ? res.data : res.data.content || [];
        setMyTransactions(txs as Transaction[]);
      } catch (e) {
        console.error('Failed to load my transactions', e);
      } finally {
        setIsTxLoading(false);
      }
    };

    loadEvents();
    loadMyTransactions();
  }, []);

  useEffect(() => {
    const loadContributions = async () => {
      setIsContribLoading(true);
      try {
        if (contribScope === 'monthly') {
          const res = await apiService.user.getContributions();
          setContributions(Array.isArray(res.data) ? res.data : res.data.content || []);
        } else if (contribScope === 'event' && selectedEventId) {
          const res = await apiService.user.getEventContributions(selectedEventId);
          setContributions(Array.isArray(res.data) ? res.data : res.data.content || []);
        } else {
          setContributions([]);
        }
      } catch (e) {
        console.error('Failed to load contributions', e);
      } finally {
        setIsContribLoading(false);
      }
    };

    loadContributions();
  }, [contribScope, selectedEventId]);

  const formatCurrency = (value: number | string | undefined) => `LKR ${Number(value || 0).toLocaleString('en-LK')}`;

  const filterContrib = (c: Contribution) => {
    if (!contribSearch) return true;
    const q = contribSearch.toLowerCase();
    return String(c.month || '').toLowerCase().includes(q) || String(c.title || '').toLowerCase().includes(q) || String(c.eventName || '').toLowerCase().includes(q);
  };

  if (!user) return null;

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-4xl mx-auto text-left">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Profile & Settings
        </h1>
        <p className="text-sm text-gray-400">Manage your credentials, change passwords, and configure dev options.</p>
      </div>

      {/* Must Change Password Alert Banner */}
      {(mustChangePassword || showFirstLoginNotice) && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5 flex items-start gap-4">
          <ShieldAlert className="text-amber-400 shrink-0 mt-0.5" size={20} />
          <div className="flex-1 space-y-1">
            <h4 className="font-semibold text-sm text-white">Password Update Required</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              You need to update your password before continuing. Please change it from the form below.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowFirstLoginNotice(false)}
            className="text-xs font-semibold text-amber-300 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: Profile Stats card */}
        <div className="md:col-span-1 space-y-6">
          <Card className="text-center pt-8 pb-6">
            <CardContent className="flex flex-col items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-brand-purple to-brand-blue text-white text-2xl font-bold shadow-lg shadow-brand-purple/20 mb-4 animate-pulse-slow">
                {(user.fullName || user.username || 'U').split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase()}
              </div>
              <h3 className="font-display font-bold text-lg text-white leading-tight">{user.fullName || 'User Profile'}</h3>
              <p className="text-xs text-gray-400 mt-1">@{user.username}</p>
              
              <span className="mt-4 inline-flex rounded-full bg-brand-purple/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-purple border border-brand-purple/10">
                {getRoleDisplayText()}
              </span>
            </CardContent>
          </Card>

          {/* Connection details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Connection Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="font-semibold text-white block">Live Backend</span>
                  <span className="text-gray-500 block">Connected to the production server</span>
                </div>
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                  Online
                </span>
              </div>

              <div className="border-t border-white/5 pt-3 flex items-center justify-between text-xs">
                <span className="text-gray-400">Server</span>
                <span className="font-mono text-[10px] text-gray-500 truncate max-w-[140px]" title="Spring Boot REST API Base URL">
                  AWS EC2 Instance
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Profile details + Password Change form */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your personal registry and authority level.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Full Name</span>
                  <span className="text-sm font-semibold text-white block bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5">{user.fullName || 'Not specified'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Username</span>
                  <span className="text-sm font-semibold text-white block bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5">@{user.username}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Email Address</span>
                  <span className="text-sm font-semibold text-white block bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5">{user.email || 'Not specified'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Authority Level</span>
                  <span className="text-sm font-semibold text-white block bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 capitalize">{getRoleDisplayText().toLowerCase()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your batch portal credentials regularly for safety.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <Input
                  label="Current Password"
                  id="old-password"
                  type="password"
                  placeholder="••••••••"
                  icon={<KeyRound size={16} />}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="New Password"
                    id="new-password"
                    type="password"
                    placeholder="Min 8 characters"
                    icon={<Shield size={16} />}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <Input
                    label="Confirm New Password"
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    icon={<Shield size={16} />}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="flex justify-end pt-3">
                  <Button type="submit" isLoading={isSubmitting} className="w-full sm:w-auto">
                    Update Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* My Contributions & Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>My Contributions & Transactions</CardTitle>
              <CardDescription>View your monthly dues, event contributions and uploaded transactions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {/* Contributions Column */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2"><UserRound size={16} />My Contributions</h4>
                    <div className="flex items-center gap-2">
                      <Input
                        id="contrib-search"
                        placeholder="Search..."
                        className="w-44"
                        icon={<Search size={14} />}
                        value={contribSearch}
                        onChange={(e) => setContribSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 mb-2">
                      <label className="text-xs text-gray-400">Scope</label>
                      <select value={contribScope} onChange={(e) => setContribScope(e.target.value as 'monthly' | 'event')} className="rounded-xl px-3 py-1 text-sm glass-input">
                        <option value="monthly">Monthly Contributions</option>
                        <option value="event">Event Contributions</option>
                      </select>
                      {contribScope === 'event' && (
                        <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className="rounded-xl px-3 py-1 text-sm glass-input">
                          <option value="">-- Select Event --</option>
                          {eventsList.map((ev) => (
                            <option key={ev.id} value={String(ev.id)}>{ev.name}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {isContribLoading ? (
                      <div className="py-8 text-center text-gray-400">Loading contributions...</div>
                    ) : contributions.length === 0 ? (
                      <div className="py-8 text-center text-gray-400">No contributions found.</div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-white/5">
                        <table className="w-full text-left">
                          <thead className="text-xs text-gray-400 uppercase">
                            <tr>
                              <th className="px-4 py-3">Month</th>
                              <th className="px-4 py-3">Title</th>
                              <th className="px-4 py-3">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {contributions.filter(filterContrib).map((c) => (
                              <tr key={String(c.id)} className="border-t border-white/3 hover:bg-white/2">
                                <td className="px-4 py-3 text-sm text-gray-200">{c.month}</td>
                                <td className="px-4 py-3 text-sm text-white">{c.title || (c.eventName ? `${c.eventName} Contribution` : 'Monthly Dues')}</td>
                                <td className="px-4 py-3 font-semibold text-brand-emerald">{formatCurrency(Number(c.amount || 0))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Transactions Column */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2"><Receipt size={16} />My Transactions</h4>
                    <div className="text-xs text-gray-400">Showing records you uploaded</div>
                  </div>

                  {isTxLoading ? (
                    <div className="py-8 text-center text-gray-400">Loading transactions...</div>
                  ) : myTransactions.length === 0 ? (
                    <div className="py-8 text-center text-gray-400">No transactions found.</div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-white/5">
                      <table className="w-full text-left">
                        <thead className="text-xs text-gray-400 uppercase">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3">Category</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myTransactions.map((t) => (
                            <tr key={String(t.id)} className="border-t border-white/3 hover:bg-white/2">
                              <td className="px-4 py-3 text-sm text-gray-200">{t.createdAt ? new Date(t.createdAt).toLocaleString() : t.date}</td>
                              <td className="px-4 py-3 text-sm text-white">{t.description || t.title}</td>
                              <td className={`px-4 py-3 font-semibold text-sm ${t.type === 'INCOME' ? 'text-brand-emerald' : 'text-brand-rose'}`}>{t.type === 'INCOME' ? '+' : '-'}{formatCurrency(Number(t.amount || 0))}</td>
                              <td className="px-4 py-3 text-xs text-gray-400">{t.category}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
