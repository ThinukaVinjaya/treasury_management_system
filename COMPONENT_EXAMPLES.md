# Component Implementation Examples

This file contains practical React component examples showing how to use the Treasury Management API endpoints.

## 1. Login Component with Forced Password Change

```typescript
// src/pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService, getErrorMessage } from '@/utils/api';
import { toast } from 'sonner';

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiService.auth.login(username, password);
      
      // response.data is unpacked by axios interceptor
      const { token, user } = response.data;

      // Store token and user
      localStorage.setItem('ts_token', token);
      localStorage.setItem('ts_user', JSON.stringify(user));

      // Check if first login
      if (user.isFirstLogin) {
        toast.info('Please change your password first');
        navigate('/change-password');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4 max-w-md mx-auto">
      <input
        type="text"
        placeholder="Username or Email"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

## 2. Dashboard Component (All Users)

```typescript
// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { apiService, DashboardStats, getErrorMessage } from '@/utils/api';
import { toast } from 'sonner';

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      const response = await apiService.user.getDashboard();
      setStats(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading dashboard...</div>;
  if (!stats) return <div>No data available</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded border">
          <div className="text-sm text-gray-600">Main Fund Balance</div>
          <div className="text-3xl font-bold">${stats.mainFundBalance}</div>
        </div>
        <div className="bg-white p-4 rounded border">
          <div className="text-sm text-gray-600">Total Income</div>
          <div className="text-3xl font-bold text-green-600">${stats.totalIncome}</div>
        </div>
        <div className="bg-white p-4 rounded border">
          <div className="text-sm text-gray-600">Total Expense</div>
          <div className="text-3xl font-bold text-red-600">${stats.totalExpense}</div>
        </div>
        <div className="bg-white p-4 rounded border">
          <div className="text-sm text-gray-600">Events</div>
          <div className="text-3xl font-bold">{stats.totalEvents}</div>
        </div>
      </div>

      {/* Monthly trend chart would go here */}
      {/* Category breakdown chart would go here */}
    </div>
  );
}
```

## 3. Event Management (Treasurer)

```typescript
// src/pages/Events.tsx
import { useEffect, useState } from 'react';
import { apiService, Event, getErrorMessage } from '@/utils/api';
import { toast } from 'sonner';

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      const response = await apiService.treasurer.getEvents(0, 50);
      setEvents(response.data.content);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function createEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      await apiService.treasurer.createEvent({
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        startDate: formData.get('startDate') as string,
        endDate: formData.get('endDate') as string || undefined,
      });
      toast.success('Event created');
      setShowCreateModal(false);
      fetchEvents();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function deleteEvent(eventId: string) {
    if (!confirm('Delete this event and all its transactions?')) return;

    try {
      await apiService.treasurer.deleteEvent(eventId);
      toast.success('Event deleted');
      fetchEvents();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  if (loading) return <div>Loading events...</div>;

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowCreateModal(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Create Event
      </button>

      <div className="grid gap-4">
        {events.map((event) => (
          <div key={event.id} className="bg-white p-4 rounded border">
            <h3 className="font-bold text-lg">{event.name}</h3>
            <p className="text-sm text-gray-600">{event.description}</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div>
                <span className="text-xs text-gray-600">Balance:</span>
                <div className="font-bold">${event.totalBalance}</div>
              </div>
              <div>
                <span className="text-xs text-gray-600">Income:</span>
                <div className="font-bold text-green-600">${event.totalIncome}</div>
              </div>
              <div>
                <span className="text-xs text-gray-600">Expense:</span>
                <div className="font-bold text-red-600">${event.totalExpense}</div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  /* Navigate to event detail */
                }}
                className="text-blue-600 text-sm"
              >
                View Details
              </button>
              <button
                onClick={() => deleteEvent(event.id)}
                className="text-red-600 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <form onSubmit={createEvent} className="bg-white p-6 rounded max-w-md w-full space-y-4">
            <h2 className="text-xl font-bold">Create Event</h2>
            <input name="name" placeholder="Event Name" required className="w-full border p-2 rounded" />
            <textarea name="description" placeholder="Description" className="w-full border p-2 rounded" />
            <input name="startDate" type="date" required className="w-full border p-2 rounded" />
            <input name="endDate" type="date" className="w-full border p-2 rounded" />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-blue-600 text-white p-2 rounded">
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-gray-300 p-2 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
```

## 4. Transaction Creation (Treasurer)

```typescript
// src/components/TransactionForm.tsx
import { useState } from 'react';
import { apiService, getErrorMessage } from '@/utils/api';
import { toast } from 'sonner';

interface TransactionFormProps {
  eventId?: string;
  onSuccess: () => void;
}

export function TransactionForm({ eventId, onSuccess }: TransactionFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    type: 'INCOME' as 'INCOME' | 'EXPENSE',
    category: '',
    description: '',
    file: null as File | null,
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate: EXPENSE requires file
    if (formData.type === 'EXPENSE' && !formData.file) {
      toast.error('Receipt file required for expenses');
      return;
    }

    setLoading(true);

    try {
      await apiService.treasurer.createTransaction({
        title: formData.title,
        amount: parseFloat(formData.amount),
        type: formData.type,
        category: formData.category,
        description: formData.description,
        eventId: eventId,
        file: formData.file || undefined,
      });

      toast.success('Transaction created');
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <input
        type="text"
        placeholder="Transaction Title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
      />

      <input
        type="number"
        placeholder="Amount"
        value={formData.amount}
        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
        required
      />

      <select
        value={formData.type}
        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
      >
        <option value="INCOME">Income</option>
        <option value="EXPENSE">Expense</option>
      </select>

      <input
        type="text"
        placeholder="Category"
        value={formData.category}
        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        required
      />

      <textarea
        placeholder="Description (optional)"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
      />

      {/* File input - required for EXPENSE, optional for INCOME */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Receipt/Proof {formData.type === 'EXPENSE' ? '(Required)' : '(Optional)'}
        </label>
        <input
          type="file"
          onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
          required={formData.type === 'EXPENSE'}
          accept="image/*,.pdf"
        />
      </div>

      <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded">
        {loading ? 'Creating...' : 'Create Transaction'}
      </button>
    </form>
  );
}
```

## 5. Contribution Management (Treasurer)

```typescript
// src/components/ContributionForm.tsx
import { useEffect, useState } from 'react';
import { apiService, User, getErrorMessage } from '@/utils/api';
import { toast } from 'sonner';

interface ContributionFormProps {
  onSuccess: () => void;
}

export function ContributionForm({ onSuccess }: ContributionFormProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    userId: '',
    month: new Date().toISOString().substring(0, 7), // YYYY-MM
    amount: '25',
    eventId: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const response = await apiService.admin.getAllUsers(0, 100);
      setUsers(response.data.content);
    } catch (error) {
      console.error(getErrorMessage(error));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    try {
      await apiService.treasurer.createContribution({
        userId: formData.userId,
        month: formData.month,
        amount: parseFloat(formData.amount),
        eventId: formData.eventId || undefined,
      });

      toast.success('Contribution created');
      onSuccess();
    } catch (error) {
      const message = getErrorMessage(error);
      if (message.includes('previous months')) {
        toast.error('User must pay all previous months first');
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1">User</label>
        <select
          value={formData.userId}
          onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
          required
        >
          <option value="">Select user...</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.fullName} ({user.username})
            </option>
          ))}
        </select>
      </div>

      <input
        type="month"
        value={formData.month}
        onChange={(e) => setFormData({ ...formData, month: e.target.value })}
        required
      />

      <input
        type="number"
        placeholder="Amount"
        value={formData.amount}
        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
        required
      />

      <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded">
        {loading ? 'Creating...' : 'Create Contribution'}
      </button>
    </form>
  );
}
```

## 6. Mark Contribution as Paid

```typescript
// src/components/PayContributionButton.tsx
import { useState } from 'react';
import { apiService, getErrorMessage } from '@/utils/api';
import { toast } from 'sonner';

interface PayContributionButtonProps {
  contributionId: string;
  onSuccess: () => void;
}

export function PayContributionButton({ contributionId, onSuccess }: PayContributionButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);

    try {
      // This creates a linked INCOME transaction automatically
      await apiService.treasurer.payContribution(contributionId);
      toast.success('Contribution marked as paid');
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      className="bg-green-600 text-white px-3 py-1 rounded text-sm"
    >
      {loading ? 'Marking...' : 'Mark Paid'}
    </button>
  );
}
```

## 7. View Receipt/Proof

```typescript
// src/components/ReceiptViewer.tsx
import { useState } from 'react';
import { apiService } from '@/utils/api';

interface ReceiptViewerProps {
  transactionId: string;
}

export function ReceiptViewer({ transactionId }: ReceiptViewerProps) {
  const [showModal, setShowModal] = useState(false);

  const receiptUrl = apiService.files.getReceiptUrl(transactionId);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-blue-600 text-sm underline"
      >
        View Receipt
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded max-w-4xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Receipt</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-600 hover:text-black"
              >
                ✕
              </button>
            </div>

            {/* Display receipt image or PDF viewer */}
            {receiptUrl.endsWith('.pdf') ? (
              <iframe src={receiptUrl} className="w-full h-96" />
            ) : (
              <img src={receiptUrl} alt="Receipt" className="max-w-full h-auto" />
            )}

            <a href={receiptUrl} download className="text-blue-600 underline mt-4 block">
              Download Receipt
            </a>
          </div>
        </div>
      )}
    </>
  );
}
```

## 8. Report Download (Treasurer)

```typescript
// src/components/ReportDownloader.tsx
import { useState } from 'react';
import { apiService, downloadPDF, openPDFInTab, getErrorMessage } from '@/utils/api';
import { toast } from 'sonner';

