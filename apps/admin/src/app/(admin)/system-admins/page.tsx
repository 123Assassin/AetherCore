import { UserManagementPage } from '../../../components/users/user-management-page';

export default function SystemAdminsPage() {
  return (
    <UserManagementPage
      description="管理后台登录账号和系统管理员权限"
      mode="system-admins"
      showFilters={false}
      showQuotaColumn={false}
      showSearch={false}
      showStats={false}
      title="系统管理员"
    />
  );
}
