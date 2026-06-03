# AetherCore 数据库结构文档

## 1. 通用约定

- 数据库：PostgreSQL。
- ORM：Drizzle ORM。
- 主键：默认使用 UUID 字段 `id`；当前仿真资源种子数据沿用源数据稳定字符串 ID，`grades.id` 使用自增整数。
- 时间：`timestamptz`。
- 软删除：业务规划表使用 `deleted_at`；当前已落库的 `users`、`sessions`、仿真资源表不含软删除字段。
- JSON 字段：使用 `jsonb` 保存模型配置、表单原始 payload、统计快照。
- 枚举可用 PostgreSQL enum 或 varchar + check；当前已落库表暂使用 `varchar` 承载 `users.role` 等状态字段。

## 2. 枚举

以下枚举是完整业务设计目标；当前 `packages/db` 已生成迁移中尚未创建 PostgreSQL enum，已落库表使用 `varchar`/`boolean` 字段表达角色和启用状态。

| 枚举                    | 值                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `user_status`           | `active`, `disabled`, `deleted`                                                                                     |
| `admin_status`          | `active`, `disabled`                                                                                                |
| `session_type`          | `user`, `admin`                                                                                                     |
| `agent_key`             | `chat`, `inspiration`, `comment`, `teaching`                                                                        |
| `agent_status`          | `enabled`, `disabled`                                                                                               |
| `conversation_category` | `chat`, `inspiration`, `comment`, `teaching`                                                                        |
| `message_role`          | `user`, `assistant`, `system`                                                                                       |
| `credit_reason`         | `chat`, `inspiration`, `comment_single`, `comment_batch_row`, `teaching`, `invite_reward`, `admin_adjust`, `refund` |
| `credit_direction`      | `in`, `out`                                                                                                         |
| `batch_job_status`      | `pending`, `running`, `completed`, `failed`, `cancelled`                                                            |
| `batch_row_status`      | `pending`, `generating`, `success`, `error`                                                                         |
| `activity_status`       | `draft`, `published`                                                                                                |
| `audit_actor_type`      | `admin`, `user`, `system`                                                                                           |

`agent_key` 与 `conversation_category` 的业务映射由 `packages/shared/src/types/agent-mapping.ts` 的 `WEB_AGENT_MAPPING` 维护，数据库 check 约束需要与该映射保持一致。

## 3. 用户与认证

### 3.1 `users`

当前 `apps/db-init` 已落库的 `users` 同时承载普通用户和管理员账号。管理员由 `seed-admin.ts` 写入，默认 `role='admin'`、`is_active=true`。微信登录用户写入 `users.role='user'`，并通过 `wechat_accounts` 保存微信身份映射。黑名单、额度等用户运营字段属于后续规划表，不在当前迁移中。

| 字段         | 类型         | 约束                     | 说明                                                          |
| ------------ | ------------ | ------------------------ | ------------------------------------------------------------- |
| `id`         | uuid         | pk                       | 用户 ID。                                                     |
| `username`   | varchar(64)  | unique, nullable         | 管理员登录用户名；默认来自 `ADMIN_USER`，未配置时为 `admin`。 |
| `email`      | varchar(255) | unique, not null         | 用户邮箱；管理员初始化未配置 `ADMIN_EMAIL` 时使用派生邮箱。   |
| `name`       | varchar(100) | nullable                 | 展示名。                                                      |
| `password`   | text         | not null                 | bcrypt hash 后的密码。                                        |
| `role`       | varchar(20)  | not null, default `user` | 用户角色；管理员为 `admin`。                                  |
| `is_active`  | boolean      | not null, default true   | 是否启用。                                                    |
| `created_at` | timestamptz  | not null                 | 创建时间。                                                    |
| `updated_at` | timestamptz  | not null                 | 更新时间。                                                    |

### 3.2 `wechat_accounts`

当前 `packages/db` 已创建该表，用于保存微信开放平台网站应用登录身份与站内用户的映射。

