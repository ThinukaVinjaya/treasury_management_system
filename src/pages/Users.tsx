import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../utils/api';
import type { User, UserRole, Event } from '../utils/api';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { Trash2, KeyRound, UserPlus, Search } from 'lucide-react';
import { toast } from 'sonner';

interface AuditLog {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
}

const mockAuditLogs: AuditLog[] = [
  { id: 1, timestamp: '2026-06-23 23:10:15', actor: 'admin', action: 'USER_LOGIN', details: 'Successful login from IP 192.168.1.105' },
  { id: 2, timestamp: '2026-06-23 22:45:30', actor: 'treasurer1', action: 'TRANSACTION_CREATE', details: 'Recorded income of LKR 1,500.00' },
  { id: 3, timestamp: '2026-06-23 22:30:12', actor: 'admin', action: 'USER_CREATE', details: 'Created student account student3 (Marcus Chen)' },
  { id: 4, timestamp: '2026-06-23 22:15:00', actor: 'treasurer1', action: 'CONTRIBUTION_CREATE', details: 'Bulk-assigned "Graduation Gala Fee" (LKR 150) to all students' },
  { id: 5, timestamp: '2026-06-23 21:50:45', actor: 'student2', action: 'PAYMENT_PROOF_UPLOAD', details: 'Uploaded proof receipt for Graduation Gala Fee' },
  { id: 6, timestamp: '2026-06-23 20:30:00', actor: 'admin', action: 'PASSWORD_RESET', details: 'Reset password for student1 (Alex Rivera)' },
  { id: 7, timestamp: '2026-06-23 19:45:00', actor: 'admin', action: 'USER_ROLE_CHANGE', details: 'Promoted treasurer1 to TREASURER' },
];

