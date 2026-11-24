import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { isTaskOverdue } from '../ui/Badges';

export const ReportsView: React.FC = () => {
  const { firebaseUser } = useAuth();
  const { tasks, projects, teams, timeEntries, getDepartmentById } = useWorkspace();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const projectReport = useMemo(() => {
    return projects.map((p) => {
      const pt = tasks.filter((t) => t.projectId === p.id);
      const completed = pt.filter((t) => t.status === 'Completed').length;
      const overdue = pt.filter((t) => isTaskOverdue(t.dueDate, t.status)).length;
      const estHours = pt.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
      const loggedHours = pt.reduce((acc, t) => acc + (t.loggedHours || 0), 0);
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        department: getDepartmentById(p.departmentId)?.name || '—',
        total: pt.length,
        completed,
        overdue,
        estHours: Number(estHours.toFixed(1)),
        loggedHours: Number(loggedHours.toFixed(1)),
        rate: pt.length ? Math.round((completed / pt.length) * 100) : 0,
      };
    });
  }, [projects, tasks, getDepartmentById]);

  const teamHoursData = useMemo(() => {
    return teams.map((team) => {
      const tt = tasks.filter((t) => t.teamId === team.id);
      return {
        name: team.name,
        Estimated: Number(tt.reduce((a, t) => a + (t.estimatedHours || 0), 0).toFixed(1)),
        Logged: Number(tt.reduce((a, t) => a + (t.loggedHours || 0), 0).toFixed(1)),
      };
    });
  }, [teams, tasks]);

  const priorityData = useMemo(
    () =>
      (['Low', 'Medium', 'High', 'Urgent'] as const).map((p) => ({
        name: p,
        Total: tasks.filter((t) => t.priority === p).length,
        Completed: tasks.filter((t) => t.priority === p && t.status === 'Completed').length,
      })),
    [tasks]
  );

  const totalLogged = useMemo(
    () => timeEntries.reduce((acc, e) => acc + (e.hours || 0), 0).toFixed(1),
    [timeEntries]
  );

  const handleExportCsv = async () => {
    if (!firebaseUser) return;
    setExporting(true);
    setExportError(null);
    try {
      const token = await firebaseUser.getIdToken();
      const headers = [
        'Task ID',
        'Title',
        'Status',
        'Priority',
        'Due Date',
        'Estimated Hours',
        'Logged Hours',
        'Review Status',
      ];
      const rows = tasks.map((t) => [
        t.taskCode,
        t.title,
        t.status,
        t.priority,
        t.dueDate,
        t.estimatedHours,
        t.loggedHours,
        t.reviewStatus,
      ]);

      const res = await fetch('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: `nex-tasks-report-${new Date().toISOString().slice(0, 10)}`,
          headers,
          rows,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || 'CSV export failed.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nex-tasks-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Unable to export CSV.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#062044]">Reports &amp; Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Delivery velocity, effort accuracy, and project completion metrics.
          </p>
        </div>

        <button
          type="button"
          disabled={exporting || tasks.length === 0}
          onClick={handleExportCsv}
          className="px-4 py-2 text-xs font-medium text-white bg-[#062044] hover:bg-[#0A2E5C] rounded-lg inline-flex items-center gap-1.5 disabled:opacity-50 shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>{exporting ? 'Exporting...' : 'Export CSV Report'}</span>
        </button>
      </div>

      {exportError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          {exportError}
        </div>
      )}

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Total Tasks Analyzed</div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-[#062044]">
            {tasks.length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Completion Rate</div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-700">
            {tasks.length
              ? Math.round(
                  (tasks.filter((t) => t.status === 'Completed').length / tasks.length) * 100
                )
              : 0}
            %
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Total Logged Hours</div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-[#0284C7]">
            {totalLogged}h
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Overdue Tasks</div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-red-600">
            {tasks.filter((t) => isTaskOverdue(t.dueDate, t.status)).length}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#062044] mb-1">
            Estimated vs. Logged Hours by Team
          </h2>
          <p className="text-xs text-slate-500 mb-4">Capacity utilization across active squads</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamHoursData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Estimated" fill="#062044" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Logged" fill="#0284C7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#062044] mb-1">
            Priority Completion Breakdown
          </h2>
          <p className="text-xs text-slate-500 mb-4">Total vs. completed tasks per priority tier</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Total" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Completed" fill="#16A34A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Project Summary Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-[#062044]">Project Delivery Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-right">Tasks</th>
                <th className="py-3 px-4 text-right">Completed</th>
                <th className="py-3 px-4 text-right">Overdue</th>
                <th className="py-3 px-4 text-right">Est / Logged</th>
                <th className="py-3 px-4 text-right">Completion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {projectReport.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No project data available.
                  </td>
                </tr>
              ) : (
                projectReport.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold text-[#0284C7] mr-2">{r.code}</span>
                      <span className="font-medium text-slate-900">{r.name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{r.department}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">{r.total}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700">
                      {r.completed}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-red-600">
                      {r.overdue}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {r.estHours}h / {r.loggedHours}h
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#062044]">
                      {r.rate}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
