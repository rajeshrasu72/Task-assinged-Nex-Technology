import React, { useEffect, useState } from 'react';
import {
  X,
  Edit3,
  Trash2,
  CheckSquare,
  Square,
  ExternalLink,
  Upload,
  FileText,
  Send,
  CheckCircle2,
  RotateCcw,
  Clock,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import {
  addTaskComment,
  deleteTask,
  logTaskTimeEntry,
  removeTaskAttachment,
  reviewTaskSubmission,
  subscribeTaskDetails,
  submitTaskForReview,
  updateTaskFields,
  uploadTaskAttachment,
} from '../../lib/firestoreService';
import {
  TaskAttachment,
  TaskComment,
  TaskItem,
  TaskReview,
  TaskStatus,
  TimeEntry,
} from '../../types/models';
import {
  PriorityLabel,
  StatusLabel,
  UserAvatar,
  isTaskOverdue,
  formatRoleLabel,
} from '../ui/Badges';

interface TaskDetailDrawerProps {
  task: TaskItem | null;
  onClose: () => void;
  onEdit: (task: TaskItem) => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  onClose,
  onEdit,
}) => {
  const { profile } = useAuth();
  const { getMemberById, getProjectById, getDepartmentById, getTeamById } = useWorkspace();

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [reviews, setReviews] = useState<TaskReview[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);

  const [commentBody, setCommentBody] = useState('');
  const [submissionNote, setSubmissionNote] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [logHours, setLogHours] = useState('1');
  const [logNote, setLogNote] = useState('');
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!task || !profile) return;
    setActionError(null);
    const unsub = subscribeTaskDetails(task.id, profile.uid, profile.role, {
      onComments: setComments,
      onAttachments: setAttachments,
      onReviews: setReviews,
      onTimeEntries: setTimeEntries,
    });
    return () => unsub();
  }, [task?.id, profile]);

  if (!task || !profile) return null;

  const project = getProjectById(task.projectId);
  const dept = getDepartmentById(task.departmentId);
  const team = getTeamById(task.teamId);
  const lead = getMemberById(task.teamLeadId);
  const overdue = isTaskOverdue(task.dueDate, task.status);

  const isAdmin = profile.role === 'admin';
  const isTaskLead = profile.role === 'team_lead' && task.teamLeadId === profile.uid;
  const isAssignee = task.assigneeIds.includes(profile.uid);
  const canEdit = isAdmin || (isTaskLead && task.status !== 'Completed');
  const canReview = (isAdmin || isTaskLead) && task.status === 'In Review';
  const canSubmitForReview =
    (isAssignee || isTaskLead || isAdmin) &&
    (task.status === 'To Do' || task.status === 'In Progress' || task.status === 'Revision Required');

  const allowedMemberStatuses: TaskStatus[] = ['To Do', 'In Progress', 'In Review'];
  const allStatuses: TaskStatus[] = [
    'To Do',
    'In Progress',
    'In Review',
    'Revision Required',
    'On Hold',
    'Completed',
  ];

  const handleStatusChange = async (nextStatus: TaskStatus) => {
    setActionError(null);
    if (!isAdmin && !isTaskLead && !allowedMemberStatuses.includes(nextStatus)) {
      setActionError('Members must submit tasks for review; only Team Leads or Admins can approve completion.');
      return;
    }
    try {
      await updateTaskFields(profile, task, { status: nextStatus });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update status.');
    }
  };

  const handleToggleCheck = async (checkId: string) => {
    if (task.status === 'Completed' && !isAdmin) return;
    const updated = task.checklist.map((item) =>
      item.id === checkId ? { ...item, done: !item.done } : item
    );
    try {
      await updateTaskFields(profile, task, { checklist: updated });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update checklist.');
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    category: 'brief' | 'deliverable'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setActionError('Maximum file size is 25 MB.');
      return;
    }
    setActionError(null);
    setUploadPct(0);
    try {
      await uploadTaskAttachment(profile, task, file, category, (pct) => setUploadPct(pct));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      if (msg.includes('storage/') || msg.includes('bucket')) {
        setActionError(
          'Firebase Storage upload failed. Ensure Firebase Storage is initialized in your Firebase Console and storage.rules are active.'
        );
      } else {
        setActionError(msg);
      }
    } finally {
      setUploadPct(null);
      e.target.value = '';
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionNote.trim()) {
      setActionError('Please include a submission summary for your Team Lead.');
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const deliverableUrls = attachments
        .filter((a) => a.category === 'deliverable')
        .map((a) => a.downloadUrl);
      await submitTaskForReview(profile, task, submissionNote, deliverableUrls);
      setSubmissionNote('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleReviewDecision = async (decision: 'Approved' | 'Revision Requested') => {
    if (decision === 'Revision Requested' && !reviewNotes.trim()) {
      setActionError('Please provide clear revision instructions before requesting changes.');
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await reviewTaskSubmission(
        profile,
        task,
        decision,
        reviewNotes.trim() || (decision === 'Approved' ? 'Approved and completed.' : '')
      );
      setReviewNotes('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Review action failed.');
    } finally {
      setBusy(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setBusy(true);
    try {
      await addTaskComment(profile, task, commentBody);
      setCommentBody('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to post comment.');
    } finally {
      setBusy(false);
    }
  };

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    const hrs = Number(logHours);
    if (!hrs || hrs <= 0 || hrs > 24) {
      setActionError('Enter valid hours between 0.25 and 24.');
      return;
    }
    setBusy(true);
    try {
      await logTaskTimeEntry(profile, task, {
        hours: hrs,
        note: logNote,
        date: new Date().toISOString().slice(0, 10),
      });
      setLogNote('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to log time.');
    } finally {
      setBusy(false);
    }
  };

  const completedChecks = task.checklist.filter((c) => c.done).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/35 flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full border-l border-slate-200 shadow-2xl flex flex-col">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-xs font-semibold text-[#0284C7] bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-md tabular-nums">
              {task.taskCode}
            </span>
            <StatusLabel status={task.status} />
            <PriorityLabel priority={task.priority} />
            {overdue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md">
                <AlertTriangle className="w-3 h-3" />
                Overdue
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {canEdit && (
              <button
                type="button"
                onClick={() => onEdit(task)}
                className="p-2 text-slate-500 hover:text-[#062044] hover:bg-slate-100 rounded-lg"
                title="Edit task"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={async () => {
                  await deleteTask(task.id);
                  onClose();
                }}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                title="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {actionError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {actionError}
            </div>
          )}

          <div>
            <h2 className="text-xl font-bold text-[#062044] leading-snug">{task.title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span>{project ? `${project.code} · ${project.name}` : 'Project'}</span>
              <span aria-hidden="true">·</span>
              <span>{dept?.name || 'Department'}</span>
              <span aria-hidden="true">·</span>
              <span>{team?.name || 'Team'}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Due {task.dueDate} {task.dueTime || ''}
              </span>
            </div>
            {task.description && (
              <p className="mt-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {task.description}
              </p>
            )}
          </div>

          {/* Workflow Status Selector & Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Workflow Status
              </label>
              <select
                value={task.status}
                disabled={task.status === 'Completed' && !isAdmin}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
              >
                {(isAdmin || isTaskLead ? allStatuses : allowedMemberStatuses).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                {!isAdmin && !isTaskLead && !allowedMemberStatuses.includes(task.status) && (
                  <option value={task.status}>{task.status}</option>
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-medium text-slate-500">Team Lead</div>
                <div className="mt-1.5 flex items-center gap-2">
                  <UserAvatar name={lead?.displayName || 'Lead'} avatarUrl={lead?.avatarUrl} />
                  <span className="text-xs font-medium text-slate-800 truncate">
                    {lead?.displayName || 'Unassigned'}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Hours</div>
                <div className="mt-1.5 text-sm font-mono font-semibold text-slate-900 tabular-nums">
                  {task.loggedHours || 0}h / {task.estimatedHours || 0}h
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 pt-2 border-t border-slate-200">
              <div className="text-xs font-medium text-slate-500 mb-1.5">Assigned Members</div>
              <div className="flex flex-wrap gap-2">
                {task.assigneeIds.length === 0 ? (
                  <span className="text-xs text-slate-400">No members assigned</span>
                ) : (
                  task.assigneeIds.map((uid) => {
                    const m = getMemberById(uid);
                    return (
                      <div
                        key={uid}
                        className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-700"
                      >
                        <UserAvatar name={m?.displayName || 'Member'} avatarUrl={m?.avatarUrl} />
                        <span>{m?.displayName || uid.slice(0, 8)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Team Lead / Admin Review Decision Panel */}
          {canReview && (
            <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-indigo-950">
                  Submission Awaiting Review
                </h3>
                <span className="text-xs text-indigo-700 font-mono">
                  {task.submittedAt ? task.submittedAt.slice(0, 10) : ''}
                </span>
              </div>
              {task.submissionNote && (
                <p className="text-xs text-indigo-900 bg-white/80 p-3 rounded-lg border border-indigo-100">
                  {task.submissionNote}
                </p>
              )}
              <textarea
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Review feedback (required if requesting revision)..."
                className="w-full px-3 py-2 text-sm bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleReviewDecision('Approved')}
                  className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve &amp; Complete
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleReviewDecision('Revision Requested')}
                  className="px-4 py-2 text-xs font-medium text-red-700 bg-white border border-red-300 hover:bg-red-50 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  <RotateCcw className="w-4 h-4" />
                  Request Revision
                </button>
              </div>
            </div>
          )}

          {/* Member Submit for Review Panel */}
          {canSubmitForReview && (
            <form
              onSubmit={handleSubmitReview}
              className="p-4 rounded-xl bg-sky-50/70 border border-sky-200 space-y-3"
            >
              <h3 className="text-sm font-semibold text-[#062044]">
                {task.status === 'Revision Required'
                  ? 'Resubmit Revised Deliverables'
                  : 'Submit Completed Work for Review'}
              </h3>
              <textarea
                rows={2}
                value={submissionNote}
                onChange={(e) => setSubmissionNote(e.target.value)}
                placeholder="Summarize completed deliverables, test verification, or links..."
                className="w-full px-3 py-2 text-sm bg-white border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0284C7]/25"
              />
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 text-xs font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg inline-flex items-center gap-1.5 disabled:opacity-60"
              >
                <Send className="w-3.5 h-3.5" />
                Submit for Review
              </button>
            </form>
          )}

          {/* Checklist */}
          {task.checklist.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-[#062044]">Checklist</h3>
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  {completedChecks}/{task.checklist.length} done
                </span>
              </div>
              <div className="space-y-1.5">
                {task.checklist.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleToggleCheck(item.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    {item.done ? (
                      <CheckSquare className="w-4 h-4 text-[#0284C7] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className={item.done ? 'line-through text-slate-400' : 'text-slate-700'}>
                      {item.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reference Links */}
          {task.referenceLinks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#062044] mb-2">Reference Links</h3>
              <div className="space-y-1.5">
                {task.referenceLinks.map((lnk) => (
                  <a
                    key={lnk.id}
                    href={lnk.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 hover:border-[#0284C7] text-xs text-slate-700 hover:text-[#0284C7] transition-colors"
                  >
                    <span className="font-medium truncate">{lnk.label}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Attachments & Deliverables */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-[#062044]">
                Attachments &amp; Deliverables ({attachments.length})
              </h3>
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0284C7] bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadPct !== null ? `Uploading ${uploadPct}%` : 'Upload Deliverable'}</span>
                <input
                  type="file"
                  className="hidden"
                  disabled={uploadPct !== null}
                  onChange={(e) => handleFileUpload(e, 'deliverable')}
                />
              </label>
            </div>
            {attachments.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 border border-dashed border-slate-200 rounded-lg text-center">
                No files uploaded yet. Attach completed deliverables or briefs up to 25 MB.
              </p>
            ) : (
              <div className="space-y-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/70 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-[#0284C7] shrink-0" />
                      <div className="min-w-0">
                        <a
                          href={att.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-slate-800 hover:text-[#0284C7] truncate block"
                        >
                          {att.fileName}
                        </a>
                        <div className="text-[11px] text-slate-500">
                          {att.uploadedByName} · {(att.fileSize / 1024).toFixed(1)} KB ·{' '}
                          {att.category}
                        </div>
                      </div>
                    </div>
                    {(isAdmin || att.uploadedBy === profile.uid) && (
                      <button
                        type="button"
                        onClick={() => removeTaskAttachment(att)}
                        className="p-1 text-slate-400 hover:text-red-600"
                        title="Remove attachment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Time Tracking */}
          <div>
            <h3 className="text-sm font-semibold text-[#062044] mb-2 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              Time Entries ({timeEntries.length})
            </h3>
            <form onSubmit={handleLogTime} className="flex gap-2 mb-3">
              <input
                type="number"
                min="0.25"
                max="24"
                step="0.25"
                value={logHours}
                onChange={(e) => setLogHours(e.target.value)}
                className="w-20 px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg tabular-nums"
              />
              <input
                type="text"
                value={logNote}
                onChange={(e) => setLogNote(e.target.value)}
                placeholder="Work logged summary..."
                className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                disabled={busy}
                className="px-3 py-1.5 text-xs font-medium text-white bg-[#062044] hover:bg-[#0A2E5C] rounded-lg shrink-0"
              >
                Log Hours
              </button>
            </form>
            {timeEntries.length > 0 && (
              <div className="space-y-1.5">
                {timeEntries.map((te) => (
                  <div
                    key={te.id}
                    className="flex items-center justify-between px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <span className="text-slate-700">
                      <span className="font-medium">{te.userName}</span>
                      {te.note ? ` · ${te.note}` : ''}
                    </span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums shrink-0 ml-2">
                      {te.hours}h · {te.date}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Review & Submission History */}
          {reviews.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#062044] mb-2">
                Submission &amp; Review History
              </h3>
              <div className="space-y-2">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">
                        {rev.action} · {rev.actorName} ({formatRoleLabel(rev.actorRole)})
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {rev.createdAt.slice(0, 16).replace('T', ' ')}
                      </span>
                    </div>
                    {rev.notes && <p className="mt-1 text-slate-600">{rev.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div>
            <h3 className="text-sm font-semibold text-[#062044] mb-2 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              Comments ({comments.length})
            </h3>
            <form onSubmit={handlePostComment} className="flex gap-2 mb-3">
              <input
                type="text"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Write an update or question..."
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                disabled={busy || !commentBody.trim()}
                className="px-4 py-2 text-xs font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg disabled:opacity-50"
              >
                Post
              </button>
            </form>
            <div className="space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="p-3 rounded-lg border border-slate-200 bg-white text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      {c.authorName}{' '}
                      <span className="font-normal text-slate-400">
                        · {formatRoleLabel(c.authorRole)}
                      </span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {c.createdAt.slice(0, 16).replace('T', ' ')}
                    </span>
                  </div>
                  <p className="mt-1.5 text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
