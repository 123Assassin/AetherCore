# AetherCore 后端设计

## 1. 设计目标

后端为 `apps/web` 用户端和 `apps/admin` 平台管理端提供统一 API。用户端面向教师，核心能力是微信扫码登录、AI 对话、知识精讲、评语生成、题目变身、互动实验和个人历史；管理端面向平台运营，核心能力是智能体配置、模型引擎调度、Prompt 和敏感词库管理、用户管理、仿真案例库、AI 内容审计、流量监控、运营配置和系统审计。

本设计只覆盖后端业务边界、数据库结构和 RESTful API，不迁移 `dd_web` 或 `dd_admin` 的 legacy 前端代码。

## 2. 技术栈

依据 `AetherCore规范.md`：

- 服务端：`apps/server`，NestJS 10 + Fastify。
- 数据库：PostgreSQL。
- ORM：Drizzle ORM。
- 缓存与会话：Redis。
- 数据初始化：`apps/db-init`。
- monorepo：pnpm workspace + Turborepo。
- 前端 API 消费：`apps/web`、`apps/admin` 通过 HTTP API 调用后端。

## 3. API 风格

虽然工程规范提到 `tRPC`，本阶段按需求输出 RESTful API。建议保留 `packages/api` 给前端封装类型化 REST client，后续如需要内部 tRPC caller，可在不改变外部 REST 契约的前提下补充。

统一约定：

- 用户端接口前缀：`/api/**`。
- 管理端接口前缀：`/api/admin/**`。
- JSON 成功响应：`{ "data": ... }`。
- JSON 错误响应：`{ "error": { "code": "string", "message": "string", "details"?: unknown } }`。
- AI 长文本接口使用 `text/event-stream`。
- 文件下载接口直接返回文件流。
- 时间字段统一 ISO 8601 字符串。
- ID 使用 UUID。

## 4. 认证与会话

### 4.1 用户端微信扫码登录

用户端登录采用微信开放平台网站应用扫码登录。后端不把 `WECHAT_APP_SECRET` 下发给前端。

流程：

1. 前端请求 `GET /api/auth/wechat/login-url` 获取微信授权 URL。
2. 后端生成 `state`，写入 Redis，返回授权 URL。
3. 用户扫码授权后，微信回调到 `GET /api/auth/wechat/callback?code=...&state=...`。
4. 后端校验 `state`，用 `code` 向微信换取 `access_token`、`openid`、`unionid`。
5. 后端按 `unionid` 优先、`openid` 兜底查找或创建用户。
6. 后端创建站内 session，写入 Redis 和 `sessions` 表，设置 HttpOnly Cookie。
7. 前端通过 `GET /api/me` 获取当前用户。

微信接口参数按网站应用登录文档处理：`scope=snsapi_login`，`redirect_uri` 需要 URL Encode，`state` 用于防 CSRF 并在回调中校验。

### 4.2 管理端登录

管理端使用独立管理员账号密码登录，不复用微信用户登录态。

流程：

1. 管理员请求 `POST /api/admin/auth/login`。
2. 后端校验账号密码，创建 admin session。
3. 管理端使用 HttpOnly Cookie 访问 `/api/admin/**`。
4. 高敏操作写入系统审计日志。

### 4.3 Redis Key

| Key                         | TTL    | 说明                                     |
| --------------------------- | ------ | ---------------------------------------- |
| `auth:wechat:state:{state}` | 10m    | 微信登录 state，防 CSRF。                |
| `session:{token}`           | 7d     | 用户端 session。                         |
| `admin:session:{token}`     | 2h     | 管理端 session。                         |
| `rate:{scope}:{identity}`   | 按场景 | 登录、AI 调用、导出等限流。              |
| `ai:stream:{requestId}`     | 15m    | 流式生成过程中的临时状态，故障恢复可选。 |

## 5. 模块设计

### 5.1 Auth 模块

职责：

- 微信扫码登录 URL 生成与回调处理。
- 用户 session 创建、续期、登出。
- 管理员账号密码登录；默认管理员由 `apps/db-init` 写入 `users`。
- 鉴权 Guard：用户端、管理端分离。

边界：

- `wechat_accounts` 保存微信身份映射。
- `users` 保存当前已落库的登录账号；管理员用 `role='admin'` 区分。
- `wechat_accounts`、独立 `admin_users` 属于后续规划表，当前迁移尚未创建。
- Redis 保存在线 session。

