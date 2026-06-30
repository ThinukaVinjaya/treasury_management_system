import React, { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu } from 'lucide-react';

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ setSidebarOpen }) => {
  const { user } = useAuth();
  const location = useLocation();
  
  // Enforce dark mode globally on mount
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.add('dark');
    root.classList.remove('light');
    localStorage.setItem('ts_theme', 'dark');
  }, []);

  // Compute breadcrumbs from path
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/dashboard') return [{ label: 'Dashboard', path: '/dashboard' }];
    if (path === '/events') return [{ label: 'Events', path: '/events' }];
    if (path === '/transactions') return [{ label: 'Transactions', path: '/transactions' }];
    if (path === '/contributions') return [{ label: 'Contributions', path: '/contributions' }];
    if (path === '/reports') return [{ label: 'Reports', path: '/reports' }];
    if (path === '/users') return [{ label: 'User Management', path: '/users' }];
    if (path === '/profile') return [{ label: 'Profile & Settings', path: '/profile' }];
    if (path === '/developers') return [{ label: 'Meet the Developers', path: '/developers' }];
    return [];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="flex h-16 w-full items-center justify-between px-6 border-b border-white/5 glass-panel select-none">
      {/* Left side: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 lg:hidden"
        >
          <Menu size={20} />
        </button>

        <nav className="hidden md:flex items-center text-sm font-medium text-gray-400">
          <Link to="/dashboard" className="hover:text-gray-200 transition-colors">
            UTMS
          </Link>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.path}>
              <span className="mx-2.5 text-gray-600">/</span>
              <span className={idx === breadcrumbs.length - 1 ? 'text-white font-semibold' : 'hover:text-gray-200 transition-colors'}>
                {crumb.label}
              </span>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-3">
        <div className="hidden rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 sm:flex">
          Live Connected
        </div>

        {/* User initials bubble (direct navigation link to Profile) */}
        {user && (
          <Link 
            to="/profile" 
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-purple to-brand-blue text-white text-sm font-semibold shadow-md shadow-brand-purple/20 hover:scale-105 transition-transform"
          >
            {user.username.slice(0, 2).toUpperCase()}
          </Link>
        )}
      </div>
    </header>
  );
};
