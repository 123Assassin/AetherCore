# RedPenAI 前端功能规格

分析对象：`/Users/shilin/Workspace/RedPenAI/红笔ai---你的ai教学搭档`

当前旧项目是 Vite + React 单页应用。没有 React Router；页面切换由 `App.tsx` 中的 `activeTab` 和 `activeSubTab` 状态控制。数据主要存在浏览器 `localStorage`，AI 调用由前端直接访问 Gemini。

迁移目标为 Next.js 16。目标前端不再安装或调用 `@google/genai`，只负责收集输入、上传文件、调用后端接口，并使用 `@ant-design/x` 相关 AI UI 组件流式渲染后端返回内容。`react-markdown` 和 `xlsx` 都应从前端依赖中移除。

## 技术栈调整

- 字体：移除 CSS 中的 Google Fonts URL，引入 `@fontsource/inter`。
  - 安装：`pnpm install @fontsource/inter`
  - 在入口文件引入：
    ```ts
    import '@fontsource/inter/400.css';
    import '@fontsource/inter/500.css';
    import '@fontsource/inter/600.css';
    ```
  - CSS：
    ```css
    body {
      font-family:
        'Inter',
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        'Segoe UI',
        sans-serif;
    }
    ```
- AI SDK：前端移除 `@google/genai`。模型选择、prompt 拼装、function/tool 调用、结构化解析和错误处理都放到后端。
- AI UI：前端移除 `react-markdown`，改用 `@ant-design/x` 的 `Bubble`、`Sender`、`Conversations`、`Prompts` 等组件，以及其面向 AI 场景的流式内容渲染能力。Ant Design X 官方文档显示 `Bubble` 支持 `streaming` 状态，适合 token 流式输出。
- Excel：前端移除 `xlsx`。批量评语只负责选择/拖拽上传 `.xlsx/.xls` 文件，后端解析、校验、生成、导出。
- 构建：迁移目标是 Next.js 16，不迁移 `vite.config.ts`，也不保留 Vite 插件配置。

## 页面列表

### 全局应用框架

- `App.tsx`
- 左侧窄侧栏：主模块入口、登录、赞助、剩余额度展示。
- 顶部栏：历史记录开关、品牌标题、二级模块切换。
- 历史记录侧栏：按当前主模块筛选会话，支持新建、选择、删除。
- 全局弹窗：登录弹窗、赞助弹窗。

### AI 助手

- 旧组件：`src/pages/ChatAssistant.tsx`
- 主入口：`activeTab === "chat"`
- 功能：通用教学对话、建议追问、通过后端返回的 workflow 指令打开专业工作流。
- 当前显示：聊天气泡、Markdown 内容、图片渲染、最后一条 AI 消息的追问建议、广告式 loading；迁移后用 Ant Design X 流式渲染替代手写气泡和 `react-markdown`。

### 知识库精讲 - 知识精讲

- 旧组件：`src/pages/InspirationLibrary.tsx`
- 主入口：`activeTab === "lesson"` 且 `activeSubTab === "inspiration"`
- 功能：根据年级、学科、知识点、学情生成知识精讲设计。
- 当前显示：左侧表单、空状态案例卡片、聊天式结果、复制、追问。

### 知识库精讲 - 互动实验

- 旧组件：`src/pages/SimulationLab.tsx`
- 主入口：`activeTab === "lesson"` 且 `activeSubTab === "simulation"`
- 功能：硬编码 PhET 仿真实验列表的筛选、搜索、iframe 演示。
- 当前显示：科目/年级筛选侧栏、结果卡片、实验全屏覆盖层。

### 办公提效 - 评语助手

- 旧组件：`src/pages/CommentAssistant.tsx`
- 主入口：`activeTab === "office"` 且 `activeSubTab === "comment"`
- 功能：单人评语生成、批量 Excel 导入生成、模板下载、结果导出。
- 当前显示：单人/批量 tab、标签选择、生成结果卡片、批量队列表格、导出广告弹窗。

### 办公提效 - 题目变身

