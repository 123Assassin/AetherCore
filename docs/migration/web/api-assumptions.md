# API 假设与数据来源

当前旧前端直接调用 Gemini，并把历史、偏好、额度存到 localStorage。严格来说，项目现在没有自有后端接口。

迁移目标下，前端不再安装 `@google/genai`、不感知具体模型、不拼装 prompt。前端只把输入、文件和会话信息发给后端；后端负责 prompt 拼装、模型调用、结构化解析、额度扣减、Excel 解析和导出。AI 文本类接口优先以流式响应返回，前端使用 `@ant-design/x` 进行流式渲染。

用户端 AI 功能与管理端智能体配置通过共享映射配对，映射常量位于 `packages/shared/src/types/agent-mapping.ts`：

| 用户端功能 | category      | 管理端 agent key |
| ---------- | ------------- | ---------------- |
| AI 助手    | `chat`        | `chat`           |
| 知识精讲   | `inspiration` | `inspiration`    |
| 学生评语   | `comment`     | `comment`        |
| 题目变身   | `teaching`    | `teaching`       |

前端不传任意 agent key。后端收到 `chat`、`inspiration`、`comment`、`teaching` 请求后，先从该映射取管理端 key，再查询数据库中的智能体、模型引擎、Prompt 和敏感词库配置，最后调用模型 API。

前端依赖调整：

- 移除：`@google/genai`
- 移除：`react-markdown`
- 移除：`xlsx`
- 新增：`@ant-design/x`
- 新增：`@fontsource/inter`
- 不迁移：`vite.config.ts`

## 流式响应约定

AI 对话、知识精讲、题目变身等长文本接口建议返回 `text/event-stream` 或兼容 ReadableStream 的分块响应。

建议事件：

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

前端职责：

- 将 `delta.content` 追加到当前 assistant 消息。
- 将 streaming 状态传给 Ant Design X `Bubble` 等组件。
- 收到 `done` 后固化消息。
- 收到 `workflow` 后执行路由跳转。
- 不解析模型原始 tool/function call。

## 当前前端需要的后端接口

### 1. 通用聊天

`POST /api/ai/chat`

用途：替代 `ChatAssistant.tsx` 中的前端 Gemini 调用。后端拼装 prompt、调用模型，并流式返回。

请求参数：

```ts
{
  sessionId?: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  input: string;
}
```

响应结构：`text/event-stream`，事件参考“流式响应约定”。

最终完成后，服务端应能持久化或返回等价结果：

```ts
{
  message: {
    id: string;
    role: "assistant";
    content: string;
    suggestions?: string[];
    createdAt: string;
  };
  toolCall?: {
    name: "openWorkflow";
    args: {
      workflowName: "comment" | "inspiration" | "teaching";
    };
    redirectTo: "/office/comment" | "/lesson/inspiration" | "/office/teaching";
  };
  credit: {
    remaining: number;
  };
}
```

错误状态：

- `400`：输入为空或消息格式非法。
- `401`：需要登录时未认证。
- `402`：额度不足且未完成广告/赞助解锁。
- `429`：调用过于频繁。
- `502`：后端 AI 服务或模型供应商错误。

当前来源：

- 旧版 Gemini 调用在浏览器中直接执行。
- 旧版 prompt、function declaration、suggestions 分隔符解析都在前端硬编码。
- 迁移后这些逻辑全部属于后端。
- 历史消息来自 `localStorage.chatHistory`。

### 2. 知识精讲生成

`POST /api/ai/inspiration`

用途：替代 `InspirationLibrary.tsx` 中的浏览器内 AI chat 调用。

请求参数：

```ts
{
  sessionId?: string;
  grade: string;
  subject: string;
  topic: string;
  context?: string;
}
```

响应结构：`text/event-stream`，事件参考“流式响应约定”。

最终完成后，服务端应能持久化或返回等价结果：

```ts
{
  sessionId: string;
  messages: [
    {
      id: string;
      role: "user";
      content: string;
      createdAt: string;
    },
    {
      id: string;
      role: "assistant";
      content: string;
      createdAt: string;
    }
  ];
  credit: {
    remaining: number;
  };
}
```

错误状态：

