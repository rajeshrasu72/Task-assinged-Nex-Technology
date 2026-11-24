import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  writeBatch,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import {
  db,
  storage,
  WORKSPACE_ID,
  OperationType,
  handleFirestoreError,
} from './firebase';
import {
  ActivityLog,
  AppNotification,
  ChecklistItem,
  Department,
  DirectoryEntry,
  EmployeeInvite,
  Project,
  ProjectStatus,
  ReferenceLink,
  TaskAttachment,
  TaskComment,
  TaskItem,
  TaskPriority,
  TaskReview,
  TaskStatus,
  Team,
  TimeEntry,
  UserProfile,
  UserRole,
  UserStatus,
} from '../types/models';

export function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function tsToIso(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

export function formatTaskCode(year: number, seq: number): string {
  return `NEX-${year}-${String(seq).padStart(4, '0')}`;
}

export function buildParticipantIds(task: Pick<TaskItem, 'assigneeIds' | 'teamLeadId' | 'createdBy'>): string[] {
  const set = new Set<string>([...task.assigneeIds, task.teamLeadId, task.createdBy].filter(Boolean));
  return Array.from(set).slice(0, 30);
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

export function subscribeDirectory(
  onData: (items: DirectoryEntry[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'directory'), where('workspaceId', '==', WORKSPACE_ID));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          uid: data.uid || d.id,
          updatedAt: tsToIso(data.updatedAt),
        } as DirectoryEntry;
      });
      items.sort((a, b) => a.displayName.localeCompare(b.displayName));
      onData(items);
    },
    (err) => {
      if (onError) onError(err);
      else handleFirestoreError(err, OperationType.LIST, 'directory');
    }
  );
}

export function subscribeUsersAdmin(
  onData: (items: UserProfile[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'users'), where('workspaceId', '==', WORKSPACE_ID));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          uid: data.uid || d.id,
          createdAt: tsToIso(data.createdAt),
          updatedAt: tsToIso(data.updatedAt),
        } as UserProfile;
      });
      items.sort((a, b) => a.displayName.localeCompare(b.displayName));
      onData(items);
    },
    (err) => {
      if (onError) onError(err);
      else handleFirestoreError(err, OperationType.LIST, 'users');
    }
  );
}

export function subscribeInvitesAdmin(
  onData: (items: EmployeeInvite[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'invites'));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          id: data.id || d.id,
          createdAt: tsToIso(data.createdAt),
          updatedAt: tsToIso(data.updatedAt),
        } as EmployeeInvite;
      });
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onData(items);
    },
    (err) => {
      if (onError) onError(err);
      else handleFirestoreError(err, OperationType.LIST, 'invites');
    }
  );
}

export function subscribeDepartments(
  onData: (items: Department[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'departments'), where('workspaceId', '==', WORKSPACE_ID));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          id: data.id || d.id,
          createdAt: tsToIso(data.createdAt),
          updatedAt: tsToIso(data.updatedAt),
        } as Department;
      });
      items.sort((a, b) => a.name.localeCompare(b.name));
      onData(items);
    },
    (err) => {
      if (onError) onError(err);
      else handleFirestoreError(err, OperationType.LIST, 'departments');
    }
  );
}

export function subscribeTeams(
  onData: (items: Team[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'teams'), where('workspaceId', '==', WORKSPACE_ID));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          id: data.id || d.id,
          createdAt: tsToIso(data.createdAt),
          updatedAt: tsToIso(data.updatedAt),
        } as Team;
      });
      items.sort((a, b) => a.name.localeCompare(b.name));
      onData(items);
    },
    (err) => {
      if (onError) onError(err);
      else handleFirestoreError(err, OperationType.LIST, 'teams');
    }
  );
}

export function subscribeProjects(
  onData: (items: Project[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'projects'), where('workspaceId', '==', WORKSPACE_ID));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          id: data.id || d.id,
          createdAt: tsToIso(data.createdAt),
          updatedAt: tsToIso(data.updatedAt),
        } as Project;
      });
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onData(items);
    },
    (err) => {
      if (onError) onError(err);
      else handleFirestoreError(err, OperationType.LIST, 'projects');
    }
  );
}

