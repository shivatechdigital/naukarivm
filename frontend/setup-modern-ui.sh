#!/bin/bash
set -e

echo "=================================================="
echo " JobAutoApply - Modern SaaS UI Setup"
echo " React + Vite + TypeScript + Tailwind CSS v4"
echo "=================================================="

cd "$(dirname "$0")"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP="frontend-backup-$TIMESTAMP"

echo ""
echo "📦 Creating backup: $BACKUP"

mkdir -p "$BACKUP"

if [ -d src ]; then
  cp -R src "$BACKUP/src"
fi

if [ -f vite.config.ts ]; then
  cp vite.config.ts "$BACKUP/vite.config.ts"
fi

echo "✅ Backup created"

echo ""
echo "📦 Installing UI dependencies..."

npm install tailwindcss @tailwindcss/vite lucide-react axios react-router-dom

echo "✅ Dependencies installed"

echo ""
echo "⚙️ Configuring Vite + Tailwind..."

cat > vite.config.ts <<'VITE'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
  },
})
VITE

echo "✅ Vite configured"

echo ""
echo "📁 Creating UI directories..."

mkdir -p src/components/layout
mkdir -p src/components/ui
mkdir -p src/pages/auth
mkdir -p src/pages/dashboard
mkdir -p src/pages/profile
mkdir -p src/pages/preferences
mkdir -p src/lib
mkdir -p src/context
mkdir -p src/hooks
mkdir -p src/types

echo ""
echo "🎨 Creating global CSS..."

cat > src/index.css <<'CSS'
@import "tailwindcss";

:root {
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  color-scheme: dark;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  margin: 0;
  min-height: 100%;
  width: 100%;
}

body {
  min-width: 320px;
  background:
    radial-gradient(circle at top left, rgba(99, 102, 241, 0.10), transparent 28%),
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.08), transparent 25%),
    #070b14;
  color: #f8fafc;
}

button,
input,
textarea,
select {
  font: inherit;
}

::selection {
  background: rgba(99, 102, 241, 0.35);
}

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #0b1020;
}

::-webkit-scrollbar-thumb {
  background: #27324a;
  border-radius: 999px;
}

::-webkit-scrollbar-thumb:hover {
  background: #3b4967;
}

.glass {
  background: rgba(15, 23, 42, 0.68);
  border: 1px solid rgba(148, 163, 184, 0.10);
  backdrop-filter: blur(18px);
}

.card {
  background: linear-gradient(
    145deg,
    rgba(15, 23, 42, 0.92),
    rgba(9, 14, 26, 0.88)
  );
  border: 1px solid rgba(148, 163, 184, 0.10);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.20);
}

.input {
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.72);
  padding: 11px 13px;
  color: #f8fafc;
  outline: none;
  transition: all 0.2s ease;
}

.input::placeholder {
  color: #64748b;
}

.input:focus {
  border-color: rgba(99, 102, 241, 0.65);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.10);
}

.label {
  display: block;
  margin-bottom: 7px;
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 600;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 11px;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  padding: 11px 16px;
  color: white;
  font-size: 14px;
  font-weight: 700;
  transition: all 0.2s ease;
  box-shadow: 0 10px 25px rgba(79, 70, 229, 0.20);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 30px rgba(79, 70, 229, 0.30);
}

.btn-primary:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 11px;
  border: 1px solid rgba(148, 163, 184, 0.15);
  background: rgba(30, 41, 59, 0.55);
  padding: 10px 15px;
  color: #cbd5e1;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: rgba(51, 65, 85, 0.65);
  color: white;
}

.animate-in {
  animation: fadeIn 0.35s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
CSS

echo "✅ CSS created"

echo ""
echo "🧭 Creating navigation layout..."

cat > src/components/layout/AppLayout.tsx <<'EOF'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  Sparkles,
  Target,
  X,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'My Profile',
    path: '/profile',
    icon: CircleUserRound,
  },
  {
    label: 'Job Preferences',
    path: '/preferences',
    icon: Target,
  },
]

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100">
      <div className="flex min-h-screen">
        {mobileOpen && (
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <aside
          className={[
            'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-[#0a0f1c]/95 backdrop-blur-xl transition-all duration-300 lg:relative lg:translate-x-0',
            collapsed ? 'w-[82px]' : 'w-[255px]',
            mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          ].join(' ')}
        >
          <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-5">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
                <BriefcaseBusiness size={21} />
              </div>

              {!collapsed && (
                <div>
                  <div className="whitespace-nowrap text-[16px] font-extrabold tracking-tight">
                    JobAuto<span className="text-indigo-400">Apply</span>
                  </div>
                  <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                    Smart career assistant
                  </div>
                </div>
              )}
            </div>

            <button
              className="hidden rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white lg:block"
              onClick={() => setCollapsed((v) => !v)}
            >
              {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
            </button>

            <button
              className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white lg:hidden"
              onClick={() => setMobileOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-3 py-5">
            {!collapsed && (
              <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
                Workspace
              </div>
            )}

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      [
                        'group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition',
                        isActive
                          ? 'bg-indigo-500/12 text-indigo-300 ring-1 ring-inset ring-indigo-500/15'
                          : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-200',
                        collapsed ? 'justify-center' : '',
                      ].join(' ')
                    }
                  >
                    <Icon size={18} />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                )
              })}
            </nav>
          </div>

          <div className="mt-auto p-3">
            {!collapsed && (
              <div className="mb-3 rounded-2xl border border-indigo-500/15 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-indigo-300">
                  <Sparkles size={15} />
                  <span className="text-xs font-bold">Auto Apply</span>
                </div>

                <p className="text-[11px] leading-5 text-slate-500">
                  Keep your profile updated to get better job matches.
                </p>
              </div>
            )}

            <button
              onClick={handleLogout}
              title={collapsed ? 'Logout' : undefined}
              className={[
                'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-500 transition hover:bg-red-500/10 hover:text-red-300',
                collapsed ? 'justify-center' : '',
              ].join(' ')}
            >
              <LogOut size={18} />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-white/10 bg-[#070b14]/85 px-4 backdrop-blur-xl md:px-7">
            <div className="flex items-center gap-3">
              <button
                className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-slate-400 lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={20} />
              </button>

              <div>
                <div className="text-sm font-semibold text-slate-200">
                  Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
                </div>
                <div className="hidden text-xs text-slate-600 sm:block">
                  Let's find your next opportunity.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-500 md:block">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400" />
                System ready
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-slate-700 to-slate-900 text-sm font-bold text-slate-200">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1500px] p-4 md:p-7">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
