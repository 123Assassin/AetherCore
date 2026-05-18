# 组件拆分建议

当前组件混合了页面、业务逻辑、UI 和 API 调用。迁移到 Next.js 16/monorepo 时，建议按页面级、业务复用、通用 UI 三层拆分。

技术栈调整后的前端边界：

- 不安装 `@google/genai`，所有 AI prompt、模型调用和结构化解析放到后端。
- 不安装 `react-markdown`，AI 对话和流式内容渲染使用 `@ant-design/x`。
- 不安装 `xlsx`，前端只上传 Excel 文件，解析和导出由后端处理。
- 不迁移 Vite 配置。
- 字体使用 `@fontsource/inter`，不再用 Google Fonts URL。

## 页面级组件

这些组件应保留在 `apps/web` 的 route segment 内，负责组装业务组件、读取路由、连接状态和触发 API。

| 旧文件                             | 页面级职责                              | 建议新位置                                                            |
| ---------------------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| `src/App.tsx`                      | 应用壳、主布局、全局弹窗、Provider 包裹 | `apps/web/app/(app)/layout.tsx` + `apps/web/components/app-shell.tsx` |
| `src/pages/ChatAssistant.tsx`      | AI 助手页面                             | `apps/web/app/(app)/chat/page.tsx`                                    |
| `src/pages/LessonModule.tsx`       | 备课精讲容器                            | `apps/web/app/(app)/lesson/layout.tsx`                                |
| `src/pages/InspirationLibrary.tsx` | 知识精讲页面                            | `apps/web/app/(app)/lesson/inspiration/page.tsx`                      |
| `src/pages/SimulationLab.tsx`      | 互动实验页面                            | `apps/web/app/(app)/lesson/simulation/page.tsx`                       |
| `src/pages/OfficeModule.tsx`       | 办公提效容器                            | `apps/web/app/(app)/office/layout.tsx`                                |
| `src/pages/CommentAssistant.tsx`   | 评语助手页面                            | `apps/web/app/(app)/office/comment/page.tsx`                          |
| `src/pages/TeachingAssist.tsx`     | 题目变身页面                            | `apps/web/app/(app)/office/teaching/page.tsx`                         |

## 可复用业务组件

这些组件带有红笔 AI 的具体业务语义，不建议放入 `packages/ui`。应放在 `apps/web/components` 或 `apps/web/features/*`。

### 应用框架

| 旧文件/片段          | 建议组件         | 说明                                    |
| -------------------- | ---------------- | --------------------------------------- |
| `Sidebar.tsx`        | `AppSidebar`     | 主导航、登录状态、额度、赞助入口        |
| `HistorySidebar.tsx` | `HistorySidebar` | 会话列表、新建、删除、按模块过滤        |
| `App.tsx` header     | `AppHeader`      | 顶部品牌、历史按钮、二级导航            |
| `App.tsx` 二级按钮   | `SubNav`         | 根据 pathname 展示 lesson/office 子导航 |

### 聊天与 AI 输出

| 旧文件/片段    | 建议组件                  | 说明                                                                 |
| -------------- | ------------------------- | -------------------------------------------------------------------- |
| 多页面消息列表 | `ChatMessageList`         | user/assistant 气泡、自动滚动                                        |
| 多页面消息气泡 | `AiMessageBubble`         | 基于 Ant Design X `Bubble` 封装角色、头像、图片样式和 streaming 状态 |
| 多页面追问按钮 | `SuggestionChips`         | 最后一条 assistant 消息后的追问                                      |
| 多页面输入框   | `AiSender`                | 基于 Ant Design X `Sender` 封装输入、Enter 发送、loading 禁用        |
| 多页面会话列表 | `AiConversations`         | 基于 Ant Design X `Conversations` 或现有业务历史侧栏封装             |
| `AdLoadingBot` | `SponsoredLoadingMessage` | 业务广告 loading                                                     |
| 多页面复制逻辑 | `CopyResultButton`        | copy 状态和按钮                                                      |

### 知识精讲

| 旧文件/片段 | 建议组件                   | 说明                     |
| ----------- | -------------------------- | ------------------------ |
| 左侧表单    | `InspirationForm`          | 年级、学科、知识点、学情 |
| 空状态案例  | `FeaturedInspirationCases` | 三个硬编码案例           |
| 输出区      | `InspirationChatPanel`     | 消息、复制、追问         |

### 互动实验

| 旧文件/片段   | 建议组件                  | 说明                       |
| ------------- | ------------------------- | -------------------------- |
| 筛选侧栏      | `SimulationFilters`       | 科目、分类、年级筛选       |
| 结果头部      | `SimulationResultsHeader` | 结果数量、已选 chips、搜索 |
| 实验卡片      | `SimulationCard`          | 图片、标签、按钮           |
| 空结果        | `SimulationEmptyState`    | 无匹配时重置               |
| iframe 覆盖层 | `SimulationPlayerOverlay` | 全屏播放、关闭             |

### 评语助手

