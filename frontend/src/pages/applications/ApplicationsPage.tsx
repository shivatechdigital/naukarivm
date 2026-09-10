import { useState, useEffect } from 'react';
import API from '../../lib/axios';
import {
  Send,
  CheckCircle,
  XCircle,
  Clock,
  SkipForward,
  ExternalLink,
  Search,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchApplications();

    const refreshApplications = () => {
      fetchApplications();
    };

    const handleStorageUpdate = (event: StorageEvent) => {
      if (event.key === 'applications-updated-at') {
        refreshApplications();
      }
    };

    window.addEventListener('applications-updated', refreshApplications);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      window.removeEventListener('applications-updated', refreshApplications);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/applications?limit=50');
      setApplications(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredApps = applications.filter((app) => {
    const matchesStatus =
      statusFilter === 'ALL' || app.status === statusFilter;
    const matchesSearch =
      app.job?.title?.toLowerCase().includes(search.toLowerCase()) ||
      app.job?.company?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPLIED':
        return (
          <span className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
            <CheckCircle className="w-3.5 h-3.5" /> Applied
          </span>
        );
      case 'ALREADY_APPLIED':
        return (
          <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
            <CheckCircle className="w-3.5 h-3.5" /> Already Applied
          </span>
        );
      case 'PENDING':
        return (
          <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
            <Clock className="w-3.5 h-3.5" /> Queue Pending
          </span>
        );
      case 'SKIPPED':
        return (
          <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
            <SkipForward className="w-3.5 h-3.5" /> External Redirect
          </span>
        );
      case 'FAILED':
        return (
          <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
            <XCircle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      default:
        return (
          <span className="bg-gray-800 text-gray-400 text-xs px-2.5 py-1 rounded-full">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Send className="w-6 h-6 text-blue-500" />
            Applied Jobs Tracker
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time status of all automated job applications
          </p>
        </div>

        <button
          onClick={fetchApplications}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg border border-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Job Title or Company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-1 bg-gray-900 p-1 border border-gray-800 rounded-lg overflow-x-auto">
          {['ALL', 'APPLIED', 'PENDING', 'SKIPPED', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-400">
          No applications found for this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {app.job?.title}
                  </h3>
                  <p className="text-gray-400 text-sm">{app.job?.company}</p>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(app.status)}
                  <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-1 rounded-full font-bold">
                    {app.matchScore}% Match
                  </span>
                  {app.job?.url && (
                    <a
                      href={app.job.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gray-400 hover:text-white p-1"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Match Reasons */}
              {app.matchReasons && app.matchReasons.length > 0 && (
                <div className="flex flex-wrap gap-1.5 my-2">
                  {app.matchReasons.map((r: string, idx: number) => (
                    <span
                      key={idx}
                      className="bg-gray-800 text-gray-400 text-[11px] px-2 py-0.5 rounded"
                    >
                      ✓ {r}
                    </span>
                  ))}
                </div>
              )}

              {/* Error Message if Failed */}
              {app.errorMessage && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded mt-2">
                  Error: {app.errorMessage}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
