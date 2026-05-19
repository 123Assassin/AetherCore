# AetherCore RESTful 接口文档

## 1. 通用约定

Base URL：`http://localhost:3000`

用户端：

- `/api/auth/**`
- `/api/me/**`
- `/api/ai/**`
- `/api/comments/**`
- `/api/simulations`
- `/api/activities`

管理端：

- `/api/admin/**`

认证：

- 用户端使用 HttpOnly Cookie：`aether_session`。
- 管理端使用 HttpOnly Cookie：`aether_admin_session`。
- 文件上传使用 `multipart/form-data`。
- AI 流式接口响应 `Content-Type: text/event-stream`。

统一 JSON 成功响应：

```json
{
  "data": {}
}
```

统一 JSON 错误响应：

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "参数错误",
    "details": {}
  }
}
```

分页响应：

```json
{
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100
    }
  }
}
```

## 2. 用户端 Auth

### 2.1 获取微信登录 URL

`GET /api/auth/wechat/login-url`

查询参数：

| 参数         | 必填 | 说明                                     |
| ------------ | ---- | ---------------------------------------- |
| `redirectTo` | 否   | 登录成功后的站内跳转路径，默认 `/chat`。 |

响应：

```json
{
  "data": {
    "loginUrl": "https://open.weixin.qq.com/connect/qrconnect?...",
    "state": "9f2d..."
  }
}
```

说明：

- 后端生成 `state` 并写入 Redis。
- 微信授权 URL 使用 `scope=snsapi_login`。
- `redirect_uri` 必须 URL Encode。

### 2.2 微信登录回调

`GET /api/auth/wechat/callback`

查询参数：

| 参数    | 必填 | 说明            |
| ------- | ---- | --------------- |
| `code`  | 是   | 微信授权 code。 |
| `state` | 是   | 登录 state。    |

行为：

- 校验 Redis 中的 state。
- 用 code 换取微信 `access_token/openid/unionid`。
- 查找或创建 `users` 与 `wechat_accounts`。
- 设置用户 session cookie。
- 302 跳转到 state 绑定的 `redirectTo`。

错误：

- `400 INVALID_WECHAT_STATE`
- `400 MISSING_WECHAT_CODE`
- `502 WECHAT_API_ERROR`

### 2.3 登出

`POST /api/auth/logout`

响应：

```json
{
  "data": {
    "success": true
  }
}
```

## 3. 用户端 Me

### 3.1 当前用户

`GET /api/me`

响应：

```json
{
  "data": {
    "id": "uuid",
    "displayName": "张老师",
    "avatarUrl": "https://...",
    "status": "active",
    "isBlacklisted": false,
    "createdAt": "2026-05-18T00:00:00.000Z"
  }
}
```

### 3.2 用户偏好

`GET /api/me/preferences`

响应：

```json
{
  "data": {
    "grade": "小学",
    "subject": "数学"
  }
}
```

`PATCH /api/me/preferences`

请求：

```json
{
  "grade": "初中",
  "subject": "物理"
}
```

响应：

```json
{
  "data": {
    "grade": "初中",
    "subject": "物理"
  }
}
```

### 3.3 用户额度

`GET /api/me/credits`

响应：

```json
{
  "data": {
    "credits": 96,
    "limit": 100,
    "resetAt": "2026-11-14T00:00:00.000Z",
    "cycleDays": 180
  }
}
```

`POST /api/me/credits/consume`

请求：

```json
{
  "reason": "chat",
  "idempotencyKey": "uuid-or-client-key"
}
```

响应：

```json
{
  "data": {
    "consumed": true,
    "credits": 95
  }
}
```

错误：

- `402 QUOTA_EXHAUSTED`
- `409 IDEMPOTENCY_KEY_REUSED`

## 4. 用户端 AI 会话历史

### 4.1 查询会话

`GET /api/me/sessions`

查询参数：

| 参数       | 必填 | 说明                                           |
| ---------- | ---- | ---------------------------------------------- |
| `category` | 否   | `chat`、`inspiration`、`comment`、`teaching`。 |
| `page`     | 否   | 页码。                                         |
| `pageSize` | 否   | 每页数量。                                     |

响应：

```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "勾股定理讲解",
        "category": "inspiration",
        "updatedAt": "2026-05-18T00:00:00.000Z",
        "messages": [
          {
            "id": "uuid",
            "role": "user",
            "content": "请讲解勾股定理",
            "createdAt": "2026-05-18T00:00:00.000Z"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1
    }
  }
}
```

### 4.2 创建会话

`POST /api/me/sessions`

请求：

```json
{
  "category": "chat",
  "title": "新的对话"
}
```

响应：

```json
{
  "data": {
    "id": "uuid",
    "category": "chat",
    "title": "新的对话"
  }
}
```

### 4.3 更新会话标题

`PATCH /api/me/sessions/{id}`

请求：

```json
{
  "title": "课堂导入问题"
}
```

响应：

```json
{
  "data": {
    "id": "uuid",
    "title": "课堂导入问题"
  }
}
```

### 4.4 删除会话

`DELETE /api/me/sessions/{id}`

响应：

```json
{
  "data": {
    "success": true
  }
}
```

## 5. AI 流式事件

所有 AI 长文本接口返回 SSE。每个事件使用 JSON 字符串作为 `data`。

事件示例：

```text
event: delta
data: {"type":"delta","content":"第一段内容"}

