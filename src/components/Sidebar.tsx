import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  CalendarDays, 
  ArrowLeftRight, 
  PiggyBank, 
  FileText, 
  Users, 
  UserCircle, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout, isTempTreasurer } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'TREASURER', 'USER'] },
    { name: 'Events', path: '/events', icon: CalendarDays, roles: ['SUPER_ADMIN', 'TREASURER', 'USER'] },
    { name: 'Transactions', path: '/transactions', icon: ArrowLeftRight, roles: ['SUPER_ADMIN', 'TREASURER', 'USER'] },
    { name: 'Contributions', path: '/contributions', icon: PiggyBank, roles: ['SUPER_ADMIN', 'TREASURER', 'USER'] },
    { name: 'Reports', path: '/reports', icon: FileText, roles: ['SUPER_ADMIN', 'TREASURER'] },
    { name: 'User Management', path: '/users', icon: Users, roles: ['SUPER_ADMIN'] },
    { name: 'Profile & Settings', path: '/profile', icon: UserCircle, roles: ['SUPER_ADMIN', 'TREASURER', 'USER'] },
  ];

  const allowedItems = menuItems.filter(item => {
    // Temporary treasurers only see Events, Dashboard, and Profile
    if (isTempTreasurer) {
      return ['/dashboard', '/events', '/profile'].includes(item.path);
    }
    
    return item.roles.includes(user.role);
  });

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-white/5 transition-all duration-300 glass-panel lg:static
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'w-20' : 'w-64'}
        `}
      >
        {/* Header/Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/5">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-purple to-brand-blue text-white shadow-lg shadow-brand-purple/25">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            {!collapsed && (
              <span className="font-display text-lg font-bold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent truncate">
                UTMS Treasury
              </span>
            )}
          </div>
          
          {/* Collapse toggle (Desktop only) */}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* User Card info (when not collapsed) */}
        {!collapsed && (
          <div className="p-4 mx-3 my-4 rounded-xl border border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-purple/10 text-brand-purple font-display font-semibold">
                {user.fullName ? user.fullName.split(' ').map(n => n[0]).join('') : user.username[0].toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <h4 className="font-medium text-sm text-gray-200 truncate">{user.fullName}</h4>
                <span className="inline-flex rounded-full bg-brand-blue/10 px-2 py-0.5 text-[10px] font-semibold text-brand-blue uppercase tracking-wider">
                  {user.role.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {allowedItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 group
                ${isActive 
                  ? 'bg-gradient-to-r from-brand-purple/10 to-brand-blue/10 border border-brand-purple/35 text-white shadow-sm shadow-brand-purple/5' 
                  : 'text-gray-400 border border-transparent hover:text-gray-200 hover:bg-white/[0.03]'
                }
              `}
            >
              <item.icon size={20} className="shrink-0 transition-transform duration-200 group-hover:scale-105" />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Logout Trigger */}
        <div className="p-3 border-t border-white/5">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-brand-rose/85 border border-transparent hover:bg-brand-rose/10 hover:text-brand-rose transition-all duration-200"
          >
            <LogOut size={20} className="shrink-0" />
            {!collapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
