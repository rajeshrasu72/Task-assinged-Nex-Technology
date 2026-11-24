import React from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { markAllNotificationsRead, markNotificationRead } from '../../lib/firestoreService';
import { TaskItem } from '../../types/models';

interface NotificationsViewProps {
  onSelectTask: (task: TaskItem) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onSelectTask }) => {
  const { notifications, tasks } = useWorkspace();

  const handleOpenNotification = async (notifId: string, taskId?: string) => {
    await markNotificationRead(notifId);
    if (taskId) {
      const found = tasks.find((t) => t.id === taskId);
      if (found) onSelectTask(found);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#062044]">Notifications</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time alerts for task assignments, review submissions, approvals, and comments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => markAllNotificationsRead(notifications)}
          className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 shrink-0"
        >
          <CheckCheck className="w-4 h-4 text-[#0284C7]" />
          Mark All Read
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-800">You are all caught up</p>
            <p className="text-xs text-slate-500 mt-1">
              Task assignments and review notifications will appear here.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleOpenNotification(n.id, n.taskId)}
              className={`w-full text-left px-5 py-4 flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors ${
                n.read ? 'bg-white' : 'bg-sky-50/40'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#062044]">{n.title}</span>
                  {!n.read && (
                    <span className="text-[11px] font-medium text-[#0284C7] bg-sky-100 px-1.5 py-0.5 rounded">
                      Unread
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-600">{n.message}</p>
              </div>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                {n.createdAt.slice(0, 16).replace('T', ' ')}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