- 旧组件：`src/pages/TeachingAssist.tsx`
- 主入口：`activeTab === "office"` 且 `activeSubTab === "teaching"`
- 功能：原题变式、知识点出题、生成后追问微调。
- 当前显示：教学上下文配置、输入内容、变身力度/出题难度、案例卡片、聊天式结果。

### 弹窗和辅助页面片段

- `LoginModal.tsx`：当前默认用户名密码登录；微信开放平台网站应用扫码登录弹窗代码保留。
- `DonateModal.tsx`：赞助与合作信息。
- `ExportAdModal`：导出前广告等待。
- `GenerationAdOverlay`：AI 生成期间在页面顶层展示毛玻璃广告；额度充足时生成同步开始，额度不足时等广告倒计时结束并手动关闭后再开始生成。

## 用户流程

### 通用导航流程

1. 用户进入应用，默认打开 `AI 助手`。
2. 点击左侧主导航切换：
   - `AI 助手`
   - `知识库精讲`
   - `办公提效`
3. 切换到 `知识库精讲` 时，默认二级页签为 `知识精讲`。
4. 切换到 `办公提效` 时，默认二级页签为 `评语助手`。
5. 点击顶部历史按钮打开历史侧栏。
6. 在历史侧栏点击 `新建对话` 时，AI 助手清空当前对话；具体功能页创建当前功能的空会话并清空表单。
7. 点击某条历史会话后，当前页面加载该会话内容；具体功能页需要回填已保存的表单和结果状态。

### AI 助手流程

1. 用户输入教学问题或点击建议问题。
2. 若 `credits <= 0`，展示顶层毛玻璃广告，倒计时结束并手动关闭后继续发送。
3. 若有额度，先消耗 1 次额度，展示顶层毛玻璃广告，同时创建或复用 `chat` 会话并开始生成。
4. 前端把用户输入和必要会话上下文发送给后端聊天接口。
5. 后端拼装 prompt、调用 AI 模型，并以流式响应返回 assistant 内容。
6. 前端使用 Ant Design X 的对话组件持续渲染流式内容。
7. 后端返回建议追问或 workflow 指令时：
   - 展示 3 条追问建议。
   - 追加 assistant 消息。
8. 后端返回打开工作流指令时：
   - `comment` 试图切换到对应工作流。
   - `inspiration` 试图切换到对应工作流。
   - `teaching` 试图切换到对应工作流。
   - 注意：当前 `setActiveTab(args.workflowName)` 与主 tab 枚举不完全匹配，迁移时需要修正为主 tab + sub tab 映射。

### 知识精讲流程

1. 用户选择授课对象、学科。
2. 输入知识点，选填学情与教学习惯。
3. 点击 `一键神级精讲` 或点击空状态案例卡。
4. 若知识点为空，浏览器 `alert` 提示。
5. 若额度不足，展示顶层毛玻璃广告，倒计时结束并手动关闭后继续。
6. 若额度充足，广告展示期间同步创建或复用 `inspiration` 会话并开始生成。
7. 后端流式返回知识精讲内容。
8. 前端用 Ant Design X 渲染流式输出。
9. 结果出现后：
   - 可复制 AI 回复。
   - 可点击追问建议。
   - 可在底部输入追问。

### 互动实验流程

1. 页面初始化时从全局偏好读取 `grade`、`subject` 作为默认筛选。
2. 用户勾选科目、子分类、年级。
3. 用户输入关键词搜索。
4. 结果列表基于硬编码 `SIMULATIONS` 前端过滤。
5. 点击卡片悬浮按钮 `立即开始` 后，打开全屏覆盖层。
6. 覆盖层内通过 iframe 加载 PhET 实验 URL。
7. 点击返回/关闭退出覆盖层。

### 评语助手 - 单人流程

1. 用户切换到 `单人评语精编`。
2. 填写学生昵称/标识、年级、性别。
3. 勾选成长画像标签。
4. 填写个性化细节。
5. 点击 `一键生成评语`。
6. 若额度不足，展示顶层毛玻璃广告，倒计时结束并手动关闭后继续；额度充足时广告展示期间同步开始生成。
7. 前端请求后端评语接口。
8. 后端调用 AI 并返回结构化评语结果或流式生成状态。
9. 将 3 个结果展示为卡片。
10. 将本次生成写入 `comment` 会话。
11. 用户可复制某条评语。

