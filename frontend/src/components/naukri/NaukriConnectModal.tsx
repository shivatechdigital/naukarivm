import { useState } from 'react';
import type { FormEvent } from 'react';
import API from '../../lib/axios';
import { X, Loader2, Shield, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NaukriConnectModal({
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpMode, setOtpMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setError('');
    setErrorCode('');
    setLoading(true);

    try {
      const response = await API.post('/naukri/connect', {
        naukriEmail: email,
        naukriPassword: password,
      });

      if (response.data?.needsOTP || response.data?.code === 'OTP_REQUIRED') {
        setOtpMode(true);
        setOtp('');
        setError('');
        setErrorCode('');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const data = err.response?.data;

      if (data?.code === 'OTP_REQUIRED' || data?.needsOTP) {
        setOtpMode(true);
        setOtp('');
        setError('');
        setErrorCode('');
        return;
      }

      setError(data?.message || 'Naukri connect nahi ho paya');
      setErrorCode(data?.code || '');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!/^\d{4,8}$/.test(otp)) {
      setError('OTP 4 se 8 digits ka hona chahiye.');
      setErrorCode('OTP_INVALID');
      return;
    }

    setError('');
    setErrorCode('');
    setLoading(true);

    try {
      const response = await API.post('/naukri/verify-otp', {
        otp,
      });

      if (response.data?.success === false) {
        setError(
          response.data?.message || 'OTP verify nahi hua. Dobara try karo.',
        );
        setErrorCode(response.data?.code || 'OTP_INVALID');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const data = err.response?.data;

      setError(
        data?.message || 'OTP verify nahi hua. Dobara try karo.',
      );
      setErrorCode(data?.code || 'OTP_INVALID');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;

    setOtpMode(false);
    setOtp('');
    setError('');
    setErrorCode('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white">
                {otpMode ? 'Verify Naukri OTP' : 'Connect Naukri'}
              </h2>

              <p className="text-xs text-gray-400">
                {otpMode
                  ? 'Naukri ne OTP bheja hai'
                  : 'Auto apply ke liye zaroori hai'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-white disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* OTP MODE */}
        {otpMode ? (
          <form onSubmit={handleOtpSubmit} className="p-6 space-y-5">
            {/* OTP Notice */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-400 text-sm">
                Naukri ne tumhare registered email par OTP bheja hai.
              </p>

              <p className="text-gray-400 text-xs mt-2">
                OTP enter karke Verify OTP button press karo.
              </p>
            </div>

            {error && (
              <div
                className={`px-4 py-3 rounded-lg text-sm flex items-start gap-2 ${
                  errorCode === 'OTP_SESSION_EXPIRED'
                    ? 'bg-yellow-500/10 border border-yellow-500/50 text-yellow-400'
                    : 'bg-red-500/10 border border-red-500/50 text-red-400'
                }`}
              >
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* OTP */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Enter OTP
              </label>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, ''))
                }
                placeholder="Enter OTP"
                autoFocus
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-center text-xl tracking-[0.5em] placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Verify */}
            <button
              type="submit"
              disabled={loading || otp.length < 4}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  OTP verify ho raha hai...
                </>
              ) : (
                'Verify OTP'
              )}
            </button>

            <p className="text-center text-gray-500 text-xs">
              OTP nahi mila? Naukri se resend hone mein thoda time lag sakta hai.
            </p>
          </form>
        ) : (
          /* LOGIN MODE */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Security Notice */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-blue-400 text-xs flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />

                <span>
                  Tumhara password <strong>store nahi hoga</strong>. Sirf
                  session cookies encrypt karke save hoti hain.
                </span>
              </p>
            </div>

            {error && (
              <div
                className={`px-4 py-3 rounded-lg text-sm flex items-start gap-2 ${
                  errorCode === 'CAPTCHA_DETECTED'
                    ? 'bg-yellow-500/10 border border-yellow-500/50 text-yellow-400'
                    : 'bg-red-500/10 border border-red-500/50 text-red-400'
                }`}
              >
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Naukri Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tumhara.email@naukri.com"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Naukri Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Naukri pe login ho raha hai...
                </>
              ) : (
                'Connect Naukri'
              )}
            </button>

            {loading && (
              <p className="text-center text-gray-500 text-xs">
                Isme 10-15 seconds lag sakte hain. Wait karo...
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
