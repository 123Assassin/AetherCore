# Admin Operations Domain Analysis

## Source Availability

Legacy source pages are available under `source/source-admin/src/pages` and were read for this analysis:

- `Users.tsx`
- `Activities.tsx`
- `Fission.tsx`
- `SystemAudit.tsx`
- `ContentAudit.tsx`
- `TrafficMonitor.tsx`
- `AlarmCenter.tsx`
- `Settings.tsx`

Supporting migration docs read: `docs/migration/admin/spec.md`, `docs/migration/admin/routes.md`, `docs/migration/admin/migration-map.md`, `docs/migration/admin/components.md`, `docs/migration/admin/api-assumptions.md`, and the audit requirements in `docs/migration/api/backend-design.md`.

The repo currently uses `apps/admin/src/app`, not bare `apps/admin/app`, so target files below use the current repo layout.

API paths below are REST documentation references for business boundaries. The current migration plan implements these capabilities as authenticated admin tRPC procedures, with Task 36 adding `adminOperations` server procedures rather than new REST route handlers.

## Route and Component Mapping

| Domain         | Old route                   | Old component                                      | Target route file                                              | Target components                                    |
| -------------- | --------------------------- | -------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| Users          | `/users`                    | `source/source-admin/src/pages/Users.tsx`          | `apps/admin/src/app/(admin)/users/page.tsx`                    | `UsersStats`, `UsersTable`, `QuotaBadge`             |
| Activities     | `/operations/activities`    | `source/source-admin/src/pages/Activities.tsx`     | `apps/admin/src/app/(admin)/operations/activities/page.tsx`    | `ActivityNoticeListItem`, `ActivityNoticeFormDialog` |
| Fission        | `/operations/fission`       | `source/source-admin/src/pages/Fission.tsx`        | `apps/admin/src/app/(admin)/operations/fission/page.tsx`       | `InviteTree`, `RewardConfigForm`                     |
| SystemAudit    | `/security/system-audit`    | `source/source-admin/src/pages/SystemAudit.tsx`    | `apps/admin/src/app/(admin)/security/system-audit/page.tsx`    | `AuditLogTable`, `ExportCsvDialog`                   |
| ContentAudit   | `/security/content-audit`   | `source/source-admin/src/pages/ContentAudit.tsx`   | `apps/admin/src/app/(admin)/security/content-audit/page.tsx`   | `ContentAuditTable`, `ExportCsvDialog`               |
| TrafficMonitor | `/security/traffic-monitor` | `source/source-admin/src/pages/TrafficMonitor.tsx` | `apps/admin/src/app/(admin)/security/traffic-monitor/page.tsx` | `TrafficEngineCard`                                  |
| AlarmCenter    | `/alarm`                    | `source/source-admin/src/pages/AlarmCenter.tsx`    | `apps/admin/src/app/(admin)/alarm/page.tsx`                    | `AlarmConfigForm`                                    |
| Settings       | `/settings`                 | `source/source-admin/src/pages/Settings.tsx`       | `apps/admin/src/app/(admin)/settings/page.tsx`                 | `PasswordSettingsForm`, `SignOutPanel`               |

## Behavior Boundaries

### Users

- Legacy `UsersPage` uses local `users` mock data with email, `status`, quotas, `totalQuota`, and `isBlacklisted`.
- User status and blacklist are separate. `status` is only `active` or `disabled`; blacklist is the independent boolean `isBlacklisted`. Do not collapse blacklist into status.
- Legacy active-user stats count `status === "active" && !isBlacklisted`.
- Search input, invite button, and history button are present but not wired to behavior.
- Legacy delete uses `window.confirm` and removes the row locally. Target docs define user deletion as soft delete: `DELETE /api/admin/users/:id` maps to `user_status = "deleted"`, while the status toggle itself only switches `active` and `disabled`.
- REST boundary references: `GET /api/admin/users`, `PATCH /api/admin/users/:id/status`, `PATCH /api/admin/users/:id/blacklist`, `DELETE /api/admin/users/:id`, optional invitation and activity endpoints.

### Activities

- Legacy `ActivitiesPage` manages activity notices with `title`, `content`, `status: "published" | "draft"`, and `publishDate`.
- Add/edit share a modal form. Create generates `id` and `publishDate` on the client; edit replaces the selected notice with form state.
- Delete uses `window.confirm` and removes the notice locally. Target docs define activity deletion as soft delete via `deleted_at`; implementation should preserve published activity history.
- REST boundary references: `GET /api/admin/activities`, `POST /api/admin/activities`, `PUT /api/admin/activities/:id`, `DELETE /api/admin/activities/:id`.
- Published activities may become user-facing data for `apps/web`, but the management UI remains under `apps/admin`.

