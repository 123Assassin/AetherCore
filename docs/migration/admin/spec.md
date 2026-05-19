# AI-Sim Admin 当前功能规格

## 页面列表

| 页面           | 路由                         | 核心能力                                                   |
| -------------- | ---------------------------- | ---------------------------------------------------------- |
| 登录页         | `/login`                     | 管理员密码登录。                                           |
| 数据看板       | `/dashboard`                 | 在线人数、Token 消耗、UV、访问时长、流量来源展示。         |
| 智能体管理     | `/resources/agents`          | 智能体列表、新增、编辑、删除，绑定引擎、Prompt、敏感词库。 |
| AI Prompt 管理 | `/resources/prompts`         | Prompt 版本列表、新增、编辑、删除。                        |
| 敏感词库管理   | `/resources/sensitive-words` | 敏感词库列表、新增、编辑、删除。                           |
| 仿真案例库管理 | `/simulations`               | 按科目/年级筛选仿真资源，启用/禁用。                       |
| 引擎调度中心   | `/engine-dispatch`           | 模型引擎 API 地址和 API Key 的 CRUD。                      |
| 用户管理       | `/users`                     | 用户状态、黑名单、配额消耗、删除。                         |
| 活动与通告管理 | `/operations/activities`     | 活动通告新增、编辑、删除、发布/草稿状态。                  |
| 裂变管理       | `/operations/fission`        | 邀请链路树、奖励规则配置。                                 |
| 系统审计日志   | `/security/system-audit`     | 操作日志列表、按日期导出 CSV 弹窗。                        |
| AI 内容审计    | `/security/content-audit`    | 会话审计列表、导出、软删除。                               |
| 流量监控       | `/security/traffic-monitor`  | 各模型引擎 Token、响应时长、费用展示。                     |
| 消息告警中心   | `/alarm`                     | 费用告警阈值和通知邮箱配置。                               |
| 系统设置       | `/settings`                  | 修改管理员密码、退出登录。                                 |

## 用户流程

1. 未登录访问后台路径时重定向到 `/login`。
2. 登录页输入访问密钥；当前硬编码密码为 `admin123`。
3. 登录成功后写入 `localStorage.isAdminAuth = "true"` 并跳转 `/dashboard`。
4. 后台左侧导航支持分组展开/收起；初始展开“内容与资源管理”“运营配置”“安全与系统监控”。
5. 后台未知路径重定向到 `/dashboard`。
6. 系统设置页点击 `Sign Out` 删除 `localStorage.isAdminAuth` 并退出。

## 表单字段

| 模块            | 字段                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 登录            | 固定用户名 `admin`、密码输入。                                                                                           |
| 智能体          | 智能体名称、模型引擎、系统提示词 Prompt、敏感词库、temperature、topP；`maxTokens` 存在于类型和默认值但当前 UI 无输入项。 |
| AI Prompt       | 标题、版本号、内容。迁移时内容建议作为 Markdown，使用 `react-markdown` 渲染预览。                                        |
| 敏感词库        | 词库名称、敏感词列表，当前通过英文逗号分隔解析。                                                                         |
| 引擎调度        | 引擎名称、API 地址、API Key。                                                                                            |
| 仿真案例        | 当前无新增/编辑表单；只有启用/禁用开关和分类筛选。                                                                       |
| 用户管理        | 搜索输入存在但未绑定筛选；邀请按钮存在但无处理；状态、黑名单通过行内按钮切换。                                           |
| 活动与通告      | 标题、正文内容、状态 `published/draft`。                                                                                 |
| 裂变奖励        | 活动状态、邀请者奖励额度、受邀者奖励额度、二级分销开关、二级提成比例。                                                   |
| 系统审计导出    | 开始日期、结束日期。                                                                                                     |
| AI 内容审计导出 | 开始日期、结束日期。                                                                                                     |
| 消息告警        | 费用告警阈值 RMB、通知邮箱。                                                                                             |
| 系统设置        | 当前密码、新密码、确认密码。                                                                                             |

## 交互行为

- 智能体、Prompt、敏感词库、引擎调度均使用弹窗做新增/编辑，并使用自定义确认弹窗删除。
- 活动与通告删除仍使用 `window.confirm`。
- 用户删除仍使用 `window.confirm`；状态按钮切换 `active/disabled`，黑名单按钮切换 `isBlacklisted`。
- 内容审计删除是软删除：把 `isDeleted` 设为 `true`，不从列表移除。
- 审计导出和内容审计导出目前只 `console.log` 日期范围并关闭弹窗。
- 裂变管理有 `chain/config` 两个 tab；邀请链路树可展开/收起。
- 数据看板 `activeNow` 每 3 秒随机波动。
- 引擎调度 API Key 在表格中默认模糊，hover 后显示。
- 登录页底部版本/加密文案仍为硬编码展示。

