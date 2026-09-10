import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  MapPin,
  Save,
  UserRound,
} from 'lucide-react'
import api from '../../lib/axios'

type Profile = {
  id?: string
  phone?: string
  currentCompany?: string
  currentTitle?: string
  currentCtc?: number
  expectedCtc?: number
  experienceYears?: number
  noticePeriod?: string
  skills?: string[]
  currentCity?: string
  preferredCities?: string[]
  willingToRelocate?: boolean
  resumeUrl?: string
  naukriProfileUrl?: string
}

const emptyProfile: Profile = {
  phone: '',
  currentCompany: '',
  currentTitle: '',
  currentCtc: undefined,
  expectedCtc: undefined,
  experienceYears: undefined,
  noticePeriod: '',
  skills: [],
  currentCity: '',
  preferredCities: [],
  willingToRelocate: false,
  resumeUrl: '',
  naukriProfileUrl: '',
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [skillsText, setSkillsText] = useState('')
  const [preferredCitiesText, setPreferredCitiesText] = useState('')
  const [completion, setCompletion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setLoading(true)

      const [profileResponse, completionResponse] = await Promise.all([
        api.get('/profiles/me'),
        api.get('/profiles/completion'),
      ])

      const data = profileResponse.data || emptyProfile

      setProfile(data)
      setSkillsText((data.skills || []).join(', '))
      setPreferredCitiesText((data.preferredCities || []).join(', '))

      const value = completionResponse.data?.completion
      setCompletion(Number(value || 0))
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        setError(
          err?.response?.data?.message ||
            'Unable to load profile information.',
        )
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const update = (key: keyof Profile, value: any) => {
    setProfile((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    const payload = {
      ...profile,
      currentCtc:
        profile.currentCtc === undefined
          ? undefined
          : Number(profile.currentCtc),
      expectedCtc:
        profile.expectedCtc === undefined
          ? undefined
          : Number(profile.expectedCtc),
      experienceYears:
        profile.experienceYears === undefined
          ? undefined
          : Number(profile.experienceYears),
      skills: skillsText
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
      preferredCities: preferredCitiesText
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    }

    try {
      if (profile.id) {
        await api.put('/profiles/me', payload)
      } else {
        const response = await api.post('/profiles', payload)
        setProfile(response.data)
      }

      setMessage('Profile saved successfully.')
      await load()
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Unable to save your profile. Please check the fields.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-sm text-slate-500">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="animate-in space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-400">
          <UserRound size={14} />
          Profile
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          Your professional profile
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Keep your professional information accurate for better job matching.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <form onSubmit={save} className="card rounded-3xl p-5 md:p-7">
          {message && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              <CheckCircle2 size={16} />
              {message}
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
              <BriefcaseBusiness size={20} />
            </div>
            <div>
              <h2 className="font-bold">Professional details</h2>
              <p className="text-xs text-slate-600">
                Your current career information
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={profile.phone || ''}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+91 9876543210"
              />
            </div>

            <div>
              <label className="label">Current company</label>
              <input
                className="input"
                value={profile.currentCompany || ''}
                onChange={(e) => update('currentCompany', e.target.value)}
                placeholder="Company name"
              />
            </div>

            <div>
              <label className="label">Current title</label>
              <input
                className="input"
                value={profile.currentTitle || ''}
                onChange={(e) => update('currentTitle', e.target.value)}
                placeholder="Software Developer"
              />
            </div>

            <div>
              <label className="label">Experience (years)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.1"
                value={profile.experienceYears ?? ''}
                onChange={(e) =>
                  update(
                    'experienceYears',
                    e.target.value === '' ? undefined : Number(e.target.value),
                  )
                }
                placeholder="2"
              />
            </div>

            <div>
              <label className="label">Current CTC</label>
              <input
                className="input"
                type="number"
                min="0"
                value={profile.currentCtc ?? ''}
                onChange={(e) =>
                  update(
                    'currentCtc',
                    e.target.value === '' ? undefined : Number(e.target.value),
                  )
                }
                placeholder="600000"
              />
            </div>

            <div>
              <label className="label">Expected CTC</label>
              <input
                className="input"
                type="number"
                min="0"
                value={profile.expectedCtc ?? ''}
                onChange={(e) =>
                  update(
                    'expectedCtc',
                    e.target.value === '' ? undefined : Number(e.target.value),
                  )
                }
                placeholder="900000"
              />
            </div>

            <div>
              <label className="label">Notice period</label>
              <select
                className="input"
                value={profile.noticePeriod || ''}
                onChange={(e) => update('noticePeriod', e.target.value)}
              >
                <option value="">Select notice period</option>
                <option value="Immediate">Immediate</option>
                <option value="15 days">15 days</option>
                <option value="30 days">30 days</option>
                <option value="60 days">60 days</option>
                <option value="90 days">90 days</option>
              </select>
            </div>

            <div>
              <label className="label">Current city</label>
              <div className="relative">
                <MapPin
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                />
                <input
                  className="input pl-9"
                  value={profile.currentCity || ''}
                  onChange={(e) => update('currentCity', e.target.value)}
                  placeholder="Noida"
                />
              </div>
            </div>
          </div>

          <div className="mt-5">
            <label className="label">Skills</label>
            <input
              className="input"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="React, Node.js, TypeScript, Docker"
            />
            <p className="mt-1.5 text-[11px] text-slate-600">
              Separate skills with commas.
            </p>
          </div>

          <div className="mt-5">
            <label className="label">Preferred cities</label>
            <input
              className="input"
              value={preferredCitiesText}
              onChange={(e) => setPreferredCitiesText(e.target.value)}
              placeholder="Noida, Delhi, Gurgaon, Bangalore"
            />
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <input
              id="relocate"
              type="checkbox"
              checked={Boolean(profile.willingToRelocate)}
              onChange={(e) => update('willingToRelocate', e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-indigo-500"
            />
            <label htmlFor="relocate" className="cursor-pointer text-sm text-slate-300">
              I am willing to relocate
            </label>
          </div>

          <div className="mt-7 border-t border-white/5 pt-7">
            <div className="mb-5 flex items-center gap-3">
              <FileText size={19} className="text-indigo-300" />
              <div>
                <h2 className="font-bold">Application links</h2>
                <p className="text-xs text-slate-600">
                  Add relevant profile and resume URLs.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="label">Resume URL</label>
                <input
                  className="input"
                  value={profile.resumeUrl || ''}
                  onChange={(e) => update('resumeUrl', e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="label">Naukri profile URL</label>
                <input
                  className="input"
                  value={profile.naukriProfileUrl || ''}
                  onChange={(e) => update('naukriProfileUrl', e.target.value)}
                  placeholder="https://www.naukri.com/..."
                />
              </div>
            </div>
          </div>

          <div className="mt-7 flex justify-end">
            <button disabled={saving} className="btn-primary">
              <Save size={16} />
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </div>
        </form>

        <aside className="space-y-5">
          <div className="card rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Profile strength</span>
              <span className="text-2xl font-black text-indigo-300">
                {completion}%
              </span>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, completion))}%` }}
              />
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-600">
              A complete profile helps the system understand your professional
              background and matching criteria.
            </p>
          </div>

          <div className="card rounded-3xl p-6">
            <h3 className="text-sm font-bold">Profile checklist</h3>

            <div className="mt-5 space-y-3 text-xs">
              {[
                ['Professional details', Boolean(profile.currentTitle)],
                ['Experience', profile.experienceYears !== undefined],
                ['Skills', (profile.skills || []).length > 0 || skillsText.trim().length > 0],
                ['Location', Boolean(profile.currentCity)],
                ['Resume', Boolean(profile.resumeUrl)],
              ].map(([label, done]) => (
                <div key={String(label)} className="flex items-center gap-3">
                  <div
                    className={[
                      'flex h-6 w-6 items-center justify-center rounded-full',
                      done
                        ? 'bg-emerald-500/10 text-emerald-300'
                        : 'bg-white/5 text-slate-600',
                    ].join(' ')}
                  >
                    <CheckCircle2 size={14} />
                  </div>
                  <span className={done ? 'text-slate-300' : 'text-slate-600'}>
                    {String(label)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