| 旧文件/片段   | 建议组件              | 说明                            |
| ------------- | --------------------- | ------------------------------- |
| 单人/批量 tab | `CommentModeTabs`     | 模式切换                        |
| 单人表单      | `SingleCommentForm`   | 昵称、年级、性别、标签、细节    |
| 标签选择      | `StudentTagSelector`  | 标签组、多选                    |
| 结果列表      | `CommentResultList`   | 评语卡片、复制                  |
| 批量导入引导  | `BatchImportGuide`    | 操作说明、模板下载              |
| 上传区        | `ExcelUploadDropzone` | 点击/拖拽上传文件，不在前端解析 |
| 批量队列表格  | `BatchCommentTable`   | 状态、单个生成                  |
| 批量工具栏    | `BatchCommentToolbar` | 重新上传、全部生成、导出        |

### 题目变身

| 旧文件/片段  | 建议组件                      | 说明                              |
| ------------ | ----------------------------- | --------------------------------- |
| 教学上下文   | `TeachingContextForm`         | 学科、学段                        |
| 输入模式切换 | `TeachingInputModeToggle`     | 原题变式/知识点出题               |
| 输入内容     | `TeachingPromptInput`         | 原题或知识点 textarea             |
| 等级选择     | `TransformationLevelSelector` | 变式/难度选项                     |
| 案例卡片     | `TeachingExampleCards`        | 三个硬编码案例                    |
| 输出区       | `TeachingResultPanel`         | Ant Design X 流式消息、复制、追问 |

### 弹窗与广告

| 旧文件            | 建议组件             | 说明                                 |
| ----------------- | -------------------- | ------------------------------------ |
| `LoginModal.tsx`  | `WechatLoginModal`   | 当前为模拟扫码                       |
| `DonateModal.tsx` | `DonateModal`        | 赞助合作                             |
| `ExportAdModal`   | `SponsoredGateModal` | 建议支持不同场景文案：额度解锁、导出 |

## 可抽到 packages/ui 的通用 UI 组件

这些组件不应依赖红笔 AI 的业务数据、localStorage、模型供应商或具体文案。

| UI 组件              | 来源片段                 | 抽象说明                                                  |
| -------------------- | ------------------------ | --------------------------------------------------------- |
| `Button`             | 全项目按钮               | variant、size、loading、disabled、icon                    |
| `IconButton`         | 侧栏、顶部栏、弹窗关闭   | 图标按钮、tooltip、active 状态                            |
| `Modal`              | 登录、赞助、广告         | overlay、dialog、close、尺寸                              |
| `Tabs`               | 评语单人/批量、二级导航  | controlled tabs                                           |
| `SegmentedControl`   | 题目输入模式             | 两段或多段选择                                            |
| `Select`             | 年级/学科选择            | label、options、value                                     |
| `TextInput`          | 聊天、搜索、昵称         | prefix/suffix icon、disabled                              |
| `Textarea`           | 知识点、学情、细节、原题 | label、hint、required                                     |
| `RadioGroup`         | 性别                     | options、controlled value                                 |
| `Checkbox`           | 实验筛选                 | checked、indeterminate 可选                               |
| `Chip`               | 标签、筛选项、追问建议   | removable、selected                                       |
| `Card`               | 案例卡、实验卡、结果卡   | 统一边框、阴影、padding                                   |
| `EmptyState`         | 各页面空状态             | icon、title、description、actions                         |
| `DataTable`          | 批量生成表格             | headers、rows、sticky header                              |
| `FileDropzone`       | Excel 上传               | accept、drag state、onFiles                               |
| `AiStreamRenderer`   | 多页面 AI 输出           | 包装 Ant Design X 的流式消息渲染，不依赖 `react-markdown` |
| `Tooltip`            | 侧栏悬浮提示             | placement、content                                        |
| `Badge`              | 学科/年级/状态           | variant、size                                             |
| `Progress/Countdown` | 广告弹窗倒计时           | duration、remaining                                       |

## 不建议抽到 packages/ui 的内容

- AI prompt 组装。
- 额度消耗逻辑。
- 会话历史读写。
- 广告素材选择。
- PhET 实验数据。
- 学生标签组。
- Excel 模板字段。
- Excel 解析和导出。
- 红笔 AI 品牌侧栏和业务文案。

## 状态与逻辑 Hook 建议

| 旧逻辑                        | 建议 hook                                      | 所属                                              |
| ----------------------------- | ---------------------------------------------- | ------------------------------------------------- |
| `ChatHistoryContext`          | `useChatSessions`                              | `apps/web/features/history` 或 shared app package |
| `UserPreferencesContext`      | `useUserPreferences`                           | `apps/web/features/preferences`                   |
| 额度判断和广告 pending action | `useCreditGate`                                | `apps/web/features/credits`                       |
| 复制状态                      | `useCopyToClipboard`                           | 可放 `packages/ui` 或 `packages/hooks`            |
| Excel 上传                    | `useCommentExcelUpload`                        | `apps/web/features/comments`                      |
| 流式 AI 请求                  | `useAiStream` 或基于 Ant Design X hooks 的封装 | `apps/web/features/ai`                            |
