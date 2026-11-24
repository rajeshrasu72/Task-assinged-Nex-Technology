import React, { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { TaskItem } from '../../types/models';
import { isTaskOverdue } from '../ui/Badges';

interface CalendarViewProps {
  onSelectTask: (task: TaskItem) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onSelectTask }) => {
  const { tasks } = useWorkspace();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      const list = map.get(t.dueDate) || [];
      list.push(t);
      map.set(t.dueDate, list);
    });
    return map;
  }, [tasks]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#062044]">Schedule Calendar</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track upcoming task due dates and delivery milestones across the month.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="min-w-[140px] text-center text-sm font-semibold text-[#062044]">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700"
          >
            Today
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="py-2.5 px-3 text-xs font-semibold text-slate-500">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDate.get(key) || [];
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);

            return (
              <div
                key={key}
                className={`min-h-[115px] p-2 ${inMonth ? 'bg-white' : 'bg-slate-50/60'}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-mono tabular-nums px-1.5 py-0.5 rounded ${
                      today
                        ? 'bg-[#0284C7] text-white font-semibold'
                        : inMonth
                        ? 'text-slate-800 font-medium'
                        : 'text-slate-400'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                      {dayTasks.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((t) => {
                    const overdue = isTaskOverdue(t.dueDate, t.status);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onSelectTask(t)}
                        className={`w-full text-left px-2 py-1 rounded text-[11px] truncate border transition-colors ${
                          t.status === 'Completed'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : overdue
                            ? 'bg-red-50 border-red-200 text-red-800'
                            : 'bg-sky-50 border-sky-200 text-[#062044] hover:border-[#0284C7]'
                        }`}
                      >
                        <span className="font-mono font-semibold mr-1">{t.taskCode.slice(-4)}</span>
                        {t.title}
                      </button>
                    );
                  })}
                  {dayTasks.length > 3 && (
                    <div className="text-[10px] text-slate-500 px-1">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
