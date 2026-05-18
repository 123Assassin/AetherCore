# 旧文件到新文件迁移映射

目标假设：迁移到 monorepo 中的 Next.js 16 App Router。当前所有已实现用户功能迁移到 `apps/web`；`apps/admin` 仅作为未来广告、实验库、Prompt、额度等运营后台的可能目标。

## 页面与路由

| 旧文件                             | 新文件                                           | 目标       | 备注                                                           |
| ---------------------------------- | ------------------------------------------------ | ---------- | -------------------------------------------------------------- |
| `src/main.tsx`                     | 删除，由 Next.js `app` 入口替代                  | `apps/web` | React root 不再手写                                            |
| `src/App.tsx`                      | `apps/web/app/(app)/layout.tsx`                  | `apps/web` | Provider、主布局、侧栏、顶部栏                                 |
| `src/App.tsx`                      | `apps/web/components/app-shell.tsx`              | `apps/web` | 若 layout 保持 server component，可把交互壳放 client component |
| `src/pages/ChatAssistant.tsx`      | `apps/web/app/(app)/chat/page.tsx`               | `apps/web` | AI 助手页                                                      |
| `src/pages/LessonModule.tsx`       | `apps/web/app/(app)/lesson/layout.tsx`           | `apps/web` | 备课二级布局                                                   |
| `src/pages/InspirationLibrary.tsx` | `apps/web/app/(app)/lesson/inspiration/page.tsx` | `apps/web` | 知识精讲页                                                     |
| `src/pages/SimulationLab.tsx`      | `apps/web/app/(app)/lesson/simulation/page.tsx`  | `apps/web` | 互动实验页                                                     |
| `src/pages/OfficeModule.tsx`       | `apps/web/app/(app)/office/layout.tsx`           | `apps/web` | 办公二级布局                                                   |
| `src/pages/CommentAssistant.tsx`   | `apps/web/app/(app)/office/comment/page.tsx`     | `apps/web` | 评语助手页                                                     |
| `src/pages/TeachingAssist.tsx`     | `apps/web/app/(app)/office/teaching/page.tsx`    | `apps/web` | 题目变身页                                                     |

## 组件

| 旧文件/片段                         | 新文件                                                        | 目标       | 备注                              |
| ----------------------------------- | ------------------------------------------------------------- | ---------- | --------------------------------- |
| `src/components/Sidebar.tsx`        | `apps/web/components/layout/app-sidebar.tsx`                  | `apps/web` | 根据 pathname 判断 active         |
| `src/components/HistorySidebar.tsx` | `apps/web/components/history/history-sidebar.tsx`             | `apps/web` | 读取 session store/API            |
| `src/components/LoginModal.tsx`     | `apps/web/components/auth/wechat-login-modal.tsx`             | `apps/web` | 当前为模拟登录；后续接真实 auth   |
| `src/components/DonateModal.tsx`    | `apps/web/components/sponsor/donate-modal.tsx`                | `apps/web` | 赞助合作                          |
| `src/components/AdSystem.tsx`       | `apps/web/components/ads/sponsored-gate-modal.tsx`            | `apps/web` | `ExportAdModal`                   |
| `src/components/AdSystem.tsx`       | `apps/web/components/ads/sponsored-loading-message.tsx`       | `apps/web` | `AdLoadingBot`                    |
| `ChatAssistant.tsx` 消息列表        | `apps/web/features/chat/chat-message-list.tsx`                | `apps/web` | 可复用到多个 AI 页                |
| `ChatAssistant.tsx` 输入栏          | `apps/web/features/chat/chat-input-bar.tsx`                   | `apps/web` | 通用聊天输入                      |
| `InspirationLibrary.tsx` 左侧表单   | `apps/web/features/inspiration/inspiration-form.tsx`          | `apps/web` | 年级、学科、知识点、学情          |
| `InspirationLibrary.tsx` 案例卡片   | `apps/web/features/inspiration/featured-cases.tsx`            | `apps/web` | 数据可先常量化                    |
| `SimulationLab.tsx` 筛选栏          | `apps/web/features/simulations/simulation-filters.tsx`        | `apps/web` | 科目/年级                         |
| `SimulationLab.tsx` 实验卡          | `apps/web/features/simulations/simulation-card.tsx`           | `apps/web` | 单个实验                          |
| `SimulationLab.tsx` 覆盖层          | `apps/web/features/simulations/simulation-player-overlay.tsx` | `apps/web` | iframe 播放                       |
| `CommentAssistant.tsx` 单人表单     | `apps/web/features/comments/single-comment-form.tsx`          | `apps/web` | 表单和标签                        |
| `CommentAssistant.tsx` 批量上传     | `apps/web/features/comments/comment-excel-upload.tsx`         | `apps/web` | 只上传 Excel 文件，后端解析       |
| `CommentAssistant.tsx` 批量表格     | `apps/web/features/comments/batch-comment-table.tsx`          | `apps/web` | 队列状态                          |
| `CommentAssistant.tsx` 结果卡       | `apps/web/features/comments/comment-result-card.tsx`          | `apps/web` | 复制                              |
| `TeachingAssist.tsx` 控制面板       | `apps/web/features/teaching/teaching-control-panel.tsx`       | `apps/web` | 学科、学段、输入、等级            |
| `TeachingAssist.tsx` 案例卡         | `apps/web/features/teaching/teaching-example-cards.tsx`       | `apps/web` | 示例题                            |
| `TeachingAssist.tsx` 输出区         | `apps/web/features/teaching/teaching-result-panel.tsx`        | `apps/web` | Ant Design X 流式消息、复制、追问 |

