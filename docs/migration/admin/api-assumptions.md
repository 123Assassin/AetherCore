# API 假设

当前前端仍没有真实 API 调用：未发现 `fetch`、`axios` 或 API client。以下接口是按当前页面行为迁移到 Next.js 16 / 后端后所需的最小集合。

技术栈约束：

- 移除 `@google/genai` 和 `GEMINI_API_KEY` 注入；当前是管理平台，不做 AI 对话。
- 新增 `react-markdown`，用于 Prompt 内容 Markdown 预览/渲染。
- 不迁移 Vite API 或 Vite 配置；Next.js 16 自带打包工具。

## 通用约定

- 所有 `/api/admin/**` 接口要求管理员鉴权。
- 成功响应：`{ "data": ... }`。
- 错误响应：`{ "error": { "code": "string", "message": "string" } }`。
- 通用错误：`400` 参数错误、`401` 未登录、`403` 无权限、`404` 不存在、`409` 冲突、`500` 服务端错误。

## Auth

| 接口                      | 方法 | 请求                 | 响应                        | 当前替代                                       |
| ------------------------- | ---- | -------------------- | --------------------------- | ---------------------------------------------- |
| `/api/admin/auth/login`   | POST | `{ user, password }` | `{ user }` + session cookie | `admin123` 硬编码 + `localStorage.isAdminAuth` |
| `/api/admin/auth/logout`  | POST | 无                   | `{ success: true }`         | 删除 `localStorage.isAdminAuth`                |
| `/api/admin/auth/session` | GET  | 无                   | `{ authenticated, user }`   | 读取 localStorage                              |

## Dashboard

### `GET /api/admin/dashboard/overview`

响应：

```json
{
  "data": {
    "pv": 124500,
    "uv": 45200,
    "activeNow": 342,
    "avgDuration": "4m 32s",
    "tokenToday": 4200000,
    "trafficSources": [{ "source": "直接访问", "ratio": 45 }]
  }
}
```

当前替代：`DashboardPage` 本地 mock，`activeNow` 每 3 秒随机变化。

## 智能体管理

### `GET /api/admin/agents`

查询参数：`q?`、`status?`、`engineId?`、`page?`、`pageSize?`。

响应 item：

```json
{
  "id": "1",
  "name": "智能评语助手",
  "engineId": "engine-1",
  "promptId": "prompt-1",
  "sensitiveListId": "sw-1",
  "config": { "temperature": 0.7, "topP": 0.9, "maxTokens": 2000 },
  "status": "running",
  "createdAt": "2024-03-20"
}
```

### `POST /api/admin/agents`

请求：`name`、`engineId`、`promptId?`、`sensitiveListId?`、`config`。

错误：`400` 名称/参数非法，`404` 关联引擎/Prompt/词库不存在，`409` 名称重复。

### `PUT /api/admin/agents/:id`

全量更新智能体配置。

### `DELETE /api/admin/agents/:id`

删除智能体；若已有生产调用或审计约束，可返回 `409`。

当前替代：`AgentsPage` 本地 `apps`，新增 id/date 客户端生成；引擎、Prompt、敏感词下拉为本地 mock。

## Prompt 管理

### `GET /api/admin/prompts`

查询参数：`q?`、`page?`、`pageSize?`。

响应 item：

```json
{
  "id": "1",
  "title": "教师评语-v1",
  "content": "## 角色\n你是专业的教师...",
  "version": "v1.0",
  "updatedAt": "2024-03-20"
}
```

### `POST /api/admin/prompts`

请求：`title`、`content`、`version`。`content` 建议支持 Markdown。

错误：`400` 标题/内容为空，`409` 版本冲突。

### `PUT /api/admin/prompts/:id`

更新 Prompt。

### `DELETE /api/admin/prompts/:id`

删除 Prompt；若被智能体引用，建议返回 `409` 或要求先解绑。

当前替代：`AIPromptsPage` 本地 `prompts`。

## 敏感词库

### `GET /api/admin/sensitive-word-lists`

响应 item：

```json
{
  "id": "1",
  "name": "默认屏蔽字库",
  "words": ["暴力", "色情", "攻击"],
  "updatedAt": "2024-03-20"
}
```

### `POST /api/admin/sensitive-word-lists`

请求：`name`、`words: string[]`。

