export type UserRole = 'admin' | 'team_lead' | 'member';
export type UserStatus = 'active' | 'pending' | 'disabled';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskStatus =
  | 'To Do'
  | 'In Progress'
  | 'In Review'
  | 'Revision Required'
  | 'On Hold'
  | 'Completed';

export type ReviewStatus = 'None' | 'Pending' | 'Approved' | 'Revision Requested';
export type ProjectStatus = 'Planning' | 'Active' | 'On Hold' | 'Completed';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface ReferenceLink {
  id: string;
  label: string;
  url: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  jobTitle?: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  departmentId?: string;
  teamId?: string;
  avatarUrl?: string;
  workspaceId: 'nex-agency';
  createdAt: string;
  updatedAt: string;
}

export interface DirectoryEntry {
  uid: string;
  displayName: string;
  jobTitle?: string;
  role: UserRole;
  status: UserStatus;
  departmentId?: string;
  teamId?: string;
  avatarUrl?: string;
  workspaceId: 'nex-agency';
  updatedAt: string;
}

export interface EmployeeInvite {
  id: string;
  email: string;
  displayName: string;
  jobTitle?: string;
  role: UserRole;
  departmentId?: string;
  teamId?: string;
  status: 'pending' | 'claimed' | 'revoked';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  headUserId?: string;
  workspaceId: 'nex-agency';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  departmentId: string;
  leadId: string;
  memberIds: string[];
  workspaceId: 'nex-agency';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  departmentId: string;
  teamId: string;
  leadId: string;
  status: ProjectStatus;
  startDate?: string;
  dueDate?: string;
  workspaceId: 'nex-agency';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskItem {
  id: string;
  taskCode: string;
  title: string;
  description?: string;
  projectId: string;
  departmentId: string;
  teamId: string;
  teamLeadId: string;
  assigneeIds: string[];
  priority: TaskPriority;
  status: TaskStatus;
  startDate?: string;
  dueDate: string;
  dueTime?: string;
  estimatedHours: number;
  loggedHours: number;
  checklist: ChecklistItem[];
  referenceLinks: ReferenceLink[];
  attachmentCount: number;
  submissionNote?: string;
  submittedBy?: string;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewStatus: ReviewStatus;
  workspaceId: 'nex-agency';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  body: string;
  participantIds: string[];
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  storagePath: string;
  downloadUrl: string;
  uploadedBy: string;
  uploadedByName: string;
  category: 'brief' | 'deliverable';
  participantIds: string[];
  createdAt: string;
}

export interface TaskReview {
  id: string;
  taskId: string;
  taskCode: string;
  action: 'Submitted' | 'Approved' | 'Revision Requested';
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  notes: string;
  attachmentUrls: string[];
  participantIds: string[];
  createdAt: string;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  type: 'assignment' | 'submission' | 'approval' | 'revision' | 'comment' | 'system';
  taskId?: string;
  taskCode?: string;
  read: boolean;
  createdBy: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: 'task' | 'project' | 'team' | 'department' | 'user' | 'review' | 'time';
  entityId: string;
  entityLabel: string;
  details?: string;
  taskId?: string;
  teamId?: string;
  participantIds: string[];
  workspaceId: 'nex-agency';
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  taskCode: string;
  projectId: string;
  teamLeadId: string;
  userId: string;
  userName: string;
  hours: number;
  note?: string;
  date: string;
  createdAt: string;
}

export type AppRoute =
  | 'dashboard'
  | 'tasks'
  | 'kanban'
  | 'projects'
  | 'teams'
  | 'employees'
  | 'calendar'
  | 'reports'
  | 'activity'
  | 'notifications'
  | 'settings';
