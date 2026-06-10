import { UserManagementPage } from '../../../components/users/user-management-page';

export default function AdminUsersPage() {
  return (
    <UserManagementPage
      description="控制访问权限并监控 API 使用情况"
      mode="web-users"
      title="用户管理"
    />
  );
}