| 字段          | 类型         | 约束                  | 说明               |
| ------------- | ------------ | --------------------- | ------------------ |
| `id`          | uuid         | pk                    | ID。               |
| `user_id`     | uuid         | fk users.id, not null | 站内用户。         |
| `openid`      | varchar(128) | not null              | 网站应用 openid。  |
| `unionid`     | varchar(128) | nullable              | 开放平台 unionid。 |
| `nickname`    | varchar(100) | nullable              | 微信昵称。         |
| `avatar_url`  | text         | nullable              | 微信头像。         |
| `raw_profile` | jsonb        | nullable              | 微信返回原始资料。 |
| `created_at`  | timestamptz  | not null              | 创建时间。         |
| `updated_at`  | timestamptz  | not null              | 更新时间。         |

约束与索引：

- `uniq_wechat_openid(openid)`
- `uniq_wechat_unionid(unionid)` where `unionid is not null`
- `idx_wechat_user_id(user_id)`

### 3.3 `admin_users`

规划表，当前实现不单独建 `admin_users`；管理员账号复用 `users.role='admin'`。

| 字段            | 类型         | 约束                       | 说明        |
| --------------- | ------------ | -------------------------- | ----------- |
| `id`            | uuid         | pk                         | 管理员 ID。 |
| `username`      | varchar(64)  | unique, not null           | 登录名。    |
| `password_hash` | text         | not null                   | 密码 hash。 |
| `display_name`  | varchar(100) | nullable                   | 展示名。    |
| `status`        | admin_status | not null, default `active` | 状态。      |
| `last_login_at` | timestamptz  | nullable                   | 最近登录。  |
| `created_at`    | timestamptz  | not null                   | 创建时间。  |
| `updated_at`    | timestamptz  | not null                   | 更新时间。  |

### 3.4 `sessions`

当前 `sessions` 存储已登录用户的 session token，不区分用户端/管理端专表。管理端可通过关联 `users.role='admin'` 判断权限。

| 字段         | 类型         | 约束                  | 说明                |
| ------------ | ------------ | --------------------- | ------------------- |
| `id`         | uuid         | pk                    | Session ID。        |
| `user_id`    | uuid         | fk users.id, not null | 用户 ID，级联删除。 |
| `token`      | varchar(255) | unique, not null      | session token。     |
| `user_agent` | text         | nullable              | UA。                |
| `ip`         | varchar(45)  | nullable              | 登录 IP。           |
| `expires_at` | timestamptz  | not null              | 过期时间。          |
| `created_at` | timestamptz  | not null              | 创建时间。          |

## 4. 用户偏好与额度

### 4.1 `user_preferences`

| 字段         | 类型        | 约束            | 说明            |
| ------------ | ----------- | --------------- | --------------- |
| `user_id`    | uuid        | pk, fk users.id | 用户 ID。       |
| `grade`      | varchar(50) | nullable        | 默认年级/学段。 |
| `subject`    | varchar(50) | nullable        | 默认学科。      |
| `created_at` | timestamptz | not null        | 创建时间。      |
| `updated_at` | timestamptz | not null        | 更新时间。      |

### 4.2 `user_credit_accounts`

| 字段          | 类型        | 约束                  | 说明           |
| ------------- | ----------- | --------------------- | -------------- |
| `user_id`     | uuid        | pk, fk users.id       | 用户 ID。      |
| `balance`     | integer     | not null, default 0   | 当前可用额度。 |
| `cycle_limit` | integer     | not null, default 100 | 周期额度。     |
| `cycle_days`  | integer     | not null, default 180 | 周期天数。     |
| `reset_at`    | timestamptz | nullable              | 下次重置时间。 |
| `created_at`  | timestamptz | not null              | 创建时间。     |
| `updated_at`  | timestamptz | not null              | 更新时间。     |

### 4.3 `credit_transactions`

| 字段                  | 类型             | 约束                        | 说明           |
| --------------------- | ---------------- | --------------------------- | -------------- |
| `id`                  | uuid             | pk                          | 流水 ID。      |
| `user_id`             | uuid             | fk users.id, not null       | 用户 ID。      |
| `direction`           | credit_direction | not null                    | 入账或出账。   |
| `amount`              | integer          | not null                    | 数量。         |
| `reason`              | credit_reason    | not null                    | 原因。         |
| `idempotency_key`     | varchar(128)     | nullable                    | 幂等键。       |
| `related_type`        | varchar(64)      | nullable                    | 关联对象类型。 |
| `related_id`          | uuid             | nullable                    | 关联对象 ID。  |
| `balance_after`       | integer          | not null                    | 变更后余额。   |
| `created_by_admin_id` | uuid             | nullable, fk admin_users.id | 后台调整人。   |
| `created_at`          | timestamptz      | not null                    | 创建时间。     |

