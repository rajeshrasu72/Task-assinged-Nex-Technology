import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeActivityLogs,
  subscribeDepartments,
  subscribeDirectory,
  subscribeInvitesAdmin,
  subscribeNotifications,
  subscribeProjects,
  subscribeTasksForRole,
  subscribeTeams,
  subscribeTimeEntriesForUser,
  subscribeUsersAdmin,
} from '../lib/firestoreService';
import {
  ActivityLog,
  AppNotification,
  Department,
  DirectoryEntry,
  EmployeeInvite,
  Project,
  TaskItem,
  Team,
  TimeEntry,
  UserProfile,
} from '../types/models';

interface WorkspaceContextValue {
  directory: DirectoryEntry[];
  adminUsers: UserProfile[];
  invites: EmployeeInvite[];
  departments: Department[];
  teams: Team[];
  projects: Project[];
  tasks: TaskItem[];
  notifications: AppNotification[];
  activityLogs: ActivityLog[];
  timeEntries: TimeEntry[];
  loadingData: boolean;
  unreadNotificationsCount: number;
  getMemberById: (uid: string) => DirectoryEntry | undefined;
  getDepartmentById: (id: string) => Department | undefined;
  getTeamById: (id: string) => Team | undefined;
  getProjectById: (id: string) => Project | undefined;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();

  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [invites, setInvites] = useState<EmployeeInvite[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!profile || profile.status !== 'active') {
      setDirectory([]);
      setAdminUsers([]);
      setInvites([]);
      setDepartments([]);
      setTeams([]);
      setProjects([]);
      setTasks([]);
      setNotifications([]);
      setActivityLogs([]);
      setTimeEntries([]);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    const unsubs = [
      subscribeDirectory(setDirectory),
      subscribeDepartments(setDepartments),
      subscribeTeams(setTeams),
      subscribeProjects(setProjects),
      subscribeTasksForRole(profile.uid, profile.role, (items) => {
        setTasks(items);
        setLoadingData(false);
      }),
      subscribeNotifications(profile.uid, setNotifications),
      subscribeActivityLogs(profile.uid, profile.role, setActivityLogs),
      subscribeTimeEntriesForUser(profile.uid, profile.role, setTimeEntries),
    ];

    if (profile.role === 'admin') {
      unsubs.push(subscribeUsersAdmin(setAdminUsers));
      unsubs.push(subscribeInvitesAdmin(setInvites));
    } else {
      setAdminUsers([]);
      setInvites([]);
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [profile]);

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const directoryMap = useMemo(() => new Map(directory.map((d) => [d.uid, d])), [directory]);
  const departmentMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  return (
    <WorkspaceContext.Provider
      value={{
        directory,
        adminUsers,
        invites,
        departments,
        teams,
        projects,
        tasks,
        notifications,
        activityLogs,
        timeEntries,
        loadingData,
        unreadNotificationsCount,
        getMemberById: (uid) => directoryMap.get(uid),
        getDepartmentById: (id) => departmentMap.get(id),
        getTeamById: (id) => teamMap.get(id),
        getProjectById: (id) => projectMap.get(id),
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return ctx;
}