## 通用 UI

| 旧来源                | 新文件                                                  | 目标          | 备注                                               |
| --------------------- | ------------------------------------------------------- | ------------- | -------------------------------------------------- |
| 全项目按钮            | `packages/ui/src/button.tsx`                            | `packages/ui` | variant/size/icon/loading                          |
| 图标按钮              | `packages/ui/src/icon-button.tsx`                       | `packages/ui` | 侧栏、关闭、发送                                   |
| 弹窗结构              | `packages/ui/src/modal.tsx`                             | `packages/ui` | overlay + content                                  |
| tab/二级导航          | `packages/ui/src/tabs.tsx`                              | `packages/ui` | controlled tabs                                    |
| 模式切换              | `packages/ui/src/segmented-control.tsx`                 | `packages/ui` | 输入模式                                           |
| input/select/textarea | `packages/ui/src/form/*`                                | `packages/ui` | 基础表单控件                                       |
| chip/badge            | `packages/ui/src/chip.tsx`, `packages/ui/src/badge.tsx` | `packages/ui` | 标签、状态                                         |
| card                  | `packages/ui/src/card.tsx`                              | `packages/ui` | 案例/结果/实验卡基础样式                           |
| empty state           | `packages/ui/src/empty-state.tsx`                       | `packages/ui` | 空结果、初始态                                     |
| table                 | `packages/ui/src/data-table.tsx`                        | `packages/ui` | 批量队列                                           |
| file dropzone         | `packages/ui/src/file-dropzone.tsx`                     | `packages/ui` | 不含业务解析                                       |
| tooltip               | `packages/ui/src/tooltip.tsx`                           | `packages/ui` | 侧栏提示                                           |
| AI stream renderer    | `apps/web/features/ai/ai-stream-renderer.tsx`           | `apps/web`    | 基于 `@ant-design/x`，不再抽 `react-markdown` 包装 |

## 状态、Hooks 与数据层

| 旧文件/逻辑                               | 新文件                                                        | 目标          | 备注                                                         |
| ----------------------------------------- | ------------------------------------------------------------- | ------------- | ------------------------------------------------------------ |
| `src/contexts/ChatHistoryContext.tsx`     | `apps/web/features/history/chat-history-provider.tsx`         | `apps/web`    | 第一阶段可继续 localStorage                                  |
| `src/contexts/ChatHistoryContext.tsx`     | `apps/web/features/history/session-store.ts`                  | `apps/web`    | 会话类型和操作                                               |
| `src/contexts/UserPreferencesContext.tsx` | `apps/web/features/preferences/user-preferences-provider.tsx` | `apps/web`    | 第一阶段可继续 localStorage                                  |
| 额度判断                                  | `apps/web/features/credits/use-credit-gate.ts`                | `apps/web`    | 统一广告 pending action                                      |
| 复制状态                                  | `packages/ui/src/hooks/use-copy-to-clipboard.ts`              | `packages/ui` | 通用 hook                                                    |
| Excel 上传                                | `apps/web/features/comments/comment-excel-upload.ts`          | `apps/web`    | 前端只做文件上传，不依赖 `xlsx`                              |
| AI prompt                                 | `apps/web/server/ai/prompts/*.ts`                             | `apps/web`    | 从页面组件移到服务端                                         |
| AI model client                           | `apps/web/server/ai/client.ts`                                | `apps/web`    | 服务端持有模型供应商 SDK/API key，前端不依赖 `@google/genai` |

## API 路由