约束与索引：

- `uniq_credit_idempotency(user_id, idempotency_key)` where `idempotency_key is not null`
- `idx_credit_user_created(user_id, created_at desc)`

## 5. AI 配置

### 5.1 `model_engines`

| 字段                 | 类型         | 约束                        | 说明                                                             |
| -------------------- | ------------ | --------------------------- | ---------------------------------------------------------------- |
| `id`                 | uuid         | pk                          | 引擎 ID。                                                        |
| `name`               | varchar(100) | unique, not null            | 引擎名称。                                                       |
| `provider`           | varchar(50)  | not null                    | 内部供应商标识；管理端新增默认写入 `custom`，表示模型 API 调用。 |
| `api_base_url`       | text         | not null                    | API 地址。                                                       |
| `api_key_ciphertext` | text         | not null                    | 加密后的 API Key。                                               |
| `model_name`         | varchar(100) | nullable                    | 默认模型名。                                                     |
| `pricing`            | jsonb        | nullable                    | token 单价配置。                                                 |
| `status`             | varchar(20)  | not null, default `enabled` | 启用状态。                                                       |
| `created_at`         | timestamptz  | not null                    | 创建时间。                                                       |
| `updated_at`         | timestamptz  | not null                    | 更新时间。                                                       |
| `deleted_at`         | timestamptz  | nullable                    | 软删除。                                                         |

### 5.2 `ai_prompts`

| 字段                  | 类型         | 约束     | 说明                  |
| --------------------- | ------------ | -------- | --------------------- |
| `id`                  | uuid         | pk       | Prompt ID。           |
| `title`               | varchar(120) | not null | 标题。                |
| `version`             | varchar(50)  | not null | 版本号。              |
| `content`             | text         | not null | Markdown/纯文本内容。 |
| `created_by_admin_id` | uuid         | nullable | 创建人。              |
| `created_at`          | timestamptz  | not null | 创建时间。            |
| `updated_at`          | timestamptz  | not null | 更新时间。            |
| `deleted_at`          | timestamptz  | nullable | 软删除。              |

约束：

- `uniq_prompt_title_version(title, version)` where `deleted_at is null`

### 5.3 `sensitive_word_lists`

| 字段         | 类型         | 约束             | 说明         |
| ------------ | ------------ | ---------------- | ------------ |
| `id`         | uuid         | pk               | 词库 ID。    |
| `name`       | varchar(120) | unique, not null | 词库名。     |
| `words`      | text[]       | not null         | 敏感词数组。 |
| `created_at` | timestamptz  | not null         | 创建时间。   |
| `updated_at` | timestamptz  | not null         | 更新时间。   |
| `deleted_at` | timestamptz  | nullable         | 软删除。     |

### 5.4 `ai_agents`

| 字段                | 类型         | 约束                                 | 说明            |
| ------------------- | ------------ | ------------------------------------ | --------------- |
| `id`                | uuid         | pk                                   | 智能体 ID。     |
| `key`               | agent_key    | not null                             | 功能 key。      |
| `grade`             | varchar(50)  | nullable                             | 年级/学段分类。 |
| `subject`           | varchar(50)  | nullable                             | 学科分类。      |
| `name`              | varchar(120) | not null                             | 智能体名称。    |
| `engine_id`         | uuid         | fk model_engines.id, not null        | 模型引擎。      |
| `prompt_id`         | uuid         | fk ai_prompts.id, nullable           | 系统 Prompt。   |
| `sensitive_list_id` | uuid         | fk sensitive_word_lists.id, nullable | 敏感词库。      |
| `temperature`       | numeric(3,2) | not null, default 0.7                | 温度。          |
| `top_p`             | numeric(3,2) | not null, default 0.9                | topP。          |
| `max_tokens`        | integer      | not null, default 2000               | 最大 token。    |
| `status`            | agent_status | not null, default `enabled`          | 状态。          |
| `created_at`        | timestamptz  | not null                             | 创建时间。      |
| `updated_at`        | timestamptz  | not null                             | 更新时间。      |
| `deleted_at`        | timestamptz  | nullable                             | 软删除。        |