event: done
data: {"type":"done","messageId":"uuid"}
```

事件类型：

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

## 6. 用户端 AI 功能

### 6.1 通用 AI 助手

`POST /api/ai/chat`

请求：

```json
{
  "sessionId": "uuid",
  "messages": [
    {
      "role": "user",
      "content": "怎么设计一节导入课？"
    }
  ],
  "input": "帮我设计初中物理浮力导入"
}
```

响应：`text/event-stream`

可能的 workflow：

| workflowName  | redirectTo            |
| ------------- | --------------------- |
| `comment`     | `/office/comment`     |
| `inspiration` | `/lesson/inspiration` |
| `teaching`    | `/office/teaching`    |

错误：

- `400 EMPTY_INPUT`
- `401 UNAUTHORIZED`
- `402 QUOTA_EXHAUSTED`
- `429 RATE_LIMITED`
- `502 AI_PROVIDER_ERROR`

### 6.2 知识精讲生成

`POST /api/ai/inspiration`

请求：

```json
{
  "sessionId": "uuid",
  "grade": "初中",
  "subject": "数学",
  "topic": "勾股定理",
  "context": "学生基础较弱，喜欢生活化例子"
}
```

响应：`text/event-stream`

错误：

- `400 EMPTY_TOPIC`
- `400 FIELD_TOO_LONG`
- `402 QUOTA_EXHAUSTED`
- `502 AI_PROVIDER_ERROR`

### 6.3 知识精讲追问

`POST /api/ai/inspiration/follow-up`

请求：

```json
{
  "sessionId": "uuid",
  "message": "换成小学高年级能理解的表达"
}
```

响应：`text/event-stream`

错误：

- `400 EMPTY_MESSAGE`
- `404 SESSION_NOT_FOUND`
- `409 SESSION_CONTEXT_MISSING`

### 6.4 单人评语生成

`POST /api/ai/comments/single`

请求：

```json
{
  "sessionId": "uuid",
  "nickname": "小林",
  "gender": "男",
  "grade": "三年级",
  "tags": ["认真", "乐于助人"],
  "keywords": "数学进步明显，但书写需要加强",
  "tone": "温和鼓励"
}
```

响应：

```json
{
  "data": {
    "sessionId": "uuid",
    "comments": [
      "你这学期在数学学习中有了明显进步...",
      "课堂上的你越来越专注...",
      "你能主动帮助同学..."
    ],
    "messages": [
      {
        "id": "uuid",
        "role": "user",
        "content": "为小林生成评语",
        "createdAt": "2026-05-18T00:00:00.000Z"
      },
      {
        "id": "uuid",
        "role": "assistant",
        "content": "评语结果...",
        "createdAt": "2026-05-18T00:00:00.000Z"
      }
    ],
    "credit": {
      "remaining": 95
    }
  }
}
```

错误：

- `400 INVALID_GENDER`
- `402 QUOTA_EXHAUSTED`
- `422 AI_RESULT_PARSE_FAILED`
- `502 AI_PROVIDER_ERROR`

### 6.5 题目变身生成

`POST /api/ai/teaching`

请求：

```json
{
  "sessionId": "uuid",
  "inputType": "variant",
  "subject": "数学",
  "grade": "初中",
  "transformationLevel": "中等变式",
  "content": "已知直角三角形两直角边为 3 和 4，求斜边。"
}
```

响应：`text/event-stream`

错误：

- `400 EMPTY_CONTENT`
- `400 INVALID_INPUT_TYPE`
- `400 INVALID_LEVEL`
- `402 QUOTA_EXHAUSTED`
- `502 AI_PROVIDER_ERROR`

### 6.6 题目变身追问

`POST /api/ai/teaching/follow-up`

请求：

```json
{
  "sessionId": "uuid",
  "message": "再增加一道开放性题目"
}
```

响应：`text/event-stream`

## 7. 批量评语

### 7.1 下载 Excel 模板

`GET /api/comments/batch-template`

响应：

- `200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- 文件名：`红笔AI_批量评语模板.xlsx`

