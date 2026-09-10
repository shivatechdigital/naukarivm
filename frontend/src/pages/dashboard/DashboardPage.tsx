import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../lib/axios';
import NaukriConnectModal from '../../components/naukri/NaukriConnectModal';
import {
  Play,
  Loader2,
  CheckCircle,
  Terminal,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { user } = useAuth();
  const [naukriStatus, setNaukriStatus] = useState<any>(null);
  const [showNaukriModal, setShowNaukriModal] = useState(false);
  const [runningCycle, setRunningCycle] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState({
    totalApplied: 0,
    jobsFoundToday: 0,
    failed: 0,
  });

  useEffect(() => {
    fetchNaukriStatus();
    fetchActivityLogs();
    fetchDashboardStats();
  }, []);

  const fetchNaukriStatus = () => {
    API.get('/naukri/status')
      .then(({ data }) => setNaukriStatus(data))
      .catch(() => {});
  };

  const fetchActivityLogs = () => {
    API.get('/automation/logs?limit=10')
      .then(({ data }) => setLogs(data || []))
      .catch(() => {});
  };

  const fetchDashboardStats = () => {
    API.get('/applications/stats')
      .then(({ data }) => {
        setStats({
          totalApplied: data?.totalApplied ?? 0,
          jobsFoundToday: data?.jobsFoundToday ?? 0,
          failed: data?.failed ?? 0,
        });
      })
      .catch(() => {});
  };

  const handleTriggerAutomation = async () => {
    setRunningCycle(true);
    setMessage('');
    try {
      const { data } = await API.post('/automation/trigger');
      setMessage(`🚀 ${data.message}`);
      setTimeout(() => {
        fetchActivityLogs();
        fetchDashboardStats();
      }, 4000);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Automation trigger failed');
    } finally {
      setRunningCycle(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-gray-900 to-gray-900 border border-blue-500/20 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Naukri Auto-Apply Engine is online and monitoring opportunities.
          </p>
        </div>

        <button
          onClick={handleTriggerAutomation}
          disabled={runningCycle || !naukriStatus?.isConnected}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 text-white font-medium px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 flex-shrink-0"
        >
          {runningCycle ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Enqueuing Cycle...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" /> Run Full Automation
            </>
          )}
        </button>
      </div>

      {message && (
        <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <Activity className="w-4 h-4" /> {message}
        </div>
      )}

      {/* Dashboard Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-xs uppercase font-medium">
            Total Applied
          </p>
          <h3 className="text-3xl font-bold text-white mt-2">
            {stats.totalApplied}
          </h3>
          <p className="text-gray-500 text-xs mt-1">
            Successful applications
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-xs uppercase font-medium">
            Jobs Found Today
          </p>
          <h3 className="text-3xl font-bold text-white mt-2">
            {stats.jobsFoundToday}
          </h3>
          <p className="text-gray-500 text-xs mt-1">
            Jobs discovered today
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-xs uppercase font-medium">
            Failed Applications
          </p>
          <h3 className="text-3xl font-bold text-white mt-2">
            {stats.failed}
          </h3>
          <p className="text-gray-500 text-xs mt-1">
            Applications that failed
          </p>
        </div>
      </div>

      {/* Connection & Setup Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Profile Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs uppercase font-medium">
              Profile
            </p>
            <h3 className="text-white font-semibold mt-1">
              {user?.hasProfile ? 'Configured' : 'Incomplete'}
            </h3>
          </div>
          <Link
            to="/profile"
            className="text-blue-400 hover:text-blue-300 p-2 bg-gray-800 rounded-lg"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Preferences Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs uppercase font-medium">
              Job Target
            </p>
            <h3 className="text-white font-semibold mt-1">DevOps Engine</h3>
          </div>
          <Link
            to="/preferences"
            className="text-blue-400 hover:text-blue-300 p-2 bg-gray-800 rounded-lg"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Naukri Status Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs uppercase font-medium">
              Naukri Session
            </p>
            <h3 className="text-white font-semibold mt-1 flex items-center gap-1.5">
              {naukriStatus?.isConnected ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-400" /> Connected
                </>
              ) : (
                'Not Connected'
              )}
            </h3>
          </div>
          {!naukriStatus?.isConnected && (
            <button
              onClick={() => setShowNaukriModal(true)}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg"
            >
              Connect
            </button>
          )}
        </div>
      </div>

      {/* Live Automation Logs Terminal */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-500" />
            Background Activity Logs
          </h2>
          <button
            onClick={fetchActivityLogs}
            className="text-xs text-gray-400 hover:text-white"
          >
            Refresh Logs
          </button>
        </div>

        <div className="space-y-3">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">
              No activity logs recorded yet.
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="bg-gray-950 border border-gray-800/80 rounded-xl p-4 font-mono text-xs flex flex-col md:flex-row md:items-center justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400 font-bold">
                      [{log.action}]
                    </span>
                    <span className="text-gray-300">{log.message}</span>
                  </div>
                  <p className="text-gray-500 text-[11px]">
                    Scraped: {log.jobsFound || 0} | Matched: {log.jobsMatched || 0} | Applied: {log.jobsApplied || 0}
                  </p>
                </div>

                <div className="text-gray-500 text-[11px] flex-shrink-0">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Naukri Connect Modal */}
      <NaukriConnectModal
        isOpen={showNaukriModal}
        onClose={() => setShowNaukriModal(false)}
        onSuccess={fetchNaukriStatus}
      />
    </div>
  );
}
