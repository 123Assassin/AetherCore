import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

test('user management page is scoped to web users and exposes create and quota flows', () => {
  const source = readSource('../app/(admin)/users/page.tsx');
  const sharedSource = readSource('../components/users/user-management-page.tsx');

  assert.match(source, /mode="web-users"/);
  assert.match(sharedSource, /client\.adminOperations\.users\.invite\.mutate/);
  assert.match(sharedSource, /client\.adminOperations\.users\.quota\.mutate/);
  assert.match(sharedSource, /添加用户/);
  assert.match(sharedSource, /额度配置/);
});

test('system admins page reuses user management layout without stats or search', () => {
  const source = readSource('../app/(admin)/system-admins/page.tsx');

  assert.match(source, /mode="system-admins"/);
  assert.match(source, /showSearch=\{false\}/);
  assert.match(source, /showStats=\{false\}/);
  assert.match(source, /showFilters=\{false\}/);
  assert.match(source, /showQuotaColumn=\{false\}/);
});

test('system admins navigation appears directly above system settings', () => {
  const sidebarSource = readSource('../components/layout/admin-sidebar.tsx');
  const headerSource = readSource('../components/layout/admin-header.tsx');
  const systemAdminsIndex = sidebarSource.indexOf("name: '系统管理员'");
  const settingsIndex = sidebarSource.indexOf("name: '系统设置'");

  assert.ok(systemAdminsIndex >= 0, 'sidebar should contain 系统管理员');
  assert.ok(settingsIndex >= 0, 'sidebar should contain 系统设置');
  assert.ok(systemAdminsIndex < settingsIndex, '系统管理员 should be above 系统设置');
  assert.match(sidebarSource, /path: '\/system-admins'/);
  assert.match(headerSource, /'\/system-admins': '系统管理员'/);
});

test('user stats show total active limited and blacklisted boards', () => {
  const source = readSource('../components/users/users-stats.tsx');

  assert.match(source, /label="总用户数"/);
  assert.match(source, /label="活跃用户"/);
  assert.match(source, /label="限制用户"/);
  assert.match(source, /label="黑名单"/);
  assert.doesNotMatch(source, /剩余额度/);
});

test('users table shows actions without hover reveal and includes quota config', () => {
  const source = readSource('../components/users/users-table.tsx');

  assert.match(source, /onQuotaConfig/);
  assert.match(source, /showQuotaColumn/);
  assert.match(source, /额度配置/);
  assert.doesNotMatch(source, /md:opacity-0/);
  assert.doesNotMatch(source, /md:group-hover:opacity-100/);
});

test('settings page exposes admin and web login idle timeout controls', () => {
  const pageSource = readSource('../app/(admin)/settings/page.tsx');
  const formSource = readSource('../components/settings/login-timeout-settings-form.tsx');

  assert.match(pageSource, /LoginTimeoutSettingsForm/);
  assert.match(formSource, /adminOperations\.systemConfig\.get/);
  assert.match(formSource, /adminOperations\.systemConfig\.update/);
  assert.match(formSource, /adminIdleTimeoutMinutes/);
  assert.match(formSource, /webIdleTimeoutMinutes/);
  assert.match(formSource, /admin端登录时效/);
  assert.match(formSource, /web端登录时效/);
});

test('settings page exposes system audit cleanup controls', () => {
  const pageSource = readSource('../app/(admin)/settings/page.tsx');
  const formSource = readSource('../components/settings/audit-log-cleanup-settings-form.tsx');

  assert.match(pageSource, /AuditLogCleanupSettingsForm/);
  assert.match(formSource, /系统审计日志清理配置/);
  assert.match(formSource, /手动清理/);
  assert.match(formSource, /自动清理/);
  assert.match(formSource, /auditLogRetentionDays/);
  assert.match(formSource, /adminOperations\.systemAudit\.cleanupManual/);
  assert.match(formSource, /adminOperations\.systemConfig\.update/);
  assert.doesNotMatch(formSource, /adminOperations\.systemAudit\.cleanupAuto/);
  assert.doesNotMatch(formSource, /按配置立即清理/);
});

test('system audit manual cleanup requires confirmation and keeps visible button text', () => {
  const formSource = readSource('../components/settings/audit-log-cleanup-settings-form.tsx');

  assert.match(
    formSource,
    /const manualCleanupButtonText = manualSubmitting \? '清理中\.\.\.' : '清理选定时间段';/
  );
  assert.match(formSource, /aria-label=\{manualCleanupButtonText\}/);
  assert.match(formSource, /ManualCleanupConfirmDialog/);
  assert.match(formSource, /setManualConfirmOpen\(true\)/);
  assert.match(formSource, /确认清理/);
});

test('system audit manual cleanup datetime fields open from the whole field frame', () => {
  const formSource = readSource('../components/settings/audit-log-cleanup-settings-form.tsx');

  assert.match(formSource, /useRef<HTMLInputElement \| null>/);
  assert.match(formSource, /startDateInputRef/);
  assert.match(formSource, /endDateInputRef/);
  assert.match(formSource, /openDateTimePicker\(startDateInputRef\.current\)/);
  assert.match(formSource, /openDateTimePicker\(endDateInputRef\.current\)/);
  assert.match(formSource, /showPicker\?: \(\) => void/);
});

test('system audit table uses new audit model and exposes detail action', () => {
  const tableSource = readSource('../components/security/audit-log-table.tsx');
  const pageSource = readSource('../app/(admin)/security/system-audit/page.tsx');

  assert.match(tableSource, /item\.logId/);
  assert.match(tableSource, /item\.timestamp/);
  assert.match(tableSource, /item\.level/);
  assert.match(tableSource, /item\.logType/);
  assert.match(tableSource, /<th className="[^"]*">\s*操作账号\s*<\/th>/);
  assert.match(tableSource, /查看详情/);
  assert.match(tableSource, /actorAccount/);
  assert.match(pageSource, /操作账号/);
  assert.match(pageSource, /操作人ID/);
  assert.match(pageSource, /AuditDetailDialog/);
  assert.match(pageSource, /selectedItem/);
  assert.doesNotMatch(tableSource, /item\.actorType/);
  assert.doesNotMatch(tableSource, /item\.action/);
  assert.doesNotMatch(tableSource, /item\.resourceType/);
  assert.doesNotMatch(tableSource, /actorId/);
});