### `PUT /api/admin/sensitive-word-lists/:id`

更新词库。

### `DELETE /api/admin/sensitive-word-lists/:id`

删除词库；若被智能体引用，建议 `409`。

当前替代：`SensitiveWordsPage` 本地 `lists`；UI 通过逗号字符串解析为数组。

## 引擎调度

### `GET /api/admin/engines`

响应 item：

```json
{
  "id": "engine-1",
  "name": "OpenAI GPT-4",
  "apiUrl": "https://api.openai.com/v1",
  "apiKeyMasked": "sk-********",
  "createdAt": "2024-03-20"
}
```

### `POST /api/admin/engines`

请求：`name`、`apiUrl`、`apiKey`。

错误：`400` URL/API Key 非法，`409` 名称重复。

### `PUT /api/admin/engines/:id`

更新引擎。建议 API Key 可选，不传则保留原密钥。

### `DELETE /api/admin/engines/:id`

删除引擎；若有智能体引用，建议返回 `409`。

当前替代：`EngineDispatchPage` 本地 `engines`；API Key 仅视觉模糊，不是真脱敏。

## 仿真案例库

| 接口                                | 方法  | 说明                                                                   |
| ----------------------------------- | ----- | ---------------------------------------------------------------------- |
| `/api/admin/simulations`            | GET   | 支持 `subject?`、`categoryId?`、`grade?`、`isable?`、`q?`、分页。      |
| `/api/admin/simulations/filters`    | GET   | 返回顶层学科、二级分类、年级筛选项。                                   |
| `/api/admin/simulations/:id/isable` | PATCH | 请求 `{ isable }`，切换启用状态。                                      |
| `/api/admin/simulations/:id`        | PUT   | 预留编辑名称、分类、年级、缩略图、实验入口、主题、学习目标、启用状态。 |

列表 item 与后端 `simulation_apps` 对齐：

```ts
{
  id: string;
  name: string;
  subject: string;
  category: { id: string; name: string };
  grades: string[];
  thumbnail?: string | null;
  src?: string | null;
  isable: boolean;
  topics?: unknown[] | null;
  sampleLearningGoals?: unknown[] | null;
  createdAt: string;
  updatedAt: string;
}
```

当前替代：`SimulationsPage` 本地 `items` 和硬编码 `treeData`；图片为 Unsplash URL。

## 用户管理

| 接口                             | 方法   | 请求/响应                                                                                         |
| -------------------------------- | ------ | ------------------------------------------------------------------------------------------------- | --------------- |
| `/api/admin/users`               | GET    | 支持 `q?`、`status?`、`isBlacklisted?`、分页；返回 email/status/quotas/totalQuota/isBlacklisted。 |
| `/api/admin/users/:id/status`    | PATCH  | `{ status: "active"                                                                               | "disabled" }`。 |
| `/api/admin/users/:id/blacklist` | PATCH  | `{ isBlacklisted: boolean }`。                                                                    |
| `/api/admin/users/:id`           | DELETE | 删除用户。                                                                                        |
| `/api/admin/users/invitations`   | POST   | 当前邀请按钮预留：`{ email, totalQuota? }`。                                                      |
| `/api/admin/users/:id/activity`  | GET    | 当前 History 按钮预留。                                                                           |

当前替代：`UsersPage` 本地 `users`；搜索和邀请无逻辑；请求峰值 `12.4K` 硬编码。

## 活动与通告

| 接口                        | 方法   | 说明                           |
| --------------------------- | ------ | ------------------------------ |
| `/api/admin/activities`     | GET    | 支持 `status?`、分页。         |
| `/api/admin/activities`     | POST   | `title`、`content`、`status`。 |
| `/api/admin/activities/:id` | PUT    | 更新活动通告。                 |
| `/api/admin/activities/:id` | DELETE | 删除活动通告。                 |

当前替代：`ActivitiesPage` 本地 `notices`；新增 id/date 客户端生成；删除使用 `window.confirm`。

## 裂变管理

### `GET /api/admin/fission/invite-tree`

返回邀请树：

```json
{
  "data": [
    {
      "id": "1",
      "email": "pioneer_user@gmail.com",
      "inviteCode": "NEXUS-7A2B",
      "totalInvited": 12,
      "rewardEarned": 6000,
      "children": []
    }
  ]
}
```

### `GET /api/admin/fission/reward-config`

