import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { createTeam, deleteTeam, updateTeam } from '../../lib/firestoreService';
import { Team } from '../../types/models';
import { UserAvatar, formatRoleLabel } from '../ui/Badges';

export const TeamsView: React.FC = () => {
  const { profile } = useAuth();
  const { teams, departments, directory, tasks, getDepartmentById, getMemberById } = useWorkspace();

  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [leadId, setLeadId] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;
  const isAdmin = profile.role === 'admin';
  const activeUsers = directory.filter((u) => u.status === 'active');

  const openNew = () => {
    setEditingTeam(null);
    setName('');
    setDescription('');
    setDepartmentId(departments[0]?.id || '');
    setLeadId(profile.uid);
    setMemberIds([profile.uid]);
    setError(null);
    setShowModal(true);
  };

  const openEdit = (t: Team) => {
    setEditingTeam(t);
    setName(t.name);
    setDescription(t.description || '');
    setDepartmentId(t.departmentId);
    setLeadId(t.leadId);
    setMemberIds(t.memberIds);
    setError(null);
    setShowModal(true);
  };

  const toggleMember = (uid: string) => {
    setMemberIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!departmentId || !leadId) {
      setError('Create a Department and select a Team Lead first.');
      return;
    }
    setSaving(true);
    try {
      if (editingTeam) {
        await updateTeam(profile, editingTeam.id, {
          name,
          description,
          departmentId,
          leadId,
          memberIds,
        });
      } else {
        await createTeam(profile, {
          name,
          description,
          departmentId,
          leadId,
          memberIds,
        });
      }
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save team.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#062044]">Teams</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Assign Team Leads, manage delivery squads, and monitor team workload.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={openNew}
            className="px-4 py-2 text-xs font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg inline-flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Team
          </button>
        )}
      </div>

      {teams.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-900">No teams created yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            Create a department first, then organize employees into delivery teams.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((t) => {
            const dept = getDepartmentById(t.departmentId);
            const lead = getMemberById(t.leadId);
            const teamTasks = tasks.filter((tk) => tk.teamId === t.id);
            const canEdit = isAdmin || (profile.role === 'team_lead' && t.leadId === profile.uid);

            return (
              <div
                key={t.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-medium text-[#0284C7]">
                        {dept?.name || 'Department'}
                      </span>
                      <h3 className="text-base font-semibold text-[#062044] mt-0.5">{t.name}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEdit(t)}
                          className="p-1.5 text-slate-400 hover:text-[#062044] rounded-md hover:bg-slate-100"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => deleteTeam(t.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {t.description && (
                    <p className="mt-2 text-xs text-slate-600 line-clamp-2">{t.description}</p>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="text-[11px] font-medium text-slate-500 mb-1.5">Team Lead</div>
                    <div className="flex items-center gap-2">
                      <UserAvatar name={lead?.displayName || 'Lead'} avatarUrl={lead?.avatarUrl} size="md" />
                      <div>
                        <div className="text-xs font-semibold text-slate-900">
                          {lead?.displayName || 'Unassigned'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {lead ? formatRoleLabel(lead.role) : ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-[11px] font-medium text-slate-500 mb-1.5">
                      Members ({t.memberIds.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {t.memberIds.map((uid) => {
                        const m = getMemberById(uid);
                        return (
                          <span
                            key={uid}
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-md text-slate-700"
                          >
                            <UserAvatar name={m?.displayName || 'M'} avatarUrl={m?.avatarUrl} />
                            {m?.displayName || uid.slice(0, 8)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
                  <span>{teamTasks.length} tasks</span>
                  <span>
                    {teamTasks.filter((tk) => tk.status === 'Completed').length} completed
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-base font-semibold text-[#062044]">
              {editingTeam ? 'Edit Team' : 'Create Team'}
            </h3>
            {error && <div className="p-2.5 text-xs bg-red-50 text-red-700 rounded-lg">{error}</div>}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Team Name</label>
              <input
                type="text"
                required
                disabled={Boolean(editingTeam && !isAdmin)}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Core Web Squad"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                <select
                  required
                  disabled={Boolean(editingTeam && !isAdmin)}
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-50"
                >
                  <option value="">Select...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Team Lead</label>
                <select
                  required
                  disabled={Boolean(editingTeam && !isAdmin)}
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-50"
                >
                  <option value="">Select...</option>
                  {activeUsers
                    .filter((u) => u.role === 'team_lead' || u.role === 'admin')
                    .map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.displayName}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Team Roster ({memberIds.length} selected)
              </label>
              <div className="border border-slate-200 rounded-lg p-2.5 max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-slate-50/70">
                {activeUsers.map((u) => (
                  <label
                    key={u.uid}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-white cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={memberIds.includes(u.uid)}
                      onChange={() => toggleMember(u.uid)}
                    />
                    <span className="truncate">{u.displayName}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg"
              >
                {saving ? 'Saving...' : 'Save Team'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
