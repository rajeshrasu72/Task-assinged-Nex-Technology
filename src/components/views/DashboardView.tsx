import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Users,
  FolderKanban,
  CheckSquare,
  Clock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  CalendarClock,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { TaskItem } from '../../types/models';
import { isTaskOverdue, PriorityLabel, StatusLabel, UserAvatar } from '../ui/Badges';

interface DashboardViewProps {
  onSelectTask: (task: TaskItem) => void;
  onCreateTask: () => void;
  onNavigate: (route: 'tasks' | 'kanban' | 'projects' | 'employees' | 'reports') => void;
}

const CHART_COLORS = ['#64748B', '#0284C7', '#6366F1', '#DC2626', '#D97706', '#16A34A'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  onSelectTask,
  onCreateTask,
  onNavigate,
}) => {
  const { profile } = useAuth();
  const {
    directory,
    projects,
    tasks,
    teams,
    activityLogs,
    loadingData,
    getMemberById,
    getProjectById,
  } = useWorkspace();

  const todayStr = new Date().toISOString().slice(0, 10);

  const metrics = useMemo(() => {
    const activeEmployees = directory.filter((d) => d.status === 'active').length;
    const totalProjects = projects.length;
    const totalTasks = tasks.length;
    const pendingTasks = tasks.filter((t) => t.status === 'To Do' || t.status === 'On Hold').length;
    const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
    const awaitingReview = tasks.filter((t) => t.status === 'In Review').length;
    const revisionRequired = tasks.filter((t) => t.status === 'Revision Required').length;
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const overdue = tasks.filter((t) => isTaskOverdue(t.dueDate, t.status)).length;
    const dueToday = tasks.filter((t) => t.dueDate === todayStr && t.status !== 'Completed').length;

    return {
      activeEmployees,
      totalProjects,
      totalTasks,
      pendingTasks,
      inProgress,
      awaitingReview,
      revisionRequired,
      completed,
      overdue,
      dueToday,
    };
  }, [directory, projects, tasks, todayStr]);

  const statusChartData = useMemo(
    () => [
      { name: 'To Do', count: tasks.filter((t) => t.status === 'To Do').length },
      { name: 'In Progress', count: tasks.filter((t) => t.status === 'In Progress').length },
      { name: 'In Review', count: tasks.filter((t) => t.status === 'In Review').length },
      { name: 'Revision', count: tasks.filter((t) => t.status === 'Revision Required').length },
      { name: 'On Hold', count: tasks.filter((t) => t.status === 'On Hold').length },
      { name: 'Completed', count: tasks.filter((t) => t.status === 'Completed').length },
    ],
    [tasks]
  );

  const teamPerformance = useMemo(() => {
    const relevantTeams =
      profile?.role === 'team_lead'
        ? teams.filter((t) => t.leadId === profile.uid || t.memberIds.includes(profile.uid))
        : teams;

    return relevantTeams.map((team) => {
      const teamTasks = tasks.filter((t) => t.teamId === team.id);
      const done = teamTasks.filter((t) => t.status === 'Completed').length;
      const inRev = teamTasks.filter((t) => t.status === 'In Review').length;
      const overdueCount = teamTasks.filter((t) => isTaskOverdue(t.dueDate, t.status)).length;
      const rate = teamTasks.length ? Math.round((done / teamTasks.length) * 100) : 0;
      const lead = getMemberById(team.leadId);
      return {
        id: team.id,
        name: team.name,
        leadName: lead?.displayName || 'Unassigned',
        membersCount: team.memberIds.length,
        total: teamTasks.length,
        completed: done,
        inReview: inRev,
        overdue: overdueCount,
        rate,
      };
    });
  }, [teams, tasks, profile, getMemberById]);

  const upcomingDeadlines = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'Completed' && t.dueDate)
      .slice()
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 6);
  }, [tasks]);

  const pendingReviewTasks = useMemo(
    () => tasks.filter((t) => t.status === 'In Review').slice(0, 6),
    [tasks]
  );

  const revisionTasks = useMemo(
    () => tasks.filter((t) => t.status === 'Revision Required'),
    [tasks]
  );

  if (!profile) return null;

  const isAdmin = profile.role === 'admin';
  const isLead = profile.role === 'team_lead';

  const myTeamMemberCount = useMemo(() => {
    const myTeams = teams.filter((t) => t.leadId === profile.uid);
    const set = new Set<string>();
    myTeams.forEach((t) => t.memberIds.forEach((m) => set.add(m)));
    return set.size;
  }, [teams, profile.uid]);

  const kpiCards = isAdmin
    ? [
        { label: 'Total Employees', value: metrics.activeEmployees, icon: Users, accent: 'text-[#062044]' },
        { label: 'Total Projects', value: metrics.totalProjects, icon: FolderKanban, accent: 'text-[#0284C7]' },
        { label: 'Total Tasks', value: metrics.totalTasks, icon: CheckSquare, accent: 'text-[#062044]' },
        { label: 'Pending Tasks', value: metrics.pendingTasks, icon: Clock, accent: 'text-slate-700' },
        { label: 'In Progress', value: metrics.inProgress, icon: Clock, accent: 'text-[#0284C7]' },
        { label: 'Awaiting Review', value: metrics.awaitingReview, icon: Eye, accent: 'text-indigo-600' },
        { label: 'Completed', value: metrics.completed, icon: CheckCircle2, accent: 'text-emerald-600' },
        { label: 'Overdue', value: metrics.overdue, icon: AlertTriangle, accent: 'text-red-600' },
      ]
    : isLead
    ? [
        { label: 'Team Members', value: myTeamMemberCount, icon: Users, accent: 'text-[#062044]' },
        { label: 'Assigned Tasks', value: metrics.totalTasks, icon: CheckSquare, accent: 'text-[#0284C7]' },
        { label: 'Pending Reviews', value: metrics.awaitingReview, icon: Eye, accent: 'text-indigo-600' },
        { label: 'In Progress', value: metrics.inProgress, icon: Clock, accent: 'text-[#0284C7]' },
        { label: 'Completed Tasks', value: metrics.completed, icon: CheckCircle2, accent: 'text-emerald-600' },
        { label: 'Overdue Tasks', value: metrics.overdue, icon: AlertTriangle, accent: 'text-red-600' },
      ]
    : [
        { label: 'My Tasks', value: metrics.totalTasks, icon: CheckSquare, accent: 'text-[#062044]' },
        { label: "Today's Tasks", value: metrics.dueToday, icon: CalendarClock, accent: 'text-[#0284C7]' },
        { label: 'In Progress', value: metrics.inProgress, icon: Clock, accent: 'text-[#0284C7]' },
        { label: 'Revision Required', value: metrics.revisionRequired, icon: RotateCcw, accent: 'text-red-600' },
        { label: 'Awaiting Review', value: metrics.awaitingReview, icon: Eye, accent: 'text-indigo-600' },
        { label: 'Completed Tasks', value: metrics.completed, icon: CheckCircle2, accent: 'text-emerald-600' },
      ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#062044]">
            {isAdmin
              ? 'Agency Operations Overview'
              : isLead
              ? 'Team Lead Command Center'
              : 'My Work Dashboard'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time metrics calculated from active Firestore workspace records.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('kanban')}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
          >
            Open Kanban
          </button>
          {(isAdmin || isLead) && (
            <button
              type="button"
              onClick={onCreateTask}
              className="px-4 py-2 text-xs font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-3 ${
          isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-6'
        } gap-4`}
      >
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{card.label}</span>
                <Icon className={`w-4 h-4 ${card.accent}`} />
              </div>
              <div className={`mt-3 text-2xl font-bold font-mono tabular-nums ${card.accent}`}>
                {loadingData ? '—' : card.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Member Revision Alert Queue */}
      {!isAdmin && revisionTasks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-red-900 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-red-600" />
              Revision Required ({revisionTasks.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {revisionTasks.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTask(t)}
                className="text-left p-3 bg-white border border-red-200 rounded-lg hover:border-red-400 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-mono text-[11px] font-semibold text-red-700">{t.taskCode}</div>
                  <div className="text-sm font-medium text-slate-900 truncate">{t.title}</div>
                </div>
                <span className="text-xs font-medium text-red-700 shrink-0">Review Notes →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#062044]">Task Distribution &amp; Velocity</h2>
              <p className="text-xs text-slate-500">Live task counts across workflow stages</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs font-medium text-[#0284C7] hover:underline"
            >
              Full Analytics
            </button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#0284C7" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
          <h2 className="text-sm font-semibold text-[#062044]">Workflow Ratio</h2>
          <p className="text-xs text-slate-500 mb-3">Proportion of active vs completed tasks</p>
          {tasks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
              No tasks recorded yet
            </div>
          ) : (
            <div className="flex-1 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData.filter((d) => d.count > 0)}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={2}
                  >
                    {statusChartData
                      .filter((d) => d.count > 0)
                      .map((entry, idx) => (
                        <Cell key={entry.name} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Team Performance & Pending Reviews / Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(isAdmin || isLead) && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#062044]">
                {isLead ? 'Pending Submission Reviews' : 'Team Performance'}
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('tasks')}
                className="text-xs font-medium text-[#0284C7] hover:underline"
              >
                View All Tasks
              </button>
            </div>

            {isLead ? (
              pendingReviewTasks.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">
                  All submissions have been reviewed.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingReviewTasks.map((task) => {
                    const submitter = task.submittedBy ? getMemberById(task.submittedBy) : undefined;
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => onSelectTask(task)}
                        className="w-full py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50 px-2 rounded-lg transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-mono text-[#0284C7] font-semibold">
                            {task.taskCode}
                          </div>
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {task.title}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Submitted by {submitter?.displayName || 'Team Member'}
                          </div>
                        </div>
                        <span className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md shrink-0">
                          Review
                        </span>
                      </button>
                    );
                  })}
                </div>
              )
            ) : teamPerformance.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                No teams configured yet. Create teams to track delivery metrics.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                      <th className="py-2 pr-3">Team</th>
                      <th className="py-2 px-2 text-right">Tasks</th>
                      <th className="py-2 px-2 text-right">Done</th>
                      <th className="py-2 px-2 text-right">Overdue</th>
                      <th className="py-2 pl-2 text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {teamPerformance.map((tp) => (
                      <tr key={tp.id} className="hover:bg-slate-50">
                        <td className="py-2.5 pr-3">
                          <div className="font-medium text-slate-900">{tp.name}</div>
                          <div className="text-[11px] text-slate-500">Lead: {tp.leadName}</div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums">{tp.total}</td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-emerald-700">
                          {tp.completed}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-red-600">
                          {tp.overdue}
                        </td>
                        <td className="py-2.5 pl-2 text-right font-mono tabular-nums font-semibold text-[#062044]">
                          {tp.rate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Upcoming Deadlines */}
        <div className={`bg-white border border-slate-200 rounded-xl p-5 ${!isAdmin && !isLead ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#062044]">Upcoming Deadlines</h2>
            <button
              type="button"
              onClick={() => onNavigate('tasks')}
              className="text-xs font-medium text-[#0284C7] hover:underline"
            >
              All Deadlines
            </button>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No pending task deadlines.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingDeadlines.map((t) => {
                const proj = getProjectById(t.projectId);
                const overdue = isTaskOverdue(t.dueDate, t.status);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectTask(t)}
                    className="w-full py-2.5 px-2 flex items-center justify-between gap-3 text-left hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-semibold text-[#0284C7]">{t.taskCode}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500 truncate">{proj?.name || 'Project'}</span>
                      </div>
                      <div className="text-sm font-medium text-slate-900 truncate mt-0.5">
                        {t.title}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <PriorityLabel priority={t.priority} />
                      <span
                        className={`text-xs font-mono tabular-nums ${
                          overdue ? 'text-red-600 font-semibold' : 'text-slate-600'
                        }`}
                      >
                        {t.dueDate}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#062044]">Recent Activity</h2>
          <span className="text-xs text-slate-400">Live audit stream</span>
        </div>
        {activityLogs.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No workspace activity recorded yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {activityLogs.slice(0, 8).map((log) => {
              const actor = getMemberById(log.actorId);
              return (
                <div key={log.id} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserAvatar name={log.actorName} avatarUrl={actor?.avatarUrl} />
                    <div className="min-w-0">
                      <span className="font-medium text-slate-900">{log.actorName}</span>{' '}
                      <span className="text-slate-600">{log.action}</span>{' '}
                      <span className="font-medium text-[#062044]">{log.entityLabel}</span>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 shrink-0 tabular-nums">
                    {log.createdAt.slice(0, 16).replace('T', ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