`key` 的可选值不在管理端本地硬编码；创建/编辑智能体时从共享 `WEB_AGENT_MAPPING` 读取，服务端 AI 调用也按该映射把用户端功能解析为管理端智能体配置。智能体允许同一个 `key` 下按业务分类创建多条配置：`inspiration`、`teaching` 必须同时填写 `grade` 和 `subject`，`comment` 必须填写 `grade` 且不填写 `subject`，`chat` 不填写分类字段。`comment`、`inspiration`、`teaching` 的管理端年级分类限定为 `小学`、`初中`；运行时将用户端细分年级归并到这两类后查询配置。

约束与索引：

- `uniq_ai_agents_key_grade_subject(key, coalesce(grade, ''), coalesce(subject, ''))`
- `idx_ai_agents_key_grade_subject(key, grade, subject)`

## 6. AI 会话与调用记录

### 6.1 `ai_conversations`

| 字段         | 类型                  | 约束                      | 说明                 |
| ------------ | --------------------- | ------------------------- | -------------------- |
| `id`         | uuid                  | pk                        | 会话 ID。            |
| `user_id`    | uuid                  | fk users.id, not null     | 用户 ID。            |
| `category`   | conversation_category | not null                  | 会话分类。           |
| `title`      | varchar(200)          | not null                  | 标题。               |
| `agent_id`   | uuid                  | fk ai_agents.id, nullable | 使用的智能体。       |
| `metadata`   | jsonb                 | nullable                  | 年级、学科等上下文。 |
| `is_deleted` | boolean               | not null, default false   | 内容审计软删除。     |
| `created_at` | timestamptz           | not null                  | 创建时间。           |
| `updated_at` | timestamptz           | not null                  | 更新时间。           |

`metadata.agentClassification` 保存首轮 AI 调用解析出的管理端智能体分类，例如 `{ key: "inspiration", grade: "小学", subject: "语文" }` 或 `{ key: "teaching", grade: "初中", subject: "数学" }`。后续追问使用该 metadata 继续匹配同一分类的智能体配置。

索引：

- `idx_ai_conversations_user_category_updated(user_id, category, updated_at desc)`
- `idx_ai_conversations_audit(category, created_at desc, is_deleted)`

### 6.2 `ai_messages`

| 字段              | 类型         | 约束                             | 说明                       |
| ----------------- | ------------ | -------------------------------- | -------------------------- |
| `id`              | uuid         | pk                               | 消息 ID。                  |
| `conversation_id` | uuid         | fk ai_conversations.id, not null | 会话 ID。                  |
| `role`            | message_role | not null                         | 角色。                     |
| `content`         | text         | not null                         | 消息内容。                 |
| `payload`         | jsonb        | nullable                         | 原始表单或模型结构化数据。 |
| `suggestions`     | text[]       | nullable                         | 追问建议。                 |
| `workflow_name`   | varchar(50)  | nullable                         | workflow 指令。            |
| `redirect_to`     | varchar(200) | nullable                         | 前端跳转路径。             |
| `created_at`      | timestamptz  | not null                         | 创建时间。                 |

索引：

- `idx_ai_messages_conversation_created(conversation_id, created_at)`

### 6.3 `ai_model_calls`

| 字段                | 类型          | 约束                             | 说明                      |
| ------------------- | ------------- | -------------------------------- | ------------------------- |
| `id`                | uuid          | pk                               | 调用 ID。                 |
| `conversation_id`   | uuid          | fk ai_conversations.id, nullable | 会话 ID。                 |
| `message_id`        | uuid          | fk ai_messages.id, nullable      | 生成出的 assistant 消息。 |
| `user_id`           | uuid          | fk users.id, nullable            | 用户 ID。                 |
| `agent_id`          | uuid          | fk ai_agents.id, nullable        | 智能体。                  |
| `engine_id`         | uuid          | fk model_engines.id, nullable    | 模型引擎。                |
| `model_name`        | varchar(100)  | nullable                         | 实际模型名。              |
| `prompt_tokens`     | integer       | nullable                         | 输入 token。              |
| `completion_tokens` | integer       | nullable                         | 输出 token。              |
| `total_tokens`      | integer       | nullable                         | 总 token。                |
| `latency_ms`        | integer       | nullable                         | 响应耗时。                |
| `cost_amount`       | numeric(12,6) | nullable                         | 估算费用。                |
| `currency`          | varchar(10)   | nullable                         | 币种。                    |
| `status`            | varchar(20)   | not null                         | `success` 或 `failed`。   |
| `error_code`        | varchar(100)  | nullable                         | 错误码。                  |
| `error_message`     | text          | nullable                         | 错误信息。                |
| `created_at`        | timestamptz   | not null                         | 创建时间。                |