- `400`：`topic` 为空，或字段超长。
- `401`：需要登录时未认证。
- `402`：额度不足。
- `429`：频率限制。
- `502`：后端 AI 服务或模型供应商错误。

当前来源：

- `grade`、`subject` 来自 localStorage 偏好。
- `topic`、`context` 来自页面局部状态。
- prompt 硬编码在页面组件。
- 图片链接或富内容由后端 prompt/响应策略决定，前端只渲染返回内容。

### 3. 知识精讲追问

`POST /api/ai/inspiration/follow-up`

请求参数：

```ts
{
  sessionId: string;
  message: string;
}
```

响应结构：

```ts
{
  message: {
    id: string;
    role: 'assistant';
    content: string;
    createdAt: string;
  }
  credit: {
    remaining: number;
  }
}
```

错误状态：

- `400`：message 为空。
- `404`：session 不存在。
- `409`：会话缺少可继续的上下文；服务端需要用历史消息重建上下文。
- `402`：额度不足。
- `502`：后端 AI 服务或模型供应商错误。

当前来源：

- 旧版使用 `chatRef.current` 保留浏览器内 AI chat 实例；刷新页面后无法恢复真实上下文，只能恢复展示消息。
- 迁移后由后端根据 session 历史重建上下文，前端不持有模型 chat 实例。

### 4. 单人评语生成

`POST /api/ai/comments/single`

用途：替代 `CommentAssistant.tsx` 单人模式浏览器内 AI JSON 生成。

请求参数：

```ts
{
  sessionId?: string;
  nickname?: string;
  gender: "男" | "女";
  grade: string;
  tags: string[];
  keywords?: string;
  tone?: string;
}
```

响应结构：

```ts
{
  sessionId: string;
  comments: string[];
  messages: [
    {
      id: string;
      role: "user";
      content: string;
      createdAt: string;
    },
    {
      id: string;
      role: "assistant";
      content: string;
      createdAt: string;
    }
  ];
  credit: {
    remaining: number;
  };
}
```

错误状态：

- `400`：字段非法，或 `gender` 不在枚举内。
- `422`：后端 AI 返回解析失败或不符合 `comments: string[]`。
- `402`：额度不足。
- `502`：后端 AI 服务或模型供应商错误。

当前来源：

- 表单全在前端状态。
- `tone` 当前调用默认 `温和鼓励`，UI 没有实际语气选择。
- `comments` 由后端结构化解析后返回。
- 结果写入 localStorage 会话。

### 5. 批量评语上传建任务

`POST /api/comments/batch-jobs`

用途：前端上传 `.xlsx/.xls` 文件，后端解析 Excel、校验字段、创建批量生成任务。前端不安装 `xlsx`，也不读取 sheet 内容。

请求参数：

```ts
{
  file: File; // multipart/form-data
  options?: {
    tone?: string;
  };
}
```

响应结构：

```ts
{
  jobId: string;
  totalRows: number;
  estimatedCredits: number;
  columns: string[];
  status: "pending" | "running";
}
```

错误状态：

- `400`：未上传文件、文件类型非法、文件过大。
- `422`：Excel 表头缺失或行数据无法解析。
- `402`：额度不足。
- `500`：文件解析或任务创建失败。

当前来源：

- 旧版 Excel 文件在浏览器中解析。
- 旧版每行生成由前端串行触发。
- 行状态只存在页面内存中，刷新丢失。

### 6. 批量评语任务状态与导出

`GET /api/comments/batch-jobs/:jobId`

响应结构：

```ts
{
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  rows: Array<{
    tempId: string;
    status: 'pending' | 'generating' | 'success' | 'error';
    comments?: string[];
    error?: string;
  }>;
}
```

`GET /api/comments/batch-jobs/:jobId/export`

响应结构：