| 旧调用位置                            | 新文件                                                         | 目标       | 备注                                                     |
| ------------------------------------- | -------------------------------------------------------------- | ---------- | -------------------------------------------------------- |
| `ChatAssistant.tsx` AI 对话           | `apps/web/app/api/ai/chat/route.ts`                            | `apps/web` | 后端拼 prompt、调模型、流式返回；workflow 指令由后端返回 |
| `InspirationLibrary.tsx` 初次生成     | `apps/web/app/api/ai/inspiration/route.ts`                     | `apps/web` | 流式返回                                                 |
| `InspirationLibrary.tsx` 追问         | `apps/web/app/api/ai/inspiration/follow-up/route.ts`           | `apps/web` | 用 session 历史重建上下文并流式返回                      |
| `CommentAssistant.tsx` 单人生成       | `apps/web/app/api/ai/comments/single/route.ts`                 | `apps/web` | 后端结构化生成，可返回 JSON 或任务状态                   |
| `CommentAssistant.tsx` 批量上传       | `apps/web/app/api/comments/batch-jobs/route.ts`                | `apps/web` | 接收 xlsx 文件，后端解析并建任务                         |
| `CommentAssistant.tsx` 批量任务状态   | `apps/web/app/api/comments/batch-jobs/[jobId]/route.ts`        | `apps/web` | 前端轮询或订阅任务进度                                   |
| `CommentAssistant.tsx` 导出结果       | `apps/web/app/api/comments/batch-jobs/[jobId]/export/route.ts` | `apps/web` | 后端生成 xlsx 文件                                       |
| `TeachingAssist.tsx` 初次生成         | `apps/web/app/api/ai/teaching/route.ts`                        | `apps/web` | variant/knowledge，流式返回                              |
| `TeachingAssist.tsx` 追问             | `apps/web/app/api/ai/teaching/follow-up/route.ts`              | `apps/web` | 用 session 历史重建上下文并流式返回                      |
| `SimulationLab.tsx` 硬编码列表        | `apps/web/app/api/simulations/route.ts`                        | `apps/web` | 可选；第一阶段也可本地常量                               |
| `ChatHistoryContext` localStorage     | `apps/web/app/api/me/sessions/route.ts`                        | `apps/web` | 接账号后需要                                             |
| `UserPreferencesContext` localStorage | `apps/web/app/api/me/preferences/route.ts`                     | `apps/web` | 接账号后需要                                             |
| `UserPreferencesContext` 额度         | `apps/web/app/api/me/credits/route.ts`                         | `apps/web` | 真实额度                                                 |
| `AdSystem.tsx` SAMPLE_ADS             | `apps/web/app/api/ads/route.ts`                                | `apps/web` | 可选；运营后台后接数据库                                 |

## 样式

| 旧文件/来源                       | 新文件                                                               | 目标       | 备注                                                   |
| --------------------------------- | -------------------------------------------------------------------- | ---------- | ------------------------------------------------------ |
| `src/index.css`                   | `apps/web/app/globals.css`                                           | `apps/web` | Tailwind v4 import、theme、body；移除 Google Fonts URL |
| `@fontsource/inter` imports       | `apps/web/app/layout.tsx` 或 `apps/web/app/providers.tsx`            | `apps/web` | 引入 `400.css`、`500.css`、`600.css`                   |
| `src/index.css` custom-scrollbar  | `packages/ui/src/styles/utilities.css` 或 `apps/web/app/globals.css` | 视复用范围 | 当前可放 web globals                                   |
| `TeachingAssist.tsx` inline style | `apps/web/app/globals.css`                                           | `apps/web` | `animate-spin-slow` 和 scrollbar 不要继续内联          |
| `LoginModal.tsx` inline style     | `apps/web/app/globals.css`                                           | `apps/web` | `scan` keyframes                                       |
| Tailwind utility classes          | 保留在组件中                                                         | 各自位置   | 无独立 CSS module                                      |

## 图片和外部资源

| 旧来源                     | 新位置/策略                                         | 目标       | 备注                                                  |
| -------------------------- | --------------------------------------------------- | ---------- | ----------------------------------------------------- |
| `picsum.photos` AI 图片    | 后端返回内容中的远程图片 URL                        | `apps/web` | 前端按消息内容渲染；如不用 `next/image` 可不配 images |
| `picsum.photos` 广告图     | `apps/web/public/mock/ads/*` 或接口配置             | `apps/web` | 第一阶段可继续远程                                    |
| `picsum.photos` 实验缩略图 | `apps/web/public/mock/simulations/*` 或接口配置     | `apps/web` | 当前不在仓库内                                        |
| PhET iframe URL            | `apps/web/features/simulations/simulations.data.ts` | `apps/web` | 硬编码数据先迁出组件                                  |
| Google Fonts `Inter`       | 替换为 `@fontsource/inter`                          | `apps/web` | 不再请求 Google Fonts URL                             |
| README banner 外链         | 不迁移到运行时                                      | N/A        | 文档资源                                              |