索引：

- `idx_ai_model_calls_engine_created(engine_id, created_at desc)`
- `idx_ai_model_calls_user_created(user_id, created_at desc)`

## 7. 批量评语

### 7.1 `comment_batch_jobs`

| 字段            | 类型             | 约束                  | 说明         |
| --------------- | ---------------- | --------------------- | ------------ |
| `id`            | uuid             | pk                    | 任务 ID。    |
| `user_id`       | uuid             | fk users.id, not null | 创建用户。   |
| `status`        | batch_job_status | not null              | 任务状态。   |
| `file_name`     | varchar(255)     | not null              | 原文件名。   |
| `file_size`     | integer          | nullable              | 文件大小。   |
| `total_rows`    | integer          | not null              | 总行数。     |
| `success_rows`  | integer          | not null, default 0   | 成功行数。   |
| `failed_rows`   | integer          | not null, default 0   | 失败行数。   |
| `tone`          | varchar(50)      | nullable              | 语气。       |
| `error_message` | text             | nullable              | 任务级错误。 |
| `created_at`    | timestamptz      | not null              | 创建时间。   |
| `updated_at`    | timestamptz      | not null              | 更新时间。   |
| `completed_at`  | timestamptz      | nullable              | 完成时间。   |

### 7.2 `comment_batch_rows`

| 字段            | 类型             | 约束                               | 说明         |
| --------------- | ---------------- | ---------------------------------- | ------------ |
| `id`            | uuid             | pk                                 | 行 ID。      |
| `job_id`        | uuid             | fk comment_batch_jobs.id, not null | 任务 ID。    |
| `row_index`     | integer          | not null                           | Excel 行号。 |
| `nickname`      | varchar(100)     | nullable                           | 昵称。       |
| `gender`        | varchar(10)      | nullable                           | 性别。       |
| `grade`         | varchar(50)      | nullable                           | 年级。       |
| `tags`          | text[]           | nullable                           | 标签。       |
| `keywords`      | text             | nullable                           | 核心优缺点。 |
| `status`        | batch_row_status | not null                           | 行状态。     |
| `comments`      | text[]           | nullable                           | 生成结果。   |
| `error_message` | text             | nullable                           | 行错误。     |
| `message_id`    | uuid             | fk ai_messages.id, nullable        | 关联消息。   |
| `created_at`    | timestamptz      | not null                           | 创建时间。   |
| `updated_at`    | timestamptz      | not null                           | 更新时间。   |

约束：

- `uniq_batch_row(job_id, row_index)`

## 8. 仿真案例库

### 8.1 `simulation_categories`

当前表由 `apps/db-init/data.json` 的学科和二级分类展开生成。顶层学科也是一条分类记录，`parent_id=null`；二级分类的 `parent_id` 指向学科分类 ID。

| 字段         | 类型         | 约束                | 说明                                                                    |
| ------------ | ------------ | ------------------- | ----------------------------------------------------------------------- |
| `id`         | varchar(100) | pk                  | 分类 ID；学科使用学科名，二级分类使用 `${subjectName}-${category.id}`。 |
| `name`       | varchar(100) | not null            | 分类名。                                                                |
| `parent_id`  | varchar(100) | nullable            | 父分类；顶层学科为空。                                                  |
| `sort_order` | integer      | not null, default 0 | 排序。                                                                  |
| `created_at` | timestamptz  | not null            | 创建时间。                                                              |

### 8.2 `simulation_apps`

当前表保存可打开的仿真实验资源。`apps/db-init` 从 `data.json` 的三级节点生成应用记录，并用分类 ID + 源应用 ID 生成稳定主键，避免同名应用跨分类冲突。

