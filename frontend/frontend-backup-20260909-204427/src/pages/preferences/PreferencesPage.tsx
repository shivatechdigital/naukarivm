import { FormEvent, useEffect, useState } from 'react'
import {
  BellRing,
  CheckCircle2,
  MapPin,
  Save,
  Target,
  Zap,
} from 'lucide-react'
import api from '../../lib/axios'

type Preferences = {
  id?: string
  jobTitles?: string[]
  keywords?: string[]
  locations?: string[]
  experienceMin?: number
  experienceMax?: number
  salaryMin?: number
  salaryMax?: number
  jobTypes?: string[]
  industries?: string[]
  excludedCompanies?: string[]
  excludedKeywords?: string[]
  isActive?: boolean
  maxApplicationsPerDay?: number
  matchScoreThreshold?: number
}

const emptyPreferences: Preferences = {
  jobTitles: [],
  keywords: [],
  locations: [],
  experienceMin: undefined,
  experienceMax: undefined,
  salaryMin: undefined,
  salaryMax: undefined,
  jobTypes: [],
  industries: [],
  excludedCompanies: [],
  excludedKeywords: [],
  isActive: true,
  maxApplicationsPerDay: 10,
  matchScoreThreshold: 70,
}

export default function PreferencesPage() {
  const [preferences, setPreferences] =
    useState<Preferences>(emptyPreferences)

  const [jobTitles, setJobTitles] = useState('')
  const [keywords, setKeywords] = useState('')
  const [locations, setLocations] = useState('')
  const [jobTypes, setJobTypes] = useState('')
  const [industries, setIndustries] = useState('')
  const [excludedCompanies, setExcludedCompanies] = useState('')
  const [excludedKeywords, setExcludedKeywords] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const list = (value: string) =>
    value
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)

  const load = async () => {
    try {
      setLoading(true)
      const response = await api.get('/preferences/me')

      const data = response.data || emptyPreferences

      setPreferences(data)
      setJobTitles((data.jobTitles || []).join(', '))
      setKeywords((data.keywords || []).join(', '))
      setLocations((data.locations || []).join(', '))
      setJobTypes((data.jobTypes || []).join(', '))
      setIndustries((data.industries || []).join(', '))
      setExcludedCompanies((data.excludedCompanies || []).join(', '))
      setExcludedKeywords((data.excludedKeywords || []).join(', '))
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        setError(
          err?.response?.data?.message ||
            'Unable to load your job preferences.',
        )
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const update = (key: keyof Preferences, value: any) => {
    setPreferences((current) => ({
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
      ...preferences,
      jobTitles: list(jobTitles),
      keywords: list(keywords),
      locations: list(locations),
      jobTypes: list(jobTypes),
      industries: list(industries),
      excludedCompanies: list(excludedCompanies),
      excludedKeywords: list(excludedKeywords),
    }

    try {
      if (preferences.id) {
        await api.put('/preferences/me', payload)
      } else {
        const response = await api.post('/preferences', payload)
        setPreferences(response.data)
      }

      setMessage('Job preferences saved successfully.')
      await load()
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Unable to save your preferences.',
      )
    } finally {
      setSaving(false)
    }
  }

  const toggle = async () => {
    try {
      const response = await api.patch('/preferences/toggle')
      setPreferences((current) => ({
        ...current,
        isActive: response.data?.isActive ?? !current.isActive,
      }))
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Unable to change automation status.',
      )
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-sm text-slate-500">Loading preferences...</div>
      </div>
    )
  }

  return (
    <div className="animate-in space-y-6" style={{ marginTop: '20px' }}>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-400">
            <Target size={14} />
            Job preferences
          </div>

          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Tell us what you're looking for
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Define your target roles and matching criteria.
          </p>
        </div>

        <button
          onClick={toggle}
          className={[
            'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition',
            preferences.isActive
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
              : 'border-white/10 bg-white/[0.03] text-slate-500',
          ].join(' ')}
        >
          <span
            className={[
              'h-2.5 w-2.5 rounded-full',
              preferences.isActive ? 'bg-emerald-400' : 'bg-slate-600',
            ].join(' ')}
          />
          {preferences.isActive ? 'Preferences active' : 'Preferences inactive'}
        </button>
      </div>

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

        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="label">Target job titles</label>
            <input
              className="input"
              value={jobTitles}
              onChange={(e) => setJobTitles(e.target.value)}
              placeholder="Software Developer, Backend Developer, Node.js Developer"
            />
          </div>

          <div>
            <label className="label">Keywords</label>
            <input
              className="input"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Node.js, React, AWS, Docker"
            />
          </div>

          <div>
            <label className="label">Preferred locations</label>
            <div className="relative">
              <MapPin
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
              />
              <input
                className="input pl-9"
                value={locations}
                onChange={(e) => setLocations(e.target.value)}
                placeholder="Noida, Delhi, Gurgaon"
              />
            </div>
          </div>

          <div>
            <label className="label">Minimum experience</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.1"
              value={preferences.experienceMin ?? ''}
              onChange={(e) =>
                update(
                  'experienceMin',
                  e.target.value === '' ? undefined : Number(e.target.value),
                )
              }
              placeholder="2"
            />
          </div>

          <div>
            <label className="label">Maximum experience</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.1"
              value={preferences.experienceMax ?? ''}
              onChange={(e) =>
                update(
                  'experienceMax',
                  e.target.value === '' ? undefined : Number(e.target.value),
                )
              }
              placeholder="6"
            />
          </div>

          <div>
            <label className="label">Minimum salary</label>
            <input
              className="input"
              type="number"
              min="0"
              value={preferences.salaryMin ?? ''}
              onChange={(e) =>
                update(
                  'salaryMin',
                  e.target.value === '' ? undefined : Number(e.target.value),
                )
              }
              placeholder="600000"
            />
          </div>

          <div>
            <label className="label">Maximum salary</label>
            <input
              className="input"
              type="number"
              min="0"
              value={preferences.salaryMax ?? ''}
              onChange={(e) =>
                update(
                  'salaryMax',
                  e.target.value === '' ? undefined : Number(e.target.value),
                )
              }
              placeholder="1200000"
            />
          </div>

          <div>
            <label className="label">Job types</label>
            <input
              className="input"
              value={jobTypes}
              onChange={(e) => setJobTypes(e.target.value)}
              placeholder="Full-time, Hybrid, Remote"
            />
          </div>

          <div>
            <label className="label">Industries</label>
            <input
              className="input"
              value={industries}
              onChange={(e) => setIndustries(e.target.value)}
              placeholder="IT Services, SaaS, FinTech"
            />
          </div>

          <div>
            <label className="label">Excluded companies</label>
            <input
              className="input"
              value={excludedCompanies}
              onChange={(e) => setExcludedCompanies(e.target.value)}
              placeholder="Company A, Company B"
            />
          </div>

          <div>
            <label className="label">Excluded keywords</label>
            <input
              className="input"
              value={excludedKeywords}
              onChange={(e) => setExcludedKeywords(e.target.value)}
              placeholder="Internship, unpaid"
            />
          </div>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-indigo-500/10 bg-indigo-500/[0.04] p-5">
            <div className="flex items-center gap-3">
              <Zap size={18} className="text-indigo-300" />
              <div>
                <div className="text-sm font-bold">Daily applications</div>
                <div className="text-xs text-slate-600">
                  Maximum applications per day
                </div>
              </div>
            </div>

            <input
              className="input mt-4"
              type="number"
              min="1"
              max="100"
              value={preferences.maxApplicationsPerDay ?? 10}
              onChange={(e) =>
                update('maxApplicationsPerDay', Number(e.target.value))
              }
            />
          </div>

          <div className="rounded-2xl border border-violet-500/10 bg-violet-500/[0.04] p-5">
            <div className="flex items-center gap-3">
              <BellRing size={18} className="text-violet-300" />
              <div>
                <div className="text-sm font-bold">Match threshold</div>
                <div className="text-xs text-slate-600">
                  Minimum match score to consider a job
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <input
                className="w-full accent-indigo-500"
                type="range"
                min="0"
                max="100"
                value={preferences.matchScoreThreshold ?? 70}
                onChange={(e) =>
                  update('matchScoreThreshold', Number(e.target.value))
                }
              />
              <span className="w-12 text-right text-sm font-black text-violet-300">
                {preferences.matchScoreThreshold ?? 70}%
              </span>
            </div>
          </div>
        </div>

        <div className="mt-7 flex justify-end">
          <button disabled={saving} className="btn-primary">
            <Save size={16} />
            {saving ? 'Saving...' : 'Save preferences'}
          </button>
        </div>
      </form>
    </div>
  )
}