### Fission

- Legacy `FissionPage` has two tabs: `chain` for the invitation tree and `config` for reward rules.
- Invitation tree nodes include email, invite code, total invited count, reward earned, and nested children. Nodes expand/collapse via local `expandedNodes`.
- Reward config fields are `isActive`, `inviterQuota`, `inviteeQuota`, `enableMultiTier`, and `tier2RewardPct`.
- Save reward rules button exists but has no legacy handler.
- REST boundary references: `GET /api/admin/fission/invite-tree`, `GET /api/admin/fission/reward-config`, `PUT /api/admin/fission/reward-config`.

### SystemAudit

- Legacy `SystemAuditPage` lists local mock audit logs with timestamp, operator, action, details, and `type: "system" | "user" | "security"`.
- Export opens a date-range modal with start/end date. Legacy export only logs the range and closes the modal.
- REST boundary references: `GET /api/admin/audit/system-logs` and `GET /api/admin/audit/system-logs/export`.
- CSV export should preserve date-range filtering and return a file stream.

### ContentAudit

- Legacy `ContentAuditPage` lists AI conversation sessions with session id, user id/email, message count, last interaction time, and `isDeleted`.
- Content audit delete is soft delete: confirming delete sets `isDeleted: true`; it does not remove the row from the list. Deleted rows show a deleted marker and hide the delete button.
- The target delete operation for `/api/admin/audit/content-sessions/:id` must preserve that soft delete behavior and return the updated `isDeleted: true` state. It must not physically delete conversation messages.
- Export uses the same start/end date dialog pattern as SystemAudit and currently only logs the range.
- REST boundary references: `GET /api/admin/audit/content-sessions`, `GET /api/admin/audit/content-sessions/export`, `GET /api/admin/audit/content-sessions/:id`, `DELETE /api/admin/audit/content-sessions/:id`.

### TrafficMonitor

- Legacy `TrafficMonitorPage` is read-only and renders hardcoded cards per model engine.
- Each card displays engine name, token consumption, average response time, and cumulative cost.
- REST boundary reference: `GET /api/admin/traffic/engines`.
- Implementation should prefer numeric API fields such as total tokens, average response milliseconds, cost amount, and currency, while formatting in the UI.

### AlarmCenter

- Legacy `AlarmCenterPage` manages local `config` with cost threshold and notification email.
- Threshold input is numeric and labeled RMB; email input is a plain email field.
- Save button has no legacy handler.
- REST boundary references: `GET /api/admin/alarm/config` and `PUT /api/admin/alarm/config`.

### Settings

- Legacy `SettingsPage` has password fields for current password, new password, and confirm password.
- It only checks that new and confirm match, then shows a transient local success message. It does not verify or persist the current password.
- Sign out calls the parent logout handler; in the legacy app that removes `localStorage.isAdminAuth` and redirects to `/login`.
- REST boundary reference: `PUT /api/admin/settings/password`.

## Audit and Mutation Requirements

High-risk mutations write system audit logs. Existing docs explicitly call this out for high-sensitive admin operations and list user blacklist changes, audit export, content soft delete, alarm threshold changes, and password modification among the sensitive operations.

For these remaining admin pages, the minimum audit coverage should be:

| Domain         | Mutations that should write system audit logs                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| Users          | Status changes, blacklist changes, user deletion, invitation creation if implemented.                  |
| Activities     | Create, update, publish/draft changes, and delete when treated as public-facing admin content changes. |
| Fission        | Reward config changes, including activity status and quota/reward values.                              |
| SystemAudit    | CSV export requests.                                                                                   |
| ContentAudit   | CSV export requests and content audit soft delete.                                                     |
| TrafficMonitor | None in the old page; read-only.                                                                       |
| AlarmCenter    | Threshold and notification email changes.                                                              |
| Settings       | Admin password changes; logout may be logged by the auth module.                                       |

The audit log writer should align with the planned `system_audit_logs` schema: `actor_type`, `actor_id`, `action`, `resource_type`, `resource_id`, `ip`, `user_agent`, `metadata`, and `created_at`. Store result/status details inside `metadata` when needed, without storing secrets or full exported content.

## Downstream Ownership

- Schema: ensure content audit rows keep `is_deleted` or equivalent soft delete state; ensure system audit log storage supports admin actors, target metadata, and export/mutation events.
- Backend: implement authenticated admin tRPC procedures, preserve separate user status and blacklist procedures, implement ContentAudit soft delete, and wrap high-risk mutations in system audit writes.
- UI: add App Router pages under the target paths above, replace local mock state with API data, and preserve the legacy interaction boundaries where they are still expected.
