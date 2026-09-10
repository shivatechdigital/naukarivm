#!/bin/bash
set -e

echo "=============================================="
echo " JobAutoApply - Frontend Final Setup"
echo " React + Vite + TypeScript"
echo "=============================================="

cd "$(dirname "$0")"

echo ""
echo "📦 Installing dependencies..."

npm install axios react-router-dom lucide-react

echo ""
echo "📁 Creating directories..."

mkdir -p src/lib
mkdir -p src/context
mkdir -p src/hooks
mkdir -p src/components/layout
mkdir -p src/pages/auth
mkdir -p src/pages/dashboard
mkdir -p src/pages/profile
mkdir -p src/pages/preferences
mkdir -p src/types

echo ""
echo "📝 Creating API client..."

cat > src/lib/axios.ts <<'TS'
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(error);
        }

        const { data } = await axios.post(
          'http://localhost:3001/api/auth/refresh',
          { refreshToken },
        );

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        originalRequest.headers.Authorization =
          `Bearer ${data.accessToken}`;

        return API(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default API;
TS

echo "✅ Axios created"

echo ""
echo "📝 Creating types..."

cat > src/types/index.ts <<'TS'
export interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt?: string;
  hasProfile?: boolean;
  hasPreferences?: boolean;
}

export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Education {
  degree: string;
  institution?: string;
  university?: string;
  fieldOfStudy?: string;
  year: number;
  percentage?: number;
}

export interface Profile {
  id: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  currentCompany?: string;
  currentTitle?: string;
  experience?: number;
  experienceYears?: number;
  currentCtc?: number;
  expectedCtc?: number;
  noticePeriod?: string;
  skills: string[];
  education?: Education;
  certifications: string[];
  location?: string;
  currentCity?: string;
  preferredCities: string[];
  willingToRelocate: boolean;
  resumeUrl?: string;
  resumeText?: string;
  naukriProfileUrl?: string;
}

export interface JobPreference {
  id: string;
  jobTitles: string[];
  keywords: string[];
  locations: string[];
  experienceMin?: number;
  experienceMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  jobTypes: string[];
  industries: string[];
  companySizes: string[];
  excludedCompanies: string[];
  excludedKeywords: string[];
  blacklistJobIds?: string[];
  isActive: boolean;
  maxApplicationsPerDay: number;
  matchScoreThreshold: number;
  cronExpression?: string;
}

export interface ProfileCompletion {
  completion: number;
  filled: number;
  total: number;
  missing: string[];
}
TS

echo "✅ Types created"

echo ""
echo "📝 Creating AuthContext..."

cat > src/context/AuthContext.tsx <<'TS'
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import API from '../lib/axios';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await API.get('/auth/profile');
      setUser(data.user);
    } catch {
      localStorage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { data } = await API.post('/auth/login', {
      email,
      password,
    });

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);

    setUser(data.user);
  };

  const register = async (
    name: string,
    email: string,
    password: string,
  ) => {
    const { data } = await API.post('/auth/register', {
      name,
      email,
      password,
    });

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);

    setUser(data.user);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { data } = await API.get('/auth/profile');
      setUser(data.user);
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};
TS

echo "✅ AuthContext created"

echo ""
echo "📝 Creating useAuth hook..."

cat > src/hooks/useAuth.ts <<'TS'
export { useAuth } from '../context/AuthContext';
TS

echo "✅ Hook created"

echo ""
echo "📝 Creating ProtectedRoute..."

cat > src/components/layout/ProtectedRoute.tsx <<'TS'
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
TS

echo "✅ ProtectedRoute created"

echo ""
echo "📝 Creating Navbar..."

cat > src/components/layout/Navbar.tsx <<'TS'
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
TS

echo "✅ Navbar created"

echo ""
echo "📝 Creating Login page..."

cat > src/pages/auth/LoginPage.tsx <<'TS'
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Login failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Briefcase className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-white">
              JobAutoApply
            </h1>
          </div>

          <p className="text-gray-400">
            Smart job application assistant
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6"
        >
          <h2 className="text-xl font-semibold text-white">
            Login
          </h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 pr-12 text-white"
                placeholder="••••••••"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-3 rounded-lg"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <p className="text-center text-gray-400 text-sm">
            Account nahi hai?{' '}
            <Link
              to="/register"
              className="text-blue-400 hover:underline"
            >
              Register karo
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
TS