interface ReportDownloaderProps {
  eventId: string;
  eventName: string;
}

export function ReportDownloader({ eventId, eventName }: ReportDownloaderProps) {
  const [loading, setLoading] = useState(false);

  async function downloadReport() {
    setLoading(true);

    try {
      const blob = await apiService.treasurer.getEventReport(eventId);
      downloadPDF(blob, `${eventName}_report.pdf`);
      toast.success('Report downloaded');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function viewReport() {
    setLoading(true);

    try {
      const blob = await apiService.treasurer.getEventReport(eventId);
      openPDFInTab(blob);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={viewReport}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? 'Loading...' : 'View Report'}
      </button>
      <button
        onClick={downloadReport}
        disabled={loading}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Download PDF
      </button>
    </div>
  );
}
```

## 9. User Management (Super Admin)

```typescript
// src/pages/UserManagement.tsx
import { useEffect, useState } from 'react';
import { apiService, User, getErrorMessage } from '@/utils/api';
import { toast } from 'sonner';

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const response = await apiService.admin.getAllUsers(0, 100);
      setUsers(response.data.content);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function createUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      await apiService.admin.createUser({
        username: formData.get('username') as string,
        email: formData.get('email') as string,
        fullName: formData.get('fullName') as string,
        password: formData.get('password') as string,
        role: (formData.get('role') as any) || 'USER',
      });

      toast.success('User created');
      setShowCreateModal(false);
      fetchUsers();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm('Delete this user?')) return;

    try {
      await apiService.admin.deleteUser(userId);
      toast.success('User deleted');
      fetchUsers();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function resetPassword(userId: string) {
    const newPassword = prompt('Enter new temporary password:');
    if (!newPassword) return;

    try {
      await apiService.admin.resetUserPassword(userId, newPassword);
      toast.success('Password reset. User will be forced to change on next login.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  if (loading) return <div>Loading users...</div>;

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowCreateModal(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Create User
      </button>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border">
              <th className="p-2 text-left">Username</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Full Name</th>
              <th className="p-2 text-left">Role</th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border">
                <td className="p-2">{user.username}</td>
                <td className="p-2">{user.email}</td>
                <td className="p-2">{user.fullName}</td>
                <td className="p-2">
                  <span className="px-2 py-1 rounded text-sm bg-gray-200">
                    {user.role}
                  </span>
                </td>
                <td className="p-2 text-center space-x-2">
                  <button
                    onClick={() => resetPassword(user.id)}
                    className="text-orange-600 text-sm"
                  >
                    Reset Password
                  </button>
                  <button
                    onClick={() => deleteUser(user.id)}
                    className="text-red-600 text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <form onSubmit={createUser} className="bg-white p-6 rounded max-w-md w-full space-y-4">
            <h2 className="text-xl font-bold">Create User</h2>
            <input name="username" placeholder="Username" required className="w-full border p-2 rounded" />
            <input name="email" type="email" placeholder="Email" required className="w-full border p-2 rounded" />
            <input name="fullName" placeholder="Full Name" required className="w-full border p-2 rounded" />
            <input name="password" type="password" placeholder="Password" required className="w-full border p-2 rounded" />
            <select name="role" className="w-full border p-2 rounded">
              <option value="USER">User</option>
              <option value="TREASURER">Treasurer</option>
            </select>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-blue-600 text-white p-2 rounded">
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-gray-300 p-2 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
```

## 10. Broadcast Email (Treasurer/Admin/Temp Treasurer)

```typescript
// src/components/BroadcastEmailForm.tsx
import { useState } from 'react';
import { apiService, getErrorMessage } from '@/utils/api';
import { toast } from 'sonner';

export function BroadcastEmailForm() {
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSend() {
    setLoading(true);

    try {
      await apiService.treasurer.sendBroadcastEmail(formData.subject, formData.message);
      toast.success('Broadcast email sent to all active members');
      setFormData({ subject: '', message: '' });
      setShowConfirm(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <input
        type="text"
        placeholder="Email Subject"
        value={formData.subject}
        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
        className="w-full border p-2 rounded"
      />

      <textarea
        placeholder="Email Message (HTML supported)"
        value={formData.message}
        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        rows={10}
        className="w-full border p-2 rounded font-mono"
      />

      <button
        onClick={() => setShowConfirm(true)}
        disabled={!formData.subject || !formData.message}
        className="w-full bg-blue-600 text-white p-2 rounded"
      >
        Send Broadcast Email
      </button>

      {showConfirm && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded space-y-4">
          <p className="font-bold">⚠️ Confirm Broadcast Email</p>
          <p className="text-sm">This email will be sent to ALL active members. This cannot be undone.</p>
          <div className="flex gap-2">
            <button
              onClick={handleSend}
              disabled={loading}
              className="flex-1 bg-red-600 text-white p-2 rounded"
            >
              {loading ? 'Sending...' : 'Yes, Send'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 bg-gray-300 p-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Authentication Context Setup

```typescript
// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { User, apiService, UserRole } from '@/utils/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage on mount
    const storedToken = localStorage.getItem('ts_token');
    const storedUser = localStorage.getItem('ts_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    setLoading(false);
  }, []);

  async function login(username: string, password: string) {
    const response = await apiService.auth.login(username, password);
    const { token: newToken, user: newUser } = response.data;

    localStorage.setItem('ts_token', newToken);
    localStorage.setItem('ts_user', JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem('ts_token');
    localStorage.removeItem('ts_user');
    setToken(null);
    setUser(null);
  }

  function hasRole(roles: UserRole[]): boolean {
    if (!user) return false;
    return roles.includes(user.role);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

## Protected Route Component

```typescript
// src/components/ProtectedRoute.tsx
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { UserRole } from '@/utils/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, token, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !token) {
      navigate('/login');
    } else if (!loading && allowedRoles && user && !allowedRoles.includes(user.role)) {
      navigate('/unauthorized');
    }
  }, [loading, token, user, allowedRoles, navigate]);

  if (loading) return <div>Loading...</div>;
  if (!token) return null;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) return null;

  return <>{children}</>;
}
```