## 配置

| 旧文件           | 新文件                                                 | 目标              | 备注                                                                                                     |
| ---------------- | ------------------------------------------------------ | ----------------- | -------------------------------------------------------------------------------------------------------- |
| `package.json`   | monorepo root `package.json` + `apps/web/package.json` | root / `apps/web` | 新增 `@fontsource/inter`、`@ant-design/x`；移除 `@google/genai`、`react-markdown`、`xlsx`、Vite 相关依赖 |
| `pnpm-lock.yaml` | root `pnpm-lock.yaml`                                  | root              | 由安装生成                                                                                               |
| `vite.config.ts` | 删除                                                   | `apps/web`        | Next.js 16 自带打包工具；不迁移 Vite 插件配置                                                            |
| `tsconfig.json`  | root `tsconfig.base.json` + `apps/web/tsconfig.json`   | root / `apps/web` | paths 改为 monorepo alias                                                                                |
| `.env.example`   | `apps/web/.env.example`                                | `apps/web`        | `GEMINI_API_KEY` 只服务端读取                                                                            |
| `metadata.json`  | `apps/web/app/metadata` 或 `app/layout.tsx` metadata   | `apps/web`        | camera/microphone 当前未使用，谨慎迁移                                                                   |
| `index.html`     | 删除，由 Next.js 文档结构替代                          | `apps/web`        | metadata/title 放 layout                                                                                 |
| `.npmrc`         | root `.npmrc`                                          | root              | 保留包管理配置                                                                                           |
| `.gitignore`     | root `.gitignore`                                      | root              | 保留                                                                                                     |
| `README.md`      | root 或 `apps/web/README.md`                           | root / `apps/web` | 更新 Next.js 运行方式                                                                                    |

## 数据常量

| 旧位置                                           | 新文件                                               | 目标       | 备注                |
| ------------------------------------------------ | ---------------------------------------------------- | ---------- | ------------------- |
| `SimulationLab.tsx` `SIMULATIONS`                | `apps/web/features/simulations/simulations.data.ts`  | `apps/web` | 后续可接 API/DB     |
| `SimulationLab.tsx` `SUBJECTS`, `GRADES`         | `apps/web/features/simulations/simulation-facets.ts` | `apps/web` | 筛选项              |
| `AdSystem.tsx` `SAMPLE_ADS`                      | `apps/web/features/ads/ads.data.ts`                  | `apps/web` | 后续可迁 admin 管理 |
| `InspirationLibrary.tsx` featured cases          | `apps/web/features/inspiration/inspiration.data.ts`  | `apps/web` | 案例数据            |
| `InspirationLibrary.tsx` suggestions             | `apps/web/features/inspiration/inspiration.data.ts`  | `apps/web` | 追问建议            |
| `CommentAssistant.tsx` tag groups                | `apps/web/features/comments/comment-tags.data.ts`    | `apps/web` | 标签组              |
| `TeachingAssist.tsx` levels/examples/suggestions | `apps/web/features/teaching/teaching.data.ts`        | `apps/web` | 模式、案例、追问    |

## 目前不需要迁移到 apps/admin 的文件

当前仓库没有管理后台页面。以下能力未来可能属于 `apps/admin`，但不是本次旧前端页面的直接迁移项：

- 广告主、广告素材、投放位置管理。
- PhET/实验资源库管理。
- 用户额度、套餐、赞助记录管理。
- Prompt 模板版本管理。
- 用户和会话审计。

## 迁移顺序建议

1. 先建立 `apps/web` App Router 布局和静态页面路径。
2. 安装 `@fontsource/inter` 和 `@ant-design/x`，不迁移 `@google/genai`、`react-markdown`、`xlsx`、Vite 配置。
3. 将现有页面按 route 拆入对应 page，保留表单和导航交互。
4. 抽出业务常量和 Ant Design X 对话 UI，降低页面文件体积。
5. 增加 Next.js API routes，将 AI 调用、prompt 拼装、Excel 解析和导出移到后端。
6. 再把 localStorage 历史、偏好、额度替换为账号级 API。
7. 最后考虑 `apps/admin` 的配置后台。