### 评语助手 - 批量流程

1. 用户切换到 `批量表格导入`。
2. 可从后端下载 Excel 模板。
3. 点击或拖拽上传 `.xlsx/.xls` 文件。
4. 前端不解析 Excel，只通过 `FormData` 上传给后端。
5. 后端读取列：
   - `昵称`
   - `性别`
   - `年级`
   - `表现标签`
   - `核心优缺点`
6. 显示待生成队列表格。
7. 用户可单个生成或一键全部生成。
8. 每个学生生成成功后将 `status` 改为 `success`，并保存 `results`。
9. 有成功结果时可以触发导出。
10. 导出前显示广告弹窗；倒计时结束并确认后，请求后端导出结果文件。导出结果中每条 AI 评语按 `评语1`、`评语2`、`评语3` 三列写入，并去除 Markdown 代码块和常见标记。

### 题目变身流程

1. 用户选择学科、学段。
2. 选择输入模式：
   - `原题变式`
   - `知识点出题`
3. 输入原题或知识点。
4. 选择变身力度或出题难度。
5. 点击生成或点击空状态案例卡。
6. 若额度不足，展示顶层毛玻璃广告，倒计时结束并手动关闭后继续；额度充足时广告展示期间同步开始生成。
7. 创建或复用 `teaching` 会话。
8. 后端流式返回题目变身内容。
9. 前端用 Ant Design X 渲染流式输出。
10. 结果出现后：

- 可复制结果。
- 可点击调整建议。
- 可输入追问要求。

### 登录流程

1. 用户点击侧栏登录按钮。
2. 弹出用户名密码登录弹窗。
3. 前端调用 `auth.userLogin`，提交 `user/password`。
4. 服务端校验普通用户账号并写入 HttpOnly session cookie。
5. 前端更新侧栏用户展示；页面刷新后通过 `me.profile` 恢复当前用户。

### 赞助流程

1. 用户点击侧栏爱心按钮。
2. 弹出赞助与合作弹窗。
3. 展示合作邮箱。
4. 点击按钮关闭。

## 表单字段

### AI 助手

| 字段     | 类型       | 必填 | 状态 key | 说明               |
| -------- | ---------- | ---- | -------- | ------------------ |
| 聊天输入 | text input | 是   | `input`  | 回车或发送按钮提交 |

### 知识精讲

| 字段           | 类型       | 必填 | 状态 key       | 说明                                   |
| -------------- | ---------- | ---- | -------------- | -------------------------------------- |
| 授课对象       | select     | 是   | `grade`        | 全局偏好，选项：小学、初中、高中、大学 |
| 学科           | select     | 是   | `subject`      | 全局偏好，含语文、数学、英语、物理等   |
| 知识点         | textarea   | 是   | `topic`        | 空值会 `alert`                         |
| 学情与教学习惯 | textarea   | 否   | `context`      | 发送给后端，由后端拼入 prompt          |
| 追问输入       | text input | 否   | `followUpText` | 仅在已有消息后显示                     |

### 互动实验

| 字段          | 类型                 | 必填 | 状态 key           | 说明                             |
| ------------- | -------------------- | ---- | ------------------ | -------------------------------- |
| 科目/分类筛选 | checkbox-like button | 否   | `selectedSubjects` | 可多选；选择时同步全局 `subject` |
| 年级筛选      | checkbox-like button | 否   | `selectedGrades`   | 可多选；选择时同步全局 `grade`   |
| 搜索词        | text input           | 否   | `searchQuery`      | 匹配标题和描述                   |

### 评语助手 - 单人

