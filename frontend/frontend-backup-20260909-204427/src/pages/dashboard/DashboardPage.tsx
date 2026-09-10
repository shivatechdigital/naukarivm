import {
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const stats = [
  {
    label: 'Applications',
    value: '0',
    note: 'Start applying',
    icon: BriefcaseBusiness,
  },
  {
    label: 'Profile strength',
    value: '0%',
    note: 'Complete your profile',
    icon: UserRound,
  },
  {
    label: 'Jobs matched',
    value: '0',
    note: 'Configure preferences',
    icon: Target,
  },
  {
    label: 'Success rate',
    value: '—',
    note: 'No applications yet',
    icon: TrendingUp,
  },
]

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="animate-in space-y-7">
      <section className="relative overflow-hidden rounded-3xl border border-indigo-500/15 bg-gradient-to-br from-indigo-600/20 via-[#11182b] to-[#0a0f1c] p-6 md:p-8">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-60 w-60 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1.5 text-xs font-bold text-indigo-300">
              <Sparkles size={13} />
              Smart career workspace
            </div>

            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              Good to see you{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Your job search command center. Keep your profile complete and
              define your preferences to prepare your application workflow.
            </p>
          </div>

          <Link to="/profile" className="btn-primary shrink-0">
            Complete profile
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon

          return (
            <div key={stat.label} className="card rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
                  <Icon size={19} />
                </div>

                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Today
                </span>
              </div>

              <div className="mt-5 text-3xl font-black tracking-tight">
                {stat.value}
              </div>

              <div className="mt-1 text-sm font-semibold text-slate-300">
                {stat.label}
              </div>

              <div className="mt-1 text-xs text-slate-600">
                {stat.note}
              </div>
            </div>
          )
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="card rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Getting started</h2>
              <p className="mt-1 text-xs text-slate-600">
                Complete these steps to prepare your workspace.
              </p>
            </div>

            <FileCheck2 size={20} className="text-indigo-400" />
          </div>

          <div className="mt-6 space-y-3">
            <Link
              to="/profile"
              className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.025] p-4 transition hover:border-indigo-500/20 hover:bg-indigo-500/[0.04]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
                <UserRound size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">Complete your profile</div>
                <div className="mt-1 text-xs text-slate-600">
                  Add your experience, skills and professional information.
                </div>
              </div>

              <ArrowUpRight
                size={17}
                className="text-slate-600 transition group-hover:text-indigo-300"
              />
            </Link>

            <Link
              to="/preferences"
              className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.025] p-4 transition hover:border-indigo-500/20 hover:bg-indigo-500/[0.04]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                <Target size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">
                  Configure job preferences
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  Define titles, locations, salary and matching criteria.
                </div>
              </div>

              <ArrowUpRight
                size={17}
                className="text-slate-600 transition group-hover:text-violet-300"
              />
            </Link>

            <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.025] p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                <CheckCircle2 size={18} />
              </div>

              <div>
                <div className="text-sm font-semibold">Application engine</div>
                <div className="mt-1 text-xs text-slate-600">
                  Ready to connect with your configured workflow.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
              <Clock3 size={19} />
            </div>

            <div>
              <h2 className="text-lg font-bold">Activity</h2>
              <p className="text-xs text-slate-600">Recent workspace activity</p>
            </div>
          </div>

          <div className="mt-8 flex min-h-[230px] flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
              <BriefcaseBusiness size={22} className="text-slate-600" />
            </div>

            <div className="mt-4 text-sm font-semibold text-slate-400">
              No activity yet
            </div>

            <p className="mt-2 max-w-xs text-xs leading-5 text-slate-600">
              Once your workspace is configured, your application activity
              will appear here.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