### 5.2 User/Profile 模块

职责：

- 用户注册入库。
- 用户端 `me`、偏好、额度查询。
- 管理端用户列表、状态、黑名单、删除、活动记录。

用户状态：

- `active`：正常。
- `disabled`：停用，不能登录或调用 AI。
- `deleted`：软删除。

黑名单独立于状态。黑名单用户可保留登录记录，但 AI 调用直接拒绝。

### 5.3 Credit 模块

职责：

- AI 额度查询、消耗、奖励和调整。
- 幂等扣减，防止前端重试重复扣费。
- 裂变奖励、运营赠送、后台调整统一记账。

扣减场景：

- `chat`
- `inspiration`
- `comment_single`
- `comment_batch_row`
- `teaching`

每次 AI 生成在事务中写入 `credit_transactions`。批量评语按行扣减。

### 5.4 AI 资源配置模块

管理端“内容与资源管理”对应用户端 AI 功能配置。

核心实体：

- `model_engines`：模型引擎 API 地址、密钥、计费参数。
- `ai_prompts`：系统提示词版本。
- `sensitive_word_lists`：敏感词库。
- `ai_agents`：智能体配置，绑定引擎、Prompt、敏感词库、temperature、topP、maxTokens。

用户端功能和智能体映射：

| 用户端功能 | agent key     | 管理端配置来源 |
| ---------- | ------------- | -------------- |
| AI 助手    | `chat`        | 智能体管理     |
| 知识精讲   | `inspiration` | 智能体管理     |
| 评语助手   | `comment`     | 智能体管理     |
| 题目变身   | `teaching`    | 智能体管理     |

后端根据功能 key 选择启用中的智能体，不允许前端传模型名或 API Key。

### 5.5 AI 会话模块

职责：

- 保存用户每次 AI 对话。
- 支持用户端历史侧栏。
- 支持管理端 AI 内容审计。
- 支持流式输出时增量记录和最终落库。

会话分类：

- `chat`
- `inspiration`
- `comment`
- `teaching`

互动实验不是 AI 对话，不进入 AI 会话；实验访问可写入行为日志。

消息结构：

- 用户消息：表单内容格式化成可读文本，同时保存原始 payload。
- 助手消息：保存最终生成内容、建议追问、workflow 指令。
- AI 调用记录：保存引擎、token、耗时、费用、错误码。

### 5.6 AI 生成模块

职责：

- 校验输入。
- 读取智能体配置。
- 拼装系统 prompt 与用户上下文。
- 执行敏感词预检查和输出后检查。
- 调用模型引擎。
- 记录 token、费用、响应时间。
- 输出 SSE 事件。

SSE 事件：

```ts
type AiStreamEvent =
  | { type: 'session'; sessionId: string }
  | { type: 'delta'; content: string }
  | { type: 'suggestions'; suggestions: string[] }
  | { type: 'workflow'; workflowName: 'comment' | 'inspiration' | 'teaching'; redirectTo: string }
  | { type: 'credit'; remaining: number }
  | { type: 'done'; messageId: string }
  | { type: 'error'; code: string; message: string };
```

### 5.7 批量评语模块

职责：

- 接收 `.xlsx/.xls` 文件。
- 后端解析 Excel，前端不依赖 `xlsx`。
- 校验列：`昵称`、`性别`、`年级`、`表现标签`、`核心优缺点`。
- 创建批量任务和行记录。
- 支持单行生成、全部生成、状态查询和结果导出。

任务状态：

- `pending`
- `running`
- `completed`
- `failed`
- `cancelled`

行状态：

- `pending`
- `generating`
- `success`
- `error`

### 5.8 仿真案例库模块

管理端“仿真案例库管理”对应用户端“互动实验”。

职责：

- 管理仿真实验资源。
- 支持学科、二级分类、年级、关键词筛选。
- 启用资源才出现在用户端；当前字段沿用种子数据的 `isable`。
- 用户端打开实验时使用 `simulation_apps.src` iframe 播放。

资源字段：

- 应用 ID、名称、所属分类、学科（由顶层分类推导）、年级（由 `grade_simulation_apps` 映射）、缩略图、实验 URL、启用状态、主题标签、学习目标。

### 5.9 运营模块

职责：

