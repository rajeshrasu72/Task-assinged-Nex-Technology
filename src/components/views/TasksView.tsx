import React, { useMemo, useState } from 'react';
import { Search, Plus, Filter, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { TaskItem, TaskPriority, TaskStatus } from '../../types/models';
import { isTaskOverdue, PriorityLabel, StatusLabel, UserAvatar } from '../ui/Badges';

interface TasksViewProps {
  onSelectTask: (task: TaskItem) => void;
  onCreateTask: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ onSelectTask, onCreateTask }) => {
  const { profile } = useAuth();
  const { tasks, projects, getProjectById, getMemberById, getDepartmentById } = useWorkspace();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'mine' | 'overdue'>('all');

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
      if (projectFilter !== 'ALL' && t.projectId !== projectFilter) return false;
      if (scopeFilter === 'mine' && profile && !t.assigneeIds.includes(profile.uid)) return false;
      if (scopeFilter === 'overdue' && !isTaskOverdue(t.dueDate, t.status)) return false;
      if (q) {
        const hay = `${t.taskCode} ${t.title} ${t.description || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, search, statusFilter, priorityFilter, projectFilter, scopeFilter, profile]);

  const canCreate = profile?.role === 'admin' || profile?.role === 'team_lead';

  const statuses: TaskStatus[] = [
    'To Do',
    'In Progress',
    'In Review',
    'Revision Required',
    'On Hold',
    'Completed',
  ];
  const priorities: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#062044]">Tasks</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track deliverables, priorities, hours, and approvals across active engagements.
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={onCreateTask}
            className="px-4 py-2 text-xs font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </button>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by task ID (NEX-2026-0001), title, or description..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0284C7]/25"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['all', 'mine', 'overdue'] as const).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => setScopeFilter(sc)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    scopeFilter === sc
                      ? 'bg-white text-[#062044] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sc === 'all' ? 'All Tasks' : sc === 'mine' ? 'Assigned to Me' : 'Overdue'}
                </button>
              ))}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">All Statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">All Priorities</option>
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white max-w-[180px]"
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} · {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Data Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="py-14 px-6 text-center">
            <Filter className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-900">No matching tasks found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {tasks.length === 0
                ? 'Create your first project and task to begin tracking agency deliverables.'
                : 'Adjust your search query or status filters to see other tasks.'}
            </p>
            {canCreate && tasks.length === 0 && (
              <button
                type="button"
                onClick={onCreateTask}
                className="mt-4 px-4 py-2 text-xs font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Create First Task
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-4">Task ID</th>
                  <th className="py-3 px-4">Task &amp; Project</th>
                  <th className="py-3 px-4">Assignees</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTasks.map((t) => {
                  const project = getProjectById(t.projectId);
                  const dept = getDepartmentById(t.departmentId);
                  const overdue = isTaskOverdue(t.dueDate, t.status);

                  return (
                    <tr
                      key={t.id}
                      onClick={() => onSelectTask(t)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-[#0284C7] whitespace-nowrap tabular-nums">
                        {t.taskCode}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-slate-900 truncate">{t.title}</div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {project?.name || 'Project'} · {dept?.name || 'Dept'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center -space-x-1.5">
                          {t.assigneeIds.slice(0, 3).map((uid) => {
                            const m = getMemberById(uid);
                            return (
                              <UserAvatar
                                key={uid}
                                name={m?.displayName || 'User'}
                                avatarUrl={m?.avatarUrl}
                              />
                            );
                          })}
                          {t.assigneeIds.length > 3 && (
                            <span className="pl-2.5 text-[11px] text-slate-500 font-mono">
                              +{t.assigneeIds.length - 3}
                            </span>
                          )}
                          {t.assigneeIds.length === 0 && (
                            <span className="text-[11px] text-slate-400">Unassigned</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusLabel status={t.status} />
                      </td>
                      <td className="py-3 px-4">
                        <PriorityLabel priority={t.priority} />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono tabular-nums">
                        <span className={overdue ? 'text-red-600 font-semibold inline-flex items-center gap-1' : 'text-slate-600'}>
                          {overdue && <AlertTriangle className="w-3 h-3" />}
                          {t.dueDate}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {t.loggedHours || 0}h / {t.estimatedHours || 0}h
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