echo "✅ Login created"

echo ""
echo "📝 Creating Register page..."

cat > src/pages/auth/RegisterPage.tsx <<'TS'
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      await register(name, email, password);
      navigate('/profile');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Registration failed.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Briefcase className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-white">
              JobAutoApply
            </h1>
          </div>

          <p className="text-gray-400">
            Create your account
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-5"
        >
          <h2 className="text-xl font-semibold text-white">
            Register
          </h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
          />

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
          />

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-3 rounded-lg"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>

          <p className="text-center text-gray-400 text-sm">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-blue-400 hover:underline"
            >
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
TS

echo "✅ Register created"

echo ""
echo "📝 Creating Dashboard..."

cat > src/pages/dashboard/DashboardPage.tsx <<'TS'
import { Link } from 'react-router-dom';
import {
  Briefcase,
  User,
  Target,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Welcome, {user?.name} 👋
        </h1>

        <p className="text-gray-400 mt-2">
          JobAutoApply dashboard
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Link
          to="/profile"
          className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-blue-500 transition"
        >
          <User className="w-8 h-8 text-blue-500 mb-4" />

          <h2 className="text-xl font-semibold text-white">
            Complete Profile
          </h2>

          <p className="text-gray-400 mt-2">
            Add your career details and resume information.
          </p>

          <div className="flex items-center gap-2 text-blue-400 mt-5">
            Open Profile
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        <Link
          to="/preferences"
          className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-blue-500 transition"
        >
          <Target className="w-8 h-8 text-purple-500 mb-4" />

          <h2 className="text-xl font-semibold text-white">
            Job Preferences
          </h2>

          <p className="text-gray-400 mt-2">
            Tell the system what jobs you want.
          </p>

          <div className="flex items-center gap-2 text-blue-400 mt-5">
            Configure
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <Briefcase className="w-8 h-8 text-green-500 mb-4" />

          <h2 className="text-xl font-semibold text-white">
            Applications
          </h2>

          <p className="text-gray-400 mt-2">
            Application tracking will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
TS

echo "✅ Dashboard created"

echo ""
echo "📝 Creating Profile page..."

cat > src/pages/profile/ProfilePage.tsx <<'TS'
import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, Plus, Save, X } from 'lucide-react';
import API from '../../lib/axios';
import type { Profile, ProfileCompletion } from '../../types';