- `200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- 文件名示例：`红笔AI_批量评语生成结果_YYYY-MM-DD.xlsx`
- 导出列包含原始学生信息与 `评语1`、`评语2`、`评语3` 三个结果列。
- 写入 Excel 前需要去除 Markdown 代码块、行内代码和常见列表/强调标记。

错误状态：

- `404`：任务不存在。
- `409`：任务尚未完成，不能导出。
- `500`：导出文件生成失败。

当前来源：

- 无后端 job；全部是浏览器内存循环。

### 7. 题目变身生成

`POST /api/ai/teaching`

用途：替代 `TeachingAssist.tsx` 初次生成。

请求参数：

```ts
{
  sessionId?: string;
  inputType: "variant" | "knowledge";
  subject: string;
  grade: string;
  transformationLevel: string;
  content: string;
}
```

响应结构：`text/event-stream`，事件参考“流式响应约定”。

最终完成后，服务端应能持久化或返回等价结果：

```ts
{
  sessionId: string;
  messages: [
    {
      id: string;
      role: "user";
      content: string;
      createdAt: string;
    },
    {
      id: string;
      role: "assistant";
      content: string;
      createdAt: string;
    }
  ];
  credit: {
    remaining: number;
  };
}
```

错误状态：

- `400`：content 为空，或 inputType/level 非法。
- `402`：额度不足。
- `502`：后端 AI 服务或模型供应商错误。

当前来源：

- prompt 硬编码在页面组件。
- 旧版使用具体 Gemini model 名称。
- 旧版 AI chat 实例保存在 `chatRef.current`。
- 迁移后模型名不暴露给前端。

### 8. 题目变身追问

`POST /api/ai/teaching/follow-up`

请求参数：

```ts
{
  sessionId: string;
  message: string;
}
```

响应结构同知识精讲追问。

错误状态同知识精讲追问。

当前来源：

- 旧版使用浏览器内 `chatRef.current`，刷新后不可恢复真实上下文。
- 迁移后由后端根据 session 历史重建上下文，前端只消费流式响应。

### 9. 实验列表

`GET /api/simulations`

用途：替代 `SimulationLab.tsx` 的硬编码 `SIMULATIONS`。

请求参数：

```ts
{
  subjects?: string[];
  categoryIds?: string[];
  grades?: string[];
  q?: string;
}
```

响应结构：

```ts
{
  items: Array<{
    id: string;
    name: string;
    subject: string;
    category: {
      id: string;
      name: string;
    };
    grades: string[];
    thumbnail?: string | null;
    src?: string | null;
    isable: boolean;
    topics?: unknown[] | null;
    sampleLearningGoals?: unknown[] | null;
  }>;
  facets: {
    subjects: Array<{
      name: string;
      categories: Array<{
        id: string;
        name: string;
      }>;
    }>;
    grades: string[];
  };
}
```

错误状态：

- `400`：筛选参数非法。
- `500`：服务端数据读取失败。

当前来源：

- 实验数据、学科分类和年级全部硬编码在前端。
- 迁移后以 `apps/db-init/data.json` 生成的 `simulation_categories`、`simulation_apps`，以及 `grade.json` 生成的 `grades`、`grade_simulation_apps` 为准。

### 10. 会话历史

`GET /api/me/sessions`

请求参数：

```ts
{
  category?: "chat" | "inspiration" | "simulation" | "comment" | "teaching";
}
```

响应结构：

```ts
{
  sessions: Array<{
    id: string;
    title: string;
    category: string;
    updatedAt: string;
    messages: Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      suggestions?: string[];
      createdAt: string;
    }>;
  }>;
}
```

`POST /api/me/sessions`

```ts
{
  category: "chat" | "inspiration" | "simulation" | "comment" | "teaching";
  title?: string;
}
```

`PATCH /api/me/sessions/:id`

```ts
{
  title?: string;
  messages?: Array<{
    role: "user" | "assistant";
    content: string;
    suggestions?: string[];
  }>;
}
```

`DELETE /api/me/sessions/:id`

响应：

```ts
{
  ok: true;
}
```

错误状态：

- `401`：未登录。
- `403`：不是当前用户的 session。
- `404`：session 不存在。
- `409`：并发更新冲突。

当前来源：

- `localStorage.chatHistory`。
- `currentSessionIds` 只在内存中。

### 11. 用户偏好

`GET /api/me/preferences`

响应：

```ts
{
  grade: string;
  subject: string;
}
```

`PATCH /api/me/preferences`

请求：

```ts
{
  grade?: string;
  subject?: string;
}
```

错误状态：

- `401`：未登录。
- `400`：字段非法。

当前来源：

- `localStorage.user_pref_grade`
- `localStorage.user_pref_subject`

### 12. 用户额度

`GET /api/me/credits`

响应：

```ts
{
  credits: number;
  limit: number;
  resetAt: string;
  cycleDays: 180;
}
```

`POST /api/me/credits/consume`

请求：

```ts
{
  reason: 'chat' | 'inspiration' | 'comment_single' | 'comment_batch_row' | 'teaching';
  idempotencyKey: string;
}
```

响应：

```ts
{
  consumed: boolean;
  credits: number;
}
```

错误状态：

- `401`：未登录。
- `402`：额度不足。
- `409`：重复 idempotencyKey。

当前来源：

- `localStorage.user_credits`
- `localStorage.user_credits_reset`
- 前端可被用户篡改，不适合作真实额度。

### 13. Excel 模板下载

`GET /api/comments/template`

用途：替代前端用 `xlsx` 生成模板。前端只触发下载。

响应结构：

- `200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- 文件名示例：`红笔AI_评语导入模板.xlsx`

