import React, { useState } from 'react';
import { Plus, Trash2, Edit3, Building2, FolderKanban } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import {
  createDepartment,
  createProject,
  deleteDepartment,
  deleteProject,
  updateDepartment,
  updateProject,
} from '../../lib/firestoreService';
import { Department, Project, ProjectStatus } from '../../types/models';
import { ProjectStatusLabel, UserAvatar } from '../ui/Badges';

export const ProjectsView: React.FC = () => {
  const { profile } = useAuth();
  const { projects, departments, teams, tasks, directory, getDepartmentById, getTeamById, getMemberById } =
    useWorkspace();

  const [showProjModal, setShowProjModal] = useState(false);
  const [editingProj, setEditingProj] = useState<Project | null>(null);
  const [projName, setProjName] = useState('');
  const [projCode, setProjCode] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projDeptId, setProjDeptId] = useState('');
  const [projTeamId, setProjTeamId] = useState('');
  const [projLeadId, setProjLeadId] = useState('');
  const [projStatus, setProjStatus] = useState<ProjectStatus>('Active');
  const [projStart, setProjStart] = useState(new Date().toISOString().slice(0, 10));
  const [projDue, setProjDue] = useState('');

  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [deptHead, setDeptHead] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;
  const isAdmin = profile.role === 'admin';
  const activeUsers = directory.filter((u) => u.status === 'active');

  const openNewProject = () => {
    setEditingProj(null);
    setProjName('');
    setProjCode('');
    setProjDesc('');
    setProjDeptId(departments[0]?.id || '');
    setProjTeamId(teams[0]?.id || '');
    setProjLeadId(teams[0]?.leadId || profile.uid);
    setProjStatus('Active');
    setProjStart(new Date().toISOString().slice(0, 10));
    setProjDue('');
    setError(null);
    setShowProjModal(true);
  };

  const openEditProject = (p: Project) => {
    setEditingProj(p);
    setProjName(p.name);
    setProjCode(p.code);
    setProjDesc(p.description || '');
    setProjDeptId(p.departmentId);
    setProjTeamId(p.teamId);
    setProjLeadId(p.leadId);
    setProjStatus(p.status);
    setProjStart(p.startDate || '');
    setProjDue(p.dueDate || '');
    setError(null);
    setShowProjModal(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!projDeptId || !projTeamId || !projLeadId) {
      setError('Create at least one Department and Team before creating a Project.');
      return;
    }
    setSaving(true);
    try {
      if (editingProj) {
        await updateProject(profile, editingProj.id, {
          name: projName,
          code: projCode,
          description: projDesc,
          departmentId: projDeptId,
          teamId: projTeamId,
          leadId: projLeadId,
          status: projStatus,
          startDate: projStart,
          dueDate: projDue,
        });
      } else {
        await createProject(profile, {
          name: projName,
          code: projCode,
          description: projDesc,
          departmentId: projDeptId,
          teamId: projTeamId,
          leadId: projLeadId,
          status: projStatus,
          startDate: projStart,
          dueDate: projDue,
        });
      }
      setShowProjModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save project.');
    } finally {
      setSaving(false);
    }
  };

  const openNewDept = () => {
    setEditingDept(null);
    setDeptName('');
    setDeptDesc('');
    setDeptHead('');
    setError(null);
    setShowDeptModal(true);
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingDept) {
        await updateDepartment(profile, editingDept.id, {
          name: deptName,
          description: deptDesc,
          headUserId: deptHead,
        });
      } else {
        await createDepartment(profile, {
          name: deptName,
          description: deptDesc,
          headUserId: deptHead,
        });
      }
      setShowDeptModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save department.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#062044]">Projects &amp; Departments</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Organize agency departments, client engagements, and delivery milestones.
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={openNewDept}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5"
            >
              <Building2 className="w-4 h-4" />
              New Department
            </button>
            <button
              type="button"
              onClick={openNewProject}
              className="px-4 py-2 text-xs font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>
        )}
      </div>

      {/* Departments Strip */}
      <section>
        <h2 className="text-sm font-semibold text-[#062044] mb-3">
          Departments ({departments.length})
        </h2>
        {departments.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500">
            No departments created yet. {isAdmin ? 'Create a department to organize teams and projects.' : ''}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {departments.map((d) => {
              const head = d.headUserId ? getMemberById(d.headUserId) : undefined;
              const deptProjects = projects.filter((p) => p.departmentId === d.id).length;
              return (
                <div
                  key={d.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[#062044]">{d.name}</h3>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDept(d);
                              setDeptName(d.name);
                              setDeptDesc(d.description || '');
                              setDeptHead(d.headUserId || '');
                              setShowDeptModal(true);
                            }}
                            className="p-1 text-slate-400 hover:text-[#062044]"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteDepartment(d.id)}
                            className="p-1 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {d.description && (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{d.description}</p>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>{head ? `Head: ${head.displayName}` : 'No head assigned'}</span>
                    <span className="font-mono tabular-nums">{deptProjects} projects</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Projects Grid */}
      <section>
        <h2 className="text-sm font-semibold text-[#062044] mb-3">
          Projects ({projects.length})
        </h2>
        {projects.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <FolderKanban className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-800">No projects yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Projects link departments, teams, and tasks together.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => {
              const dept = getDepartmentById(p.departmentId);
              const team = getTeamById(p.teamId);
              const lead = getMemberById(p.leadId);
              const pTasks = tasks.filter((t) => t.projectId === p.id);
              const done = pTasks.filter((t) => t.status === 'Completed').length;
              const pct = pTasks.length ? Math.round((done / pTasks.length) * 100) : 0;
              const canEditProj = isAdmin || (profile.role === 'team_lead' && p.leadId === profile.uid);

              return (
                <div
                  key={p.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-semibold text-[#0284C7]">
                        {p.code}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <ProjectStatusLabel status={p.status} />
                        {canEditProj && (
                          <button
                            type="button"
                            onClick={() => openEditProject(p)}
                            className="p-1 text-slate-400 hover:text-[#062044]"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => deleteProject(p.id)}
                            className="p-1 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <h3 className="text-base font-semibold text-[#062044]">{p.name}</h3>
                    <div className="mt-1 text-xs text-slate-500">
                      {dept?.name || 'Department'} · {team?.name || 'Team'}
                    </div>
                    {p.description && (
                      <p className="mt-2.5 text-xs text-slate-600 line-clamp-2">{p.description}</p>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-500">Delivery Progress</span>
                        <span className="font-mono font-semibold text-slate-800 tabular-nums">
                          {done}/{pTasks.length} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0284C7] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <UserAvatar name={lead?.displayName || 'Lead'} avatarUrl={lead?.avatarUrl} />
                        <span className="text-slate-700 font-medium">
                          {lead?.displayName || 'Lead'}
                        </span>
                      </div>
                      {p.dueDate && (
                        <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                          Due {p.dueDate}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveDept}
            className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
          >
            <h3 className="text-base font-semibold text-[#062044]">
              {editingDept ? 'Edit Department' : 'Create Department'}
            </h3>
            {error && <div className="p-2.5 text-xs bg-red-50 text-red-700 rounded-lg">{error}</div>}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Department Name</label>
              <input
                type="text"
                required
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="e.g., Platform Engineering"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={deptDesc}
                onChange={(e) => setDeptDesc(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Department Head</label>
              <select
                value={deptHead}
                onChange={(e) => setDeptHead(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Unassigned</option>
                {activeUsers.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeptModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg"
              >
                {saving ? 'Saving...' : 'Save Department'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Project Modal */}
      {showProjModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProject}
            className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-base font-semibold text-[#062044]">
              {editingProj ? 'Edit Project' : 'Create Project'}
            </h3>
            {error && <div className="p-2.5 text-xs bg-red-50 text-red-700 rounded-lg">{error}</div>}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  placeholder="e.g., Nex Cloud Portal v2"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Code</label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingProj && !isAdmin)}
                  value={projCode}
                  onChange={(e) => setProjCode(e.target.value.toUpperCase())}
                  placeholder="NEX-PORTAL"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={projDesc}
                onChange={(e) => setProjDesc(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                <select
                  required
                  disabled={Boolean(editingProj && !isAdmin)}
                  value={projDeptId}
                  onChange={(e) => setProjDeptId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
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
                <label className="block text-xs font-medium text-slate-700 mb-1">Team</label>
                <select
                  required
                  disabled={Boolean(editingProj && !isAdmin)}
                  value={projTeamId}
                  onChange={(e) => {
                    setProjTeamId(e.target.value);
                    const t = teams.find((tm) => tm.id === e.target.value);
                    if (t) setProjLeadId(t.leadId);
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Select...</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Project Lead</label>
                <select
                  required
                  disabled={Boolean(editingProj && !isAdmin)}
                  value={projLeadId}
                  onChange={(e) => setProjLeadId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
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
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={projStatus}
                  onChange={(e) => setProjStatus(e.target.value as ProjectStatus)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Planning">Planning</option>
                  <option value="Active">Active</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={projStart}
                  onChange={(e) => setProjStart(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={projDue}
                  onChange={(e) => setProjDue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowProjModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg"
              >
                {saving ? 'Saving...' : 'Save Project'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