- 活动与通告发布。
- 裂变邀请链路。
- 奖励规则配置。
- 用户邀请奖励发放。

用户端暂未明确活动展示入口，接口保留 `GET /api/activities` 给后续公告或活动入口使用。

### 5.10 审计与监控模块

系统审计：

- 管理员登录、登出。
- 新增/编辑/删除智能体、Prompt、词库、模型引擎。
- 用户停用、黑名单、删除。
- 审计导出、内容软删除。
- 告警配置修改、密码修改。

内容审计：

- 管理端查询 AI 会话。
- 查看消息详情。
- 导出 CSV。
- 软删除会话，用户端默认不再展示。

流量监控：

- 按模型引擎聚合 token、费用、响应时间、失败率。
- 写入 `ai_model_calls`，查询时聚合。

### 5.11 告警模块

职责：

- 保存费用告警阈值和通知邮箱。
- 定时统计当日或周期费用。
- 超阈值写入告警事件，后续可接邮件发送。

## 6. 权限设计

### 6.1 用户端

| 能力                           | 权限                       |
| ------------------------------ | -------------------------- |
| 微信登录                       | 公开                       |
| 查看启用仿真案例               | 公开或登录后可用，建议公开 |
| AI 对话/知识精讲/评语/题目变身 | 登录用户                   |
| 查看个人历史、偏好、额度       | 登录用户                   |
| 批量评语导出                   | 登录用户且任务归属本人     |

### 6.2 管理端

第一阶段按单一管理员角色实现。所有 `/api/admin/**` 均要求管理员登录。后续如增加 RBAC，可按模块拆分权限：

- `resource:write`
- `user:write`
- `audit:read`
- `audit:export`
- `security:write`
- `operation:write`

## 7. 数据一致性

- AI 额度扣减和会话创建在同一事务前半段完成；模型调用失败时写入失败调用记录，并按策略退回额度或标记未消费。
- `credits/consume` 使用 `idempotencyKey` 防止重复扣减。
- 批量评语每行独立事务，单行失败不影响其他行。
- 智能体配置引用模型引擎、Prompt、敏感词库；被引用资源删除返回 `409`，或先禁用再解绑。
- 内容审计删除是软删除，不物理删除消息。

## 8. 错误码

| code                   | HTTP | 说明                               |
| ---------------------- | ---- | ---------------------------------- |
| `BAD_REQUEST`          | 400  | 参数格式错误。                     |
| `UNAUTHORIZED`         | 401  | 未登录或 session 失效。            |
| `FORBIDDEN`            | 403  | 无权限或用户被禁用/拉黑。          |
| `NOT_FOUND`            | 404  | 资源不存在。                       |
| `QUOTA_EXHAUSTED`      | 402  | AI 额度不足。                      |
| `CONFLICT`             | 409  | 重复名称、重复幂等键、资源被引用。 |
| `UNPROCESSABLE_ENTITY` | 422  | Excel 或 AI 结构化结果无法解析。   |
| `RATE_LIMITED`         | 429  | 请求过于频繁。                     |
| `AI_PROVIDER_ERROR`    | 502  | 模型供应商错误。                   |
| `INTERNAL_ERROR`       | 500  | 服务端未知错误。                   |

## 9. 环境变量

| 变量                        | 说明                             |
| --------------------------- | -------------------------------- |
| `DATABASE_URL`              | PostgreSQL 连接串。              |
| `REDIS_URL`                 | Redis 连接串。                   |
| `APP_HTTP_URL`              | 后端公开访问地址。               |
| `WEB_HTTP_URL`              | 用户端地址，用于微信回调跳转。   |
| `ADMIN_HTTP_URL`            | 管理端地址。                     |
| `WECHAT_APP_ID`             | 微信开放平台网站应用 AppID。     |
| `WECHAT_APP_SECRET`         | 微信开放平台网站应用 AppSecret。 |
| `WECHAT_REDIRECT_URI`       | 微信登录回调地址。               |
| `SESSION_COOKIE_NAME`       | 用户端 session cookie 名。       |
| `ADMIN_SESSION_COOKIE_NAME` | 管理端 session cookie 名。       |

## 10. 外部文档

- 微信开放平台网站应用微信登录文档：`https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html`
- 微信登录流程要点：`scope=snsapi_login`、`redirect_uri` URL Encode、`state` 回调校验、用 `code` 换取 `access_token/openid/unionid`。