| 字段           | 类型                 | 必填 | 状态 key   | 说明                               |
| -------------- | -------------------- | ---- | ---------- | ---------------------------------- |
| 学生昵称/标识  | text input           | 否   | `nickname` | 产品文档建议使用代号，当前未强校验 |
| 年级           | select               | 是   | `grade`    | 全局偏好，选项为一年级到高中       |
| 性别           | radio                | 是   | `gender`   | 男/女                              |
| 成长画像标签   | multi-select buttons | 否   | `tags`     | 学习表现、品德行为、社交互动       |
| 个性化细节补充 | textarea             | 否   | `keywords` | 发送给后端，由后端拼入 prompt      |

### 评语助手 - 批量

| 字段              | 类型                 | 必填 | 状态 key   | 说明                              |
| ----------------- | -------------------- | ---- | ---------- | --------------------------------- |
| Excel 文件        | file/drop            | 是   | `file`     | 接受 `.xlsx,.xls`，前端只上传文件 |
| Excel: 昵称       | backend sheet column | 否   | `nickname` | 后端解析，缺省策略由后端决定      |
| Excel: 性别       | backend sheet column | 否   | `gender`   | 后端解析，缺省策略由后端决定      |
| Excel: 年级       | backend sheet column | 否   | `grade`    | 后端解析，缺省策略由后端决定      |
| Excel: 表现标签   | backend sheet column | 否   | `tags`     | 后端解析                          |
| Excel: 核心优缺点 | backend sheet column | 否   | `keywords` | 后端解析                          |

### 题目变身

| 字段              | 类型              | 必填 | 状态 key              | 说明                             |
| ----------------- | ----------------- | ---- | --------------------- | -------------------------------- |
| 学科选择          | select            | 是   | `subject`             | 全局偏好                         |
| 学段选择          | select            | 是   | `grade`               | 全局偏好，选项：小学、初中、高中 |
| 输入模式          | segmented buttons | 是   | `inputType`           | `variant` 或 `knowledge`         |
| 原题/知识点       | textarea          | 是   | `inputContent`        | 空值禁用提交                     |
| 变身力度/出题难度 | option buttons    | 是   | `transformationLevel` | 随 `inputType` 切换候选项        |
| 追问输入          | text input        | 否   | `followUpText`        | 仅在已有消息后显示               |

## 交互行为

- 主导航点击后只更新内存状态，没有 URL 变化。
- 二级导航只在 `lesson` 或 `office` 下显示。
- 历史侧栏打开后按主模块过滤会话：
  - `chat` 只看 `chat`
  - `lesson` 看 `inspiration` 和 `simulation`
  - `office` 看 `comment` 和 `teaching`
- AI 助手新建对话只清空当前 session id；具体功能页新建对话会创建当前功能的空 session 并重置表单，恢复历史时回填功能状态。
- 所有 AI 生成入口都使用额度：
  - 额度大于 0：展示顶层毛玻璃广告，同时继续请求 AI。
  - 额度小于等于 0：展示顶层毛玻璃广告，倒计时结束并手动关闭后再请求 AI。
- `GenerationAdOverlay` 用于 AI 生成广告停留；`ExportAdModal` 仅用于导出广告。
- 复制使用 `navigator.clipboard.writeText`，成功后 2 秒内显示已复制状态。
- 旧版 Markdown 结果使用 `react-markdown` 渲染；迁移后移除该依赖，统一用 Ant Design X 的 AI 消息/流式渲染方案。
- AI prompt 生成图片链接的逻辑迁移到后端；前端只渲染后端返回的内容块或消息内容。
- Excel 导入/导出迁移到后端；前端只负责上传文件和下载结果文件。
- 批量生成由后端任务或队列处理；前端只轮询/订阅任务状态。
- 互动实验全屏层由 `activeSim` 控制，iframe 直接加载外部 PhET URL。

## 状态管理逻辑

### App 层状态

- `activeTab`: 当前主模块，默认 `chat`。
- `activeSubTab`: 当前二级模块。
- `user`: 登录用户对象，仅内存保存。
- `isLoginModalOpen`: 登录弹窗。
- `isDonateModalOpen`: 赞助弹窗。
- `isHistoryOpen`: 历史侧栏。

`activeTab` 改变时：