| 字段                    | 类型         | 约束                                  | 说明                                      |
| ----------------------- | ------------ | ------------------------------------- | ----------------------------------------- |
| `id`                    | varchar(100) | pk                                    | 应用 ID；格式 `${categoryId}-${app.id}`。 |
| `name`                  | varchar(100) | not null                              | 实验名称。                                |
| `category_id`           | varchar(100) | fk simulation_categories.id, not null | 所属二级分类，级联删除。                  |
| `src`                   | text         | nullable                              | iframe/静态资源入口。                     |
| `thumbnail`             | varchar(500) | nullable                              | 缩略图路径。                              |
| `isable`                | boolean      | not null, default true                | 是否启用；沿用源数据字段名。              |
| `topics`                | jsonb        | nullable                              | 主题标签数组。                            |
| `sample_learning_goals` | jsonb        | nullable                              | 学习目标数组。                            |
| `created_at`            | timestamptz  | not null                              | 创建时间。                                |
| `updated_at`            | timestamptz  | not null                              | 更新时间。                                |

### 8.3 `grades`

当前表由 `apps/db-init/grade.json` 的年级 key 生成。

| 字段   | 类型        | 约束             | 说明                                          |
| ------ | ----------- | ---------------- | --------------------------------------------- |
| `id`   | serial      | pk               | 年级 ID。                                     |
| `name` | varchar(20) | unique, not null | 年级名称，如 `小学`、`中学`、`高中`、`大学`。 |

### 8.4 `grade_simulation_apps`

当前表由 `grade.json` 中的“年级 -> 实验名称列表”映射生成；同名实验如果存在于多个分类，会关联到所有匹配的 `simulation_apps.id`。

| 字段                | 类型         | 约束                      | 说明                    |
| ------------------- | ------------ | ------------------------- | ----------------------- |
| `grade_id`          | integer      | pk, fk grades.id          | 年级 ID，级联删除。     |
| `simulation_app_id` | varchar(100) | pk, fk simulation_apps.id | 仿真应用 ID，级联删除。 |

## 9. 运营与裂变

### 9.1 `activities`

| 字段                  | 类型            | 约束     | 说明           |
| --------------------- | --------------- | -------- | -------------- |
| `id`                  | uuid            | pk       | 活动/通告 ID。 |
| `title`               | varchar(200)    | not null | 标题。         |
| `content`             | text            | not null | 正文。         |
| `status`              | activity_status | not null | 草稿/发布。    |
| `published_at`        | timestamptz     | nullable | 发布时间。     |
| `created_by_admin_id` | uuid            | nullable | 创建人。       |
| `created_at`          | timestamptz     | not null | 创建时间。     |
| `updated_at`          | timestamptz     | not null | 更新时间。     |
| `deleted_at`          | timestamptz     | nullable | 软删除。       |

### 9.2 `invite_codes`

| 字段         | 类型        | 约束                  | 说明       |
| ------------ | ----------- | --------------------- | ---------- |
| `id`         | uuid        | pk                    | ID。       |
| `user_id`    | uuid        | fk users.id, not null | 邀请者。   |
| `code`       | varchar(32) | unique, not null      | 邀请码。   |
| `created_at` | timestamptz | not null              | 创建时间。 |

### 9.3 `invite_relations`

| 字段              | 类型        | 约束                         | 说明           |
| ----------------- | ----------- | ---------------------------- | -------------- |
| `id`              | uuid        | pk                           | ID。           |
| `inviter_user_id` | uuid        | fk users.id, not null        | 邀请者。       |
| `invitee_user_id` | uuid        | fk users.id, not null        | 受邀者。       |
| `invite_code_id`  | uuid        | fk invite_codes.id, nullable | 邀请码。       |
| `tier`            | integer     | not null, default 1          | 层级。         |
| `reward_granted`  | boolean     | not null, default false      | 是否已发奖励。 |
| `created_at`      | timestamptz | not null                     | 创建时间。     |

约束：

- `uniq_invitee(invitee_user_id)`

### 9.4 `fission_reward_config`

单行配置表。