## 状态管理逻辑

| 状态                                           | 位置                 | 来源                                   |
| ---------------------------------------------- | -------------------- | -------------------------------------- |
| `isAuthenticated`                              | `src/App.tsx`        | 从 `localStorage.isAdminAuth` 初始化。 |
| `expandedGroups`                               | `Sidebar`            | 本地状态，控制导航分组展开。           |
| `stats`                                        | `DashboardPage`      | 本地 mock，`activeNow` 定时随机变化。  |
| `apps`                                         | `AgentsPage`         | 本地 mock 智能体列表。                 |
| `prompts`                                      | `AIPromptsPage`      | 本地 mock Prompt 列表。                |
| `lists` / `wordsInput`                         | `SensitiveWordsPage` | 本地 mock 敏感词库和逗号分隔输入。     |
| `engines`                                      | `EngineDispatchPage` | 本地 mock 模型引擎。                   |
| `items` / `activeFilter` / `expandedNodes`     | `SimulationsPage`    | 本地 mock 仿真资源、筛选和树展开。     |
| `users`                                        | `UsersPage`          | 本地 mock 用户、配额、黑名单。         |
| `notices`                                      | `ActivitiesPage`     | 本地 mock 活动通告。                   |
| `rewardConfig` / `activeTab` / `expandedNodes` | `FissionPage`        | 本地 mock 裂变配置和树状态。           |
| `logs` / `exportDateRange`                     | `SystemAuditPage`    | 本地 mock 日志和导出日期。             |
| `sessions` / `exportDateRange`                 | `ContentAuditPage`   | 本地 mock 会话审计和导出日期。         |
| `config`                                       | `AlarmCenterPage`    | 本地 mock 告警配置。                   |
| `passwords` / `success`                        | `SettingsPage`       | 本地设置表单。                         |

## 权限假设

- 当前仍只有单一管理员角色，无 RBAC。
- 所有后台页面迁移到 `apps/admin`，并要求管理员权限。
- 高敏操作包括：引擎 API Key 管理、智能体配置、Prompt 管理、敏感词库、用户黑名单、审计导出、内容软删除、告警阈值、密码修改。
- API Key 不应下发明文给无权限用户；编辑时也应考虑脱敏回显和重新录入策略。
- `apps/web` 只消费公开/用户侧数据，不承载管理入口。

## 数据依赖

| 数据             | 当前来源                              | 迁移依赖                                      |
| ---------------- | ------------------------------------- | --------------------------------------------- |
| 登录状态         | `localStorage.isAdminAuth`            | 服务端 session/cookie/token。                 |
| 管理员密码       | `src/App.tsx` 硬编码 `admin123`       | Auth API。                                    |
| Dashboard 指标   | `DashboardPage` mock                  | 指标统计 API。                                |
| 智能体           | `AgentsPage` mock                     | 智能体 CRUD、引擎/Prompt/敏感词库下拉数据。   |
| Prompt           | `AIPromptsPage` mock                  | Prompt CRUD；前端新增 `react-markdown` 预览。 |
| 敏感词库         | `SensitiveWordsPage` mock             | 敏感词库 CRUD。                               |
| 模型引擎         | `EngineDispatchPage` mock             | 引擎 CRUD 和密钥安全存储。                    |
| 仿真资源         | `SimulationsPage` mock + Unsplash URL | 仿真资源、分类树、启停 API、图片存储。        |
| 用户与配额       | `UsersPage` mock                      | 用户查询、状态、黑名单、删除、配额 API。      |
| 活动通告         | `ActivitiesPage` mock                 | 活动/通告 CRUD。                              |
| 裂变树和奖励配置 | `FissionPage` mock                    | 邀请链路、奖励配置 API。                      |
| 审计日志         | `SystemAuditPage` mock                | 审计查询和 CSV 导出 API。                     |
| 内容审计会话     | `ContentAuditPage` mock               | 会话查询、导出、软删除 API。                  |
| 流量监控         | `TrafficMonitorPage` mock             | 引擎调用统计 API。                            |
| 告警配置         | `AlarmCenterPage` mock                | 告警配置读写 API。                            |
