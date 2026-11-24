import React, { useState } from 'react';
import { UserPlus, Shield, Trash2, CheckCircle2, Edit3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import {
  createEmployeeInvite,
  revokeEmployeeInvite,
  updateEmployeeRoleAndAssignment,
} from '../../lib/firestoreService';
import { UserProfile, UserRole, UserStatus } from '../../types/models';
import { UserAvatar, formatRoleLabel } from '../ui/Badges';

export const EmployeesView: React.FC = () => {
  const { profile, provisionEmployeeAuthAccount } = useAuth();
  const {
    adminUsers,
    directory,
    invites,
    departments,
    teams,
    getDepartmentById,
    getTeamById,
  } = useWorkspace();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invEmail, setInvEmail] = useState('');
  const [invName, setInvName] = useState('');
  const [invTitle, setInvTitle] = useState('');
  const [invRole, setInvRole] = useState<UserRole>('member');
  const [invDept, setInvDept] = useState('');
  const [invTeam, setInvTeam] = useState('');
  const [createPasswordLogin, setCreatePasswordLogin] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('member');
  const [editStatus, setEditStatus] = useState<UserStatus>('active');
  const [editDept, setEditDept] = useState('');
  const [editTeam, setEditTeam] = useState('');
  const [editTitle, setEditTitle] = useState('');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;
  const isAdmin = profile.role === 'admin';

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    setSaving(true);
    try {
      await createEmployeeInvite(profile, {
        email: invEmail,
        displayName: invName,
        jobTitle: invTitle,
        role: invRole,
        departmentId: invDept,
        teamId: invTeam,
      });

      let note = 'Employee invite provisioned. Role and team will bind automatically upon verified Google Sign-In.';
      if (createPasswordLogin && tempPassword.length >= 6) {
        const res = await provisionEmployeeAuthAccount({
          email: invEmail,
          displayName: invName,
          tempPassword,
        });
        note = res.note;
      }

      setFeedback(note);
      setShowInviteModal(false);
      setInvEmail('');
      setInvName('');
      setInvTitle('');
      setTempPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to provision employee.');
    } finally {
      setSaving(false);
    }
  };

  const openEditUser = (u: UserProfile) => {
    setEditingUser(u);
    setEditRole(u.role);
    setEditStatus(u.status);
    setEditDept(u.departmentId || '');
    setEditTeam(u.teamId || '');
    setEditTitle(u.jobTitle || '');
    setError(null);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    setError(null);
    try {
      await updateEmployeeRoleAndAssignment(profile, editingUser, {
        role: editRole,
        status: editStatus,
        departmentId: editDept,
        teamId: editTeam,
        jobTitle: editTitle,
      });
      setEditingUser(null);
      setFeedback(`Updated access and assignment for ${editingUser.displayName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update employee.');
    } finally {
      setSaving(false);
    }
  };

  const rows = isAdmin ? adminUsers : directory;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#062044]">
            {isAdmin ? 'Employee Management' : 'Team Directory'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAdmin
              ? 'Provision employee accounts, assign roles, and manage department/team membership.'
              : 'Active Nex Technology team members across departments.'}
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setShowInviteModal(true);
            }}
            className="px-4 py-2 text-xs font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg inline-flex items-center gap-1.5 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Add Employee
          </button>
        )}
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {feedback}
          </span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-emerald-700 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Employees Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                <th className="py-3 px-4">Employee</th>
                {isAdmin && <th className="py-3 px-4">Email</th>}
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Department &amp; Team</th>
                <th className="py-3 px-4">Status</th>
                {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {rows.map((u) => {
                const dept = u.departmentId ? getDepartmentById(u.departmentId) : undefined;
                const team = u.teamId ? getTeamById(u.teamId) : undefined;
                const adminRow = isAdmin ? (u as UserProfile) : null;

                return (
                  <tr key={u.uid} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar name={u.displayName} avatarUrl={u.avatarUrl} size="md" />
                        <div>
                          <div className="font-medium text-slate-900">{u.displayName}</div>
                          <div className="text-[11px] text-slate-500">
                            {u.jobTitle || 'Agency Staff'}
                          </div>
                        </div>
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 font-mono text-slate-600">{adminRow?.email}</td>
                    )}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 font-medium text-slate-800">
                        <Shield className="w-3 h-3 text-[#0284C7]" />
                        {formatRoleLabel(u.role)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {dept?.name || '—'} · {team?.name || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md border text-[11px] font-medium capitalize ${
                          u.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : u.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    {isAdmin && adminRow && (
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openEditUser(adminRow)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#0284C7] hover:bg-sky-50 rounded-md"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Manage
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provisioned Invites List (Admin Only) */}
      {isAdmin && invites.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#062044] mb-3">
            Provisioned Account Invitations ({invites.length})
          </h2>
          <div className="divide-y divide-slate-100 text-xs">
            {invites.map((inv) => (
              <div key={inv.id} className="py-2.5 flex items-center justify-between gap-4">
                <div>
                  <span className="font-medium text-slate-900">{inv.displayName}</span>
                  <span className="text-slate-400 mx-1.5">·</span>
                  <span className="font-mono text-slate-600">{inv.email}</span>
                  <span className="text-slate-400 mx-1.5">·</span>
                  <span>{formatRoleLabel(inv.role)}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded border text-[11px] capitalize ${
                      inv.status === 'claimed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : inv.status === 'pending'
                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {inv.status}
                  </span>
                  {inv.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => revokeEmployeeInvite(inv.id)}
                      className="text-slate-400 hover:text-red-600"
                      title="Revoke invite"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleProvision}
            className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-base font-semibold text-[#062044]">Provision Employee Account</h3>
            {error && <div className="p-2.5 text-xs bg-red-50 text-red-700 rounded-lg">{error}</div>}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={invName}
                onChange={(e) => setInvName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Work Email</label>
              <input
                type="email"
                required
                value={invEmail}
                onChange={(e) => setInvEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={invRole}
                  onChange={(e) => setInvRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="member">Member</option>
                  <option value="team_lead">Team Lead</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Job Title</label>
                <input
                  type="text"
                  value={invTitle}
                  onChange={(e) => setInvTitle(e.target.value)}
                  placeholder="e.g., UI Engineer"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                <select
                  value={invDept}
                  onChange={(e) => setInvDept(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Optional</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Team</label>
                <select
                  value={invTeam}
                  onChange={(e) => setInvTeam(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Optional</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createPasswordLogin}
                  onChange={(e) => setCreatePasswordLogin(e.target.checked)}
                />
                Also create Email/Password credential &amp; send password-setup email
              </label>
              {createPasswordLogin && (
                <input
                  type="password"
                  minLength={6}
                  required
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder="Temporary password (min 6 chars)"
                  className="mt-2 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg"
              >
                {saving ? 'Provisioning...' : 'Provision Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Employee Role/Status Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateUser}
            className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
          >
            <h3 className="text-base font-semibold text-[#062044]">
              Manage {editingUser.displayName}
            </h3>
            {error && <div className="p-2.5 text-xs bg-red-50 text-red-700 rounded-lg">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="member">Member</option>
                  <option value="team_lead">Team Lead</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Access Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                <select
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">None</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Team</label>
                <select
                  value={editTeam}
                  onChange={(e) => setEditTeam(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">None</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Job Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg"
              >
                {saving ? 'Updating...' : 'Save Access'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
