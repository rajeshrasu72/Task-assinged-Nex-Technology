/**
 * Security TDD Verification Suite for Nex Task Manager Firestore Rules
 * Verifies all "Dirty Dozen" adversarial payloads against firestore.rules.
 * Run with Firebase Emulator Suite when available:
 *   npx firebase emulators:exec --only firestore "npx tsx firestore.rules.test.ts"
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  collection: string;
  actor: 'member' | 'unverified_owner' | 'team_lead' | 'unauthenticated';
  operation: 'create' | 'update' | 'get' | 'list';
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Role Self-Promotion to Admin',
    collection: 'roles/member-1',
    actor: 'member',
    operation: 'create',
    payload: { uid: 'member-1', role: 'admin', active: true, updatedBy: 'member-1' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Shadow Field Injection on Task Create',
    collection: 'tasks/task-evil',
    actor: 'team_lead',
    operation: 'create',
    payload: { title: 'Test', isApprovedOverride: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Email Spoofing Without email_verified',
    collection: 'admins/spoof-uid',
    actor: 'unverified_owner',
    operation: 'create',
    payload: { uid: 'spoof-uid', email: 'rasurajesh72@gmail.com', grantedBy: 'spoof-uid' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Cross-User PII Read on /users',
    collection: 'users/other-uid',
    actor: 'member',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Member Direct Task Completion Bypass',
    collection: 'tasks/task-1',
    actor: 'member',
    operation: 'update',
    payload: { status: 'Completed', reviewStatus: 'Approved' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Terminal State Tampering After Completed',
    collection: 'tasks/completed-task-1',
    actor: 'member',
    operation: 'update',
    payload: { status: 'In Progress' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Comment Author Identity Spoofing',
    collection: 'taskComments/comment-evil',
    actor: 'member',
    operation: 'create',
    payload: { id: 'comment-evil', taskId: 'task-1', authorId: 'admin-1', body: 'Approved!' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Path Variable ID Poisoning',
    collection: 'projects/' + 'x'.repeat(200),
    actor: 'team_lead',
    operation: 'create',
    payload: { name: 'Poison' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Unfiltered Blanket Task List Query',
    collection: 'tasks',
    actor: 'member',
    operation: 'list',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Client-Forged Timestamp Backdating',
    collection: 'timeEntries/entry-evil',
    actor: 'member',
    operation: 'create',
    payload: { hours: 100, createdAt: '2020-01-01T00:00:00Z' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Orphaned Task Referencing Missing Project',
    collection: 'tasks/task-orphan',
    actor: 'team_lead',
    operation: 'create',
    payload: { projectId: 'non-existent-project' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Cross-User Notification Tampering',
    collection: 'notifications/other-user-notif',
    actor: 'member',
    operation: 'update',
    payload: { read: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
