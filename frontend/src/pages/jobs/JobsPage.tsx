import { useState, useEffect } from 'react';
import API from '../../lib/axios';
import {
  Briefcase,
  MapPin,
  IndianRupee,
  ExternalLink,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Send,
} from 'lucide-react';

const getDescriptionText = (description: string) => {
  const document = new DOMParser().parseFromString(description, 'text/html');
  return (document.body.textContent || '').replace(/\s+/g, ' ').trim();
};

const formatPostedDate = (value: string | null | undefined) => {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Posted just now';
  if (diffHours < 24) return `Posted ${diffHours}h ago`;
  if (diffDays === 1) return 'Posted 1 day ago';
  if (diffDays < 30) return `Posted ${diffDays} days ago`;

  return `Posted on ${date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`;
};

const notifyApplicationsUpdated = () => {
  window.dispatchEvent(new Event('applications-updated'));
  window.localStorage.setItem('applications-updated-at', String(Date.now()));
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [easyApplyOnly, setEasyApplyOnly] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [applyingAll, setApplyingAll] = useState(false);

  const fetchJobs = async (targetPage = page) => {
    setLoading(true);
    try {
      const { data } = await API.get(
        `/jobs?search=${encodeURIComponent(search)}&page=${targetPage}&limit=20${easyApplyOnly ? '&isEasyApply=true' : ''}`,
      );
      setJobs(data.data ?? []);
      setTotalPages(data.meta?.totalPages ?? 1);
      setPage(targetPage);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(1);
  }, []);

  const handleTriggerScrape = async () => {
    setScraping(true);
    setStatusMsg('');

    try {
      const { data } = await API.post('/jobs/scrape', {
        maxPagesPerQuery: 1,
      });

      setStatusMsg(`🎉 ${data.jobsSaved} fresh jobs scraped!`);
      await fetchJobs(1);
    } catch (err: any) {
      const response = err?.response;
      const errorData = response?.data;

      if (
        response?.status === 503 &&
        errorData?.blocked === true &&
        errorData?.reason === 'NAUKRI_HTTP_403'
      ) {
        setStatusMsg(
          '⚠️ Naukri ne Access Denied (403) return kiya. Abhi jobs fetch nahi ho pa rahi hain.',
        );
      } else {
        setStatusMsg(
          errorData?.message || 'Scrape trigger fail ho gaya',
        );
      }
    } finally {
      setScraping(false);
    }
  };

  const handleApply = async (jobId: string) => {
    if (applyingJobId) return;

    setApplyingJobId(jobId);
    setStatusMsg('' );

    try {
      const { data } = await API.post(`/applications/apply/${jobId}`);

      if (data?.status === 'APPLIED' || data?.status === 'ALREADY_APPLIED') {
        setAppliedJobIds((prev) => {
          const next = new Set(prev);
          next.add(jobId);
          return next;
        });
      }

      notifyApplicationsUpdated();
      setStatusMsg(data?.message || 'Application processed successfully.');
      await fetchJobs(page);
    } catch (err: any) {
      setStatusMsg(
        err?.response?.data?.message ||
          'Application failed. Please try again.'
      );
    } finally {
      setApplyingJobId(null);
    }
  };

  const handleApplyAll = async () => {
    if (applyingAll || applyingJobId) return;

    const eligibleJobs = jobs.filter((job) => !appliedJobIds.has(job.id));

    if (eligibleJobs.length === 0) {
      setStatusMsg('No unapplied jobs available on this page.');
      return;
    }

    setApplyingAll(true);
    setStatusMsg(
      `Applying to ${eligibleJobs.length} jobs...`,
    );

    let applied = 0;
    let alreadyApplied = 0;
    let failed = 0;
    let skipped = 0;

    try {
      for (const job of eligibleJobs) {
        try {
          const { data } = await API.post(
            `/applications/apply/${job.id}`,
          );

          const status = data?.status;

          if (status === 'APPLIED') {
            applied++;
            setAppliedJobIds((prev) => {
              const next = new Set(prev);
              next.add(job.id);
              return next;
            });
          } else if (status === 'ALREADY_APPLIED') {
            alreadyApplied++;
            setAppliedJobIds((prev) => {
              const next = new Set(prev);
              next.add(job.id);
              return next;
            });
          } else if (status === 'SKIPPED') {
            skipped++;
          } else {
            failed++;
          }

          notifyApplicationsUpdated();
        } catch {
          failed++;
          notifyApplicationsUpdated();
        }

        setStatusMsg(
          `Apply All running... Applied: ${applied}, Already Applied: ${alreadyApplied}, Failed: ${failed}, Skipped: ${skipped}`,
        );
      }

      setStatusMsg(
        `Apply All complete: ${applied} applied, ${alreadyApplied} already applied, ${failed} failed, ${skipped} skipped.`,
      );

      await fetchJobs(page);
    } finally {
      setApplyingAll(false);
    }
  };

  const handleSearch = () => {
    fetchJobs(1);
  };

  const handleEasyApplyToggle = () => {
    setEasyApplyOnly((prev) => !prev);
    setTimeout(() => fetchJobs(1), 0);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchJobs(newPage);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Discovered Jobs</h1>
          <p className="text-gray-400 text-sm">
            Naukri se scrape ki gayi live openings
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTriggerScrape}
            disabled={scraping || applyingAll}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            {scraping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scraping Naukri...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Scrape Fresh Jobs
              </>
            )}
          </button>

          <button
            onClick={handleApplyAll}
            disabled={applyingAll || applyingJobId !== null}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:text-gray-400 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            {applyingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Applying All...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Apply All
              </>
            )}
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`mb-4 text-sm px-4 py-3 rounded-lg flex items-center gap-2 ${
            statusMsg.includes('Access Denied') || statusMsg.includes('fail')
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
              : 'bg-green-500/10 border border-green-500/30 text-green-400'
          }`}
        >
          {statusMsg.includes('Access Denied') || statusMsg.includes('fail') ? (
            <span className="text-base">⚠️</span>
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          {statusMsg}
        </div>
      )}

      {/* Search Input */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, company, or skill..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <button
          onClick={handleSearch}
          className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
        >
          Search
        </button>
      </div>

      <div className="mb-4 flex items-center justify-end">
        <button
          type="button"
          onClick={handleEasyApplyToggle}
          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
            easyApplyOnly
              ? 'bg-blue-600 text-white border-blue-500'
              : 'bg-gray-900 text-gray-300 border-gray-700 hover:bg-gray-800'
          }`}
        >
          {easyApplyOnly ? 'Direct Apply Only: ON' : 'Direct Apply Only: OFF'}
        </button>
      </div>

      {/* Job Cards */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Koi job nahi mili.</p>
          <p className="text-gray-600 text-xs mt-1">
            "Scrape Fresh Jobs" button dabao ya preferences check karo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-white hover:text-blue-400">
                    {job.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-300 font-medium text-sm">
                      {job.company}
                    </span>
                    {job.companyRating && (
                      <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded font-bold">
                        ★ {job.companyRating}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {job.isEasyApply && (
  <>
    <span className="bg-green-500/10 text-green-400 border border-green-500/30 text-xs px-2.5 py-1 rounded-full font-medium">
      Easy Apply
    </span>

    {appliedJobIds.has(job.id) ? (
      <span className="flex items-center gap-1 bg-green-500/10 text-green-400 border border-green-500/30 text-xs px-3 py-1.5 rounded-lg font-medium">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Applied
      </span>
    ) : (
      <button
        onClick={() => handleApply(job.id)}
        disabled={applyingJobId !== null}
        className="flex items-center gap-1 bg-green-500/10 hover:bg-green-500/20 disabled:bg-gray-700 disabled:text-gray-400 text-green-400 border border-green-500/30 text-xs px-2.5 py-1 rounded-full font-medium transition-colors"
      >
        {applyingJobId === job.id ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Applying...
          </>
        ) : (
          <>
            <Send className="w-3.5 h-3.5" />
            Apply Now
          </>
        )}
      </button>
    )}
  </>
)}
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs px-3 py-1.5 rounded-lg border border-gray-700"
                  >
                    View on Naukri <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Details strip */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 my-3">
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-gray-500" />
                  {job.experience || 'Not specified'}
                </span>
                <span className="flex items-center gap-1">
                  <IndianRupee className="w-3.5 h-3.5 text-gray-500" />
                  {job.salary || 'Not Disclosed'}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-500" />
                  {job.location}
                  <span className="flex items-center gap-1">
                    🗓️ {formatPostedDate(job.postedDate)}
                  </span>
                </span>
              </div>

              {/* Description Snippet */}
              {job.description && (
                <p className="text-gray-400 text-xs line-clamp-2 mb-3">
                  {getDescriptionText(job.description)}
                </p>
              )}

              {/* Skills */}
              <div className="flex flex-wrap gap-1.5">
                {job.skills?.slice(0, 6).map((skill: string) => (
                  <span
                    key={skill}
                    className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1 || loading}
                className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm"
              >
                Previous
              </button>

              <span className="text-sm text-gray-300">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages || loading}
                className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