function mapTaskDoc(id: string, data: Record<string, unknown>): TaskItem {
  return {
    ...(data as Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>),
    id: (data.id as string) || id,
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

export function subscribeTasksForRole(
  uid: string,
  role: UserRole,
  onData: (items: TaskItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (role === 'admin') {
    const q = query(collection(db, 'tasks'), where('workspaceId', '==', WORKSPACE_ID));
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => mapTaskDoc(d.id, d.data()));
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        onData(items);
      },
      (err) => {
        if (onError) onError(err);
        else handleFirestoreError(err, OperationType.LIST, 'tasks');
      }
    );
  }

  // Team Lead and Member merge scoped rule-enforced queries cleanly
  const map = new Map<string, TaskItem>();
  const emit = () => {
    const merged = Array.from(map.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    onData(merged);
  };

  const assignedQ = query(collection(db, 'tasks'), where('assigneeIds', 'array-contains', uid));
  const unsubAssigned = onSnapshot(
    assignedQ,
    (snap) => {
      // Remove previous assigned-only entries and re-populate
      for (const [k, v] of map.entries()) {
        if (v.assigneeIds.includes(uid) && v.teamLeadId !== uid && v.createdBy !== uid) {
          map.delete(k);
        }
      }
      snap.docs.forEach((d) => map.set(d.id, mapTaskDoc(d.id, d.data())));
      emit();
    },
    (err) => {
      if (onError) onError(err);
      else handleFirestoreError(err, OperationType.LIST, 'tasks');
    }
  );

  let unsubLead: Unsubscribe = () => {};
  let unsubCreated: Unsubscribe = () => {};

  if (role === 'team_lead') {
    const leadQ = query(collection(db, 'tasks'), where('teamLeadId', '==', uid));
    unsubLead = onSnapshot(
      leadQ,
      (snap) => {
        for (const [k, v] of map.entries()) {
          if (v.teamLeadId === uid && !v.assigneeIds.includes(uid) && v.createdBy !== uid) {
            map.delete(k);
          }
        }
        snap.docs.forEach((d) => map.set(d.id, mapTaskDoc(d.id, d.data())));
        emit();
      },
      (err) => {
        if (onError) onError(err);
        else handleFirestoreError(err, OperationType.LIST, 'tasks');
      }
    );

    const createdQ = query(collection(db, 'tasks'), where('createdBy', '==', uid));
    unsubCreated = onSnapshot(
      createdQ,
      (snap) => {
        snap.docs.forEach((d) => map.set(d.id, mapTaskDoc(d.id, d.data())));
        emit();
      },
      (err) => {
        if (onError) onError(err);
        else handleFirestoreError(err, OperationType.LIST, 'tasks');
      }
    );
  }

  return () => {
    unsubAssigned();
    unsubLead();
    unsubCreated();
  };
}

export function subscribeTaskDetails(
  taskId: string,
  uid: string,
  role: UserRole,
  callbacks: {
    onComments: (items: TaskComment[]) => void;
    onAttachments: (items: TaskAttachment[]) => void;
    onReviews: (items: TaskReview[]) => void;
    onTimeEntries: (items: TimeEntry[]) => void;
  }
): Unsubscribe {
  const buildScopedQuery = (colName: string) => {
    if (role === 'admin') {
      return query(collection(db, colName), where('taskId', '==', taskId));
    }
    if (colName === 'timeEntries') {
      return role === 'team_lead'
        ? query(collection(db, colName), where('teamLeadId', '==', uid))
        : query(collection(db, colName), where('userId', '==', uid));
    }
    return query(
      collection(db, colName),
      where('participantIds', 'array-contains', uid)
    );
  };

  const u1 = onSnapshot(
    buildScopedQuery('taskComments'),
    (snap) => {
      const items = snap.docs
        .map((d) => ({ ...d.data(), id: d.id, createdAt: tsToIso(d.data().createdAt) }) as TaskComment)
        .filter((item) => item.taskId === taskId);
      items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      callbacks.onComments(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'taskComments')
  );

  const u2 = onSnapshot(
    buildScopedQuery('taskAttachments'),
    (snap) => {
      const items = snap.docs
        .map((d) => ({ ...d.data(), id: d.id, createdAt: tsToIso(d.data().createdAt) }) as TaskAttachment)
        .filter((item) => item.taskId === taskId);
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      callbacks.onAttachments(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'taskAttachments')
  );

  const u3 = onSnapshot(
    buildScopedQuery('taskReviews'),
    (snap) => {
      const items = snap.docs
        .map((d) => ({ ...d.data(), id: d.id, createdAt: tsToIso(d.data().createdAt) }) as TaskReview)
        .filter((item) => item.taskId === taskId);
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      callbacks.onReviews(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'taskReviews')
  );

  const u4 = onSnapshot(
    buildScopedQuery('timeEntries'),
    (snap) => {
      const items = snap.docs
        .map((d) => ({ ...d.data(), id: d.id, createdAt: tsToIso(d.data().createdAt) }) as TimeEntry)
        .filter((item) => item.taskId === taskId);
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      callbacks.onTimeEntries(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'timeEntries')
  );

  return () => {
    u1();
    u2();
    u3();
    u4();
  };
}

export function subscribeNotifications(
  uid: string,
  onData: (items: AppNotification[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', uid),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ ...d.data(), id: d.id, createdAt: tsToIso(d.data().createdAt) }) as AppNotification);
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
  );
}

export function subscribeActivityLogs(
  uid: string,
  role: UserRole,
  onData: (items: ActivityLog[]) => void
): Unsubscribe {
  const q =
    role === 'admin'
      ? query(collection(db, 'activityLogs'), where('workspaceId', '==', WORKSPACE_ID), limit(150))
      : query(collection(db, 'activityLogs'), where('participantIds', 'array-contains', uid), limit(100));

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ ...d.data(), id: d.id, createdAt: tsToIso(d.data().createdAt) }) as ActivityLog);
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'activityLogs')
  );
}

export function subscribeTimeEntriesForUser(
  uid: string,
  role: UserRole,
  onData: (items: TimeEntry[]) => void
): Unsubscribe {
  const q =
    role === 'admin'
      ? query(collection(db, 'timeEntries'), limit(300))
      : role === 'team_lead'
      ? query(collection(db, 'timeEntries'), where('teamLeadId', '==', uid), limit(200))
      : query(collection(db, 'timeEntries'), where('userId', '==', uid), limit(200));

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ ...d.data(), id: d.id, createdAt: tsToIso(d.data().createdAt) }) as TimeEntry);
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'timeEntries')
  );
}

