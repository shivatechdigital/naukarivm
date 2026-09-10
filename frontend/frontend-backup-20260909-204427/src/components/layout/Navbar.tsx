import {
  Briefcase,
  LayoutDashboard,
  LogOut,
  Target,
  User,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const links = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: '/profile',
      label: 'Profile',
      icon: User,
    },
    {
      to: '/preferences',
      label: 'Preferences',
      icon: Target,
    },
  ];

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link
          to="/dashboard"
          className="flex items-center gap-2"
        >
          <Briefcase className="w-6 h-6 text-blue-500" />
          <span className="text-white font-bold text-lg">
            JobAutoApply
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
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

        <div className="flex items-center gap-4">
          <span className="text-gray-300 text-sm">
            {user?.name}
          </span>

          <button
            onClick={logout}
            className="flex items-center gap-2 text-gray-400 hover:text-red-400"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
