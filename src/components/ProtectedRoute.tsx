import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('SUPER_ADMIN' | 'TREASURER' | 'USER')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user, mustChangePassword, isTempTreasurer } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-purple border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but must change password -> redirect them to the profile page so they can update the password
  if (mustChangePassword && location.pathname !== '/profile') {
    return <Navigate to="/profile" state={{ forceChange: true }} replace />;
  }

  // Temporary treasurers can only access Events, Dashboard, and Profile
  if (isTempTreasurer) {
    const allowedTempPaths = ['/dashboard', '/events', '/profile'];
    if (!allowedTempPaths.includes(location.pathname)) {
      return <Navigate to="/events" replace />;
    }
  }

  // Logged in but role is not allowed -> redirect to dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