// ============================================================================
// ORGANIZATION CRUD (DEPARTMENTS, TEAMS, PROJECTS, EMPLOYEES)
// ============================================================================

async function recordActivity(
  actor: { uid: string; displayName: string; role: UserRole },
  payload: Omit<ActivityLog, 'id' | 'actorId' | 'actorName' | 'actorRole' | 'workspaceId' | 'createdAt'>
) {
  const id = makeId('log');
  await setDoc(doc(db, 'activityLogs', id), {
    id,
    actorId: actor.uid,
    actorName: actor.displayName.slice(0, 120),
    actorRole: actor.role,
    action: payload.action.slice(0, 120),
    entityType: payload.entityType,
    entityId: payload.entityId,
    entityLabel: payload.entityLabel.slice(0, 200),
    ...(payload.details ? { details: payload.details.slice(0, 500) } : {}),
    ...(payload.taskId ? { taskId: payload.taskId } : {}),
    ...(payload.teamId ? { teamId: payload.teamId } : {}),
    participantIds: Array.from(new Set([...payload.participantIds, actor.uid])).slice(0, 30),
    workspaceId: WORKSPACE_ID,
    createdAt: serverTimestamp(),
  });
}

async function sendNotification(
  actorUid: string,
  recipientId: string,
  payload: Pick<AppNotification, 'title' | 'message' | 'type' | 'taskId' | 'taskCode'>
) {
  const id = makeId('notif');
  await setDoc(doc(db, 'notifications', id), {
    id,
    recipientId,
    title: payload.title.slice(0, 160),
    message: payload.message.slice(0, 500),
    type: payload.type,
    ...(payload.taskId ? { taskId: payload.taskId } : {}),
    ...(payload.taskCode ? { taskCode: payload.taskCode } : {}),
    read: false,
    createdBy: actorUid,
    createdAt: serverTimestamp(),
  });
}