const NOTICE_PERIODS = [
  ['IMMEDIATE', 'Immediate'],
  ['FIFTEEN_DAYS', '15 Days'],
  ['ONE_MONTH', '1 Month'],
  ['TWO_MONTHS', '2 Months'],
  ['THREE_MONTHS', '3 Months'],
  ['MORE_THAN_THREE', '3+ Months'],
];

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);

  const [message, setMessage] = useState('');

  const [completion, setCompletion] =
    useState<ProfileCompletion | null>(null);

  const [form, setForm] = useState({
    phone: '',
    currentCompany: '',
    currentTitle: '',
    currentCtc: '',
    experienceYears: '',
    expectedCtc: '',
    noticePeriod: '',
    skills: [] as string[],
    certifications: [] as string[],
    currentCity: '',
    preferredCities: [] as string[],
    willingToRelocate: false,
    naukriProfileUrl: '',
  });

  const [skillInput, setSkillInput] = useState('');
  const [cityInput, setCityInput] = useState('');

  useEffect(() => {
    loadProfile();
    loadCompletion();
  }, []);

  const loadProfile = async () => {
    try {
      const { data } = await API.get('/profiles/me');
      const p: Profile = data.profile;

      setForm({
        phone: p.phone || '',
        currentCompany: p.currentCompany || '',
        currentTitle: p.currentTitle || '',
        currentCtc:
          p.currentCtc !== undefined
            ? String(p.currentCtc)
            : '',
        experienceYears:
          p.experienceYears !== undefined
            ? String(p.experienceYears)
            : '',
        expectedCtc:
          p.expectedCtc !== undefined
            ? String(p.expectedCtc)
            : '',
        noticePeriod: p.noticePeriod || '',
        skills: p.skills || [],
        certifications: p.certifications || [],
        currentCity: p.currentCity || '',
        preferredCities: p.preferredCities || [],
        willingToRelocate: p.willingToRelocate ?? false,
        naukriProfileUrl: p.naukriProfileUrl || '',
      });
    } catch {
      setIsNew(true);
    } finally {
      setLoading(false);
    }
  };

  const loadCompletion = async () => {
    try {
      const { data } =
        await API.get('/profiles/completion');

      setCompletion(data);
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const payload = {
      ...form,
      currentCtc: form.currentCtc
        ? Number(form.currentCtc)
        : undefined,
      expectedCtc: form.expectedCtc
        ? Number(form.expectedCtc)
        : undefined,
      experienceYears: form.experienceYears
        ? Number(form.experienceYears)
        : undefined,
    };

    try {
      if (isNew) {
        await API.post('/profiles', payload);
        setIsNew(false);
        setMessage('Profile created successfully! 🎉');
      } else {
        await API.put('/profiles/me', payload);
        setMessage('Profile updated successfully! ✅');
      }

      await loadCompletion();
    } catch (err: any) {
      setMessage(
        err.response?.data?.message ||
        'Could not save profile.',
      );
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    const value = skillInput.trim();

    if (value && !form.skills.includes(value)) {
      setForm({
        ...form,
        skills: [...form.skills, value],
      });

      setSkillInput('');
    }
  };

  const addCity = () => {
    const value = cityInput.trim();

    if (
      value &&
      !form.preferredCities.includes(value)
    ) {
      setForm({
        ...form,
        preferredCities: [
          ...form.preferredCities,
          value,
        ],
      });

      setCityInput('');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">
            My Profile
          </h1>

          <p className="text-gray-400 mt-1">
            Complete your career profile
          </p>
        </div>

        {completion && (
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-500">
              {completion.completion}%
            </div>

            <div className="text-gray-400 text-xs">
              Complete
            </div>
          </div>
        )}
      </div>

      {completion && (
        <div className="bg-gray-800 rounded-full h-2 mb-6">
          <div
            className="bg-blue-500 h-2 rounded-full"
            style={{
              width: `${completion.completion}%`,
            }}
          />
        </div>
      )}

      {message && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-6 text-gray-200">
          {message}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-5">
            💼 Current Job
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <input
              value={form.currentCompany}
              onChange={(e) =>
                setForm({
                  ...form,
                  currentCompany: e.target.value,
                })
              }
              placeholder="Current Company"
              className="input"
            />

            <input
              value={form.currentTitle}
              onChange={(e) =>
                setForm({
                  ...form,
                  currentTitle: e.target.value,
                })
              }
              placeholder="Current Designation"
              className="input"
            />

            <input
              type="number"
              value={form.currentCtc}
              onChange={(e) =>
                setForm({
                  ...form,
                  currentCtc: e.target.value,
                })
              }
              placeholder="Current CTC (Annual INR)"
              className="input"
            />

            <input
              type="number"
              step="0.5"
              value={form.experienceYears}
              onChange={(e) =>
                setForm({
                  ...form,
                  experienceYears: e.target.value,
                })
              }
              placeholder="Experience (Years)"
              className="input"
            />
          </div>
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-5">
            🎯 Expectations
          </h2>

          <div className="grid md:grid-cols-3 gap-4">
            <input
              type="number"
              value={form.expectedCtc}
              onChange={(e) =>
                setForm({
                  ...form,
                  expectedCtc: e.target.value,
                })
              }
              placeholder="Expected CTC"
              className="input"
            />

            <select
              value={form.noticePeriod}
              onChange={(e) =>
                setForm({
                  ...form,
                  noticePeriod: e.target.value,
                })
              }
              className="input"
            >
              <option value="">
                Select Notice Period
              </option>

              {NOTICE_PERIODS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <input
              value={form.phone}
              onChange={(e) =>
                setForm({
                  ...form,
                  phone: e.target.value,
                })
              }
              placeholder="Phone"
              className="input"
            />
          </div>
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-5">
            🛠️ Skills
          </h2>

          <div className="flex gap-2">
            <input
              value={skillInput}
              onChange={(e) =>
                setSkillInput(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSkill();
                }
              }}
              placeholder="Type skill and press Enter"
              className="input flex-1"
            />

            <button
              type="button"
              onClick={addSkill}
              className="bg-blue-600 px-4 rounded-lg"
            >
              <Plus />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {form.skills.map((skill) => (
              <span
                key={skill}
                className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full flex items-center gap-2"
              >
                {skill}

                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      skills: form.skills.filter(
                        (s) => s !== skill,
                      ),
                    })
                  }
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-5">
            📍 Location
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <input
              value={form.currentCity}
              onChange={(e) =>
                setForm({
                  ...form,
                  currentCity: e.target.value,
                })
              }
              placeholder="Current City"
              className="input"
            />

            <input
              value={form.naukriProfileUrl}
              onChange={(e) =>
                setForm({
                  ...form,
                  naukriProfileUrl: e.target.value,
                })
              }
              placeholder="Naukri Profile URL"
              className="input"
            />
          </div>

          <div className="flex gap-2 mt-4">
            <input
              value={cityInput}
              onChange={(e) =>
                setCityInput(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCity();
                }
              }}
              placeholder="Preferred City"
              className="input flex-1"
            />

            <button
              type="button"
              onClick={addCity}
              className="bg-blue-600 px-4 rounded-lg"
            >
              <Plus />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {form.preferredCities.map((city) => (
              <span
                key={city}
                className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full flex items-center gap-2"
              >
                {city}

                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      preferredCities:
                        form.preferredCities.filter(
                          (c) => c !== city,
                        ),
                    })
                  }
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <label className="flex items-center gap-3 text-gray-300 mt-5">
            <input
              type="checkbox"
              checked={form.willingToRelocate}
              onChange={(e) =>
                setForm({
                  ...form,
                  willingToRelocate:
                    e.target.checked,
                })
              }
            />
            Willing to relocate
          </label>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg text-white font-medium flex justify-center items-center gap-2"
        >
          {saving ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Save />
          )}

          {isNew ? 'Create Profile' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
TS

echo "✅ Profile page created"

echo ""
echo "📝 Creating Preferences page..."

cat > src/pages/preferences/PreferencesPage.tsx <<'TS'
import { useEffect, useState, type FormEvent } from 'react';
import {
  Loader2,
  Plus,
  Power,
  Save,
  X,
} from 'lucide-react';

import API from '../../lib/axios';
import type { JobPreference } from '../../types';

export default function PreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    jobTitles: [] as string[],
    keywords: [] as string[],
    locations: [] as string[],
    experienceMin: '',
    experienceMax: '',
    salaryMin: '',
    salaryMax: '',
    jobTypes: [] as string[],
    industries: [] as string[],
    companySizes: [] as string[],
    excludedCompanies: [] as string[],
    excludedKeywords: [] as string[],
    blacklistJobIds: [] as string[],
    isActive: true,
    maxApplicationsPerDay: 15,
    matchScoreThreshold: 65,
    cronExpression: '0 */2 * * *',
  });

  const [input, setInput] = useState({
    jobTitles: '',
    keywords: '',
    locations: '',
    jobTypes: '',
    industries: '',
    companySizes: '',
    excludedCompanies: '',
    excludedKeywords: '',
    blacklistJobIds: '',
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data } =
        await API.get('/preferences/me');

      const p: JobPreference = data.preference;

      setForm({
        jobTitles: p.jobTitles || [],
        keywords: p.keywords || [],
        locations: p.locations || [],
        experienceMin:
          p.experienceMin !== undefined
            ? String(p.experienceMin)
            : '',
        experienceMax:
          p.experienceMax !== undefined
            ? String(p.experienceMax)
            : '',
        salaryMin:
          p.salaryMin !== undefined
            ? String(p.salaryMin)
            : '',
        salaryMax:
          p.salaryMax !== undefined
            ? String(p.salaryMax)
            : '',
        jobTypes: p.jobTypes || [],
        industries: p.industries || [],
        companySizes: p.companySizes || [],
        excludedCompanies:
          p.excludedCompanies || [],
        excludedKeywords:
          p.excludedKeywords || [],
        blacklistJobIds:
          p.blacklistJobIds || [],
        isActive: p.isActive,
        maxApplicationsPerDay:
          p.maxApplicationsPerDay,
        matchScoreThreshold:
          p.matchScoreThreshold,
        cronExpression:
          p.cronExpression || '0 */2 * * *',
      });
    } catch {
      setIsNew(true);
    } finally {
      setLoading(false);
    }
  };

  const addTag = (
    field: keyof typeof form,
    inputField: keyof typeof input,
  ) => {
    const value = input[inputField].trim();

    if (!value) return;

    const current = form[field];

    if (
      Array.isArray(current) &&
      !current.includes(value)
    ) {
      setForm({
        ...form,
        [field]: [...current, value],
      });

      setInput({
        ...input,
        [inputField]: '',
      });
    }
  };

  const removeTag = (
    field: keyof typeof form,
    value: string,
  ) => {
    const current = form[field];

    if (Array.isArray(current)) {
      setForm({
        ...form,
        [field]: current.filter(
          (item) => item !== value,
        ),
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const payload = {
      ...form,
      experienceMin: form.experienceMin
        ? Number(form.experienceMin)
        : undefined,
      experienceMax: form.experienceMax
        ? Number(form.experienceMax)
        : undefined,
      salaryMin: form.salaryMin
        ? Number(form.salaryMin)
        : undefined,
      salaryMax: form.salaryMax
        ? Number(form.salaryMax)
        : undefined,
    };

    try {
      if (isNew) {
        await API.post('/preferences', payload);
        setIsNew(false);
      } else {
        await API.put('/preferences/me', payload);
      }

      setMessage('Preferences saved successfully! ✅');
    } catch (err: any) {
      setMessage(
        err.response?.data?.message ||
        'Could not save preferences.',
      );
    } finally {
      setSaving(false);
    }
  };

  const toggle = async () => {
    try {
      const { data } =
        await API.patch('/preferences/toggle');

      setForm({
        ...form,
        isActive: data.isActive,
      });

      setMessage(data.message);
    } catch {
      setMessage('Could not toggle automation.');
    }
  };

  const TagInput = ({
    label,
    field,
    inputField,
  }: {
    label: string;
    field: keyof typeof form;
    inputField: keyof typeof input;
  }) => (
    <div>
      <label className="text-sm text-gray-400 block mb-2">
        {label}
      </label>

      <div className="flex gap-2">
        <input
          value={input[inputField]}
          onChange={(e) =>
            setInput({
              ...input,
              [inputField]: e.target.value,
            })
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag(field, inputField);
            }
          }}
          placeholder={`Add ${label}`}
          className="input flex-1"
        />

        <button
          type="button"
          onClick={() => addTag(field, inputField)}
          className="bg-blue-600 px-4 rounded-lg"
        >
          <Plus />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {(Array.isArray(form[field])
          ? form[field]
          : []
        ).map((value) => (
          <span
            key={value}
            className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full flex items-center gap-2"
          >
            {value}

            <button
              type="button"
              onClick={() =>
                removeTag(field, value)
              }
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Job Preferences
          </h1>

          <p className="text-gray-400 mt-1">
            Configure the jobs you want to find.
          </p>
        </div>

        {!isNew && (
          <button
            onClick={toggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              form.isActive
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            <Power className="w-4 h-4" />

            {form.isActive ? 'Active' : 'Paused'}
          </button>
        )}
      </div>

      {message && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-6 text-gray-200">
          {message}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
          <h2 className="text-xl font-semibold text-white">
            🔍 Job Search
          </h2>

          <TagInput
            label="Job Titles"
            field="jobTitles"
            inputField="jobTitles"
          />

          <TagInput
            label="Keywords"
            field="keywords"
            inputField="keywords"
          />

          <TagInput
            label="Locations"
            field="locations"
            inputField="locations"
          />
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-5">
            💰 Experience & Salary
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <input
              type="number"
              step="0.5"
              value={form.experienceMin}
              onChange={(e) =>
                setForm({
                  ...form,
                  experienceMin: e.target.value,
                })
              }
              placeholder="Min Experience"
              className="input"
            />

            <input
              type="number"
              step="0.5"
              value={form.experienceMax}
              onChange={(e) =>
                setForm({
                  ...form,
                  experienceMax: e.target.value,
                })
              }
              placeholder="Max Experience"
              className="input"
            />

            <input
              type="number"
              value={form.salaryMin}
              onChange={(e) =>
                setForm({
                  ...form,
                  salaryMin: e.target.value,
                })
              }
              placeholder="Min Salary"
              className="input"
            />

            <input
              type="number"
              value={form.salaryMax}
              onChange={(e) =>
                setForm({
                  ...form,
                  salaryMax: e.target.value,
                })
              }
              placeholder="Max Salary"
              className="input"
            />
          </div>
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
          <h2 className="text-xl font-semibold text-white">
            🏷️ Filters
          </h2>

          <TagInput
            label="Job Types"
            field="jobTypes"
            inputField="jobTypes"
          />

          <TagInput
            label="Industries"
            field="industries"
            inputField="industries"
          />

          <TagInput
            label="Company Sizes"
            field="companySizes"
            inputField="companySizes"
          />
        </section>

        <section className="bg-gray-900 border border-red-900/50 rounded-xl p-6 space-y-5">
          <h2 className="text-xl font-semibold text-red-400">
            🚫 Exclusions
          </h2>

          <TagInput
            label="Excluded Companies"
            field="excludedCompanies"
            inputField="excludedCompanies"
          />

          <TagInput
            label="Excluded Keywords"
            field="excludedKeywords"
            inputField="excludedKeywords"
          />

          <TagInput
            label="Blacklisted Job IDs"
            field="blacklistJobIds"
            inputField="blacklistJobIds"
          />
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-5">
            ⚙️ Automation
          </h2>

          <div className="grid md:grid-cols-3 gap-4">
            <input
              type="number"
              min="1"
              max="100"
              value={form.maxApplicationsPerDay}
              onChange={(e) =>
                setForm({
                  ...form,
                  maxApplicationsPerDay:
                    Number(e.target.value),
                })
              }
              placeholder="Max applications/day"
              className="input"
            />

            <input
              type="number"
              min="0"
              max="100"
              value={form.matchScoreThreshold}
              onChange={(e) =>
                setForm({
                  ...form,
                  matchScoreThreshold:
                    Number(e.target.value),
                })
              }
              placeholder="Match threshold"
              className="input"
            />

            <input
              value={form.cronExpression}
              onChange={(e) =>
                setForm({
                  ...form,
                  cronExpression: e.target.value,
                })
              }
              placeholder="Cron expression"
              className="input"
            />
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg text-white font-medium flex justify-center items-center gap-2"
        >
          {saving ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Save />
          )}

          Save Preferences
        </button>
      </form>
    </div>
  );
}
TS

echo "✅ Preferences page created"

echo ""
echo "📝 Creating App..."

cat > src/App.tsx <<'TS'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';

import Navbar from './components/layout/Navbar';
import ProtectedRoute from './components/layout/ProtectedRoute';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProfilePage from './pages/profile/ProfilePage';
import PreferencesPage from './pages/preferences/PreferencesPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={<LoginPage />}
          />

          <Route
            path="/register"
            element={<RegisterPage />}
          />

          <Route element={<ProtectedRoute />}>
            <Route
              element={
                <div className="min-h-screen bg-gray-950">
                  <Navbar />

                  <main>
                    <Routes>
                      <Route
                        path="/dashboard"
                        element={<DashboardPage />}
                      />

                      <Route
                        path="/profile"
                        element={<ProfilePage />}
                      />

                      <Route
                        path="/preferences"
                        element={<PreferencesPage />}
                      />
                    </Routes>
                  </main>
                </div>
              }
            />
          </Route>

          <Route
            path="/"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />

          <Route
            path="*"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
TS

echo "✅ App created"

echo ""
echo "📝 Creating main.tsx..."

cat > src/main.tsx <<'TS'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(
  document.getElementById('root')!,
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
TS

echo "✅ main.tsx created"

echo ""
echo "🎨 Updating CSS..."

cat > src/index.css <<'CSS'
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
}

html,
body,
#root {
  margin: 0;
  min-height: 100%;
}

body {
  background: #030712;
  color: white;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.input {
  width: 100%;
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  color: white;
  outline: none;
}

.input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgb(59 130 246 / 0.25);
}

select.input {
  appearance: auto;
}
CSS

echo "✅ CSS updated"

echo ""
echo "🔎 Checking Tailwind configuration..."

if [ -f tailwind.config.js ]; then
  echo "✅ tailwind.config.js found"
else
  echo "⚠️ tailwind.config.js not found"
fi

echo ""
echo "🧹 Running TypeScript/Vite build..."

npm run build

echo ""
echo "=============================================="
echo " ✅ FRONTEND SETUP COMPLETE"
echo "=============================================="
echo ""
echo "Start frontend:"
echo ""
echo "  npm run dev -- --host 0.0.0.0"
echo ""
echo "Backend:"
echo ""
echo "  http://localhost:3001"
echo ""
echo "Frontend:"
echo ""
echo "  http://YOUR_SERVER_IP:5173"
echo ""