| 字段                  | 类型        | 约束     | 说明               |
| --------------------- | ----------- | -------- | ------------------ |
| `id`                  | uuid        | pk       | ID。               |
| `inviter_quota`       | integer     | not null | 邀请者奖励额度。   |
| `invitee_quota`       | integer     | not null | 受邀者奖励额度。   |
| `enable_multi_tier`   | boolean     | not null | 是否开启二级奖励。 |
| `tier2_reward_pct`    | integer     | not null | 二级奖励比例。     |
| `is_active`           | boolean     | not null | 是否启用。         |
| `updated_by_admin_id` | uuid        | nullable | 更新人。           |
| `updated_at`          | timestamptz | not null | 更新时间。         |

## 10. 审计、监控与告警

### 10.1 `system_audit_logs`

| 字段            | 类型             | 约束     | 说明         |
| --------------- | ---------------- | -------- | ------------ |
| `id`            | uuid             | pk       | 日志 ID。    |
| `actor_type`    | audit_actor_type | not null | 操作者类型。 |
| `actor_id`      | uuid             | nullable | 操作者 ID。  |
| `action`        | varchar(100)     | not null | 操作。       |
| `resource_type` | varchar(100)     | nullable | 资源类型。   |
| `resource_id`   | uuid             | nullable | 资源 ID。    |
| `ip`            | varchar(45)      | nullable | IP。         |
| `user_agent`    | text             | nullable | UA。         |
| `metadata`      | jsonb            | nullable | 操作快照。   |
| `created_at`    | timestamptz      | not null | 创建时间。   |

索引：

- `idx_audit_created(created_at desc)`
- `idx_audit_actor(actor_type, actor_id, created_at desc)`

### 10.2 `alarm_config`

单行配置表。

| 字段                    | 类型          | 约束                    | 说明       |
| ----------------------- | ------------- | ----------------------- | ---------- |
| `id`                    | uuid          | pk                      | ID。       |
| `cost_threshold_amount` | numeric(12,2) | not null                | 费用阈值。 |
| `currency`              | varchar(10)   | not null, default `CNY` | 币种。     |
| `email`                 | varchar(255)  | not null                | 通知邮箱。 |
| `updated_by_admin_id`   | uuid          | nullable                | 更新人。   |
| `updated_at`            | timestamptz   | not null                | 更新时间。 |

### 10.3 `alarm_events`

| 字段           | 类型        | 约束     | 说明       |
| -------------- | ----------- | -------- | ---------- |
| `id`           | uuid        | pk       | 告警 ID。  |
| `type`         | varchar(50) | not null | 告警类型。 |
| `message`      | text        | not null | 告警内容。 |
| `metadata`     | jsonb       | nullable | 快照。     |
| `triggered_at` | timestamptz | not null | 触发时间。 |
| `resolved_at`  | timestamptz | nullable | 解决时间。 |

## 11. 初始化数据

`apps/db-init` 应初始化：

1. 执行 `packages/db/drizzle` 迁移；`--seed-only` 模式跳过迁移。
2. 默认管理员账号：写入 `users`，`username` 来自 `ADMIN_USER` 或默认 `admin`，`email` 来自 `ADMIN_EMAIL` 或默认 `admin@aethercore.local`，`password` 使用 bcrypt hash，默认密码 `admin@123`，`role='admin'`。
3. 默认用户端账号：写入 20 个 `role='user'` 的 `users` 账号。主账号 `username` 来自 `WEB_USER` 或默认 `teacher`，`email` 来自 `WEB_USER_EMAIL` 或默认 `teacher@aethercore.local`；其余账号为 `teacher01` 到 `teacher19`，邮箱为 `<username>@aethercore.local`。所有内置用户端账号密码使用 bcrypt hash，密码来自 `WEB_USER_PASSWORD` 或默认 `teacher123`。
4. 默认仿真分类与应用：从 `apps/db-init/data.json` 生成 `simulation_categories` 和 `simulation_apps`。
5. 默认年级与仿真映射：从 `apps/db-init/grade.json` 生成 `grades` 和 `grade_simulation_apps`。

当前 `db-init` 不初始化模型引擎、智能体、Prompt、敏感词库、裂变奖励或告警配置；这些仍是后续业务规划数据。

密钥类字段不得写入明文示例值到生产数据库；本地环境可用 `.env` 注入。