export async function createDepartment(
  actor: UserProfile,
  input: { name: string; description?: string; headUserId?: string }
): Promise<string> {
  const id = makeId('dept');
  try {
    await setDoc(doc(db, 'departments', id), {
      id,
      name: input.name.trim().slice(0, 100),
      description: (input.description || '').trim().slice(0, 500),
      headUserId: input.headUserId || '',
      workspaceId: WORKSPACE_ID,
      createdBy: actor.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await recordActivity(actor, {
      action: 'Created department',
      entityType: 'department',
      entityId: id,
      entityLabel: input.name.trim(),
      participantIds: [actor.uid],
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `departments/${id}`);
  }
}

export async function updateDepartment(
  actor: UserProfile,
  id: string,
  input: { name: string; description?: string; headUserId?: string }
): Promise<void> {
  try {
    await updateDoc(doc(db, 'departments', id), {
      name: input.name.trim().slice(0, 100),
      description: (input.description || '').trim().slice(0, 500),
      headUserId: input.headUserId || '',
      updatedAt: serverTimestamp(),
    });
    await recordActivity(actor, {
      action: 'Updated department',
      entityType: 'department',
      entityId: id,
      entityLabel: input.name.trim(),
      participantIds: [actor.uid],
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `departments/${id}`);
  }
}

export async function deleteDepartment(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'departments', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `departments/${id}`);
  }
}

export async function createTeam(
  actor: UserProfile,
  input: { name: string; description?: string; departmentId: string; leadId: string; memberIds: string[] }
): Promise<string> {
  const id = makeId('team');
  const members = Array.from(new Set([...input.memberIds, input.leadId].filter(Boolean))).slice(0, 50);
  try {
    await setDoc(doc(db, 'teams', id), {
      id,
      name: input.name.trim().slice(0, 100),
      description: (input.description || '').trim().slice(0, 500),
      departmentId: input.departmentId,
      leadId: input.leadId,
      memberIds: members,
      workspaceId: WORKSPACE_ID,
      createdBy: actor.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await recordActivity(actor, {
      action: 'Created team',
      entityType: 'team',
      entityId: id,
      entityLabel: input.name.trim(),
      teamId: id,
      participantIds: members,
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `teams/${id}`);
  }
}

export async function updateTeam(
  actor: UserProfile,
  id: string,
  input: { name?: string; description?: string; departmentId?: string; leadId?: string; memberIds: string[] }
): Promise<void> {
  const members = Array.from(new Set(input.memberIds.filter(Boolean))).slice(0, 50);
  try {
    const updatePayload: Record<string, unknown> = {
      memberIds: members,
      description: (input.description || '').trim().slice(0, 500),
      updatedAt: serverTimestamp(),
    };
    if (actor.role === 'admin') {
      if (input.name) updatePayload.name = input.name.trim().slice(0, 100);
      if (input.departmentId) updatePayload.departmentId = input.departmentId;
      if (input.leadId) updatePayload.leadId = input.leadId;
    }
    await updateDoc(doc(db, 'teams', id), updatePayload);
    await recordActivity(actor, {
      action: 'Updated team roster',
      entityType: 'team',
      entityId: id,
      entityLabel: input.name || id,
      teamId: id,
      participantIds: members,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `teams/${id}`);
  }
}

export async function deleteTeam(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'teams', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `teams/${id}`);
  }
}

export async function createProject(
  actor: UserProfile,
  input: {
    name: string;
    code: string;
    description?: string;
    departmentId: string;
    teamId: string;
    leadId: string;
    status: ProjectStatus;
    startDate?: string;
    dueDate?: string;
  }
): Promise<string> {
  const id = makeId('proj');
  const cleanCode = input.code.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 20) || 'NEX';
  try {
    await setDoc(doc(db, 'projects', id), {
      id,
      name: input.name.trim().slice(0, 140),
      code: cleanCode,
      description: (input.description || '').trim().slice(0, 2000),
      departmentId: input.departmentId,
      teamId: input.teamId,
      leadId: input.leadId,
      status: input.status,
      startDate: input.startDate || '',
      dueDate: input.dueDate || '',
      workspaceId: WORKSPACE_ID,
      createdBy: actor.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await recordActivity(actor, {
      action: 'Created project',
      entityType: 'project',
      entityId: id,
      entityLabel: `${cleanCode} · ${input.name.trim()}`,
      teamId: input.teamId,
      participantIds: [actor.uid, input.leadId],
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `projects/${id}`);
  }
}

export async function updateProject(
  actor: UserProfile,
  id: string,
  input: Partial<{
    name: string;
    code: string;
    description: string;
    departmentId: string;
    teamId: string;
    leadId: string;
    status: ProjectStatus;
    startDate: string;
    dueDate: string;
  }>
): Promise<void> {
  try {
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (input.status) payload.status = input.status;
    if (input.description !== undefined) payload.description = input.description.trim().slice(0, 2000);
    if (input.dueDate !== undefined) payload.dueDate = input.dueDate;
    if (actor.role === 'admin') {
      if (input.name) payload.name = input.name.trim().slice(0, 140);
      if (input.code) payload.code = input.code.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 20);
      if (input.departmentId) payload.departmentId = input.departmentId;
      if (input.teamId) payload.teamId = input.teamId;
      if (input.leadId) payload.leadId = input.leadId;
      if (input.startDate !== undefined) payload.startDate = input.startDate;
    }
    await updateDoc(doc(db, 'projects', id), payload);
    await recordActivity(actor, {
      action: 'Updated project',
      entityType: 'project',
      entityId: id,
      entityLabel: input.name || id,
      participantIds: [actor.uid],
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `projects/${id}`);
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'projects', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `projects/${id}`);
  }
}

export async function createEmployeeInvite(
  actor: UserProfile,
  input: {
    email: string;
    displayName: string;
    jobTitle?: string;
    role: UserRole;
    departmentId?: string;
    teamId?: string;
  }
): Promise<string> {
  const id = makeId('inv');
  const email = input.email.trim().toLowerCase();
  try {
    await setDoc(doc(db, 'invites', id), {
      id,
      email: email.slice(0, 254),
      displayName: input.displayName.trim().slice(0, 120),
      jobTitle: (input.jobTitle || '').trim().slice(0, 120),
      role: input.role,
      departmentId: input.departmentId || '',
      teamId: input.teamId || '',
      status: 'pending',
      createdBy: actor.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await recordActivity(actor, {
      action: 'Provisioned employee account',
      entityType: 'user',
      entityId: id,
      entityLabel: `${input.displayName.trim()} (${input.role})`,
      participantIds: [actor.uid],
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `invites/${id}`);
  }
}

export async function revokeEmployeeInvite(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'invites', id), {
      status: 'revoked',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `invites/${id}`);
  }
}

export async function updateEmployeeRoleAndAssignment(
  admin: UserProfile,
  target: UserProfile,
  updates: {
    role: UserRole;
    status: UserStatus;
    departmentId?: string;
    teamId?: string;
    jobTitle?: string;
  }
): Promise<void> {
  try {
    const batch = writeBatch(db);
    const active = updates.status === 'active';

    batch.update(doc(db, 'users', target.uid), {
      role: updates.role,
      status: updates.status,
      departmentId: updates.departmentId || '',
      teamId: updates.teamId || '',
      jobTitle: (updates.jobTitle ?? target.jobTitle ?? '').slice(0, 120),
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'directory', target.uid), {
      role: updates.role,
      status: updates.status,
      departmentId: updates.departmentId || '',
      teamId: updates.teamId || '',
      jobTitle: (updates.jobTitle ?? target.jobTitle ?? '').slice(0, 120),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'roles', target.uid), {
      uid: target.uid,
      role: updates.role,
      active,
      departmentId: updates.departmentId || '',
      teamId: updates.teamId || '',
      updatedBy: admin.uid,
      updatedAt: serverTimestamp(),
    });

    if (updates.role === 'admin' && active) {
      const adminSnap = await getDoc(doc(db, 'admins', target.uid));
      if (!adminSnap.exists()) {
        batch.set(doc(db, 'admins', target.uid), {
          uid: target.uid,
          email: target.email,
          grantedBy: admin.uid,
          createdAt: serverTimestamp(),
        });
      }
    } else if (target.uid !== admin.uid) {
      const adminSnap = await getDoc(doc(db, 'admins', target.uid));
      if (adminSnap.exists()) {
        batch.delete(doc(db, 'admins', target.uid));
      }
    }

    await batch.commit();
    await recordActivity(admin, {
      action: 'Updated employee role & access',
      entityType: 'user',
      entityId: target.uid,
      entityLabel: `${target.displayName} → ${updates.role} (${updates.status})`,
      participantIds: [admin.uid, target.uid],
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${target.uid}`);
  }
}

export async function updateOwnProfile(
  user: UserProfile,
  updates: { displayName: string; jobTitle: string; phone: string }
): Promise<void> {
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', user.uid), {
      displayName: updates.displayName.trim().slice(0, 120),
      jobTitle: updates.jobTitle.trim().slice(0, 120),
      phone: updates.phone.trim().slice(0, 40),
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'directory', user.uid), {
      displayName: updates.displayName.trim().slice(0, 120),
      jobTitle: updates.jobTitle.trim().slice(0, 120),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
  }
}

// ============================================================================
// TASK LIFECYCLE, TRANSACTIONAL NEX-YYYY-0001 ID, WORKFLOW & REVIEWS
// ============================================================================

export async function createTaskWithSequentialId(
  actor: UserProfile,
  input: {
    title: string;
    description: string;
    projectId: string;
    departmentId: string;
    teamId: string;
    teamLeadId: string;
    assigneeIds: string[];
    priority: TaskPriority;
    startDate?: string;
    dueDate: string;
    dueTime?: string;
    estimatedHours: number;
    checklist: ChecklistItem[];
    referenceLinks: ReferenceLink[];
  }
): Promise<{ id: string; taskCode: string }> {
  const year = new Date().getFullYear();
  const counterRef = doc(db, 'counters', `tasks-${year}`);
  const taskId = makeId('task');
  const taskRef = doc(db, 'tasks', taskId);

  try {
    const taskCode = await runTransaction(db, async (tx) => {
      const counterSnap = await tx.get(counterRef);
      const nextSeq = counterSnap.exists() ? Number(counterSnap.data().seq || 0) + 1 : 1;
      const generatedCode = formatTaskCode(year, nextSeq);

      tx.set(counterRef, {
        year,
        seq: nextSeq,
        updatedAt: serverTimestamp(),
      });

      const cleanAssignees = Array.from(new Set(input.assigneeIds.filter(Boolean))).slice(0, 25);

      tx.set(taskRef, {
        id: taskId,
        taskCode: generatedCode,
        title: input.title.trim().slice(0, 200),
        description: input.description.trim().slice(0, 8000),
        projectId: input.projectId,
        departmentId: input.departmentId,
        teamId: input.teamId,
        teamLeadId: input.teamLeadId,
        assigneeIds: cleanAssignees,
        priority: input.priority,
        status: 'To Do',
        startDate: input.startDate || new Date().toISOString().slice(0, 10),
        dueDate: input.dueDate,
        dueTime: input.dueTime || '17:00',
        estimatedHours: Math.max(0, Math.min(10000, Number(input.estimatedHours) || 0)),
        loggedHours: 0,
        checklist: input.checklist.slice(0, 50),
        referenceLinks: input.referenceLinks.slice(0, 20),
        attachmentCount: 0,
        submissionNote: '',
        submittedBy: '',
        submittedAt: '',
        reviewedBy: '',
        reviewedAt: '',
        reviewStatus: 'None',
        workspaceId: WORKSPACE_ID,
        createdBy: actor.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return generatedCode;
    });

    const participantIds = Array.from(
      new Set([...input.assigneeIds, input.teamLeadId, actor.uid].filter(Boolean))
    ).slice(0, 30);

    await recordActivity(actor, {
      action: `Created task ${taskCode}`,
      entityType: 'task',
      entityId: taskId,
      entityLabel: `${taskCode} · ${input.title.trim()}`,
      taskId,
      teamId: input.teamId,
      participantIds,
    });

    await Promise.all(
      input.assigneeIds
        .filter((uid) => uid !== actor.uid)
        .map((recipientId) =>
          sendNotification(actor.uid, recipientId, {
            title: `New Task Assigned: ${taskCode}`,
            message: `${actor.displayName} assigned you "${input.title.trim()}" (Due ${input.dueDate}).`,
            type: 'assignment',
            taskId,
            taskCode,
          })
        )
    );

    return { id: taskId, taskCode };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `tasks/${taskId}`);
  }
}

export async function updateTaskFields(
  actor: UserProfile,
  task: TaskItem,
  updates: Partial<{
    title: string;
    description: string;
    assigneeIds: string[];
    priority: TaskPriority;
    status: TaskStatus;
    startDate: string;
    dueDate: string;
    dueTime: string;
    estimatedHours: number;
    checklist: ChecklistItem[];
    referenceLinks: ReferenceLink[];
  }>
): Promise<void> {
  try {
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.title !== undefined) payload.title = updates.title.trim().slice(0, 200);
    if (updates.description !== undefined) payload.description = updates.description.trim().slice(0, 8000);
    if (updates.assigneeIds !== undefined) payload.assigneeIds = Array.from(new Set(updates.assigneeIds)).slice(0, 25);
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.startDate !== undefined) payload.startDate = updates.startDate;
    if (updates.dueDate !== undefined) payload.dueDate = updates.dueDate;
    if (updates.dueTime !== undefined) payload.dueTime = updates.dueTime;
    if (updates.estimatedHours !== undefined) {
      payload.estimatedHours = Math.max(0, Math.min(10000, Number(updates.estimatedHours) || 0));
    }
    if (updates.checklist !== undefined) payload.checklist = updates.checklist.slice(0, 50);
    if (updates.referenceLinks !== undefined) payload.referenceLinks = updates.referenceLinks.slice(0, 20);

    await updateDoc(doc(db, 'tasks', task.id), payload);

    const participantIds = buildParticipantIds(task);
    await recordActivity(actor, {
      action: updates.status && updates.status !== task.status ? `Moved ${task.taskCode} to ${updates.status}` : `Updated ${task.taskCode}`,
      entityType: 'task',
      entityId: task.id,
      entityLabel: `${task.taskCode} · ${task.title}`,
      taskId: task.id,
      teamId: task.teamId,
      participantIds,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `tasks/${task.id}`);
  }
}

export async function deleteTask(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'tasks', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `tasks/${id}`);
  }
}

export async function submitTaskForReview(
  actor: UserProfile,
  task: TaskItem,
  submissionNote: string,
  attachmentUrls: string[]
): Promise<void> {
  const reviewId = makeId('rev');
  const participantIds = buildParticipantIds(task);
  const nowIso = new Date().toISOString();

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'tasks', task.id), {
      status: 'In Review',
      reviewStatus: 'Pending',
      submissionNote: submissionNote.trim().slice(0, 2000),
      submittedBy: actor.uid,
      submittedAt: nowIso,
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'taskReviews', reviewId), {
      id: reviewId,
      taskId: task.id,
      taskCode: task.taskCode,
      action: 'Submitted',
      actorId: actor.uid,
      actorName: actor.displayName.slice(0, 120),
      actorRole: actor.role,
      notes: submissionNote.trim().slice(0, 3000),
      attachmentUrls: attachmentUrls.slice(0, 10),
      participantIds,
      createdAt: serverTimestamp(),
    });

    await batch.commit();

    await recordActivity(actor, {
      action: `Submitted ${task.taskCode} for review`,
      entityType: 'review',
      entityId: reviewId,
      entityLabel: `${task.taskCode} · ${task.title}`,
      details: submissionNote.trim().slice(0, 500),
      taskId: task.id,
      teamId: task.teamId,
      participantIds,
    });

    if (task.teamLeadId && task.teamLeadId !== actor.uid) {
      await sendNotification(actor.uid, task.teamLeadId, {
        title: `Submission Ready for Review: ${task.taskCode}`,
        message: `${actor.displayName} submitted "${task.title}" for approval.`,
        type: 'submission',
        taskId: task.id,
        taskCode: task.taskCode,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `tasks/${task.id}`);
  }
}

export async function reviewTaskSubmission(
  reviewer: UserProfile,
  task: TaskItem,
  decision: 'Approved' | 'Revision Requested',
  notes: string
): Promise<void> {
  const reviewId = makeId('rev');
  const participantIds = buildParticipantIds(task);
  const nowIso = new Date().toISOString();
  const nextStatus: TaskStatus = decision === 'Approved' ? 'Completed' : 'Revision Required';

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'tasks', task.id), {
      status: nextStatus,
      reviewStatus: decision,
      reviewedBy: reviewer.uid,
      reviewedAt: nowIso,
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'taskReviews', reviewId), {
      id: reviewId,
      taskId: task.id,
      taskCode: task.taskCode,
      action: decision,
      actorId: reviewer.uid,
      actorName: reviewer.displayName.slice(0, 120),
      actorRole: reviewer.role,
      notes: notes.trim().slice(0, 3000),
      attachmentUrls: [],
      participantIds,
      createdAt: serverTimestamp(),
    });

    await batch.commit();

    await recordActivity(reviewer, {
      action: decision === 'Approved' ? `Approved ${task.taskCode}` : `Requested revision on ${task.taskCode}`,
      entityType: 'review',
      entityId: reviewId,
      entityLabel: `${task.taskCode} · ${task.title}`,
      details: notes.trim().slice(0, 500),
      taskId: task.id,
      teamId: task.teamId,
      participantIds,
    });

    await Promise.all(
      task.assigneeIds
        .filter((uid) => uid !== reviewer.uid)
        .map((recipientId) =>
          sendNotification(reviewer.uid, recipientId, {
            title:
              decision === 'Approved'
                ? `Task Approved: ${task.taskCode}`
                : `Revision Requested: ${task.taskCode}`,
            message:
              decision === 'Approved'
                ? `${reviewer.displayName} approved "${task.title}".`
                : `${reviewer.displayName} requested revisions on "${task.title}": ${notes.trim().slice(0, 160)}`,
            type: decision === 'Approved' ? 'approval' : 'revision',
            taskId: task.id,
            taskCode: task.taskCode,
          })
        )
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `tasks/${task.id}`);
  }
}

export async function addTaskComment(
  actor: UserProfile,
  task: TaskItem,
  body: string
): Promise<void> {
  const id = makeId('cmt');
  const participantIds = buildParticipantIds(task);
  try {
    await setDoc(doc(db, 'taskComments', id), {
      id,
      taskId: task.id,
      authorId: actor.uid,
      authorName: actor.displayName.slice(0, 120),
      authorRole: actor.role,
      body: body.trim().slice(0, 4000),
      participantIds,
      createdAt: serverTimestamp(),
    });

    await recordActivity(actor, {
      action: `Commented on ${task.taskCode}`,
      entityType: 'task',
      entityId: task.id,
      entityLabel: `${task.taskCode} · ${task.title}`,
      details: body.trim().slice(0, 200),
      taskId: task.id,
      teamId: task.teamId,
      participantIds,
    });

    const notifyTargets = participantIds.filter((uid) => uid !== actor.uid);
    await Promise.all(
      notifyTargets.slice(0, 10).map((recipientId) =>
        sendNotification(actor.uid, recipientId, {
          title: `New Comment on ${task.taskCode}`,
          message: `${actor.displayName}: ${body.trim().slice(0, 140)}`,
          type: 'comment',
          taskId: task.id,
          taskCode: task.taskCode,
        })
      )
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `taskComments/${id}`);
  }
}

export async function uploadTaskAttachment(
  actor: UserProfile,
  task: TaskItem,
  file: File,
  category: 'brief' | 'deliverable',
  onProgress?: (pct: number) => void
): Promise<TaskAttachment> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'file';
  const attachmentId = makeId('att');
  const path = `tasks/${task.id}/${actor.uid}/${attachmentId}_${safeName}`;
  const fileRef = storageRef(storage, path);

  const downloadUrl = await new Promise<string>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(fileRef, file, {
      contentType: file.type || 'application/octet-stream',
    });
    uploadTask.on(
      'state_changed',
      (snap) => {
        if (onProgress && snap.totalBytes > 0) {
          onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        }
      },
      (err) => reject(err),
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        } catch (e) {
          reject(e);
        }
      }
    );
  });

  const participantIds = buildParticipantIds(task);
  try {
    const batch = writeBatch(db);
    const attachmentDoc = {
      id: attachmentId,
      taskId: task.id,
      fileName: file.name.slice(0, 255),
      fileSize: Math.max(1, Math.round(file.size)),
      contentType: (file.type || 'application/octet-stream').slice(0, 128),
      storagePath: path,
      downloadUrl,
      uploadedBy: actor.uid,
      uploadedByName: actor.displayName.slice(0, 120),
      category,
      participantIds,
      createdAt: serverTimestamp(),
    };
    batch.set(doc(db, 'taskAttachments', attachmentId), attachmentDoc);
    batch.update(doc(db, 'tasks', task.id), {
      attachmentCount: (task.attachmentCount || 0) + 1,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();

    await recordActivity(actor, {
      action: `Uploaded ${category} to ${task.taskCode}`,
      entityType: 'task',
      entityId: task.id,
      entityLabel: file.name.slice(0, 200),
      taskId: task.id,
      teamId: task.teamId,
      participantIds,
    });

    return {
      ...attachmentDoc,
      createdAt: new Date().toISOString(),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `taskAttachments/${attachmentId}`);
  }
}

export async function removeTaskAttachment(attachment: TaskAttachment): Promise<void> {
  try {
    try {
      await deleteObject(storageRef(storage, attachment.storagePath));
    } catch {
      // File may already be removed in storage
    }
    await deleteDoc(doc(db, 'taskAttachments', attachment.id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `taskAttachments/${attachment.id}`);
  }
}

export async function logTaskTimeEntry(
  actor: UserProfile,
  task: TaskItem,
  input: { hours: number; note: string; date: string }
): Promise<void> {
  const id = makeId('time');
  const hours = Math.max(0.25, Math.min(24, Number(input.hours) || 0));
  const participantIds = buildParticipantIds(task);
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'timeEntries', id), {
      id,
      taskId: task.id,
      taskCode: task.taskCode,
      projectId: task.projectId,
      teamLeadId: task.teamLeadId,
      userId: actor.uid,
      userName: actor.displayName.slice(0, 120),
      hours,
      note: input.note.trim().slice(0, 500),
      date: input.date,
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, 'tasks', task.id), {
      loggedHours: Number(((task.loggedHours || 0) + hours).toFixed(2)),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();

    await recordActivity(actor, {
      action: `Logged ${hours}h on ${task.taskCode}`,
      entityType: 'time',
      entityId: id,
      entityLabel: `${task.taskCode} · ${hours}h`,
      details: input.note.trim().slice(0, 500),
      taskId: task.id,
      teamId: task.teamId,
      participantIds,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `timeEntries/${id}`);
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
  }
}

export async function markAllNotificationsRead(notifications: AppNotification[]): Promise<void> {
  const unread = notifications.filter((n) => !n.read);
  if (unread.length === 0) return;
  try {
    const batch = writeBatch(db);
    unread.slice(0, 100).forEach((n) => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'notifications');
  }
}

export async function fetchPendingInviteForEmail(email: string): Promise<EmployeeInvite | null> {
  try {
    const q = query(
      collection(db, 'invites'),
      where('email', '==', email.toLowerCase()),
      limit(10)
    );
    const snap = await getDocs(q);
    const pendingDoc = snap.docs.find((d) => d.data().status === 'pending');
    if (!pendingDoc) return null;
    return {
      ...(pendingDoc.data() as Omit<EmployeeInvite, 'id' | 'createdAt' | 'updatedAt'>),
      id: pendingDoc.id,
      createdAt: tsToIso(pendingDoc.data().createdAt),
      updatedAt: tsToIso(pendingDoc.data().updatedAt),
    };
  } catch {
    return null;
  }
}
