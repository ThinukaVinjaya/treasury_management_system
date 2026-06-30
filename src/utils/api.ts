import axios from 'axios';
import { toast } from 'sonner';

export const getCurrentUserRole = () => {
  try {
    const userStr = localStorage.getItem('ts_user');
    if (!userStr) return null;
    const parsed = JSON.parse(userStr);
    return parsed?.role || null;
  } catch {
    return null;
  }
};

export const getCurrentUserId = () => {
  try {
    const userStr = localStorage.getItem('ts_user');
    if (!userStr) return null;
    const parsed = JSON.parse(userStr);
    return parsed?.id || null;
  } catch {
    return null;
  }
};

// ==========================================
// DEMO MODE HELPER EXPORTS
// ==========================================

export const isMockMode = (): boolean => false;

export const setMockMode = (_val: boolean) => {
  localStorage.removeItem('ts_mock_mode');
  window.dispatchEvent(new Event('mock_mode_changed'));
};

// ==========================================
// BASE CONFIGURATION
// ==========================================

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://ec2-13-60-247-126.eu-north-1.compute.amazonaws.com:10000/api';
const REPORT_DOWNLOAD_TIMEOUT_MS = 300000;

const getBaseURL = () => {
  return import.meta.env.VITE_API_BASE_URL || '/api';
};

export const getAbsoluteUrl = (path: string) => {
  if (!path) return DEFAULT_API_BASE_URL;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const normalizedPath = path.startsWith('/api/') ? path.replace(/^\/api/, '') : path;
  const normalizedBasePath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
  return `${getBaseURL()}${normalizedBasePath}`;
};

// ==========================================
// API INSTANCE
// ==========================================

export const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 second timeout for cold starts
});

const normalizeId = (value: string | number | undefined | null) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') return value;
  const trimmed = String(value).trim();
  if (/^-?\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
};

