import React, { useState } from 'react';
import { Plus, Calendar, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { updateTaskFields } from '../../lib/firestoreService';
import { TaskItem, TaskStatus } from '../../types/models';
import { isTaskOverdue, PriorityLabel, UserAvatar } from '../ui/Badges';

interface KanbanViewProps {
  onSelectTask: (task: TaskItem) => void;
  onCreateTask: () => void;
}

const KANBAN_COLUMNS: TaskStatus[] = [
  'To Do',
  'In Progress',
  'In Review',
  'Revision Required',
  'Completed',
];

export const KanbanView: React.FC<KanbanViewProps> = ({ onSelectTask, onCreateTask }) => {
  const { profile } = useAuth();
  const { tasks, getMemberById, getProjectById } = useWorkspace();

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);

  if (!profile) return null;

  const isAdmin = profile.role === 'admin';
  const canCreate = isAdmin || profile.role === 'team_lead';

  const handleMoveTask = async (task: TaskItem, targetStatus: TaskStatus) => {
    setPolicyError(null);
    if (task.status === targetStatus) return;

    const isTaskLead = profile.role === 'team_lead' && task.teamLeadId === profile.uid;

    if (task.status === 'Completed' && !isAdmin) {
      setPolicyError('Completed tasks are locked. Only an Admin can reopen a completed task.');
      return;
    }

    if (!isAdmin && !isTaskLead) {
      if (targetStatus === 'Completed' || targetStatus === 'Revision Required') {
        setPolicyError(
          'Members cannot mark tasks Completed or Revision Required directly. Move to "In Review" to request Team Lead approval.'
        );
        return;
      }
    }

    try {
      await updateTaskFields(profile, task, { status: targetStatus });
    } catch (err) {
      setPolicyError(err instanceof Error ? err.message : 'Unable to move task.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#062044]">Kanban Board</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Drag and drop task cards across stages. Every move syncs immediately to Firestore.
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={onCreateTask}
            className="px-4 py-2 text-xs font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        )}
      </div>

      {policyError && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-4">
          <span>{policyError}</span>
          <button
            type="button"
            onClick={() => setPolicyError(null)}
            className="text-amber-700 font-medium underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-start">
        {KANBAN_COLUMNS.map((colStatus) => {
          const colTasks = tasks.filter((t) => t.status === colStatus);
          const isDropTarget = dragOverCol === colStatus;

          return (
            <div
              key={colStatus}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(colStatus);
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverCol(null);
                const id = e.dataTransfer.getData('text/plain') || draggedTaskId;
                const found = tasks.find((t) => t.id === id);
                setDraggedTaskId(null);
                if (found) void handleMoveTask(found, colStatus);
              }}
              className={`rounded-xl border p-3 min-h-[420px] transition-colors ${
                isDropTarget
                  ? 'bg-sky-50/70 border-[#0284C7]'
                  : 'bg-slate-100/70 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between px-1 pb-3 mb-3 border-b border-slate-200/80">
                <h2 className="text-xs font-semibold text-[#062044]">{colStatus}</h2>
                <span className="font-mono text-xs font-semibold text-slate-500 tabular-nums">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-2.5">
                {colTasks.map((task) => {
                  const overdue = isTaskOverdue(task.dueDate, task.status);
                  const project = getProjectById(task.projectId);
                  return (
                    <div
                      key={task.id}
                      draggable={task.status !== 'Completed' || isAdmin}
                      onDragStart={(e) => {
                        setDraggedTaskId(task.id);
                        e.dataTransfer.setData('text/plain', task.id);
                      }}
                      onDragEnd={() => {
                        setDraggedTaskId(null);
                        setDragOverCol(null);
                      }}
                      onClick={() => onSelectTask(task)}
                      className="bg-white border border-slate-200 hover:border-[#0284C7]/60 rounded-lg p-3.5 cursor-pointer transition-colors shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono text-[11px] font-semibold text-[#0284C7] tabular-nums">
                          {task.taskCode}
                        </span>
                        <PriorityLabel priority={task.priority} />
                      </div>

                      <h3 className="text-sm font-medium text-slate-900 leading-snug line-clamp-2">
                        {task.title}
                      </h3>

                      {project && (
                        <div className="mt-1 text-[11px] text-slate-500 truncate">
                          {project.code} · {project.name}
                        </div>
                      )}

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center -space-x-1.5">
                          {task.assigneeIds.slice(0, 3).map((uid) => {
                            const m = getMemberById(uid);
                            return (
                              <UserAvatar
                                key={uid}
                                name={m?.displayName || 'User'}
                                avatarUrl={m?.avatarUrl}
                              />
                            );
                          })}
                          {task.assigneeIds.length === 0 && (
                            <span className="text-[11px] text-slate-400">Unassigned</span>
                          )}
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-mono tabular-nums ${
                            overdue ? 'text-red-600 font-semibold' : 'text-slate-500'
                          }`}
                        >
                          {overdue ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : (
                            <Calendar className="w-3 h-3" />
                          )}
                          {task.dueDate}
                        </span>
                      </div>

                      {/* Accessible Mobile/Keyboard Quick-Move Select */}
                      <div
                        className="mt-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          aria-label={`Move ${task.taskCode} status`}
                          value={task.status}
                          disabled={task.status === 'Completed' && !isAdmin}
                          onChange={(e) =>
                            void handleMoveTask(task, e.target.value as TaskStatus)
                          }
                          className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded bg-slate-50 text-slate-700"
                        >
                          {KANBAN_COLUMNS.map((s) => (
                            <option key={s} value={s}>
                              Stage: {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
                {colTasks.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-300/70 rounded-lg">
                    Drop task here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
