import React, { useState } from 'react';
import { CheckCircle2, KeyRound, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { updateOwnProfile } from '../../lib/firestoreService';
import { formatRoleLabel, UserAvatar } from '../ui/Badges';

export const SettingsView: React.FC = () => {
  const { profile, changeOwnPassword, sendResetEmail } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [jobTitle, setJobTitle] = useState(profile?.jobTitle || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setMessage(null);
    setError(null);
    try {
      await updateOwnProfile(profile, { displayName, jobTitle, phone });
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSavingPwd(true);
    setMessage(null);
    setError(null);
    try {
      await changeOwnPassword(newPassword);
      setNewPassword('');
      setMessage('Password updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update password.');
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#062044]">Profile &amp; Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your account profile, security credentials, and workspace preferences.
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Profile Form */}
      <form
        onSubmit={handleSaveProfile}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
      >
        <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
          <UserAvatar name={profile.displayName} avatarUrl={profile.avatarUrl} size="lg" />
          <div>
            <h2 className="text-base font-semibold text-[#062044]">{profile.displayName}</h2>
            <p className="text-xs text-slate-500">
              {profile.email} · {formatRoleLabel(profile.role)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Job Title</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Assigned Role</label>
            <div className="px-3 py-2 text-sm border border-slate-200 bg-slate-50 rounded-lg text-slate-700 flex items-center gap-2">
              <User className="w-4 h-4 text-[#0284C7]" />
              {formatRoleLabel(profile.role)}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingProfile}
            className="px-4 py-2 text-xs font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg"
          >
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>

      {/* Password Management */}
      <form
        onSubmit={handleUpdatePassword}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#0284C7]" />
          <h2 className="text-sm font-semibold text-[#062044]">Password &amp; Recovery</h2>
        </div>
        <p className="text-xs text-slate-500">
          Set a new password for email login or send a password reset email to {profile.email}.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="password"
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (minimum 6 characters)"
            className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
          <button
            type="submit"
            disabled={savingPwd || !newPassword}
            className="px-4 py-2 text-xs font-medium text-white bg-[#062044] hover:bg-[#0A2E5C] rounded-lg disabled:opacity-50"
          >
            {savingPwd ? 'Updating...' : 'Update Password'}
          </button>
          <button
            type="button"
            onClick={async () => {
              await sendResetEmail(profile.email);
              setMessage(`Password reset email sent to ${profile.email}.`);
            }}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            Send Reset Email
          </button>
        </div>
      </form>

      {/* Admin Setup Reference */}
      {profile.role === 'admin' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-[#062044]">
              Firebase Auth &amp; Storage Console Configuration
            </h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Google Sign-In and Cloud Firestore security rules are active. To also allow Email/Password
            credentials and Deliverable File Uploads in production:
          </p>
          <ul className="text-xs text-slate-600 list-disc pl-5 space-y-1">
            <li>
              In Firebase Console → <strong>Authentication → Sign-in method</strong>, enable the{' '}
              <strong>Email/Password</strong> provider.
            </li>
            <li>
              In Firebase Console → <strong>Storage</strong>, click <strong>Get Started</strong> to
              initialize the default bucket and deploy the project&apos;s{' '}
              <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">storage.rules</code>.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};
