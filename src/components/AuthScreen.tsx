import React, { useState } from 'react';
import {
  Mail,
  Lock,
  ArrowRight,
  KeyRound,
  ShieldAlert,
  CheckCircle2,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const AuthScreen: React.FC = () => {
  const {
    firebaseUser,
    authError,
    needsEmailVerification,
    isPendingApproval,
    isDisabled,
    signInWithGoogle,
    signInWithEmail,
    sendResetEmail,
    resendVerificationEmail,
    signOut,
    clearAuthError,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      await signInWithEmail(email, password);
    } catch {
      // Error surfaced via authError
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      await sendResetEmail(email);
      setFeedback('Password reset link sent. Check your inbox and spam folder.');
    } catch {
      // Error surfaced via authError
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setFeedback(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch {
      // Error surfaced via authError
    } finally {
      setSubmitting(false);
    }
  };

  if (needsEmailVerification && firebaseUser) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <img
            src="/assets/aistudio/NEX_Technology_Logo_with_Cyan_Swoosh_54e8291d.png"
            alt="Nex Technology"
            referrerPolicy="no-referrer"
            className="w-14 h-14 rounded-full object-contain border border-slate-200 bg-white mb-5"
          />
          <h1 className="text-xl font-bold text-[#062044]">Verify Your Email</h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            A verification link is required before accessing workspace records for{' '}
            <span className="font-medium text-slate-900">{firebaseUser.email}</span>.
          </p>
          {feedback && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={async () => {
                await resendVerificationEmail();
                setFeedback('Verification email sent. Refresh once verified.');
              }}
              className="w-full py-2.5 px-4 text-sm font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors"
            >
              Resend Verification Email
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              I Verified My Email
            </button>
            <button
              type="button"
              onClick={signOut}
              className="w-full py-2 text-sm text-slate-500 hover:text-slate-800 inline-flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if ((isPendingApproval || isDisabled) && firebaseUser) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <img
              src="/assets/aistudio/NEX_Technology_Logo_with_Cyan_Swoosh_54e8291d.png"
              alt="Nex Technology"
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-full object-contain border border-slate-200 bg-white"
            />
            <div>
              <h1 className="text-lg font-bold text-[#062044]">Nex Task Manager</h1>
              <p className="text-xs text-slate-500">{firebaseUser.email}</p>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-amber-900">
                {isDisabled ? 'Account Disabled' : 'Awaiting Administrator Activation'}
              </h2>
              <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                {isDisabled
                  ? 'Your workspace access has been disabled. Contact your Nex Technology administrator.'
                  : 'Your account is registered, but an administrator must assign your role and activate access in Employee Management before you can view projects and tasks.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="mt-6 w-full py-2.5 px-4 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row">
      {/* Left Brand Panel */}
      <div className="lg:w-[46%] bg-[#062044] text-white p-8 lg:p-14 flex flex-col justify-between relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 85% 15%, #0099EB 0%, transparent 45%), radial-gradient(circle at 15% 85%, #0284C7 0%, transparent 50%)',
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <img
              src="/assets/aistudio/NEX_Technology_Logo_with_Cyan_Swoosh_54e8291d.png"
              alt="Nex Technology"
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-full object-contain bg-white p-0.5 shadow-sm"
            />
            <div>
              <span className="text-lg font-bold tracking-tight text-white block leading-tight">
                Nex Task Manager
              </span>
              <span className="text-xs text-sky-200/80">Nex Technology Agency Platform</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 my-12 lg:my-0 max-w-md">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight leading-tight text-balance">
            Structured delivery for modern engineering &amp; creative teams.
          </h1>
          <p className="mt-4 text-sm lg:text-base text-slate-300 leading-relaxed">
            Manage projects, atomic task assignments, deliverable uploads, and Team Lead
            approvals in a single workspace secured by role-based access control.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
            <div>
              <div className="text-xs text-sky-300 font-medium">Role Isolation</div>
              <div className="mt-1 text-sm font-semibold">Admin · Lead · Member</div>
            </div>
            <div>
              <div className="text-xs text-sky-300 font-medium">Task Sequencing</div>
              <div className="mt-1 text-sm font-semibold font-mono">NEX-YYYY-0001</div>
            </div>
            <div>
              <div className="text-xs text-sky-300 font-medium">Workflow</div>
              <div className="mt-1 text-sm font-semibold">Review &amp; Approval</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-400">
          Nex Technology · Internal Operations Workspace
        </div>
      </div>

      {/* Right Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#062044]">
              {mode === 'login' ? 'Sign in to workspace' : 'Reset your password'}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              {mode === 'login'
                ? 'Use your Nex Technology corporate account to continue.'
                : 'Enter your work email and we will send a password reset link.'}
            </p>
          </div>

          {authError && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
              {authError}
            </div>
          )}

          {feedback && (
            <div className="mb-5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{feedback}</span>
            </div>
          )}

          {mode === 'login' ? (
            <>
              <button
                type="button"
                disabled={submitting}
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2.5 disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="my-6 flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400">or sign in with email</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@nextechnology.io"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0284C7]/25 focus:border-[#0284C7]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-700">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        clearAuthError();
                        setFeedback(null);
                        setMode('forgot');
                      }}
                      className="text-xs font-medium text-[#0284C7] hover:text-[#0369A1]"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0284C7]/25 focus:border-[#0284C7]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-[#062044] hover:bg-[#0A2E5C] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@nextechnology.io"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0284C7]/25 focus:border-[#0284C7]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-[#0284C7] hover:bg-[#0369A1] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <KeyRound className="w-4 h-4" />
                <span>{submitting ? 'Sending link...' : 'Send Password Reset Link'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  clearAuthError();
                  setFeedback(null);
                  setMode('login');
                }}
                className="w-full py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Back to sign in
              </button>
            </form>
          )}

          <p className="mt-6 pt-5 border-t border-slate-100 text-xs text-slate-500 text-center">
            Employee accounts are provisioned by your Nex Technology administrator.
          </p>
        </div>
      </div>
    </div>
  );
};
