import { FormEvent, useState } from 'react'
import { Eye, EyeOff, LockKeyhole, Mail, Sparkles, ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to login. Please check your credentials.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative hidden overflow-hidden border-r border-white/10 lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,.25),transparent_32%),radial-gradient(circle_at_70%_80%,rgba(139,92,246,.14),transparent_30%)]" />

          <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
                <Sparkles size={21} />
              </div>
              <div className="text-xl font-extrabold">
                JobAuto<span className="text-indigo-400">Apply</span>
              </div>
            </div>

            <div className="max-w-xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1.5 text-xs font-bold text-indigo-300">
                <Sparkles size={13} />
                Smart job application assistant
              </div>

              <h1 className="text-5xl font-black leading-[1.08] tracking-tight xl:text-6xl">
                Your next career move,
                <span className="block text-indigo-400">simplified.</span>
              </h1>

              <p className="mt-6 max-w-lg text-base leading-7 text-slate-500">
                Manage your profile, define your job preferences, and keep your
                application workflow organized from one place.
              </p>

              <div className="mt-10 grid grid-cols-3 gap-3">
                {[
                  ['01', 'Profile'],
                  ['02', 'Preferences'],
                  ['03', 'Applications'],
                ].map(([number, title]) => (
                  <div
                    key={number}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="text-xs font-bold text-indigo-400">{number}</div>
                    <div className="mt-2 text-sm font-semibold text-slate-300">
                      {title}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-600">
              © {new Date().getFullYear()} JobAutoApply
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-5 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
                  <Sparkles size={21} />
                </div>
                <div className="text-xl font-extrabold">
                  JobAuto<span className="text-indigo-400">Apply</span>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="mb-3 inline-flex rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300">
                Welcome back
              </div>

              <h2 className="text-3xl font-black tracking-tight">
                Sign in to your account
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Continue managing your job search.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-5">
              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div>
                <label className="label">Email address</label>
                <div className="relative">
                  <Mail
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                  />
                  <input
                    className="input pl-10"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <LockKeyhole
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                  />

                  <input
                    className="input px-10"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button disabled={loading} className="btn-primary w-full py-3.5">
                {loading ? 'Signing in...' : 'Sign in'}
                {!loading && <ArrowRight size={17} />}
              </button>
            </form>

            <div className="mt-7 text-center text-sm text-slate-500">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-bold text-indigo-400 hover:text-indigo-300"
              >
                Create one
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