响应：`inviterQuota`、`inviteeQuota`、`enableMultiTier`、`tier2RewardPct`、`isActive`。

### `PUT /api/admin/fission/reward-config`

保存奖励规则。错误：`400` 金额/比例非法。

当前替代：`FissionPage` 本地 `mockInviteTree` 和 `rewardConfig`；保存按钮无处理。

## 系统审计日志

| 接口                                  | 方法 | 说明                                           |
| ------------------------------------- | ---- | ---------------------------------------------- |
| `/api/admin/audit/system-logs`        | GET  | 支持 `startDate?`、`endDate?`、`type?`、分页。 |
| `/api/admin/audit/system-logs/export` | GET  | 返回 CSV 文件流。                              |

当前替代：`SystemAuditPage` 本地 `logs`；导出只 `console.log` 日期。

## AI 内容审计

| 接口                                       | 方法   | 说明                                                           |
| ------------------------------------------ | ------ | -------------------------------------------------------------- |
| `/api/admin/audit/content-sessions`        | GET    | 支持 `startDate?`、`endDate?`、`userId?`、`isDeleted?`、分页。 |
| `/api/admin/audit/content-sessions/export` | GET    | 返回 CSV 文件流。                                              |
| `/api/admin/audit/content-sessions/:id`    | GET    | 查看会话详情，当前按钮预留。                                   |
| `/api/admin/audit/content-sessions/:id`    | DELETE | 软删除，响应更新后的 `isDeleted: true`。                       |

当前替代：`ContentAuditPage` 本地 `sessions`；删除只更新本地 `isDeleted`。

## 流量监控

### `GET /api/admin/traffic/engines`

响应 item：`engine`、`tokens`、`responseTime`、`cost`。生产建议返回数字字段：`tokensTotal`、`avgResponseMs`、`costAmount`、`currency`。

当前替代：`TrafficMonitorPage` 硬编码数组。

## 消息告警

| 接口                      | 方法 | 请求/响应                    |
| ------------------------- | ---- | ---------------------------- |
| `/api/admin/alarm/config` | GET  | 返回 `threshold`、`email`。  |
| `/api/admin/alarm/config` | PUT  | 保存费用告警阈值和通知邮箱。 |

当前替代：`AlarmCenterPage` 本地 `config`；保存按钮无处理。

## 系统设置

### `PUT /api/admin/settings/password`

请求：`currentPassword`、`newPassword`。

错误：`400` 新密码不合规，`401` 当前密码错误。

当前替代：只校验新密码和确认密码一致，不修改真实密码。

## Mock、localStorage、硬编码清单

| 项                                 | 位置                              | 类型            |
| ---------------------------------- | --------------------------------- | --------------- |
| 管理员密码 `admin123`              | `src/App.tsx`                     | 硬编码          |
| 登录状态 `isAdminAuth`             | `src/App.tsx`                     | localStorage    |
| 导航分组默认展开                   | `src/App.tsx`                     | 硬编码          |
| Dashboard 指标和流量来源           | `Dashboard.tsx`                   | mock / 随机     |
| 智能体、引擎/Prompt/词库下拉       | `Agents.tsx`                      | mock            |
| Prompt 列表                        | `AIPrompts.tsx`                   | mock            |
| 敏感词库                           | `SensitiveWords.tsx`              | mock            |
| 引擎列表和 API Key                 | `EngineDispatch.tsx`              | mock / 视觉脱敏 |
| 仿真资源、分类树、图片 URL         | `Simulations.tsx`                 | mock / 硬编码   |
| 用户、配额、黑名单                 | `Users.tsx`                       | mock            |
| 请求峰值 `12.4K`                   | `Users.tsx`                       | 硬编码          |
| 活动通告                           | `Activities.tsx`                  | mock            |
| 裂变邀请树和奖励配置               | `Fission.tsx`                     | mock            |
| 审计日志                           | `SystemAudit.tsx`                 | mock            |
| 内容审计会话                       | `ContentAudit.tsx`                | mock            |
| 流量监控数据                       | `TrafficMonitor.tsx`              | 硬编码          |
| 告警阈值和邮箱                     | `AlarmCenter.tsx`                 | mock            |
| `@google/genai` / `GEMINI_API_KEY` | `package.json` / `vite.config.ts` | 迁移时移除      |
