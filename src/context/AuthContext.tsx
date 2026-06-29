import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService, setMockMode as updateMockMode } from '../utils/api';
import type { User } from '../utils/api';
import { toast } from 'sonner';

interface JwtPayload {
  sub?: string;
  username?: string;
  email?: string;
  role?: string;
  roles?: string | string[];
  authorities?: string | string[] | { authority: string }[];
  mustChangePassword?: boolean;
  [key: string]: any;
}

const normalizeUserRole = (rawRole?: string | null, username?: string | null): User['role'] => {
  const roleText = String(rawRole || '').toUpperCase();
  const usernameText = String(username || '').toLowerCase();

  if (roleText.includes('SUPER') || roleText.includes('ADMIN') || usernameText.includes('admin')) {
    return 'SUPER_ADMIN';
  }

  if (roleText.includes('TREASURER') || usernameText.includes('treasurer')) {
    return 'TREASURER';
  }

  return 'USER';
};

// Decode user details from Spring Boot JWT payload when direct user metadata isn't returned on login
const decodeUserFromToken = (token: string): User => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token format');
    }
    
    // Convert base64url to base64
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payloadDecoded = atob(payloadBase64);
    const decoded = JSON.parse(payloadDecoded) as JwtPayload;
    
    const username = decoded.sub || decoded.username || decoded.email || 'user';
    const email = decoded.email || `${username}@university.edu`;
    
    const rawRoles: string[] = [];
    const extractRoles = (val: any) => {
      if (typeof val === 'string') {
        rawRoles.push(val);
      } else if (Array.isArray(val)) {
        val.forEach(item => {
          if (typeof item === 'string') {
            rawRoles.push(item);
          } else if (item && typeof item === 'object') {
            const itemObj = item as any;
            if (itemObj.authority !== undefined) rawRoles.push(String(itemObj.authority));
            else if (itemObj.role !== undefined) rawRoles.push(String(itemObj.role));
          }
        });
      }
    };

    if (decoded.role) extractRoles(decoded.role);
    if (decoded.roles) extractRoles(decoded.roles);
    if (decoded.authorities) extractRoles(decoded.authorities);
    if (decoded.scopes) extractRoles(decoded.scopes);
    if (decoded.scope) extractRoles(decoded.scope);
    if (decoded.auth) extractRoles(decoded.auth);
    if (decoded.groups) extractRoles(decoded.groups);

    const role = normalizeUserRole(rawRoles.find(Boolean) || decoded.role || decoded.roles?.[0], username);
    
    const mustChangePassword = decoded.mustChangePassword ?? false;
    
    return {
      id: decoded.id || 1,
      username,
      email,
      role,
      fullName: decoded.fullName || decoded.name || username,
      mustChangePassword,
    };
  } catch (err) {
    console.error('Failed to decode JWT token:', err);
    return {
      id: 1,
      username: 'user',
      email: 'user@university.edu',
      role: 'USER',
      fullName: 'User',
      mustChangePassword: false,
    };
  }
};

