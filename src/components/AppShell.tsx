import React, { useState } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Columns3,
  FolderKanban,
  Users,
  UserCog,
  Calendar,
  BarChart3,
  History,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Plus,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { AppRoute, TaskItem } from '../types/models';
import { formatRoleLabel, UserAvatar } from './ui/Badges';
import { DashboardView } from './views/DashboardView';
import { TasksView } from './views/TasksView';
import { KanbanView } from './views/KanbanView';
import { ProjectsView } from './views/ProjectsView';
import { TeamsView } from './views/TeamsView';
import { EmployeesView } from './views/EmployeesView';
import { CalendarView } from './views/CalendarView';
import { ReportsView } from './views/ReportsView';
import { ActivityView } from './views/ActivityView';
import { NotificationsView } from './views/NotificationsView';
import { SettingsView } from './views/SettingsView';
import { TaskFormModal } from './tasks/TaskFormModal';
import { TaskDetailDrawer } from './tasks/TaskDetailDrawer';

interface NavItem {
  id: AppRoute;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const AppShell: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { tasks, unreadNotificationsCount } = useWorkspace();

  const [route, setRoute] = useState<AppRoute>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  if (!profile) return null;

  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) || null : null;
  const canCreateTask = profile.role === 'admin' || profile.role === 'team_lead';

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'kanban', label: 'Kanban Board', icon: Columns3 },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'teams', label: 'Teams', icon: Users },
    {
      id: 'employees',
      label: profile.role === 'admin' ? 'Employees' : 'Directory',
      icon: UserCog,
    },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'activity', label: 'Activity', icon: History },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotificationsCount,
    },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const currentLabel = navItems.find((n) => n.id === route)?.label || 'Dashboard';

  const handleSelectNav = (id: AppRoute) => {
    setRoute(id);
    setMobileMenuOpen(false);
  };

  const renderContent = () => {
    switch (route) {
      case 'dashboard':
        return (
          <DashboardView
            onSelectTask={(t) => setSelectedTaskId(t.id)}
            onCreateTask={() => {
              setEditingTask(null);
              setShowTaskModal(true);
            }}
            onNavigate={(r) => setRoute(r)}
          />
        );
      case 'tasks':
        return (
          <TasksView
            onSelectTask={(t) => setSelectedTaskId(t.id)}
            onCreateTask={() => {
              setEditingTask(null);
              setShowTaskModal(true);
            }}
          />
        );
      case 'kanban':
        return (
          <KanbanView
            onSelectTask={(t) => setSelectedTaskId(t.id)}
            onCreateTask={() => {
              setEditingTask(null);
              setShowTaskModal(true);
            }}
          />
        );
      case 'projects':
        return <ProjectsView />;
      case 'teams':
        return <TeamsView />;
      case 'employees':
        return <EmployeesView />;
      case 'calendar':
        return <CalendarView onSelectTask={(t) => setSelectedTaskId(t.id)} />;
      case 'reports':
        return <ReportsView />;
      case 'activity':
        return <ActivityView />;
      case 'notifications':
        return <NotificationsView onSelectTask={(t) => setSelectedTaskId(t.id)} />;
      case 'settings':
        return <SettingsView />;
      default:
        return null;
    }
  };

  const SidebarContent = (
    <div className="h-full flex flex-col bg-[#062044] text-slate-200">
      {/* Brand Lockup */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/assets/aistudio/NEX_Technology_Logo_with_Cyan_Swoosh_54e8291d.png"
            alt="Nex Technology"
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-full object-contain bg-white p-0.5 shrink-0"
          />
          <div className="min-w-0">
            <div className="text-sm font-bold text-white tracking-tight truncate">
              Nex Task Manager
            </div>
            <div className="text-[11px] text-sky-300/80 truncate">
              {formatRoleLabel(profile.role)} Workspace
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1 text-slate-300 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = route === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectNav(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[#0284C7] text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded font-mono text-[10px] tabular-nums ${
                    active ? 'bg-white text-[#062044]' : 'bg-[#0099EB] text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Account Footer */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-white/5">
          <UserAvatar name={profile.displayName} avatarUrl={profile.avatarUrl} size="md" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white truncate">{profile.displayName}</div>
            <div className="text-[11px] text-slate-400 truncate">{profile.email}</div>
          </div>
          <button
            type="button"
            onClick={signOut}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-white/10 shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] h-full z-10">{SidebarContent}</aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
              <span className="font-semibold text-[#062044] whitespace-nowrap">
                Nex Task Manager
              </span>
              <span aria-hidden="true">/</span>
              <span className="text-slate-700 font-medium truncate">{currentLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setRoute('notifications')}
              className="relative p-2 text-slate-600 hover:text-[#062044] hover:bg-slate-100 rounded-lg transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 px-1 min-w-[16px] h-4 rounded-full bg-[#0284C7] text-white text-[10px] font-mono font-semibold flex items-center justify-center">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            {canCreateTask && (
              <button
                type="button"
                onClick={() => {
                  setEditingTask(null);
                  setShowTaskModal(true);
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Task</span>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {renderContent()}
        </main>
      </div>

      {/* Modals & Drawers */}
      <TaskFormModal
        open={showTaskModal}
        editingTask={editingTask}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTask(null);
        }}
      />

      <TaskDetailDrawer
        task={selectedTask}
        onClose={() => setSelectedTaskId(null)}
        onEdit={(taskToEdit) => {
          setEditingTask(taskToEdit);
          setShowTaskModal(true);
        }}
      />
    </div>
  );
};
