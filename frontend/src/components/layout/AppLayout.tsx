import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Target,
  X,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'My Profile', path: '/profile', icon: CircleUserRound },
  { label: 'Job Preferences', path: '/preferences', icon: Target },
  { label: 'Jobs', path: '/jobs', icon: BriefcaseBusiness },
]

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const navigate = useNavigate()
  const auth = useAuth()

  const user = auth.user

  const handleLogout = () => {
    auth.logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100">
      <div className="flex min-h-screen">

        {mobileOpen && (
          <button
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
        )}

        <aside
          className={[
            'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-[#0a0f1c] transition-all duration-300 lg:relative lg:translate-x-0',
            collapsed ? 'w-[82px]' : 'w-[255px]',
            mobileOpen
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0',
          ].join(' ')}
        >
          <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-5">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
                <BriefcaseBusiness size={21} />
              </div>

              {!collapsed && (
                <div>
                  <div className="whitespace-nowrap text-[16px] font-extrabold">
                    JobAuto<span className="text-indigo-400">Apply</span>
                  </div>

                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
                    Career Assistant
                  </div>
                </div>
              )}
            </div>

            <button
              className="hidden rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white lg:block"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <ChevronRight size={17} />
              ) : (
                <ChevronLeft size={17} />
              )}
            </button>

            <button
              className="lg:hidden"
              onClick={() => setMobileOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 space-y-2 p-3 pt-6">
            {!collapsed && (
              <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
                Workspace
              </div>
            )}

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
                      'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition',
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-300 ring-1 ring-inset ring-indigo-500/20'
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

          <div className="border-t border-white/5 p-3">
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
          <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-white/10 bg-[#070b14]/90 px-4 backdrop-blur-xl md:px-7">
            <div className="flex items-center gap-3">
              <button
                className="rounded-xl border border-white/10 bg-white/[0.03] p-2 lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={20} />
              </button>

              <div>
                <div className="text-sm font-semibold text-slate-200">
                  Welcome back
                  {user?.name
                    ? `, ${user.name.split(' ')[0]}`
                    : ''}
                </div>

                <div className="hidden text-xs text-slate-600 sm:block">
                  Let's find your next opportunity.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-500 md:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                System ready
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold">
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
