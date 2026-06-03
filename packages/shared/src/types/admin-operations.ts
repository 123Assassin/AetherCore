export type AdminOperationListInput = {
  page?: number;
  pageSize?: number;
  q?: string;
};

export type AdminOperationListResult<TItem> = {
  items: TItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminUserStatus = 'active' | 'disabled' | 'deleted';
export type AdminMutableUserStatus = Exclude<AdminUserStatus, 'deleted'>;

export type AdminUserItem = {
  id: string;
  email: string;
  name: string | null;
  displayName: string;
  role: string;
  status: AdminUserStatus;
  isBlacklisted: boolean;
  credits: number;
  totalQuota: number;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type AdminUserListInput = AdminOperationListInput & {
  role?: string;
  status?: AdminUserStatus;
  isBlacklisted?: boolean;
};

export type AdminUserStatusInput = {
  id: string;
  status: AdminMutableUserStatus;
};

export type AdminUserBlacklistInput = {
  id: string;
  isBlacklisted: boolean;
};

export type AdminUserDeleteInput = {
  id: string;
};

export type AdminUserInviteInput = {
  email: string;
  name?: string | null;
  totalQuota?: number;
};

export type AdminUserActivityInput = {
  userId: string;
  page?: number;
  pageSize?: number;
};

export type AdminUserActivityType = 'login' | 'ai_call' | 'credit' | 'conversation';

export type AdminUserActivityItem = {
  id: string;
  type: AdminUserActivityType;
  title: string;
  description: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
};

export type AdminActivityStatus = 'draft' | 'published';

export type AdminActivityItem = {
  id: string;
  title: string;
  content: string;
  status: AdminActivityStatus;
  publishedAt: string | null;
  createdByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminActivityListInput = AdminOperationListInput & {
  status?: AdminActivityStatus;
};

export type AdminActivityCreateInput = {
  title: string;
  content: string;
  status?: AdminActivityStatus;
};

export type AdminActivityUpdateInput = Partial<AdminActivityCreateInput> & {
  id: string;
};

export type AdminEntityIdInput = {
  id: string;
};

export type AdminInviteTreeNode = {
  id: string;
  email: string;
  name: string | null;
  inviteCode: string | null;
  totalInvited: number;
  rewardEarned: number;
  children: AdminInviteTreeNode[];
};

export type AdminFissionRewardConfig = {
  inviterQuota: number;
  inviteeQuota: number;
  enableMultiTier: boolean;
  tier2RewardPct: number;
  isActive: boolean;
  updatedByAdminId: string | null;
  updatedAt: string;
};

export type AdminFissionRewardConfigUpdateInput = {
  inviterQuota: number;
  inviteeQuota: number;
  enableMultiTier: boolean;
  tier2RewardPct: number;
  isActive: boolean;
};

export type AdminAlarmConfig = {
  threshold: number;
  currency: string;
  email: string;
  updatedByAdminId: string | null;
  updatedAt: string;
};

export type AdminAlarmConfigUpdateInput = {
  threshold: number;
  currency?: string;
  email: string;
};

export type AdminSystemAuditItem = {
  id: string;
  actorType: 'admin' | 'user' | 'system';
  actorId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminSystemAuditListInput = AdminOperationListInput & {
  actorType?: 'admin' | 'user' | 'system';
  actorId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
};

export type AdminAuditExportInput = {
  startDate?: string;
  endDate?: string;
};

export type AdminAuditExportResult = {
  filename: string;
  contentType: 'text/csv';
  content: string;
};

export type AdminContentAuditItem = {
  id: string;
  conversationId: string;
  userId: string | null;
  userEmail: string;
  category: 'chat' | 'inspiration' | 'comment' | 'teaching';
  title: string;
  messageCount: number;
  lastMessageAt: string | null;
  metadata: Record<string, unknown> | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminContentAuditMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
};

export type AdminContentAuditDetail = AdminContentAuditItem & {
  messages: AdminContentAuditMessage[];
};

export type AdminContentAuditListInput = AdminOperationListInput & {
  userId?: string;
  category?: AdminContentAuditItem['category'];
  isDeleted?: boolean;
  startDate?: string;
  endDate?: string;
};

export type AdminTrafficStatsInput = {
  startDate?: string;
  endDate?: string;
};

export type AdminTrafficStatsItem = {
  engineId: string | null;
  engine: string;
  tokensTotal: number;
  avgResponseMs: number;
  successRate: number;
  costAmount: number;
  currency: string;
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
};
