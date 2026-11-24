import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, Link as LinkIcon, CheckSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { createTaskWithSequentialId, makeId, updateTaskFields } from '../../lib/firestoreService';
import { ChecklistItem, ReferenceLink, TaskItem, TaskPriority } from '../../types/models';

interface TaskFormModalProps {
  open: boolean;
  editingTask?: TaskItem | null;
  onClose: () => void;
  onSaved?: (taskCode: string) => void;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  open,
  editingTask,
  onClose,
  onSaved,
}) => {
  const { profile } = useAuth();
  const { projects, departments, teams, directory } = useWorkspace();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [teamLeadId, setTeamLeadId] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  );
  const [dueTime, setDueTime] = useState('17:00');
  const [estimatedHours, setEstimatedHours] = useState('4');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newCheckText, setNewCheckText] = useState('');
  const [referenceLinks, setReferenceLinks] = useState<ReferenceLink[]>([]);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeUsers = directory.filter((u) => u.status === 'active');

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setProjectId(editingTask.projectId);
      setDepartmentId(editingTask.departmentId);
      setTeamId(editingTask.teamId);
      setTeamLeadId(editingTask.teamLeadId);
      setAssigneeIds(editingTask.assigneeIds);
      setPriority(editingTask.priority);
      setStartDate(editingTask.startDate || new Date().toISOString().slice(0, 10));
      setDueDate(editingTask.dueDate);
      setDueTime(editingTask.dueTime || '17:00');
      setEstimatedHours(String(editingTask.estimatedHours ?? 0));
      setChecklist(editingTask.checklist || []);
      setReferenceLinks(editingTask.referenceLinks || []);
    } else {
      const defaultProject = projects[0];
      setTitle('');
      setDescription('');
      setProjectId(defaultProject?.id || '');
      setDepartmentId(defaultProject?.departmentId || departments[0]?.id || '');
      setTeamId(defaultProject?.teamId || teams[0]?.id || '');
      setTeamLeadId(defaultProject?.leadId || profile?.uid || '');
      setAssigneeIds([]);
      setPriority('Medium');
      setStartDate(new Date().toISOString().slice(0, 10));
      setDueDate(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
      setDueTime('17:00');
      setEstimatedHours('4');
      setChecklist([]);
      setReferenceLinks([]);
    }
  }, [open, editingTask, projects, departments, teams, profile]);

  if (!open || !profile) return null;

  const handleProjectChange = (pid: string) => {
    setProjectId(pid);
    const proj = projects.find((p) => p.id === pid);
    if (proj) {
      setDepartmentId(proj.departmentId);
      setTeamId(proj.teamId);
      setTeamLeadId(proj.leadId);
    }
  };

  const toggleAssignee = (uid: string) => {
    setAssigneeIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const addChecklistItem = () => {
    if (!newCheckText.trim()) return;
    setChecklist((prev) => [
      ...prev,
      { id: makeId('chk'), text: newCheckText.trim().slice(0, 200), done: false },
    ]);
    setNewCheckText('');
  };

  const addRefLink = () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) return;
    try {
      const parsed = new URL(newLinkUrl.trim());
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        setError('Reference links must start with https:// or http://');
        return;
      }
      setReferenceLinks((prev) => [
        ...prev,
        {
          id: makeId('lnk'),
          label: newLinkLabel.trim().slice(0, 80),
          url: parsed.toString().slice(0, 500),
        },
      ]);
      setNewLinkLabel('');
      setNewLinkUrl('');
      setError(null);
    } catch {
      setError('Please enter a valid URL starting with https:// or http://');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (!projectId || !departmentId || !teamId || !teamLeadId) {
      setError('Please ensure a Project, Department, Team, and Team Lead are selected. Create them first if none exist.');
      return;
    }

    setSaving(true);
    try {
      if (editingTask) {
        await updateTaskFields(profile, editingTask, {
          title,
          description,
          assigneeIds,
          priority,
          startDate,
          dueDate,
          dueTime,
          estimatedHours: Number(estimatedHours) || 0,
          checklist,
          referenceLinks,
        });
        onSaved?.(editingTask.taskCode);
      } else {
        const res = await createTaskWithSequentialId(profile, {
          title,
          description,
          projectId,
          departmentId,
          teamId,
          teamLeadId,
          assigneeIds,
          priority,
          startDate,
          dueDate,
          dueTime,
          estimatedHours: Number(estimatedHours) || 0,
          checklist,
          referenceLinks,
        });
        onSaved?.(res.taskCode);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save task.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#062044]">
              {editingTask ? `Edit ${editingTask.taskCode}` : 'Create New Task'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {editingTask
                ? 'Update scope, assignees, schedule, or checklist'
                : 'Automatically assigns the next sequential NEX-YYYY-0001 task ID'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Task Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Implement OAuth token refresh middleware"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0284C7]/25 focus:border-[#0284C7]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Description &amp; Acceptance Criteria
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline requirements, deliverables, and review expectations..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0284C7]/25 focus:border-[#0284C7]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Project</label>
              <select
                required
                disabled={Boolean(editingTask)}
                value={projectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-50"
              >
                <option value="">Select project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Department</label>
              <select
                required
                disabled={Boolean(editingTask)}
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-50"
              >
                <option value="">Select department...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Team</label>
              <select
                required
                disabled={Boolean(editingTask)}
                value={teamId}
                onChange={(e) => {
                  setTeamId(e.target.value);
                  const t = teams.find((tm) => tm.id === e.target.value);
                  if (t) setTeamLeadId(t.leadId);
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-50"
              >
                <option value="">Select team...</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Assigned Team Lead
              </label>
              <select
                required
                disabled={Boolean(editingTask)}
                value={teamLeadId}
                onChange={(e) => setTeamLeadId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-50"
              >
                <option value="">Select lead...</option>
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

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Due Date</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Due Time</label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Est. Hours</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
              />
            </div>
          </div>

          {/* Multi-member Assignees */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Assigned Members ({assigneeIds.length} selected)
            </label>
            <div className="border border-slate-200 rounded-lg p-2.5 max-h-36 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-slate-50/60">
              {activeUsers.map((u) => {
                const checked = assigneeIds.includes(u.uid);
                return (
                  <label
                    key={u.uid}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer text-xs transition-colors ${
                      checked
                        ? 'bg-sky-50 border border-sky-200 text-[#062044] font-medium'
                        : 'hover:bg-white text-slate-700 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAssignee(u.uid)}
                      className="rounded border-slate-300 text-[#0284C7]"
                    />
                    <span className="truncate">{u.displayName}</span>
                    <span className="text-[11px] text-slate-400 ml-auto shrink-0">
                      {u.role === 'team_lead' ? 'Lead' : u.role === 'admin' ? 'Admin' : 'Member'}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Checklist */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Subtask Checklist
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCheckText}
                onChange={(e) => setNewCheckText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addChecklistItem();
                  }
                }}
                placeholder="Add deliverable checkpoint..."
                className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
              />
              <button
                type="button"
                onClick={addChecklistItem}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
            {checklist.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {checklist.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <span className="flex items-center gap-2 text-slate-700">
                      <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                      {item.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => setChecklist((prev) => prev.filter((i) => i.id !== item.id))}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Reference Links */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Reference Links
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              <input
                type="text"
                value={newLinkLabel}
                onChange={(e) => setNewLinkLabel(e.target.value)}
                placeholder="Label (e.g., Figma Spec)"
                className="sm:col-span-2 px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="url"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                placeholder="https://..."
                className="sm:col-span-2 px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
              />
              <button
                type="button"
                onClick={addRefLink}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg inline-flex items-center justify-center gap-1"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                Attach
              </button>
            </div>
            {referenceLinks.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {referenceLinks.map((lnk) => (
                  <li
                    key={lnk.id}
                    className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <span className="truncate text-slate-700">
                      <span className="font-medium">{lnk.label}</span>
                      <span className="text-slate-400 mx-1.5">·</span>
                      <span className="text-[#0284C7]">{lnk.url}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setReferenceLinks((prev) => prev.filter((l) => l.id !== lnk.id))
                      }
                      className="text-slate-400 hover:text-red-600 ml-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="px-5 py-2 text-sm font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : editingTask ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
};