- `lesson` 自动设置 `activeSubTab = "inspiration"`。
- `office` 自动设置 `activeSubTab = "comment"`。
- 其他模块清空 `activeSubTab`。

### ChatHistoryContext

localStorage key：`chatHistory`

状态结构：

```ts
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  category: string;
}
```

逻辑：

- 初始化时读取 `localStorage.chatHistory`。
- `sessions` 变化时写回 localStorage。
- `currentSessionIds` 存内存，不持久化。
- `createNewSession(category)` 用 `Date.now().toString()` 生成 id，并设为当前会话。
- `updateSession(id, messages)`：
  - 若消息 JSON 未变化则跳过。
  - 标题默认取第一条 user 消息前 15 个字符。
  - 按 `updatedAt` 倒序排序。
- `deleteSession(id)` 删除会话，并清空所有指向该 id 的 current session。
- `clearHistory()` 清空所有历史和当前会话。

### UserPreferencesContext

localStorage keys：

- `user_pref_grade`
- `user_pref_subject`
- `user_credits`
- `user_credits_reset`

逻辑：

- `grade` 默认 `初中`。
- `subject` 默认 `语文`。
- `credits` 默认 40。
- 若首次使用或距离 `user_credits_reset` 超过 180 天，重置为 40。
- `consumeCredit()` 在 `credits > 0` 时减 1 并返回 `true`。
- `addCredit(amount)` 当前未在 UI 中使用。

### 页面局部状态

- `ChatAssistant`：消息、输入、loading、广告、pendingText。
- `InspirationLibrary`：topic、context、messages、loading、followUpText、copiedIndex、广告 pending action；迁移后移除浏览器内 Gemini chatRef。
- `SimulationLab`：筛选条件、搜索词、activeSim。
- `CommentAssistant`：单人表单、结果、tab、批量数据、拖拽状态、广告 pending action。
- `TeachingAssist`：输入模式、输入内容、变身等级、messages、followUpText；迁移后移除浏览器内 Gemini chatRef。

## 权限假设

当前代码没有真实权限系统。迁移时可按以下假设建模：

- 未登录用户也可使用全部功能；当前登录只影响侧栏展示。
- 额度由本地 localStorage 控制，不能作为真实计费或风控依据。
- 批量 Excel 迁移后由后端解析，需要认证、文件大小限制、文件类型校验和上传权限控制。
- `metadata.json` 声明了 `camera`、`microphone` frame permissions，但当前源码没有使用摄像头或麦克风。
- AI API key 不应进入前端。迁移到 Next.js 后，前端只能访问自有后端接口；模型供应商、API key、prompt 和结构化解析全部放在服务端。
- 互动实验 iframe 依赖外部站点允许嵌入。
- 微信扫码登录代码保留但暂不作为默认入口；恢复前需要解决微信开放平台 `snsapi_login` scope 权限和授权域名问题。

## 数据依赖

### 外部服务

- 后端 AI 接口：
  - 前端不感知具体模型。
  - 后端负责模型选择、prompt 拼装和流式输出。
- 图片：
  - `https://picsum.photos/...`
- 仿真实验：
  - `https://phet.colorado.edu/...`
- 广告跳转：
  - `https://example.com`
- 字体：
  - `@fontsource/inter`

### 本地持久化

- `chatHistory`：全部历史会话。
- `user_pref_grade`：年级偏好。
- `user_pref_subject`：学科偏好。
- `user_credits`：剩余额度。
- `user_credits_reset`：额度重置时间。

### 硬编码数据

- `SimulationLab.tsx`：
  - `SIMULATIONS`
  - `SUBJECTS`
  - `GRADES`
- `AdSystem.tsx`：
  - `SAMPLE_ADS`
- `InspirationLibrary.tsx`：
  - featured cases
  - follow-up suggestions
- `TeachingAssist.tsx`：
  - variant/knowledge levels
  - examples
  - suggestions
- `CommentAssistant.tsx`：
  - availableTagGroups
  - Excel 模板字段说明；模板文件由后端生成或静态提供
- `LoginModal.tsx`：
  - 用户名、密码、提交加载态、错误提示