### 7.2 上传并创建任务

`POST /api/comments/batch-jobs`

请求：`multipart/form-data`

| 字段   | 必填 | 说明                    |
| ------ | ---- | ----------------------- |
| `file` | 是   | `.xlsx` 或 `.xls`。     |
| `tone` | 否   | 语气，默认 `温和鼓励`。 |

响应：

```json
{
  "data": {
    "jobId": "uuid",
    "totalRows": 30,
    "estimatedCredits": 30,
    "columns": ["昵称", "性别", "年级", "表现标签", "核心优缺点"],
    "status": "pending"
  }
}
```

错误：

- `400 INVALID_FILE_TYPE`
- `400 FILE_TOO_LARGE`
- `422 INVALID_EXCEL_HEADER`
- `402 QUOTA_EXHAUSTED`

### 7.3 查询任务

`GET /api/comments/batch-jobs/{jobId}`

响应：

```json
{
  "data": {
    "jobId": "uuid",
    "status": "running",
    "totalRows": 2,
    "successRows": 1,
    "failedRows": 0,
    "rows": [
      {
        "id": "uuid",
        "rowIndex": 2,
        "nickname": "小林",
        "gender": "男",
        "grade": "三年级",
        "tags": ["认真"],
        "keywords": "进步明显",
        "status": "success",
        "comments": ["评语一", "评语二", "评语三"]
      }
    ]
  }
}
```

### 7.4 生成单行

`POST /api/comments/batch-jobs/{jobId}/rows/{rowId}/generate`

响应：

```json
{
  "data": {
    "rowId": "uuid",
    "status": "success",
    "comments": ["评语一", "评语二", "评语三"],
    "credit": {
      "remaining": 94
    }
  }
}
```

### 7.5 生成全部

`POST /api/comments/batch-jobs/{jobId}/generate-all`

响应：

```json
{
  "data": {
    "jobId": "uuid",
    "status": "running"
  }
}
```

### 7.6 导出结果

`GET /api/comments/batch-jobs/{jobId}/export`

响应：

- `200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- 文件名：`红笔AI_批量评语生成结果_YYYY-MM-DD.xlsx`

错误：

- `404 JOB_NOT_FOUND`
- `409 JOB_NOT_COMPLETED`

## 8. 用户端互动实验

### 8.1 查询实验列表

`GET /api/simulations`

查询参数：

| 参数          | 必填 | 说明                                       |
| ------------- | ---- | ------------------------------------------ |
| `subjects`    | 否   | 逗号分隔的顶层学科分类名，如 `物理,数学`。 |
| `categoryIds` | 否   | 逗号分隔的二级分类 ID。                    |
| `grades`      | 否   | 逗号分隔的年级名，如 `小学,中学`。         |
| `q`           | 否   | 搜索实验名称、主题标签和学习目标。         |

响应：

```json
{
  "data": {
    "items": [
      {
        "id": "物理-motion-energy-skate-park",
        "name": "能量滑板竞技场",
        "subject": "物理",
        "category": {
          "id": "物理-motion",
          "name": "运动"
        },
        "grades": ["中学", "高中"],
        "thumbnail": "energy-skate-park.png",
        "src": "energy-skate-park_en.html",
        "isable": true,
        "topics": ["能量守恒", "动能"],
        "sampleLearningGoals": ["通过运用动能和重力势能来解释能量守恒定律的概念。"]
      }
    ],
    "facets": {
      "subjects": [
        {
          "name": "物理",
          "categories": [
            {
              "id": "物理-motion",
              "name": "运动"
            }
          ]
        }
      ],
      "grades": ["小学", "中学", "高中", "大学"]
    }
  }
}
```

## 9. 用户端活动

### 9.1 查询已发布活动/通告

`GET /api/activities`

响应：

```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "新功能上线",
        "content": "互动实验已开放",
        "publishedAt": "2026-05-18T00:00:00.000Z"
      }
    ]
  }
}
```

## 10. 管理端 Auth

### 10.1 登录

`POST /api/admin/auth/login`

请求：

```json
{
  "username": "admin",
  "password": "password"
}
```

响应：

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "username": "admin",
      "displayName": "管理员"
    }
  }
}
```

