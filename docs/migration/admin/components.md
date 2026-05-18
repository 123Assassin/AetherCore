# 组件迁移拆分

## 页面级组件

| 当前文件                       | 页面           | 新位置建议                                                  |
| ------------------------------ | -------------- | ----------------------------------------------------------- |
| `src/pages/Login.tsx`          | 登录页         | `apps/admin/app/login/page.tsx`                             |
| `src/pages/Dashboard.tsx`      | 数据看板       | `apps/admin/app/(admin)/dashboard/page.tsx`                 |
| `src/pages/Agents.tsx`         | 智能体管理     | `apps/admin/app/(admin)/resources/agents/page.tsx`          |
| `src/pages/AIPrompts.tsx`      | AI Prompt 管理 | `apps/admin/app/(admin)/resources/prompts/page.tsx`         |
| `src/pages/SensitiveWords.tsx` | 敏感词库管理   | `apps/admin/app/(admin)/resources/sensitive-words/page.tsx` |
| `src/pages/Simulations.tsx`    | 仿真案例库管理 | `apps/admin/app/(admin)/simulations/page.tsx`               |
| `src/pages/EngineDispatch.tsx` | 引擎调度中心   | `apps/admin/app/(admin)/engine-dispatch/page.tsx`           |
| `src/pages/Users.tsx`          | 用户管理       | `apps/admin/app/(admin)/users/page.tsx`                     |
| `src/pages/Activities.tsx`     | 活动与通告管理 | `apps/admin/app/(admin)/operations/activities/page.tsx`     |
| `src/pages/Fission.tsx`        | 裂变管理       | `apps/admin/app/(admin)/operations/fission/page.tsx`        |
| `src/pages/SystemAudit.tsx`    | 系统审计日志   | `apps/admin/app/(admin)/security/system-audit/page.tsx`     |
| `src/pages/ContentAudit.tsx`   | AI 内容审计    | `apps/admin/app/(admin)/security/content-audit/page.tsx`    |
| `src/pages/TrafficMonitor.tsx` | 流量监控       | `apps/admin/app/(admin)/security/traffic-monitor/page.tsx`  |
| `src/pages/AlarmCenter.tsx`    | 消息告警中心   | `apps/admin/app/(admin)/alarm/page.tsx`                     |
| `src/pages/Settings.tsx`       | 系统设置       | `apps/admin/app/(admin)/settings/page.tsx`                  |

## 后台布局组件

| 来源                    | 建议组件                             | 说明                           |
| ----------------------- | ------------------------------------ | ------------------------------ |
| `src/App.tsx` `Sidebar` | `AdminSidebar`                       | 分组导航、展开状态、用户卡片。 |
| `src/App.tsx` `Header`  | `AdminHeader`                        | 路由标题展示。                 |
| `src/App.tsx` `Layout`  | `AdminShell` 或 `(admin)/layout.tsx` | 后台主框架和保护布局。         |

## 可复用业务组件

| 组件建议名                 | 来源                                   | 说明                                       |
| -------------------------- | -------------------------------------- | ------------------------------------------ |
| `DashboardStatCard`        | `Dashboard.tsx`                        | 指标卡片。                                 |
| `TrafficSourceList`        | `Dashboard.tsx`                        | 流量来源 Top 5。                           |
| `AgentCard`                | `Agents.tsx`                           | 智能体卡片，展示引擎、参数、运行状态。     |
| `AgentFormDialog`          | `Agents.tsx`                           | 智能体新增/编辑表单。                      |
| `PromptCard`               | `AIPrompts.tsx`                        | Prompt 版本卡片。                          |
| `PromptFormDialog`         | `AIPrompts.tsx`                        | Prompt 新增/编辑表单。                     |
| `PromptMarkdownPreview`    | 新增                                   | 用 `react-markdown` 渲染 Prompt 内容预览。 |
| `SensitiveWordListCard`    | `SensitiveWords.tsx`                   | 词库卡片和词条标签。                       |
| `SensitiveWordFormDialog`  | `SensitiveWords.tsx`                   | 词库新增/编辑。                            |
| `EngineTable`              | `EngineDispatch.tsx`                   | 引擎列表，API Key 脱敏展示。               |
| `EngineFormDialog`         | `EngineDispatch.tsx`                   | 引擎新增/编辑。                            |
| `SimulationTreeFilter`     | `Simulations.tsx`                      | 科目/年级树筛选。                          |
| `SimulationCard`           | `Simulations.tsx`                      | 仿真资源卡片和启停开关。                   |
| `UsersStats`               | `Users.tsx`                            | 用户统计卡。                               |
| `UsersTable`               | `Users.tsx`                            | 用户表格、状态、黑名单、删除。             |
| `QuotaBadge`               | `Users.tsx`                            | 应用配额百分比标签。                       |
| `ActivityNoticeListItem`   | `Activities.tsx`                       | 活动通告列表项。                           |
| `ActivityNoticeFormDialog` | `Activities.tsx`                       | 活动通告新增/编辑。                        |
| `InviteTree`               | `Fission.tsx`                          | 裂变邀请树。                               |
| `RewardConfigForm`         | `Fission.tsx`                          | 裂变奖励配置表单。                         |
| `AuditLogTable`            | `SystemAudit.tsx`                      | 系统审计日志表格。                         |
| `ContentAuditTable`        | `ContentAudit.tsx`                     | 内容审计会话表格。                         |
| `ExportCsvDialog`          | `SystemAudit.tsx` / `ContentAudit.tsx` | 日期范围导出弹窗。                         |
| `TrafficEngineCard`        | `TrafficMonitor.tsx`                   | 单引擎流量、响应、费用统计。               |
| `AlarmConfigForm`          | `AlarmCenter.tsx`                      | 告警阈值和邮箱配置。                       |
| `PasswordSettingsForm`     | `Settings.tsx`                         | 管理员密码修改。                           |
| `SignOutPanel`             | `Settings.tsx`                         | 退出登录区。                               |

## 可抽到 packages/ui 的通用 UI 组件

| 组件建议名         | 说明                                           |
| ------------------ | ---------------------------------------------- |
| `Button`           | 普通按钮、危险按钮、带图标按钮。               |
| `IconButton`       | 编辑、删除、关闭、导出等图标按钮。             |
| `Dialog`           | 新增/编辑/导出弹窗。                           |
| `ConfirmDialog`    | 智能体、Prompt、词库、引擎、内容审计删除确认。 |
| `TextField`        | 文本、密码、邮箱、数字、日期输入。             |
| `Textarea`         | Prompt、敏感词、活动正文。                     |
| `Select`           | 智能体绑定引擎/Prompt/敏感词库。               |
| `Slider`           | temperature、topP、二级奖励比例。              |
| `Switch`           | 启停状态、裂变活动状态、多级奖励开关。         |
| `SegmentedControl` | 裂变管理 tab、仿真视图切换。                   |
| `Badge`            | 状态、版本、黑名单、分类标签。                 |
| `StatCard`         | Dashboard 和用户统计卡。                       |
| `DataTable`        | 用户、引擎、审计、内容审计表格基础。           |
| `EmptyState`       | 空列表/无结果。                                |
| `MarkdownRenderer` | 对 `react-markdown` 做统一封装。               |

## 类型与工具

| 当前文件           | 新位置建议                                                        |
| ------------------ | ----------------------------------------------------------------- |
| `src/types.ts`     | `packages/shared/src/admin-types.ts` 或 `apps/admin/lib/types.ts` |
| `src/lib/utils.ts` | `packages/ui/src/lib/utils.ts`                                    |
