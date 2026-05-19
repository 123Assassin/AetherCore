# 迁移执行索引

本索引用于后续迁移任务的基线核对。当前执行依据为 `docs/migration/**` 与
`docs/AetherCore规范.md`，不从缺失的源码参考目录推断功能。

## 基线核对

- `source_web`：不存在。已执行 `test -d source_web`，退出码为 `1`。
- `source_admin`：不存在。已执行 `test -d source_admin`，退出码为 `1`。
- 按计划顺序执行 `test -d source_web; test -d source_admin`，最终退出码为 `1`；
  实际可用性以以上两个单独检查为准。
- 因 `source_web` 和 `source_admin` 均缺失，迁移分析以
  `docs/migration/web/spec.md`、`docs/migration/admin/spec.md`、
  `docs/migration/api/backend-design.md`、`docs/migration/api/database-schema.md`
  为事实来源。
- `docker-compose.yml` 已存在，并包含 PostgreSQL、Redis、pgAdmin
  (`pgadmin` service) 以及 `profiles: ['app']` 下的 `db-init`、`server`、`web`、
  `admin` 服务。

## 执行决策

- 用户端页面和公开/教师工作流迁移到 `apps/web`。
- 管理端、运营端、安全审计和内部配置页面迁移到 `apps/admin`。
- 统一后端能力由 `apps/server` 承载，公共类型、tRPC client/provider/caller、
  数据库、认证和共享工具分别落在现有 `packages/*` 边界内。
- tRPC-over-REST decision：以 AetherCore 工程规范为准，前后端集成使用
  tRPC 和 `packages/api` 的类型化调用。`docs/migration/api/backend-design.md`
  中的 RESTful API 路径只作为旧接口语义和业务边界参考，迁移实现应映射为
  tRPC router/procedure；仅在文件下载、外部回调或明确要求 REST/SSE 的场景保留
  HTTP 端点。

## 用户端业务域

| 业务域                                                                     | 来源                         | 目标       |
| -------------------------------------------------------------------------- | ---------------------------- | ---------- |
| 全局应用框架：主导航、二级页签、顶部栏、历史侧栏、登录/赞助弹窗、额度展示  | `docs/migration/web/spec.md` | `apps/web` |
| AI 助手：通用教学对话、追问建议、workflow 跳转指令                         | `docs/migration/web/spec.md` | `apps/web` |
| 备课精讲 - 知识精讲：年级、学科、知识点、学情生成精讲设计                  | `docs/migration/web/spec.md` | `apps/web` |
| 备课精讲 - 互动实验：科目/分类/年级筛选、搜索、PhET iframe 全屏演示        | `docs/migration/web/spec.md` | `apps/web` |
| 办公提效 - 评语助手：单人评语生成、复制、结果卡片                          | `docs/migration/web/spec.md` | `apps/web` |
| 办公提效 - 批量评语：Excel 上传、模板下载、批量生成、结果导出              | `docs/migration/web/spec.md` | `apps/web` |
| 办公提效 - 题目变身：原题变式、知识点出题、追问微调                        | `docs/migration/web/spec.md` | `apps/web` |
| 用户登录入口：当前模拟微信扫码，迁移为服务端 session/OAuth 流程            | `docs/migration/web/spec.md` | `apps/web` |
| 用户偏好、额度和历史会话：年级/学科偏好、AI 额度、聊天历史                 | `docs/migration/web/spec.md` | `apps/web` |
| 赞助、广告等待和导出前等待：`DonateModal`、`ExportAdModal`、`AdLoadingBot` | `docs/migration/web/spec.md` | `apps/web` |

## 管理端业务域

| 业务域         | 路由                         | 来源                           | 目标         |
| -------------- | ---------------------------- | ------------------------------ | ------------ |
| 管理员登录     | `/login`                     | `docs/migration/admin/spec.md` | `apps/admin` |
| 数据看板       | `/dashboard`                 | `docs/migration/admin/spec.md` | `apps/admin` |
| 智能体管理     | `/resources/agents`          | `docs/migration/admin/spec.md` | `apps/admin` |
| AI Prompt 管理 | `/resources/prompts`         | `docs/migration/admin/spec.md` | `apps/admin` |
| 敏感词库管理   | `/resources/sensitive-words` | `docs/migration/admin/spec.md` | `apps/admin` |
| 仿真案例库管理 | `/simulations`               | `docs/migration/admin/spec.md` | `apps/admin` |
| 引擎调度中心   | `/engine-dispatch`           | `docs/migration/admin/spec.md` | `apps/admin` |
| 用户管理       | `/users`                     | `docs/migration/admin/spec.md` | `apps/admin` |
| 活动与通告管理 | `/operations/activities`     | `docs/migration/admin/spec.md` | `apps/admin` |
| 裂变管理       | `/operations/fission`        | `docs/migration/admin/spec.md` | `apps/admin` |
| 系统审计日志   | `/security/system-audit`     | `docs/migration/admin/spec.md` | `apps/admin` |
| AI 内容审计    | `/security/content-audit`    | `docs/migration/admin/spec.md` | `apps/admin` |
| 流量监控       | `/security/traffic-monitor`  | `docs/migration/admin/spec.md` | `apps/admin` |
| 消息告警中心   | `/alarm`                     | `docs/migration/admin/spec.md` | `apps/admin` |
| 系统设置       | `/settings`                  | `docs/migration/admin/spec.md` | `apps/admin` |

## 后端与数据业务边界

| 业务边界            | 覆盖内容                                                                        | 目标                                          |
| ------------------- | ------------------------------------------------------------------------------- | --------------------------------------------- |
| Auth/session        | 微信扫码登录、管理员登录、用户 session、admin session、Redis key                | `apps/server`, `packages/auth`, `packages/db` |
| User/Profile/Credit | 用户状态、黑名单、偏好、额度账户、额度流水、邀请奖励、后台调整                  | `apps/server`, `packages/db`                  |
| AI 资源配置         | 模型引擎、Prompt、敏感词库、智能体配置                                          | `apps/server`, `packages/db`                  |
| AI 会话与生成       | `chat`、`inspiration`、`comment`、`teaching` 会话、消息、模型调用记录、流式输出 | `apps/server`, `packages/db`                  |
| 批量评语            | Excel 解析、批量任务、行状态、结果导出                                          | `apps/server`, `packages/db`                  |
| 仿真案例库          | 仿真分类、仿真应用、年级、年级与应用映射                                        | `apps/server`, `packages/db`, `apps/db-init`  |
| 运营与裂变          | 活动通告、邀请码、邀请关系、奖励配置                                            | `apps/server`, `packages/db`                  |
| 审计、监控与告警    | 系统审计、AI 内容审计、模型调用统计、费用告警配置和事件                         | `apps/server`, `packages/db`                  |

## 后续执行约束

- 不假设 `source_web` 或 `source_admin` 可读；若目录后续出现，需要重新执行基线核对。
- 不把用户端页面放入 `apps/admin`，不把管理/内部页面放入 `apps/web`。
- 不把旧前端的浏览器内 AI key、Gemini 调用、Excel 解析或本地额度逻辑原样迁移；
  这些能力应通过后端 tRPC 能力实现。
- `docker-compose.yml` 中已有 pgAdmin，不需要为本迁移另建 pgAdmin 文档或服务。