### 10.2 登出

`POST /api/admin/auth/logout`

响应：

```json
{
  "data": {
    "success": true
  }
}
```

### 10.3 当前管理会话

`GET /api/admin/auth/session`

响应：

```json
{
  "data": {
    "authenticated": true,
    "user": {
      "id": "uuid",
      "username": "admin"
    }
  }
}
```

## 11. 管理端 Dashboard

### 11.1 总览

`GET /api/admin/dashboard/overview`

响应：

```json
{
  "data": {
    "pv": 124500,
    "uv": 45200,
    "activeNow": 342,
    "avgDurationSeconds": 272,
    "tokenToday": 4200000,
    "trafficSources": [
      {
        "source": "直接访问",
        "ratio": 45
      }
    ]
  }
}
```

## 12. 管理端 AI 资源

### 12.1 智能体

`GET /api/admin/agents`

查询参数：`q`、`status`、`engineId`、`page`、`pageSize`。

响应 item：

```json
{
  "id": "uuid",
  "key": "comment",
  "name": "智能评语助手",
  "engineId": "uuid",
  "promptId": "uuid",
  "sensitiveListId": "uuid",
  "config": {
    "temperature": 0.7,
    "topP": 0.9,
    "maxTokens": 2000
  },
  "status": "enabled",
  "updatedAt": "2026-05-18T00:00:00.000Z"
}
```

`POST /api/admin/agents`

请求：

```json
{
  "key": "comment",
  "name": "智能评语助手",
  "engineId": "uuid",
  "promptId": "uuid",
  "sensitiveListId": "uuid",
  "config": {
    "temperature": 0.7,
    "topP": 0.9,
    "maxTokens": 2000
  },
  "status": "enabled"
}
```

`PUT /api/admin/agents/{id}`：全量更新，body 同创建。

`DELETE /api/admin/agents/{id}`：删除或软删除。

错误：

- `404 ENGINE_NOT_FOUND`
- `404 PROMPT_NOT_FOUND`
- `404 SENSITIVE_LIST_NOT_FOUND`
- `409 AGENT_KEY_EXISTS`
- `409 RESOURCE_IN_USE`

### 12.2 Prompt

`GET /api/admin/prompts`

查询参数：`q`、`page`、`pageSize`。

`POST /api/admin/prompts`

请求：

```json
{
  "title": "教师评语",
  "version": "v1.0",
  "content": "## 角色\n你是专业教师..."
}
```

`PUT /api/admin/prompts/{id}`：更新 Prompt。

`DELETE /api/admin/prompts/{id}`：删除 Prompt；被智能体引用返回 `409`。

### 12.3 敏感词库

`GET /api/admin/sensitive-word-lists`

`POST /api/admin/sensitive-word-lists`

请求：

```json
{
  "name": "默认屏蔽字库",
  "words": ["暴力", "色情", "攻击"]
}
```

`PUT /api/admin/sensitive-word-lists/{id}`：更新词库。

`DELETE /api/admin/sensitive-word-lists/{id}`：删除词库；被智能体引用返回 `409`。

### 12.4 模型引擎

`GET /api/admin/engines`

响应 item：

