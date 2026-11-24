import React, { useMemo, useState } from 'react';
import { History } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { UserAvatar, formatRoleLabel } from '../ui/Badges';

export const ActivityView: React.FC = () => {
  const { activityLogs, getMemberById } = useWorkspace();
  const [entityFilter, setEntityFilter] = useState('ALL');

  const filtered = useMemo(() => {
    if (entityFilter === 'ALL') return activityLogs;
    return activityLogs.filter((l) => l.entityType === entityFilter);
  }, [activityLogs, entityFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#062044]">Activity History</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Immutable audit trail of task assignments, status transitions, submissions, and approvals.
          </p>
        </div>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white shrink-0"
        >
          <option value="ALL">All Activity Types</option>
          <option value="task">Tasks</option>
          <option value="review">Reviews &amp; Approvals</option>
          <option value="time">Time Entries</option>
          <option value="project">Projects</option>
          <option value="team">Teams</option>
          <option value="department">Departments</option>
          <option value="user">Employees &amp; Roles</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-800">No activity logs recorded</p>
          </div>
        ) : (
          filtered.map((log) => {
            const actor = getMemberById(log.actorId);
            return (
              <div key={log.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <UserAvatar name={log.actorName} avatarUrl={actor?.avatarUrl} size="md" />
                  <div className="min-w-0">
                    <div className="text-sm text-slate-800">
                      <span className="font-semibold text-[#062044]">{log.actorName}</span>{' '}
                      <span className="text-slate-500 text-xs">
                        ({formatRoleLabel(log.actorRole)})
                      </span>{' '}
                      <span>{log.action}</span>{' '}
                      <span className="font-medium text-slate-900">{log.entityLabel}</span>
                    </div>
                    {log.details && (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{log.details}</p>
                    )}
                  </div>
                </div>
                <span className="font-mono text-xs text-slate-400 tabular-nums shrink-0">
                  {log.createdAt.slice(0, 16).replace('T', ' ')}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
