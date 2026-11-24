import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  PauseCircle,
  RotateCcw,
  Circle,
} from 'lucide-react';
import { ProjectStatus, TaskPriority, TaskStatus, UserRole } from '../../types/models';

export const StatusLabel: React.FC<{ status: TaskStatus }> = ({ status }) => {
  const styles: Record<TaskStatus, { cls: string; icon: React.ReactNode }> = {
    'To Do': {
      cls: 'text-slate-700 bg-slate-100 border-slate-200',
      icon: <Circle className="w-3 h-3 text-slate-500" />,
    },
    'In Progress': {
      cls: 'text-[#0369A1] bg-sky-50 border-sky-200',
      icon: <Clock className="w-3 h-3 text-[#0284C7]" />,
    },
    'In Review': {
      cls: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      icon: <Eye className="w-3 h-3 text-indigo-600" />,
    },
    'Revision Required': {
      cls: 'text-red-700 bg-red-50 border-red-200',
      icon: <RotateCcw className="w-3 h-3 text-red-600" />,
    },
    'On Hold': {
      cls: 'text-amber-700 bg-amber-50 border-amber-200',
      icon: <PauseCircle className="w-3 h-3 text-amber-600" />,
    },
    Completed: {
      cls: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" />,
    },
  };

  const cfg = styles[status] || styles['To Do'];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 ${cfg.cls}`}
    >
      {cfg.icon}
      <span>{status}</span>
    </span>
  );
};

export const PriorityLabel: React.FC<{ priority: TaskPriority }> = ({ priority }) => {
  const styles: Record<TaskPriority, string> = {
    Low: 'text-slate-600 bg-slate-100 border-slate-200',
    Medium: 'text-[#0369A1] bg-sky-50 border-sky-200',
    High: 'text-amber-700 bg-amber-50 border-amber-200',
    Urgent: 'text-red-700 bg-red-50 border-red-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 ${styles[priority]}`}
    >
      {priority === 'Urgent' && <AlertCircle className="w-3 h-3 text-red-600" />}
      <span>{priority}</span>
    </span>
  );
};

export const ProjectStatusLabel: React.FC<{ status: ProjectStatus }> = ({ status }) => {
  const styles: Record<ProjectStatus, string> = {
    Planning: 'text-slate-700 bg-slate-100 border-slate-200',
    Active: 'text-[#0369A1] bg-sky-50 border-sky-200',
    'On Hold': 'text-amber-700 bg-amber-50 border-amber-200',
    Completed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 ${styles[status]}`}
    >
      {status}
    </span>
  );
};

export function formatRoleLabel(role: UserRole): string {
  if (role === 'admin') return 'Admin';
  if (role === 'team_lead') return 'Team Lead';
  return 'Member';
}

export const UserAvatar: React.FC<{
  name: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ name, avatarUrl, size = 'sm' }) => {
  const dim =
    size === 'lg' ? 'w-10 h-10 text-sm' : size === 'md' ? 'w-8 h-8 text-xs' : 'w-6 h-6 text-[11px]';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'NX';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        referrerPolicy="no-referrer"
        className={`${dim} rounded-full object-cover border border-slate-200 shrink-0 bg-slate-100`}
      />
    );
  }

  return (
    <div
      title={name}
      className={`${dim} rounded-full bg-[#062044] text-white font-semibold flex items-center justify-center shrink-0 border border-white`}
    >
      {initials}
    </div>
  );
};

export function isTaskOverdue(dueDate: string, status: TaskStatus): boolean {
  if (!dueDate || status === 'Completed') return false;
  const todayStr = new Date().toISOString().slice(0, 10);
  return dueDate < todayStr;
}