```json
{
  "id": "uuid",
  "name": "OpenAI GPT",
  "provider": "openai",
  "apiBaseUrl": "https://api.openai.com/v1",
  "apiKeyMasked": "sk-********",
  "modelName": "gpt-4.1",
  "status": "enabled",
  "createdAt": "2026-05-18T00:00:00.000Z"
}
```

`POST /api/admin/engines`

请求：

```json
{
  "name": "OpenAI GPT",
  "provider": "openai",
  "apiBaseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-...",
  "modelName": "gpt-4.1"
}
```

`PUT /api/admin/engines/{id}`：更新引擎。`apiKey` 不传则保留原密钥。

`DELETE /api/admin/engines/{id}`：删除引擎；被智能体引用返回 `409`。

## 13. 管理端仿真案例库

### 13.1 查询案例

`GET /api/admin/simulations`

查询参数：`subject`、`categoryId`、`grade`、`isable`、`q`、`page`、`pageSize`。

响应 item：

```json
{
  "id": "物理-motion-energy-skate-park",
  "name": "能量滑板竞技场",
  "subject": "物理",
  "category": {
    "id": "物理-motion",
    "name": "运动"
  },
  "grades": ["中学", "高中"],
  "thumbnail": "energy-skate-park.png",
  "src": "energy-skate-park_en.html",
  "isable": true,
  "topics": ["能量守恒", "动能"],
  "sampleLearningGoals": ["通过运用动能和重力势能来解释能量守恒定律的概念。"],
  "createdAt": "2026-05-18T00:00:00.000Z",
  "updatedAt": "2026-05-18T00:00:00.000Z"
}
```

### 13.2 筛选项

`GET /api/admin/simulations/filters`

响应：

```json
{
  "data": {
    "subjects": ["物理", "数学", "化学"],
    "grades": ["小学", "中学", "高中", "大学"],
    "categories": [
      {
        "id": "物理-motion",
        "name": "运动",
        "subject": "物理"
      }
    ]
  }
}
```

### 13.3 新增案例

`POST /api/admin/simulations`

请求：

```json
{
  "name": "能量滑板竞技场",
  "categoryId": "物理-motion",
  "grades": ["中学", "高中"],
  "thumbnail": "energy-skate-park.png",
  "src": "energy-skate-park_en.html",
  "isable": true,
  "topics": ["能量守恒", "动能"],
  "sampleLearningGoals": ["通过运用动能和重力势能来解释能量守恒定律的概念。"]
}
```

### 13.4 更新案例

`PUT /api/admin/simulations/{id}`

body 同新增。

### 13.5 启停案例

`PATCH /api/admin/simulations/{id}/isable`

请求：

```json
{
  "isable": false
}
```

### 13.6 删除案例

`DELETE /api/admin/simulations/{id}`

软删除。

## 14. 管理端用户

### 14.1 用户列表

`GET /api/admin/users`

查询参数：`q`、`status`、`isBlacklisted`、`page`、`pageSize`。

响应 item：

```json
{
  "id": "uuid",
  "displayName": "张老师",
  "status": "active",
  "isBlacklisted": false,
  "credits": 95,
  "totalQuota": 100,
  "lastLoginAt": "2026-05-18T00:00:00.000Z",
  "createdAt": "2026-05-18T00:00:00.000Z"
}
```

### 14.2 切换状态

`PATCH /api/admin/users/{id}/status`

请求：

```json
{
  "status": "disabled"
}
```

### 14.3 黑名单

`PATCH /api/admin/users/{id}/blacklist`

请求：

```json
{
  "isBlacklisted": true
}
```

### 14.4 删除用户

`DELETE /api/admin/users/{id}`

软删除用户。

### 14.5 用户活动

`GET /api/admin/users/{id}/activity`

响应包含最近登录、AI 调用、额度流水和会话摘要。

### 14.6 邀请用户

`POST /api/admin/users/invitations`

请求：

```json
{
  "email": "teacher@example.com",
  "totalQuota": 100
}
```

第一阶段可只记录邀请，不发送邮件。

## 15. 管理端运营

### 15.1 活动与通告

`GET /api/admin/activities`

查询参数：`status`、`page`、`pageSize`。

`POST /api/admin/activities`

