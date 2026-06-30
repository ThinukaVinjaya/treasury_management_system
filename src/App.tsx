import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Developers } from './pages/Developers';
import { Events } from './pages/Events';
import { Transactions } from './pages/Transactions';
import { Contributions } from './pages/Contributions';
import { Reports } from './pages/Reports';
import { Users } from './pages/Users';
import { Profile } from './pages/Profile';
import { Toaster } from 'sonner';

// Main Layout wrapping sidebar, top navigation, and subpages
const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-dark font-sans select-none">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <Header setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-hidden flex flex-col">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

const UserManagementRoute: React.FC = () => {
  const { user } = useAuth();

  if (!user || user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Users />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Auth routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/developers" element={<Developers />} />

            <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TREASURER', 'USER']}><Outlet /></ProtectedRoute>}>
              <Route path="/events" element={<Events />} />
              <Route path="/transactions" element={<Transactions />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TREASURER']}><Outlet /></ProtectedRoute>}>
              <Route path="/reports" element={<Reports />} />
            </Route>

            <Route path="/contributions" element={<Contributions />} />
            
            {/* Super Admin Restricted route */}
            <Route path="/users" element={<UserManagementRoute />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
      <Toaster 
        theme="dark" 
        position="top-right" 
        expand={true} 
        richColors 
        toastOptions={{
          style: {
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(16px)',
          }
        }}
      />
    </AuthProvider>
  );
};

export default App;