const mergeUserWithToken = (token: string, fallbackUser?: Partial<User> | null): User => {
  const decodedUser = decodeUserFromToken(token);
  const mergedUser = {
    ...decodedUser,
    ...fallbackUser,
    id: fallbackUser?.id ?? decodedUser.id,
    username: fallbackUser?.username || decodedUser.username,
    email: fallbackUser?.email || decodedUser.email,
    fullName: fallbackUser?.fullName || decodedUser.fullName,
    role: normalizeUserRole(
      (fallbackUser as User | undefined)?.role || decodedUser.role,
      fallbackUser?.username || decodedUser.username
    ),
    mustChangePassword: fallbackUser?.mustChangePassword ?? decodedUser.mustChangePassword,
  } as User;

  return mergedUser;
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mustChangePassword: boolean;
  mockMode: boolean;
  setMockMode: (val: boolean) => void;
  login: (payload: any) => Promise<User>;
  logout: () => void;
  changePassword: (payload: any) => Promise<void>;
  forgotPasswordRequest: (username: string) => Promise<void>;
  forgotPasswordReset: (payload: any) => Promise<void>;
  setMustChangePassword: (val: boolean) => void;
  isTempTreasurer: boolean;
  tempTreasurerEventIds: string[];
  defaultContributionAmount: number;
  updateDefaultContributionAmount: (amount: number) => Promise<void>;
  getRoleDisplayText: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mustChangePassword, setMustChangePasswordState] = useState<boolean>(false);
  const [mockMode, setMockModeState] = useState<boolean>(false);
  const [isTempTreasurer, setIsTempTreasurer] = useState<boolean>(false);
  const [tempTreasurerEventIds, setTempTreasurerEventIds] = useState<string[]>([]);
  const [defaultContributionAmount, setDefaultContributionAmount] = useState<number>(25);

  // Check and sync default contribution amount
  useEffect(() => {
    const fetchDefaultAmount = async () => {
      if (user && (user.role === 'TREASURER' || user.role === 'SUPER_ADMIN' || isTempTreasurer)) {
        try {
          const res = await apiService.contributions.getDefaultAmount();
          setDefaultContributionAmount(Number(res.data));
        } catch (e) {
          const stored = localStorage.getItem('ts_default_contribution_amount');
          if (stored) setDefaultContributionAmount(Number(stored));
        }
      }
    };
    fetchDefaultAmount();
  }, [user, mockMode, isTempTreasurer]);

  const updateDefaultContributionAmount = async (amount: number) => {
    try {
      await apiService.contributions.updateDefaultAmount(amount);
      setDefaultContributionAmount(amount);
      localStorage.setItem('ts_default_contribution_amount', String(amount));
      toast.success('Default monthly contribution value updated!');
    } catch (e) {
      toast.error('Failed to update default monthly contribution value.');
      throw e;
    }
  };

  // Check if a user is assigned as temporary treasurer of any event
  // Includes: regular USER role assigned, or TREASURER with username matching event name
  useEffect(() => {
    const checkTempTreasurerStatus = async () => {
      if (user) {
        try {
          const res = await apiService.events.getAll();
          const cleanEvents = Array.isArray(res.data) ? res.data : [];
          let assignedEventIds: string[] = [];

          // Check if USER is explicitly assigned as temporary treasurer
          if (user.role === 'USER') {
            assignedEventIds = cleanEvents
              .filter((e) =>
                String(e.temporaryTreasurer?.id) === String(user.id) ||
                String(e.temporaryTreasurerId) === String(user.id)
              )
              .map((e) => String(e.id));
          }

          // Check if TREASURER has username matching an event name (auto-assigned temp treasurer)
          if (user.role === 'TREASURER' && user.username) {
            const matchingEvents = cleanEvents
              .filter((e) => 
                String(e.eventName || e.name).toLowerCase() === String(user.username).toLowerCase()
              )
              .map((e) => String(e.id));
            assignedEventIds = [...new Set([...assignedEventIds, ...matchingEvents])];
          }
          
          setIsTempTreasurer(assignedEventIds.length > 0);
          setTempTreasurerEventIds(assignedEventIds);
        } catch (e) {
          setIsTempTreasurer(false);
          setTempTreasurerEventIds([]);
        }
      } else {
        setIsTempTreasurer(false);
        setTempTreasurerEventIds([]);
      }
    };
    checkTempTreasurerStatus();
  }, [user, mockMode]);

  // Get role display text based on user role and username
  const getRoleDisplayText = (): string => {
    if (!user) return '';
    
    // If temporary treasurer (any role), show "Temporary Treasurer"
    if (isTempTreasurer) {
      return 'Temporary Treasurer';
    }
    
    // If super admin with username "admin", show "Super Admin"
    if (user.role === 'SUPER_ADMIN' && user.username?.toLowerCase() === 'admin') {
      return 'Super Admin';
    }
    
    // If other super admin, show "Treasurer"
    if (user.role === 'SUPER_ADMIN') {
      return 'Treasurer';
    }
    
    // For TREASURER or USER, show the role as-is
    return user.role?.replace('_', ' ') || '';
  };

  // Keep the hook available for compatibility, but force the app back to the live backend mode.
  const setMockMode = (_val: boolean) => {
    updateMockMode(false);
    setMockModeState(false);
    toast.success('Live server mode enabled.');
  };

  useEffect(() => {
    const handleMockModeChange = () => {
      setMockModeState(false);
    };
    window.addEventListener('mock_mode_changed', handleMockModeChange);
    return () => window.removeEventListener('mock_mode_changed', handleMockModeChange);
  }, []);

  // Initialize auth state from local storage
  useEffect(() => {
    const storedToken = localStorage.getItem('ts_token');
    const storedUser = localStorage.getItem('ts_user');
    
    if (storedToken) {
      setToken(storedToken);
      apiService.user.getMe()
        .then(res => {
          const parsedUser = mergeUserWithToken(storedToken, res.data);
          setUser(parsedUser);
          setMustChangePasswordState(!!parsedUser.mustChangePassword);
          localStorage.setItem('ts_user', JSON.stringify(parsedUser));
        })
        .catch(() => {
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser) as User;
              setUser(parsedUser);
              setMustChangePasswordState(!!parsedUser.mustChangePassword);
            } catch (e) {
              logout();
            }
          } else {
            logout();
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (payload: any): Promise<User> => {
    setIsLoading(true);
    try {
      const response = await apiService.auth.login(payload);
      
      let jwtToken: string | null = null;
      let loggedUser: User | null = null;
      let responseMustChangePassword = false;
      
      const resData = response?.data;
      
      if (resData) {
        if (typeof resData === 'string') {
          // Unpacked JWT token from response interceptor
          jwtToken = resData;
        } else if (typeof resData === 'object') {
          if ('success' in resData && 'data' in resData) {
            // Standard ApiResponse wrapper (fallback if interceptor didn't unpack)
            const apiPayload = resData.data;
            if (typeof apiPayload === 'string') {
              jwtToken = apiPayload;
            } else if (apiPayload && typeof apiPayload === 'object') {
              jwtToken = apiPayload.token || null;
              loggedUser = apiPayload.user || null;
              responseMustChangePassword = Boolean(apiPayload.mustChangePassword);
            }
          } else {
            // Unwrapped credentials payload (mock mode or direct token/user pair)
            jwtToken = resData.token || null;
            loggedUser = resData.user || null;
            responseMustChangePassword = Boolean(resData.mustChangePassword);
          }
        }
      }
      
      if (!jwtToken) {
        throw new Error('No authentication token returned from login server.');
      }
      
      if (!loggedUser) {
        loggedUser = decodeUserFromToken(jwtToken);
      }

      if (loggedUser) {
        loggedUser = {
          ...loggedUser,
          mustChangePassword: responseMustChangePassword || !!loggedUser.mustChangePassword,
        } as User;
      }

      loggedUser = mergeUserWithToken(jwtToken, loggedUser);
      
      localStorage.setItem('ts_token', jwtToken);
      localStorage.setItem('ts_user', JSON.stringify(loggedUser));
      
      setToken(jwtToken);
      setUser(loggedUser);
      setMustChangePasswordState(!!loggedUser?.mustChangePassword);
      
      toast.success(`Welcome back, ${loggedUser?.fullName || loggedUser?.username}!`);
      return loggedUser;
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || 'Login failed';
      toast.error(errMsg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('ts_token');
    localStorage.removeItem('ts_user');
    setToken(null);
    setUser(null);
    setMustChangePasswordState(false);
    toast.success('Logged out successfully');
  };

  const changePassword = async (payload: any) => {
    try {
      const fullPayload = { username: user?.username, ...payload };
      await apiService.auth.changePassword(fullPayload);
      // If password changed successfully, remove mustChangePassword flag
      if (user) {
        const updatedUser = { ...user, mustChangePassword: false };
        localStorage.setItem('ts_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
      setMustChangePasswordState(false);
      toast.success('Password changed successfully!');
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || 'Password change failed';
      toast.error(errMsg);
      throw error;
    }
  };

  const forgotPasswordRequest = async (username: string) => {
    try {
      await apiService.auth.forgotPasswordRequestOtp(username);
      toast.success('OTP has been requested. Please check your inbox.');
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || 'Failed to request OTP';
      toast.error(errMsg);
      throw error;
    }
  };

  const forgotPasswordReset = async (payload: any) => {
    try {
      await apiService.auth.forgotPasswordReset(payload);
      toast.success('Password reset completed successfully. You can now login.');
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || 'Failed to reset password';
      toast.error(errMsg);
      throw error;
    }
  };

  const setMustChangePassword = (val: boolean) => {
    setMustChangePasswordState(val);
    if (user) {
      const updatedUser = { ...user, mustChangePassword: val };
      localStorage.setItem('ts_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        mustChangePassword,
        mockMode,
        setMockMode,
        login,
        logout,
        changePassword,
        forgotPasswordRequest,
        forgotPasswordReset,
        setMustChangePassword,
        isTempTreasurer,
        tempTreasurerEventIds,
        defaultContributionAmount,
        updateDefaultContributionAmount,
        getRoleDisplayText,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
