import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  User,
  Target,
  Send,
  Briefcase,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/applications', label: 'Applications', icon: Send },
    { to: '/jobs', label: 'Discovered Jobs', icon: Briefcase },
    { to: '/profile', label: 'Profile', icon: User },
    { to: '/preferences', label: 'Preferences', icon: Target },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-blue-500" />
          <span className="text-white font-bold text-lg">JobAutoApply</span>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm transition-colors ${
                location.pathname === to
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-gray-300 text-sm font-medium">
            {user?.name}
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors p-2"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden rounded-lg border border-gray-700 p-2 text-gray-300 hover:bg-gray-800"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <>
          <button
            className="fixed inset-0 top-[61px] z-40 bg-black/60 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
          />
          <aside className="fixed right-0 top-0 z-50 h-full w-[min(82vw,320px)] bg-gray-900 border-l border-gray-700 p-5 shadow-2xl lg:hidden">
            <div className="flex items-center justify-between mb-6">
              <span className="text-white font-semibold">Navigation</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {links.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm ${
                    location.pathname === to
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </Link>
              ))}
            </div>
          </aside>
        </>
      )}
    </nav>
  );
}