错误状态：

- `500`：模板生成失败。

### 14. 广告/赞助配置

`GET /api/ads?placement=loading|export|credit_gate`

响应：

```ts
{
  ad: {
    id: string;
    imageUrl: string;
    targetUrl: string;
    brandName: string;
    slogan: string;
    label?: string;
  };
}
```

错误状态：

- `204`：无广告可展示。
- `500`：广告配置读取失败。

当前来源：

- `AdSystem.tsx` 的 `SAMPLE_ADS`，图片和跳转都硬编码。

### 15. 登录认证

当前接口：

- tRPC `auth.userLogin`：当前默认登录入口，提交 `user/password` 并创建用户端 session。
- tRPC `auth.wechatLoginConfig`：返回微信内嵌二维码所需 `appId`、`redirectUri`、`scope`、`state`。
- tRPC `auth.wechatCallback`：接收微信回调 `code/state`，服务端换取微信授权信息并写入 session。
- `POST /api/auth/logout`
- tRPC `me.profile`

`GET /api/me` 响应：

```ts
{
  user: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
  };
}
```

当前实现：

- `UserLoginModal` 使用用户名和密码登录；`WechatLoginModal` 代码保留，暂不作为默认入口。
- user 从服务端 session 对应的 `me.profile` 查询恢复。
- session 使用 HttpOnly Cookie，不在前端存储 token。

## 哪些数据目前是 mock、localStorage 或硬编码

### Mock

- 登录扫码流程和用户：
  - name: `微信用户`
  - avatar: `https://picsum.photos/seed/avatar/100/100`
- 广告素材：
  - `知领智慧校园`
  - `晨鸣纸业`
  - targetUrl 都是 `https://example.com`
- AI 生成图片：
  - 旧版 prompt 要求使用 `picsum.photos`，不是真实教学图片检索。

### localStorage

- `chatHistory`
- `user_pref_grade`
- `user_pref_subject`
- `user_credits`
- `user_credits_reset`

### 硬编码

- 旧版 Gemini model 名称。
- 所有 system prompt 和输出结构要求。
- AI 助手 function declaration。
- PhET 实验数据。
- 学科、年级、标签组。
- 题目变身模式和案例。
- 知识精讲案例和追问建议。
- 旧版 Excel 模板示例行。
- 赞助邮箱。
- 旧版 Google Fonts URL；迁移后改为 `@fontsource/inter`。
- `metadata.json` 的 camera/microphone permissions。

## 迁移风险

- 旧版直接在客户端使用 AI API key 有泄露风险，迁移时必须移到后端。
- `chatRef.current` 不能跨刷新恢复，需要服务端用历史消息重建上下文。
- 额度扣减目前不是原子操作；迁移后应服务端扣减并支持幂等。
- 批量生成迁移到后端后需要队列、限流、失败重试和任务恢复。
- Excel 上传需要文件大小、MIME、扩展名、表头和敏感信息校验；产品文档要求匿名化，但当前代码未强制。
- 流式接口需要处理断线重连、取消生成、重复提交和最终消息落库一致性。
- `Message.timestamp` localStorage 反序列化后会变成字符串，不再是 Date 实例；当前展示未使用日期，迁移时应规范为 ISO string。