const getStoredArray = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveStoredArray = <T>(key: string, value: T[]) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const getStoredDeletedUserIds = (): string[] => {
  try {
    const raw = localStorage.getItem('ts_deleted_user_ids');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const isSoftDeletedUser = (user: any): boolean => {
  if (!user || typeof user !== 'object') return true;

  const deletedUserIds = getStoredDeletedUserIds();
  if (deletedUserIds.includes(String(user.id ?? ''))) {
    return true;
  }

  const deletedFlags = [
    user.deleted,
    user.isDeleted,
    user.is_deleted,
    user.isDelete,
    user.deletedAt,
    user.deleted_at,
  ];

  const hasDeletedFlag = deletedFlags.some((value) => value === true || value === 'true' || value === 1 || value === '1');
  if (hasDeletedFlag) return true;
  if (user?.isActive === false || user?.active === false || user?.status === 'INACTIVE' || user?.status === 'DELETED') return true;

  return false;
};

const normalizeUserList = (payload: any): any[] => {
  const rawList = Array.isArray(payload)
    ? payload
    : payload?.content || payload?.data || payload?.items || [];

  return rawList.filter((user: any) => !isSoftDeletedUser(user));
};

const isSoftDeletedEvent = (event: any): boolean => {
  if (!event || typeof event !== 'object') return true;

  const deletedFlags = [
    event.deleted,
    event.isDeleted,
    event.is_deleted,
    event.isDelete,
    event.deletedAt,
    event.deleted_at,
  ];

  const hasDeletedFlag = deletedFlags.some((value) => value === true || value === 'true' || value === 1 || value === '1');
  if (hasDeletedFlag) return true;
  if (event.status === 'DELETED') return true;

  return false;
};

const normalizeEventList = (payload: any): any[] => {
  const rawList = Array.isArray(payload)
    ? payload
    : payload?.content || payload?.data || payload?.items || [];

  return rawList.filter((event: any) => !isSoftDeletedEvent(event));
};

const markLocalFallback = () => {
  try {
    localStorage.setItem('ts_force_local_fallback', 'true');
  } catch {
    // ignore storage failures
  }
};

const hasAuthToken = () => Boolean(localStorage.getItem('ts_token'));

const shouldUseLocalFallbackForTreasurerRoute = (url: string) => {
  const normalizedUrl = url || '';
  const isKnownRoute = normalizedUrl.includes('/treasurer/transactions') || normalizedUrl.includes('/treasurer/contributions');
  if (!isKnownRoute) return false;

  const forced = localStorage.getItem('ts_force_local_fallback');
  return forced === 'true' || !hasAuthToken();
};

const notifyLocalFallback = (reason: string) => {
  toast.warning(`Saved locally because the backend rejected the request (${reason}).`);
};

const createLocalTransactionRecord = (payload: any) => ({
  id: `local-tx-${Date.now()}`,
  title: payload.title || payload.description || 'Local Transaction',
  amount: Number(payload.amount || 0),
  type: payload.type || 'INCOME',
  category: payload.category || 'CONTRIBUTION',
  description: payload.description || 'Saved locally because the backend endpoint is unavailable.',
  eventId: payload.eventId || null,
  date: payload.date || new Date().toISOString().split('T')[0],
  createdAt: new Date().toISOString(),
  __localOnly: true,
});

const createLocalContributionRecord = (payload: any) => ({
  id: `local-contrib-${Date.now()}`,
  userId: payload.userId,
  month: payload.month,
  amount: Number(payload.amount || 0),
  title: payload.title || 'Contribution',
  dueDate: payload.dueDate || payload.month ? `${payload.month}-01` : undefined,
  eventId: payload.eventId || null,
  isPaid: true,
  status: 'PAID',
  createdAt: new Date().toISOString(),
  __localOnly: true,
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ts_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.url?.startsWith('/api/')) {
      config.url = config.url.replace(/^\/api/, '');
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Authentication Errors & Unpack Response Wrappers
api.interceptors.response.use(
  (response) => {
    // Unpack Spring Boot ApiResponse envelope {success, message, data}
    if (response.data && typeof response.data === 'object') {
      const resObj = response.data as any;
      if (resObj.success !== undefined && resObj.data !== undefined) {
        return {
          ...response,
          data: resObj.data,
        };
      }
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ts_token');
      localStorage.removeItem('ts_user');
      if (!window.location.pathname.includes('/login')) {
        toast.error('Session expired. Please log in again.');
        window.location.href = '/login';
      }
    }

    // Handle error messages from backend
    if (error.response?.data?.message) {
      // Don't toast here - let the calling code decide what to do
    }

    return Promise.reject(error);
  }
);

// ==========================================
// TYPES & INTERFACES
// ==========================================

export type UserRole = 'SUPER_ADMIN' | 'TREASURER' | 'USER';

export interface User {
  id: string | number;
  username: string;
  email: string;
  role: UserRole;
  fullName: string;
  isFirstLogin?: boolean;
  isActive?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
  mustChangePassword?: boolean;
}

export interface Event {
  id: string | number;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  treasurerId?: string;
  temporaryTreasurerId?: string;
  temporaryTreasurer?: User | null;
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  budget: number;
  balance: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Transaction {
  id: string | number;
  title: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description?: string;
  fileUrl?: string;
  publicId?: string;
  originalFileName?: string;
  contentType?: string;
  eventId?: string | number | null;
  uploadedBy?: string;
  recordedBy?: User;
  date?: string;
  proofUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Contribution {
  id: string | number;
  userId: string | number;
  user: User;
  month: string; // YYYY-MM
  amount: number;
  isPaid: boolean;
  eventId?: string | number | null;
  transactionId?: string;
  title: string;
  dueDate?: string;
  status?: string;
  payDate?: string;
  paymentProofUrl?: string;
  eventName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardStats {
  // Required fields used by the UI:
  totalMainFundBalance: number;
  totalEventFundsBalance: number;
  totalContributionsCollected: number;
  collectionRate: number;
  pendingContributionsCount: number;
  monthlyOverview: Array<{ month: string; income: number; expense: number }>;
  recentTransactions: Transaction[];
  upcomingContributions: Contribution[];

  // Optional fields returned by backend but not used directly by UI:
  mainFundBalance?: number;
  totalIncome?: number;
  totalExpense?: number;
  totalEvents?: number;
  totalUsers?: number;
  monthlyTrend?: Array<{ month: string; income: number; expense: number }>;
  expenseByCategory?: Array<{ category: string; amount: number }>;
}

export interface EventSummary {
  totalBalance?: number;
  totalIncome?: number;
  totalExpense?: number;
  totalContributions?: number;
  totalBudget?: number;
  collectedAmount?: number;
  spentAmount?: number;
  remainingAmount?: number;
  paidContributionsCount?: number;
  pendingContributionsCount?: number;
}

export interface AuditLog {
  id: string | number;
  action: string;
  entityType: string;
  entityId?: string;
  performedBy?: string;
  details?: string;
  timestamp?: string;
}

export interface PagedResponse<T> {
  content: T[];
  pageable: any;
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

// ==========================================
// API SERVICE - Complete Implementation
// ==========================================

export const apiService = {
  // ==========================================
  // AUTH ENDPOINTS
  // ==========================================
  auth: {
    /**
     * POST /api/auth/login
     * Login with username/email and password
     * Returns JWT token
     */
    login: async (
      usernameOrPayload: string | { username?: string; email?: string; password?: string },
      password?: string
    ) => {
      if (typeof usernameOrPayload === 'object') {
        const u = usernameOrPayload.username || usernameOrPayload.email || '';
        const p = usernameOrPayload.password || '';
        return api.post('/api/auth/login', { username: u, password: p });
      }
      return api.post('/api/auth/login', { username: usernameOrPayload, password });
    },

    /**
     * POST /api/auth/change-password
     * Change password (required after first login)
     */
    changePassword: async (
      usernameOrPayload: string | { username?: string; oldPassword?: string; newPassword?: string },
      oldPassword?: string,
      newPassword?: string
    ) => {
      if (typeof usernameOrPayload === 'object') {
        const u = usernameOrPayload.username || '';
        const op = usernameOrPayload.oldPassword || '';
        const np = usernameOrPayload.newPassword || '';
        return api.post('/api/auth/change-password', {
          username: u,
          oldPassword: op,
          newPassword: np,
        });
      }
      return api.post('/api/auth/change-password', {
        username: usernameOrPayload,
        oldPassword,
        newPassword,
      });
    },

    /**
     * POST /api/auth/forgot-password/request-otp
     * Request OTP for password reset
     */
    forgotPasswordRequestOtp: async (username: string) => {
      return api.post('/api/auth/forgot-password/request-otp', { username });
    },

    /**
     * POST /api/auth/forgot-password/reset
     * Reset password using OTP
     */
    forgotPasswordReset: async (
      usernameOrPayload: string | { username?: string; otp?: string; newPassword?: string },
      otp?: string,
      newPassword?: string
    ) => {
      if (typeof usernameOrPayload === 'object') {
        const u = usernameOrPayload.username || '';
        const o = usernameOrPayload.otp || '';
        const np = usernameOrPayload.newPassword || '';
        return api.post('/api/auth/forgot-password/reset', {
          username: u,
          otp: o,
          newPassword: np,
        });
      }
      return api.post('/api/auth/forgot-password/reset', {
        username: usernameOrPayload,
        otp,
        newPassword,
      });
    },
  },

  // ==========================================
  // USER ENDPOINTS (Authenticated Users)
  // ==========================================
  user: {
    /**
     * GET /api/user/me
     * Get current logged-in user profile
     */
    getMe: async () => {
      return api.get('/api/user/me');
    },

    /**
     * GET /api/user/dashboard
     * Get main fund dashboard summary
     */
    getDashboard: async () => {
      return api.get('/api/user/dashboard');
    },

    /**
     * GET /api/user/transactions/main?page=0&size=10
     * Get Main Fund transactions for current user
     */
    getMainFundTransactions: async (page = 0, size = 10) => {
      return api.get('/api/user/transactions/main', {
        params: { page, size },
      });
    },

    /**
     * GET /api/user/transactions/event/{eventId}?page=0&size=10
     * Get transactions for a specific event
     */
    getEventTransactions: async (eventId: string, page = 0, size = 10) => {
      return api.get(`/api/user/transactions/event/${eventId}`, {
        params: { page, size },
      });
    },

    /**
     * GET /api/user/my-transactions?page=0&size=10
     * Get transactions uploaded by current user only
     */
    getMyTransactions: async (page = 0, size = 10) => {
      return api.get('/api/user/my-transactions', {
        params: { page, size },
      });
    },

    /**
     * GET /api/user/events?page=0&size=10
     * Get all events
     */
    getEvents: async (page = 0, size = 10) => {
      return api.get('/api/user/events', {
        params: { page, size },
      });
    },

    /**
     * GET /api/user/contributions?page=0&size=10
     * Get current user's contributions
     */
    getContributions: async (page = 0, size = 10) => {
      return api.get('/api/user/contributions', {
        params: { page, size },
      });
    },

    /**
     * GET /api/user/events/{eventId}/contributions?page=0&size=10
     * Get current user's contributions for a specific event
     */
    getEventContributions: async (eventId: string, page = 0, size = 10) => {
      return api.get(`/api/user/events/${eventId}/contributions`, {
        params: { page, size },
      });
    },

    /**
     * GET /api/user/events?page=0&size=10
     * Get event summary for regular users by fetching all events and finding the specific one
     */
    getEventSummary: async (eventId: string) => {
      try {
        // Fetch all events and find the matching event by ID
        const res = await api.get('/api/user/events', {
          params: { page: 0, size: 100 }, // Fetch more events to ensure we find the target
        });
        
        const events = res.data.content || [];
        const event = events.find((e: any) => String(e.id) === String(eventId));
        
        if (!event) {
          throw new Error(`Event with ID ${eventId} not found`);
        }
        
        // Transform event data to EventSummary format
        return {
          data: {
            totalBalance: event.totalBalance || 0,
            totalIncome: event.totalIncome || 0,
            totalExpense: event.totalExpense || 0,
            totalContributions: event.totalContributions || 0,
            totalBudget: event.totalBudget,
            collectedAmount: event.totalIncome || 0,
            spentAmount: event.totalExpense || 0,
            remainingAmount: (event.totalBalance || 0),
          },
          status: 200,
        };
      } catch (error: any) {
        throw error;
      }
    },
  },

  // ==========================================
  // ADMIN ENDPOINTS (SUPER_ADMIN only)
  // ==========================================
  admin: {
    /**
     * POST /api/admin/users
     * Create new user (TREASURER or USER)
     */
    createUser: async (payload: {
      username: string;
      email: string;
      fullName: string;
      password: string;
      role: 'TREASURER' | 'USER';
    }) => {
      return api.post('/api/admin/users', payload);
    },

    /**
     * GET /api/admin/users?page=0&size=10
     * Get all users
     */
    getAllUsers: async (page = 0, size = 10) => {
      return api.get('/api/admin/users', {
        params: { page, size },
      });
    },

    /**
     * GET /api/admin/users/{id}
     * Get single user by ID
     */
    getUser: async (userId: string) => {
      return api.get(`/api/admin/users/${userId}`);
    },

    /**
     * DELETE /api/admin/users/{id}
     * Delete user (soft delete)
     */
    deleteUser: async (userId: string) => {
      return api.delete(`/api/admin/users/${userId}`);
    },

    /**
     * POST /api/admin/users/{id}/reset-password
     * Reset user password (forces password change on next login)
     */
    resetUserPassword: async (userId: string, newPassword: string) => {
      return api.post(`/api/admin/users/${userId}/reset-password`, { 
        newPassword,
        password: newPassword 
      });
    },

    /**
     * GET /api/admin/audit
     * Get audit logs (50 most recent)
     */
    getAuditLogs: async () => {
      return api.get('/api/admin/audit');
    },
  },

  // ==========================================
  // TREASURER ENDPOINTS
  // ==========================================
  treasurer: {
    // --- EVENTS ---

    /**
     * POST /api/treasurer/events
     * Create new event
     */
    createEvent: async (payload: {
      name: string;
      description?: string;
      startDate: string;
      endDate?: string;
      treasurerId?: string;
    }) => {
      return api.post('/api/treasurer/events', payload);
    },

    /**
     * GET /api/treasurer/events?page=0&size=10
     * Get all events
     */
    getEvents: async (page = 0, size = 10) => {
      return api.get('/api/treasurer/events', {
        params: { page, size },
      });
    },

    /**
     * DELETE /api/treasurer/events/{eventId}
     * Delete event (soft delete + cascades to transactions)
     */
    deleteEvent: async (eventId: string) => {
      return api.delete(`/api/treasurer/events/${eventId}`);
    },

    /**
     * PUT /api/treasurer/events/{eventId}/temporary-treasurer?username=jane_doe
     * or PUT /api/treasurer/events/{eventId}/temporary-treasurer?userId=123
     * Assign temporary treasurer to event (accepts username or userId)
     */
    assignTemporaryTreasurer: async (eventId: string, identifier: string | null) => {
      const id = (identifier || '')?.toString();
      if (!id) {
        // clear/unassign temporary treasurer — call endpoint without query params
        return api.put(`/api/treasurer/events/${eventId}/temporary-treasurer`);
      }
      const isLikelyId = /^[0-9]+$/.test(id) || /^[0-9a-fA-F-]{8,}$/.test(id);
      const params = isLikelyId ? { userId: id } : { username: id };
      return api.put(`/api/treasurer/events/${eventId}/temporary-treasurer`, {}, { params });
    },

    /**
     * GET /api/treasurer/events/{eventId}/summary
     * Get event full summary with transactions and contributions
     */
    getEventSummary: async (eventId: string) => {
      return api.get(`/api/treasurer/events/${eventId}/summary`);
    },

    /**
     * GET /api/treasurer/events/{eventId}/report
     * Get event PDF report (opens in browser)
     */
    getEventReport: async (eventId: string) => {
      return api.get(`/api/treasurer/events/${eventId}/report`, {
        responseType: 'blob',
        timeout: 300000,
        withCredentials: true,
      });
    },

    /**
     * GET /api/treasurer/events/{eventId}/contribution-report
     * Get event contribution PDF report
     */
    getEventContributionReport: async (eventId: string) => {
      return api.get(`/api/treasurer/events/${eventId}/contribution-report`, {
        responseType: 'blob',
        timeout: 300000,
        withCredentials: true,
      });
    },

    // --- TRANSACTIONS ---

    /**
     * POST /api/treasurer/transactions
     * Create transaction (multipart/form-data with file)
     * File required for EXPENSE, optional for INCOME
     */
    createTransaction: async (payload: {
      title: string;
      amount: number;
      type: 'INCOME' | 'EXPENSE';
      category: string;
      description?: string;
      eventId?: string;
      file?: File;
    }) => {
      if (shouldUseLocalFallbackForTreasurerRoute('/api/treasurer/transactions')) {
        markLocalFallback();
        const localRecord = createLocalTransactionRecord(payload);
        const existing = getStoredArray<any>('ts_local_transactions');
        saveStoredArray('ts_local_transactions', [localRecord, ...existing]);
        try { window.dispatchEvent(new Event('ts_local_transactions_updated')); } catch {}
        notifyLocalFallback('no-auth-token');
        return { data: localRecord };
      }

      const formData = new FormData();
      formData.append('title', payload.title);
      formData.append('amount', String(payload.amount));
      formData.append('type', payload.type);
      formData.append('category', payload.category);
      if (payload.description) formData.append('description', payload.description);
      if (payload.eventId) formData.append('eventId', payload.eventId);
      if (payload.file) formData.append('file', payload.file);

      try {
        return await api.post('/api/treasurer/transactions', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404 || status === 500 || status === 403 || status === 401) {
          const localRecord = createLocalTransactionRecord(payload);
          const existing = getStoredArray<any>('ts_local_transactions');
          saveStoredArray('ts_local_transactions', [localRecord, ...existing]);
          try { window.dispatchEvent(new Event('ts_local_transactions_updated')); } catch {}
          notifyLocalFallback(`status-${status}`);
          return { data: localRecord };
        }
        throw err;
      }
    },

    /**
     * GET /api/treasurer/transactions/main?page=0&size=10
     * Get Main Fund transactions
     */
    getMainFundTransactions: async (page = 0, size = 10) => {
      if (shouldUseLocalFallbackForTreasurerRoute('/api/treasurer/transactions/main')) {
        markLocalFallback();
        const localRecords = getStoredArray<any>('ts_local_transactions').filter((tx) => !tx.eventId);
        return { data: localRecords.slice(0, size) };
      }

      try {
        const res = await api.get('/api/treasurer/transactions/main', {
          params: { page, size },
        });
        return res;
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404 || status === 500 || status === 403) {
          const localRecords = getStoredArray<any>('ts_local_transactions').filter((tx) => !tx.eventId);
          return { data: localRecords.slice(0, size) };
        }
        throw err;
      }
    },

    /**
     * GET /api/treasurer/transactions/event/{eventId}?page=0&size=10
     * Get transactions for specific event
     */
    getEventTransactions: async (eventId: string, page = 0, size = 10) => {
      if (shouldUseLocalFallbackForTreasurerRoute(`/api/treasurer/transactions/event/${eventId}`)) {
        markLocalFallback();
        const localRecords = getStoredArray<any>('ts_local_transactions').filter((tx) => String(tx.eventId) === String(eventId));
        return { data: localRecords.slice(0, size) };
      }

      try {
        const res = await api.get(`/api/treasurer/transactions/event/${eventId}`, {
          params: { page, size },
        });
        return res;
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404 || status === 500 || status === 403) {
          const localRecords = getStoredArray<any>('ts_local_transactions').filter((tx) => String(tx.eventId) === String(eventId));
          return { data: localRecords.slice(0, size) };
        }
        throw err;
      }
    },

    /**
     * DELETE /api/treasurer/transactions/{id}
     * Delete transaction (soft delete)
     */
    deleteTransaction: async (transactionId: string) => {
      return api.delete(`/api/treasurer/transactions/${transactionId}`);
    },

    // --- CONTRIBUTIONS ---

    /**
     * POST /api/treasurer/contributions
     * Create contribution for a user
     * Main Fund only: enforces sequential payment
     * Event contributions: no restrictions
     */
    createContribution: async (payload: {
      userId: string;
      month: string; // YYYY-MM format
      amount: number;
      eventId?: string; // omit for Main Fund
      title?: string;
      dueDate?: string;
    }) => {
      if (shouldUseLocalFallbackForTreasurerRoute('/api/treasurer/contributions')) {
        markLocalFallback();
        const localContribution = createLocalContributionRecord({
          userId: normalizeId(payload.userId),
          month: payload.month,
          amount: payload.amount,
          title: payload.title,
          dueDate: payload.dueDate,
          eventId: payload.eventId !== undefined ? normalizeId(payload.eventId) : undefined,
        });
        const existingContributions = getStoredArray<any>('ts_local_contributions');
        saveStoredArray('ts_local_contributions', [localContribution, ...existingContributions]);
        notifyLocalFallback('no-auth-token');
        return {
          data: {
            id: localContribution.id,
            __createdAsTransaction: true,
            __localOnly: true,
          },
        };
      }

      const normalizedUserId = normalizeId(payload.userId);
      const normalizedEventId = payload.eventId !== undefined ? normalizeId(payload.eventId) : undefined;
      const requestPayload: any = {
        userId: normalizedUserId,
        month: payload.month,
        amount: payload.amount,
      };

      if (payload.title) requestPayload.title = payload.title;
      if (payload.dueDate) requestPayload.dueDate = payload.dueDate;
      if (normalizedEventId !== undefined) requestPayload.eventId = normalizedEventId;

      try {
        return await api.post('/api/treasurer/contributions', requestPayload);
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404 || status === 500 || status === 403 || status === 401) {
          const localContribution = createLocalContributionRecord(requestPayload);
          const existingContributions = getStoredArray<any>('ts_local_contributions');
          saveStoredArray('ts_local_contributions', [localContribution, ...existingContributions]);

          try {
            const transactionResponse = await apiService.treasurer.createTransaction({
              title: payload.title || 'Contribution',
              amount: payload.amount,
              type: 'INCOME',
              category: 'CONTRIBUTION',
              description: payload.title || `Contribution for ${payload.month}`,
              eventId: normalizedEventId ? String(normalizedEventId) : undefined,
            });

            return {
              ...(transactionResponse || {}),
              data: {
                ...(transactionResponse?.data || {}),
                id: localContribution.id,
                __createdAsTransaction: true,
                __localOnly: true,
              },
            };
          } catch (txnErr: any) {
            notifyLocalFallback(`status-${txnErr?.response?.status || 'unknown'}`);
            return {
              data: {
                id: localContribution.id,
                __createdAsTransaction: true,
                __localOnly: true,
              },
            };
          }
        }
        throw err;
      }
    },

    /**
     * GET /api/treasurer/contributions/{id}
     * Get specific contribution
     */
    getContribution: async (contributionId: string) => {
      return api.get(`/api/treasurer/contributions/${contributionId}`);
    },

    /**
     * GET /api/treasurer/events/{eventId}/contributions?page=0&size=10
     * Get contributions for specific event
     */
    getEventContributions: async (eventId: string, page = 0, size = 10) => {
      if (shouldUseLocalFallbackForTreasurerRoute(`/api/treasurer/events/${eventId}/contributions`)) {
        markLocalFallback();
        const localRecords = getStoredArray<any>('ts_local_contributions').filter((c) => String(c.eventId) === String(eventId));
        return { data: localRecords.slice(0, size) };
      }

      try {
        const res = await api.get(`/api/treasurer/events/${eventId}/contributions`, {
          params: { page, size },
        });
        return res;
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404 || status === 500 || status === 403) {
          const localRecords = getStoredArray<any>('ts_local_contributions').filter((c) => String(c.eventId) === String(eventId));
          return { data: localRecords.slice(0, size) };
        }
        throw err;
      }
    },

    /**
     * PUT /api/treasurer/contributions/{id}/pay
     * Mark contribution as paid (creates linked INCOME transaction)
     */
    payContribution: async (contributionId: string, proofFile?: File) => {
      const url = `/api/treasurer/contributions/${contributionId}/pay`;
      const fallback = async () => {
        return apiService.treasurer.updateContribution(String(contributionId), { status: 'PAID' });
      };

      if (proofFile) {
        const formData = new FormData();
        formData.append('proof', proofFile);
        try {
          return await api.put(url, formData);
        } catch (err: any) {
          const status = err?.response?.status;
          if (status === 404) {
            return fallback();
          }
          throw err;
        }
      }

      try {
        return await api.put(url, undefined);
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404) {
          return fallback();
        }
        throw err;
      }
    },

    /**
     * PUT /api/treasurer/contributions/{id}
     * Update contribution (month, amount, eventId)
     */
    updateContribution: async (
      contributionId: string,
      payload: {
        month?: string;
        amount?: number;
        eventId?: string;
        status?: string;
      }
    ) => {
      return api.put(`/api/treasurer/contributions/${contributionId}`, payload);
    },

    /**
     * DELETE /api/treasurer/contributions/{id}
     * Delete contribution (soft delete)
     * If paid, also deletes linked transaction
     */
    deleteContribution: async (contributionId: string) => {
      return api.delete(`/api/treasurer/contributions/${contributionId}`);
    },

    /**
     * POST /api/treasurer/reminders/send
     * Send email reminders to unpaid members
     */
    sendContributionReminders: async () => {
      return api.post('/api/treasurer/reminders/send');
    },

    // --- CONTRIBUTION CONFIG ---

    /**
     * GET /api/treasurer/contribution-config/default
     * Get default monthly contribution amount
     */
    getDefaultContributionAmount: async () => {
      return api.get('/api/treasurer/contribution-config/default');
    },

    /**
     * PUT /api/treasurer/contribution-config/default?amount=250
     * Update default monthly contribution amount
     * WARNING: Stored in memory only - resets on backend restart
     */
    updateDefaultContributionAmount: async (amount: number) => {
      return api.put(
        '/api/treasurer/contribution-config/default',
        {},
        { params: { amount } }
      );
    },

    // --- REPORTS ---

    /**
     * GET /api/treasurer/reports/main-fund/monthly?monthYear=2026-06
     * Get monthly Main Fund report PDF
     */
    getMainFundMonthlyReport: async (monthYear: string) => {
      return api.get('/api/treasurer/reports/main-fund/monthly', {
        params: { monthYear },
        responseType: 'blob',
        timeout: REPORT_DOWNLOAD_TIMEOUT_MS,
        headers: { Accept: 'application/pdf,application/octet-stream' },
      });
    },

    /**
     * GET /api/treasurer/reports/contributions/period?startMonth=2026-06&endMonth=2026-12
     * Get contributions for a time period as a PDF.
     */
    getContributionsPeriodReport: async (startMonth: string, endMonth: string) => {
      return api.get('/api/treasurer/reports/contributions/period', {
        params: { startMonth, endMonth },
        responseType: 'blob',
        timeout: REPORT_DOWNLOAD_TIMEOUT_MS,
        headers: { Accept: 'application/pdf,application/octet-stream' },
      });
    },

    /**
     * GET /api/treasurer/reports/contributions/user/{userId}?startMonth=2026-06&endMonth=2026-12
     * Get single user's contributions for time period (JSON)
     */
    getUserContributionDetails: async (
      userId: string,
      startMonth: string,
      endMonth: string
    ) => {
      return api.get(`/api/treasurer/reports/contributions/user/${userId}`, {
        params: { startMonth, endMonth },
      });
    },

    /**
     * GET /api/treasurer/reports/contributions/user?userId=&page=0&size=10
     * Get all users' contributions (filtered by user ID if provided)
     */
    getUserContributions: async (userId?: string, page = 0, size = 10) => {
      const params: any = { page, size };
      if (userId) params.userId = userId;
      return api.get('/api/user/contributions', {
        params,
      });
    },

    // --- EMAILS ---

    /**
     * POST /api/treasurer/email/test?to=someone@example.com
     * Send test email
     */
    sendTestEmail: async (to: string) => {
      return api.post('/api/treasurer/email/test', {}, { params: { to } });
    },

    /**
     * POST /api/treasurer/email/broadcast?subject=...&message=...
     * Send broadcast email to all active users
     * No dry-run endpoint - build confirmation modal before calling
     */
    sendBroadcastEmail: async (subject: string, message: string) => {
      return api.post(
        '/api/treasurer/email/broadcast',
        {},
        { params: { subject, message } }
      );
    },
  },

  // ==========================================
  // FILE ENDPOINTS
  // ==========================================
  files: {
    /**
     * GET /api/files/{transactionId}
     * Get receipt file (public endpoint, 302 redirect to Cloudinary)
     * No auth needed for this endpoint
     */
    getReceiptUrl: (transactionId: string) => {
      return getAbsoluteUrl(`/api/files/${transactionId}`);
    },

    /**
     * Fetch receipt file as blob
     */
    getReceiptFile: async (transactionId: string) => {
      return api.get(`/api/files/${transactionId}`, { responseType: 'blob' });
    },
  },

  // ==========================================
  // DASHBOARD ENDPOINTS
  // ==========================================
  dashboard: {
    /**
     * GET /api/dashboard
     * Get main fund dashboard statistics
     */
    getStats: async () => {
      return api.get('/api/dashboard');
    },
  },

  // ==========================================
  // UNIFIED RESOURCE NAMESPACES
  // ==========================================
  users: {
    getAll: async () => {
      try {
        const userStr = localStorage.getItem('ts_user');
        const currentRole = userStr ? JSON.parse(userStr)?.role : null;
        if (currentRole !== 'SUPER_ADMIN') {
          return { data: [] };
        }

        const res = await apiService.admin.getAllUsers(0, 1000);
        const payload = res?.data;
        const list = normalizeUserList(payload);
        return {
          ...res,
          data: list,
        };
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 403 || status === 404 || status === 500) {
          return { data: [] };
        }
        throw err;
      }
    },
    create: async (payload: {
      username: string;
      fullName: string;
      email: string;
      role: UserRole;
      password?: string;
    }) => {
      return apiService.admin.createUser({
        ...payload,
        password: payload.password || payload.username,
      } as any);
    },
    resetPassword: async (userId: string | number, newPassword?: string) => {
      return apiService.admin.resetUserPassword(String(userId), newPassword || 'TempPassword123');
    },
    delete: async (userId: string | number) => {
      return apiService.admin.deleteUser(String(userId));
    },
  },

  events: {
    getAll: async () => {
      const role = getCurrentUserRole();
      const res = role === 'TREASURER' || role === 'SUPER_ADMIN'
        ? await apiService.treasurer.getEvents(0, 1000)
        : await apiService.user.getEvents(0, 1000);
      const payload = res.data;
      const list = normalizeEventList(payload);
      return {
        ...res,
        data: list,
      };
    },
    create: async (payload: { name: string; description?: string; budget: number }) => {
      const startDate = new Date().toISOString().split('T')[0];
      return apiService.treasurer.createEvent({
        name: payload.name,
        description: payload.description,
        startDate: startDate,
      });
    },
    delete: async (eventId: string | number) => {
      return apiService.treasurer.deleteEvent(String(eventId));
    },
    assignTemporaryTreasurer: async (eventId: string | number, identifier: string | null) => {
      return apiService.treasurer.assignTemporaryTreasurer(String(eventId), identifier ?? null);
    },
    getSummary: async (eventId: string | number) => {
      const role = getCurrentUserRole();
      if (role === 'TREASURER' || role === 'SUPER_ADMIN') {
        return apiService.treasurer.getEventSummary(String(eventId));
      }
      // regular users get a user-scoped summary endpoint
      return apiService.user.getEventSummary(String(eventId));
    },
    downloadReport: async (eventId: string | number, reportType: 'summary' | 'contribution') => {
      let res;
      if (reportType === 'summary') {
        res = await apiService.treasurer.getEventReport(String(eventId));
      } else {
        res = await apiService.treasurer.getEventContributionReport(String(eventId));
      }

      const blob = res.data;
      if (!blob || blob.size === 0) {
        throw new Error('The server returned an empty report.');
      }

      if (blob.size < 1000) {
        try {
          const text = await blob.text();
          const parsed = JSON.parse(text);
          if (parsed && parsed.success === false) {
            throw new Error(parsed.message || 'Failed to download report');
          }
        } catch (e: any) {
          if (e.message && !e.message.includes('Unexpected token')) {
            throw e;
          }
        }
      }

      const headerValue = res.headers?.['content-type'] || res.headers?.['Content-Type'] || '';
      const contentType = String(headerValue).toLowerCase();
      const preview = await blob.text();
      const looksLikePdf = contentType.includes('pdf') || preview.includes('%PDF') || contentType.includes('octet-stream');
      if (!looksLikePdf) {
        throw new Error('The server did not return a PDF report.');
      }

      const filename = reportType === 'summary' ? `event_${eventId}_summary.pdf` : `event_${eventId}_contributions.pdf`;
      downloadPDF(blob, filename);
      return res;
    },
  },

  transactions: {
    getMainFund: async () => {
      const res = await apiService.user.getMainFundTransactions(0, 1000);
      return {
        ...res,
        data: res.data.content || [],
      };
    },
    getEventTransactions: async (eventId: string | number) => {
      const role = getCurrentUserRole();
      const res = role === 'TREASURER' || role === 'SUPER_ADMIN'
        ? await apiService.treasurer.getEventTransactions(String(eventId), 0, 1000)
        : await apiService.user.getEventTransactions(String(eventId), 0, 1000);
      return {
        ...res,
        data: res.data.content || [],
      };
    },
    create: async (payload: {
      title?: string;
      amount: number;
      type: 'INCOME' | 'EXPENSE';
      category: string;
      description: string;
      date: string;
      eventId?: string | number | null;
      proof?: File | null;
    }) => {
      return apiService.treasurer.createTransaction({
        title: payload.title || payload.description || 'Transaction',
        amount: payload.amount,
        type: payload.type,
        category: payload.category,
        description: payload.description,
        eventId: payload.eventId ? String(payload.eventId) : undefined,
        file: payload.proof || undefined,
      });
    },
    delete: async (transactionId: string | number) => {
      return apiService.treasurer.deleteTransaction(String(transactionId));
    },
    viewReceipt: async (transactionId: string | number) => {
      return apiService.files.getReceiptUrl(String(transactionId));
    },
  },

  contributions: {
    getDefaultAmount: async () => {
      return apiService.treasurer.getDefaultContributionAmount();
    },
    updateDefaultAmount: async (amount: number) => {
      return apiService.treasurer.updateDefaultContributionAmount(amount);
    },
    getEventContributions: async (eventId: string | number) => {
      const role = getCurrentUserRole();
      const res = role === 'TREASURER' || role === 'SUPER_ADMIN'
        ? await apiService.treasurer.getEventContributions(String(eventId), 0, 1000)
        : await apiService.user.getEventContributions(String(eventId), 0, 1000);
      return {
        ...res,
        data: Array.isArray(res.data) ? res.data : res.data.content || [],
      };
    },
    create: async (
      payload: {
        title: string;
        amount: number;
        dueDate?: string;
        month: string;
        userId: string | number;
        eventId?: string | number | null;
      },
      options?: { confirmPayment?: boolean }
    ) => {
      const month = payload.month || payload.dueDate?.substring(0, 7) || '2026-06';
      const requestBody: any = {
        title: payload.title,
        userId: normalizeId(payload.userId),
        amount: payload.amount,
        month,
      };
      if (payload.dueDate) {
        requestBody.dueDate = payload.dueDate;
      }
      if (payload.eventId !== undefined) {
        requestBody.eventId = payload.eventId === null ? null : normalizeId(payload.eventId);
      }

      const response = await apiService.treasurer.createContribution(requestBody as any);
      const responsePayload = (response as any)?.data?.data ?? (response as any)?.data ?? response;
      const contributionId = responsePayload?.id;
      if (options?.confirmPayment !== false && contributionId) {
        await apiService.treasurer.payContribution(String(contributionId));
      }

      return response;
    },
    getUserContributions: async (userId?: string | number, page = 0, size = 1000) => {
      const token = localStorage.getItem('ts_token');
      let isPrivileged = false;
      if (token) {
        try {
          const userStr = localStorage.getItem('ts_user');
          if (userStr) {
            const parsedUser = JSON.parse(userStr);
            isPrivileged = parsedUser.role === 'TREASURER' || parsedUser.role === 'SUPER_ADMIN';
          }
        } catch (e) {
          console.error(e);
        }
      }
      
      let res;
      if (userId || isPrivileged) {
        res = await apiService.treasurer.getUserContributions(userId ? String(userId) : undefined, page, size);
      } else {
        res = await apiService.user.getContributions(page, size);
      }
      
      return {
        ...res,
        data: Array.isArray(res.data) ? res.data : res.data.content || [],
      };
    },
    payContribution: async (contributionId: string | number, proofFile?: File) => {
      return apiService.treasurer.payContribution(String(contributionId), proofFile);
    },
    update: async (contributionId: string | number, payload: any) => {
      return apiService.treasurer.updateContribution(String(contributionId), payload);
    },
    delete: async (contributionId: string | number) => {
      return apiService.treasurer.deleteContribution(String(contributionId));
    },
    sendReminders: async (eventId?: string | number) => {
      return api.post('/api/treasurer/reminders/send', {}, {
        params: eventId ? { eventId: String(eventId) } : {},
      });
    },
    sendBroadcastEmail: async (
      subject: string,
      message: string,
      isTestEmail?: boolean,
      eventId?: string | number
    ) => {
      if (isTestEmail) {
        let toEmail = 'admin@university.edu';
        try {
          const userStr = localStorage.getItem('ts_user');
          if (userStr) {
            const user = JSON.parse(userStr);
            if (user.email) toEmail = user.email;
          }
        } catch (e) {
          console.error(e);
        }
        return apiService.treasurer.sendTestEmail(toEmail);
      }
      
      const params: any = { subject, message };
      if (eventId) params.eventId = String(eventId);
      
      return api.post('/api/treasurer/email/broadcast', {}, { params });
    },
  },

  reports: {
    getMainFundMonthly: async (monthYear: string) => {
      return api.get('/api/treasurer/reports/main-fund/monthly', {
        params: { monthYear },
      });
    },
    getContributionsPeriod: async (startMonth: string, endMonth: string, userId?: string | number) => {
      return api.get('/api/treasurer/reports/contributions/period', {
        params: { startMonth, endMonth, userId: userId ? String(userId) : undefined },
      });
    },
    getUserContributionDetails: async (userId: string, startMonth: string, endMonth: string) => {
      return apiService.treasurer.getUserContributionDetails(userId, startMonth, endMonth);
    },
  },
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Download PDF report from blob
 */
export const downloadPDF = (blob: Blob, filename: string) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => window.URL.revokeObjectURL(url), 0);
};

/**
 * Open PDF report in new tab for viewing
 */
export const openPDFInTab = (blob: Blob) => {
  if (typeof window === 'undefined') return;

  const url = window.URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Check if error is a specific HTTP status
 */
export const isErrorStatus = (error: any, status: number): boolean => {
  return error.response?.status === status;
};

/**
 * Get human-readable error message from API response
 */
export const getErrorMessage = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

/**
 * Check if current role can perform action
 */
export const hasRole = (userRole: UserRole, allowedRoles: UserRole[]): boolean => {
  return allowedRoles.includes(userRole);
};

/**
 * Check if user is temporary treasurer for event
 * Note: Backend checks this internally on specific endpoints
 */
export const isTemporaryTreasurerForEvent = (
  user: User,
  event: Event
): boolean => {
  return event.temporaryTreasurerId === user.id && user.role === 'USER';
};
