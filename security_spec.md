# Nex Task Manager — Security Specification (Payload-First Security TDD)

## 1. Data Invariants

1. **Zero Public Admin Registration**: Only the verified workspace owner (`rasurajesh72@gmail.com` with `email_verified == true`) or an existing Admin listed in `/admins/{uid}` may grant or revoke `admin` privileges. Users cannot self-assign `admin` or `team_lead` roles without a matching Admin-created invitation.
2. **PII Isolation**: Email addresses and phone numbers reside strictly in `/users/{uid}` and `/invites/{inviteId}`, readable only by the document owner or an Admin. Shared colleague metadata lives in `/directory/{uid}` with zero PII.
3. **Immutable Ownership & Identity**: `createdBy`, `createdAt`, `uid`, and `taskCode` are immutable after creation. Every author/actor field on create (`authorId`, `uploadedBy`, `actorId`, `userId`, `createdBy`) must match `request.auth.uid`.
4. **Role-Enforced Workflow Transitions**:
   - Only **Admins** and **Team Leads** can create tasks, assign members, change priority/deadlines, approve submissions (`Completed`), or request revisions (`Revision Required`).
   - **Members** assigned to a task can update checklist progress, log hours, upload deliverables, post comments, and transition tasks between `To Do`, `In Progress`, and `In Review`—they cannot mark tasks `Completed` directly.
   - Once a task reaches `Completed`, further status mutations are locked unless overridden by an Admin or Team Lead review workflow.
5. **Strict Schema & Boundary Enforcement**: Every document rejects unknown shadow keys via `keys().hasOnly(...)` / `affectedKeys().hasOnly(...)`, enforces string `.size()` bounds and ID regex `^[a-zA-Z0-9_\-]+$`, caps arrays (`assigneeIds <= 25`, `checklist <= 50`, `referenceLinks <= 20`, `memberIds <= 50`), and validates `createdAt == request.time` / `updatedAt == request.time`.
6. **Verified Query Isolation**: Non-admin list queries on `tasks`, `notifications`, `timeEntries`, `taskComments`, `taskAttachments`, `taskReviews`, and `activityLogs` strictly validate `resource.data` membership/ownership without blanket `isSignedIn()` reads.

---

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Attack Vector | Target Collection | Malicious Payload / Action | Expected Result |
|---|---------------|-------------------|----------------------------|-----------------|
| 1 | **Privilege Escalation (Role Self-Promotion)** | `/roles/{uid}` | Member creates or updates `/roles/{uid}` with `{ "role": "admin", "active": true }` | `PERMISSION_DENIED` |
| 2 | **Shadow Field Injection** | `/tasks/{taskId}` | Team Lead creates task with valid fields plus `{ "isApprovedOverride": true }` | `PERMISSION_DENIED` |
| 3 | **Email Spoofing (`email_verified: false`)** | `/admins/{uid}` | Unverified token with `email: "rasurajesh72@gmail.com", email_verified: false` tries to bootstrap `/admins/{uid}` | `PERMISSION_DENIED` |
| 4 | **PII Harvesting** | `/users` | Standard Member executes `list` or `get` on another user's `/users/{otherUid}` | `PERMISSION_DENIED` |
| 5 | **Workflow Bypass (Self-Approval)** | `/tasks/{taskId}` | Member updates assigned task `{ "status": "Completed", "reviewStatus": "Approved" }` | `PERMISSION_DENIED` |
| 6 | **Terminal State Tampering** | `/tasks/{taskId}` | Member updates an already `Completed` task back to `In Progress` or modifies `estimatedHours` | `PERMISSION_DENIED` |
| 7 | **Author Identity Spoofing** | `/taskComments/{commentId}` | Member posts comment with `authorId: "other-user-uid"` | `PERMISSION_DENIED` |
| 8 | **Resource Exhaustion / ID Poisoning** | `/projects/{projectId}` | Admin creates project with 200-char ID or invalid characters `../bad/id` | `PERMISSION_DENIED` |
| 9 | **Blanket Task Scraping** | `/tasks` | Member queries `collection(db, 'tasks')` without filtering by `assigneeIds` | `PERMISSION_DENIED` |
| 10 | **Timestamp Backdating** | `/timeEntries/{entryId}` | Member logs time entry with client-forged `createdAt: "2020-01-01T00:00:00Z"` instead of `serverTimestamp()` | `PERMISSION_DENIED` |
| 11 | **Orphaned Task Creation** | `/tasks/{taskId}` | Team Lead creates task referencing a non-existent `projectId: "missing-proj"` | `PERMISSION_DENIED` |
| 12 | **Notification Spoofing** | `/notifications/{notifId}` | Member marks another user's notification `{ "read": true }` or creates fake system alert | `PERMISSION_DENIED` |