请求：

```json
{
  "title": "新功能上线",
  "content": "互动实验已开放",
  "status": "published"
}
```

`PUT /api/admin/activities/{id}`：更新。

`DELETE /api/admin/activities/{id}`：软删除。

### 15.2 邀请树

`GET /api/admin/fission/invite-tree`

响应：

```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "inviteCode": "NEXUS-7A2B",
      "totalInvited": 12,
      "rewardEarned": 6000,
      "children": []
    }
  ]
}
```

### 15.3 奖励配置

`GET /api/admin/fission/reward-config`

`PUT /api/admin/fission/reward-config`

请求：

```json
{
  "inviterQuota": 500,
  "inviteeQuota": 100,
  "enableMultiTier": true,
  "tier2RewardPct": 10,
  "isActive": true
}
```

## 16. 管理端审计与监控

### 16.1 系统审计日志

`GET /api/admin/audit/system-logs`

查询参数：`startDate`、`endDate`、`action`、`actorId`、`page`、`pageSize`。

`GET /api/admin/audit/system-logs/export`

查询参数：`startDate`、`endDate`。

响应：

- `200 text/csv`
- 文件名：`system-audit-YYYY-MM-DD.csv`

### 16.2 AI 内容审计

`GET /api/admin/audit/content-sessions`

查询参数：`startDate`、`endDate`、`userId`、`category`、`isDeleted`、`page`、`pageSize`。

响应 item：

```json
{
  "id": "uuid",
  "userId": "uuid",
  "userName": "张老师",
  "category": "chat",
  "title": "课堂导入",
  "messageCount": 6,
  "isDeleted": false,
  "createdAt": "2026-05-18T00:00:00.000Z",
  "updatedAt": "2026-05-18T00:00:00.000Z"
}
```

`GET /api/admin/audit/content-sessions/{id}`

返回会话详情和消息列表。

`DELETE /api/admin/audit/content-sessions/{id}`

软删除，响应：

```json
{
  "data": {
    "id": "uuid",
    "isDeleted": true
  }
}
```

`GET /api/admin/audit/content-sessions/export`

响应 CSV。

### 16.3 流量监控

`GET /api/admin/traffic/engines`

查询参数：`startDate`、`endDate`。

响应：

```json
{
  "data": {
    "items": [
      {
        "engineId": "uuid",
        "engine": "OpenAI GPT",
        "tokensTotal": 4200000,
        "avgResponseMs": 1280,
        "costAmount": 320.5,
        "currency": "CNY",
        "successRate": 0.992
      }
    ]
  }
}
```

## 17. 管理端告警与设置

### 17.1 告警配置

`GET /api/admin/alarm/config`

响应：

```json
{
  "data": {
    "threshold": 1000,
    "currency": "CNY",
    "email": "ops@example.com"
  }
}
```

`PUT /api/admin/alarm/config`

请求：

```json
{
  "threshold": 1000,
  "email": "ops@example.com"
}
```

### 17.2 修改管理员密码

`PUT /api/admin/settings/password`

请求：

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password"
}
```

响应：

```json
{
  "data": {
    "success": true
  }
}
```

错误：

- `400 WEAK_PASSWORD`
- `401 CURRENT_PASSWORD_INCORRECT`

## 18. 状态码汇总

| HTTP | code                   | 说明                             |
| ---- | ---------------------- | -------------------------------- |
| 400  | `BAD_REQUEST`          | 参数错误。                       |
| 401  | `UNAUTHORIZED`         | 未登录。                         |
| 402  | `QUOTA_EXHAUSTED`      | 额度不足。                       |
| 403  | `FORBIDDEN`            | 无权限、账号停用或黑名单。       |
| 404  | `NOT_FOUND`            | 资源不存在。                     |
| 409  | `CONFLICT`             | 重复、资源被引用、任务状态冲突。 |
| 422  | `UNPROCESSABLE_ENTITY` | Excel 或 AI 结构化结果无法解析。 |
| 429  | `RATE_LIMITED`         | 频率限制。                       |
| 500  | `INTERNAL_ERROR`       | 服务端错误。                     |
| 502  | `AI_PROVIDER_ERROR`    | 模型或微信等外部服务错误。       |