export const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [search, setSearch] = useState('');

  // Form states
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('USER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTempTreasurer, setIsTempTreasurer] = useState(false);
  const [selectedEventForTempTreasurer, setSelectedEventForTempTreasurer] = useState<string>('');

  // Reset password modal states
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | number | null>(null);
  const [resetUserName, setResetUserName] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const normalizeUsers = (data: any): User[] => {
    const list = Array.isArray(data) ? data : data?.content || data?.data || data?.items || [];
    const deletedUserIds = new Set<string>(JSON.parse(localStorage.getItem('ts_deleted_user_ids') || '[]'));

    return list.filter((u: any) => {
      if (!u || typeof u !== 'object') return false;
      if (deletedUserIds.has(String(u.id ?? ''))) return false;
      if (u?.isActive === false || u?.active === false || u?.status === 'INACTIVE' || u?.status === 'DELETED') return false;
      if (u?.deleted === true || u?.isDeleted === true || u?.is_deleted === true || u?.isDelete === true || u?.deletedAt || u?.deleted_at) return false;
      return true;
    });
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await apiService.users.getAll();
      setUsers(normalizeUsers(res.data));
    } catch (e) {
      toast.error('Failed to load user list.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await apiService.events.getAll();
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setEvents([]);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchEvents();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !fullName || !email) {
      toast.error('Please enter all required details.');
      return;
    }

    if (isTempTreasurer && !selectedEventForTempTreasurer) {
      toast.error('Please select an event for temporary treasurer assignment.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newUser = await apiService.users.create({
        username,
        fullName,
        email,
        role,
        password: password || undefined,
      });

      // If temporary treasurer, assign to event
      if (isTempTreasurer && selectedEventForTempTreasurer && newUser?.data?.id) {
        try {
          await apiService.events.assignTemporaryTreasurer(
            selectedEventForTempTreasurer,
            username
          );
        } catch (assignErr) {
          console.error('Failed to assign as temp treasurer:', assignErr);
          toast.warning('User created but failed to assign as temporary treasurer.');
        }
      }

      toast.success(`User "${fullName}" created successfully!`);
      setIsCreateOpen(false);

      // Reset form
      setUsername('');
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('USER');
      setIsTempTreasurer(false);
      setSelectedEventForTempTreasurer('');

      fetchUsers();
      fetchEvents();
    } catch (err: any) {
      toast.error('Failed to create user account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordClick = (id: string | number, userName: string) => {
    setResetUserId(id);
    setResetUserName(userName);
    setNewPassword('');
    setIsResetOpen(true);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId || !newPassword) {
      toast.error('Please enter a new password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiService.users.resetPassword(resetUserId, newPassword);
      toast.success(`Password for @${resetUserName} has been reset successfully!`);
      setIsResetOpen(false);
    } catch (err: any) {
      toast.error('Failed to reset user password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string | number, userName: string) => {
    if (String(id) === String(currentUser?.id)) {
      toast.error("You cannot delete your own account.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete user @${userName}? This will permanently remove their logs.`)) return;
    
    try {
      await apiService.users.delete(id);
      const deletedId = String(id);
      const existingDeletedIds = JSON.parse(localStorage.getItem('ts_deleted_user_ids') || '[]');
      if (!existingDeletedIds.includes(deletedId)) {
        localStorage.setItem('ts_deleted_user_ids', JSON.stringify([...existingDeletedIds, deletedId]));
      }
      toast.success('User account deleted.');
      setUsers(prev => prev.filter(u => String(u.id) !== deletedId));
      setSearch('');
    } catch (err: any) {
      toast.error('Failed to delete user.');
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            User Accounts
          </h1>
          <p className="text-sm text-gray-400">Manage user accounts, change roles, reset passwords, or delete credentials.</p>
        </div>
        <Button 
          className="flex items-center gap-2 self-start sm:self-auto"
          onClick={() => setIsCreateOpen(true)}
        >
          <UserPlus size={18} />
          <span>Add User Account</span>
        </Button>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-white/5 gap-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all duration-200
            ${activeTab === 'users' 
              ? 'border-brand-purple text-white' 
              : 'border-transparent text-gray-400 hover:text-gray-200'
            }
          `}
        >
          Users Directory
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all duration-200
            ${activeTab === 'audit' 
              ? 'border-brand-purple text-white' 
              : 'border-transparent text-gray-400 hover:text-gray-200'
            }
          `}
        >
          Audit Activity Logs
        </button>
      </div>

      {/* Search Filter for Users */}
      {activeTab === 'users' && (
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <Input
            id="user-search"
            placeholder="Find single user by name or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-80"
            icon={<Search size={16} />}
          />
        </div>
      )}

      {/* Directory Grid */}
      {activeTab === 'users' ? (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-purple border-t-transparent"></div>
                <span className="text-xs text-gray-400">Fetching user accounts...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-sm text-gray-500 py-12">No user accounts found.</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Full Name</TH>
                    <TH>Username</TH>
                    <TH>Email Address</TH>
                    <TH>Role</TH>
                    <TH className="text-right">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {filteredUsers.map((u) => (
                    <TR key={u.id}>
                      <TD className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-gray-300 font-display text-sm font-semibold shrink-0">
                          {u.fullName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="font-semibold text-white text-sm">{u.fullName}</span>
                      </TD>
                      <TD className="text-sm text-gray-300">@{u.username}</TD>
                      <TD className="text-xs text-gray-400">{u.email}</TD>
                      <TD>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider
                          ${u.role === 'SUPER_ADMIN' ? 'bg-brand-rose/10 text-brand-rose' : ''}
                          ${u.role === 'TREASURER' ? 'bg-brand-purple/10 text-brand-purple' : ''}
                          ${u.role === 'USER' ? 'bg-brand-blue/10 text-brand-blue' : ''}
                        `}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </TD>
                      <TD className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleResetPasswordClick(u.id, u.username)}
                            className="rounded-lg p-1.5 border border-white/5 hover:border-brand-purple/20 text-gray-400 hover:text-brand-purple hover:bg-brand-purple/5 transition-all"
                            title="Reset Password"
                          >
                            <KeyRound size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            className={`rounded-lg p-1.5 border border-white/5 transition-all
                              ${String(u.id) === String(currentUser?.id) 
                                ? 'opacity-30 cursor-not-allowed text-gray-600' 
                                : 'hover:border-brand-rose/20 text-gray-400 hover:text-brand-rose hover:bg-brand-rose/5'
                              }
                            `}
                            disabled={String(u.id) === String(currentUser?.id)}
                            title="Delete User"
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
      ) : (
        /* AUDIT ACTIVITY LOGS SCREEN */
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Timestamp</TH>
                  <TH>Actor</TH>
                  <TH>Action Type</TH>
                  <TH>Details</TH>
                </TR>
              </THead>
              <TBody>
                {mockAuditLogs.map((log) => (
                  <TR key={log.id}>
                    <TD className="text-xs text-gray-400">{log.timestamp}</TD>
                    <TD className="text-sm font-semibold text-white">@{log.actor}</TD>
                    <TD>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider
                        ${log.action.includes('CREATE') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : ''}
                        ${log.action.includes('LOGIN') ? 'bg-blue-500/10 text-blue-400 border border-blue-500/10' : ''}
                        ${log.action.includes('PASSWORD') || log.action.includes('RESET') ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10' : ''}
                        ${log.action.includes('CHANGE') || log.action.includes('DELETE') ? 'bg-rose-500/10 text-rose-400 border border-rose-500/10' : ''}
                      `}>
                        {log.action}
                      </span>
                    </TD>
                    <TD className="text-xs text-gray-300">{log.details}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* CREATE USER MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create User Account">
        <form onSubmit={handleCreateUser} className="space-y-4 text-left">
          <Input
            label="Full Name"
            id="user-fullname"
            placeholder="e.g. John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Username"
              id="user-username"
              placeholder="e.g. johndoe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <Input
              label="Email Address"
              id="user-email"
              type="email"
              placeholder="e.g. john@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <Input
            label="Account Password (Optional - defaults to username)"
            id="user-password"
            type="password"
            placeholder="Enter custom password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Assigned Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-xl px-3 py-1 text-sm glass-input"
            >
              <option value="USER">USER (Regular Batch Student)</option>
              <option value="TREASURER">TREASURER (Logs expenditures & fees)</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN (Admin permissions + users)</option>
            </select>
            <p className="text-[10px] text-gray-500 mt-1">
              * Newly created accounts will be forced to change this password on their very first sign-in.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <input
                type="checkbox"
                checked={isTempTreasurer}
                onChange={(e) => {
                  setIsTempTreasurer(e.target.checked);
                  if (!e.target.checked) setSelectedEventForTempTreasurer('');
                }}
                className="rounded w-4 h-4 cursor-pointer"
              />
              Make Temporary Treasurer for Event
            </label>
            {isTempTreasurer && (
              <select
                value={selectedEventForTempTreasurer}
                onChange={(e) => setSelectedEventForTempTreasurer(e.target.value)}
                className="w-full rounded-xl px-3 py-1 text-sm glass-input"
              >
                <option value="">-- Select Event --</option>
                {events.map((evt) => (
                  <option key={evt.id} value={String(evt.id)}>
                    {evt.name || 'Unnamed Event'}
                  </option>
                ))}
              </select>
            )}
            <p className="text-[10px] text-gray-500 mt-1">
              * Temporary treasurers can only manage transactions and contributions for their assigned event.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* RESET PASSWORD MODAL */}
      <Modal isOpen={isResetOpen} onClose={() => setIsResetOpen(false)} title={`Reset Password for @${resetUserName}`}>
        <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-left">
          <Input
            label="New Password"
            id="new-password"
            type="password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <Button type="button" variant="outline" onClick={() => setIsResetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Reset Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
