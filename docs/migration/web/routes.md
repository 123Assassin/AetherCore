# 路由迁移说明

当前旧项目没有 React Router。它是单页 Vite 应用，所有页面都挂在 `/` 下，由 `App.tsx` 内部状态决定渲染哪个页面。

## 旧 React 路由/页面结构

| 旧逻辑入口 | 旧组件                   | 旧状态条件                                                 | 说明                                     |
| ---------- | ------------------------ | ---------------------------------------------------------- | ---------------------------------------- |
| `/`        | `App.tsx`                | N/A                                                        | 应用壳、Provider、侧栏、顶部栏、主内容区 |
| `/`        | `ChatAssistant.tsx`      | `activeTab === "chat"`                                     | AI 助手默认页                            |
| `/`        | `LessonModule.tsx`       | `activeTab === "lesson"`                                   | 知识库精讲容器                           |
| `/`        | `InspirationLibrary.tsx` | `activeTab === "lesson" && activeSubTab === "inspiration"` | 知识精讲                                 |
| `/`        | `SimulationLab.tsx`      | `activeTab === "lesson" && activeSubTab === "simulation"`  | 互动实验                                 |
| `/`        | `OfficeModule.tsx`       | `activeTab === "office"`                                   | 办公提效容器                             |
| `/`        | `CommentAssistant.tsx`   | `activeTab === "office" && activeSubTab === "comment"`     | 评语助手                                 |
| `/`        | `TeachingAssist.tsx`     | `activeTab === "office" && activeSubTab === "teaching"`    | 题目变身                                 |
| 弹窗       | `LoginModal.tsx`         | `isLoginModalOpen`                                         | 用户名密码登录                           |
| 弹窗       | `DonateModal.tsx`        | `isDonateModalOpen`                                        | 赞助合作                                 |
| 侧栏       | `HistorySidebar.tsx`     | `isHistoryOpen`                                            | 历史会话                                 |
| 弹窗       | `ExportAdModal`          | 页面局部广告状态                                           | 额度/导出广告                            |

## 对应的新 Next.js App Router 路径

建议将旧的状态式页面拆成真实 URL。主导航和二级导航由路由表达，历史侧栏、登录弹窗、赞助弹窗保留为 client components。

| 旧组件/状态          | 新 App Router 路径                                | 目标应用   | 迁移备注                                                    |
| -------------------- | ------------------------------------------------- | ---------- | ----------------------------------------------------------- |
| `App.tsx` 应用壳     | `apps/web/app/(app)/layout.tsx`                   | `apps/web` | 放侧栏、顶部栏、providers、历史侧栏入口                     |
| 默认 AI 助手         | `apps/web/app/(app)/chat/page.tsx`                | `apps/web` | 可将 `/` redirect 到 `/chat`                                |
| `LessonModule`       | `apps/web/app/(app)/lesson/layout.tsx`            | `apps/web` | 放知识库精讲二级导航                                        |
| `InspirationLibrary` | `apps/web/app/(app)/lesson/inspiration/page.tsx`  | `apps/web` | 知识精讲                                                    |
| `SimulationLab`      | `apps/web/app/(app)/lesson/simulation/page.tsx`   | `apps/web` | 互动实验                                                    |
| `OfficeModule`       | `apps/web/app/(app)/office/layout.tsx`            | `apps/web` | 放办公提效二级导航                                          |
| `CommentAssistant`   | `apps/web/app/(app)/office/comment/page.tsx`      | `apps/web` | 评语助手                                                    |
| `TeachingAssist`     | `apps/web/app/(app)/office/teaching/page.tsx`     | `apps/web` | 题目变身                                                    |
| 登录弹窗             | `apps/web/components/auth/login-modal.tsx`        | `apps/web` | 真实登录可改为 `/login` 或 intercepted modal                |
| 赞助弹窗             | `apps/web/components/sponsor/donate-modal.tsx`    | `apps/web` | 用户侧功能                                                  |
| 历史侧栏             | `apps/web/components/history/history-sidebar.tsx` | `apps/web` | 需要根据 pathname 过滤分类                                  |
| 广告弹窗/Loading     | `apps/web/components/ads/*`                       | `apps/web` | 用户侧广告展示                                              |
| AI 流式接口          | `apps/web/app/api/ai/*/route.ts`                  | `apps/web` | 前端不安装 `@google/genai`；后端拼 prompt、调模型、流式返回 |
| 历史/偏好/额度 API   | `apps/web/app/api/me/*/route.ts`                  | `apps/web` | 如接入真实账号后迁移本地数据                                |

## apps/web 还是 apps/admin

当前项目所有已实现页面都是教师用户侧功能，应迁移到 `apps/web`。

| 功能            | 迁移目标              | 理由                                       |
| --------------- | --------------------- | ------------------------------------------ |
| AI 助手         | `apps/web`            | 面向教师终端用户                           |
| 知识精讲        | `apps/web`            | 面向教师终端用户                           |
| 互动实验        | `apps/web`            | 面向教师终端用户                           |
| 评语助手        | `apps/web`            | 面向教师终端用户                           |
| 题目变身        | `apps/web`            | 面向教师终端用户                           |
| 登录            | `apps/web`            | 用户认证入口                               |
| 赞助合作弹窗    | `apps/web`            | 用户侧展示                                 |
| 广告展示        | `apps/web`            | 用户侧展示                                 |
| 广告素材配置    | 未来可建 `apps/admin` | 当前只是硬编码 `SAMPLE_ADS`，没有后台管理  |
| 仿真实验库配置  | 未来可建 `apps/admin` | 当前只是硬编码 `SIMULATIONS`，没有后台管理 |
| 用户额度管理    | 未来可建 `apps/admin` | 当前只是 localStorage，真实运营后台未实现  |
| Prompt 模板管理 | 未来可建 `apps/admin` | 当前 prompt 分散硬编码在页面组件           |

## 路由分组建议

```txt
apps/web/app/
  page.tsx                         -> redirect('/chat')
  (app)/
    layout.tsx                     -> 登录后/主应用布局，或当前免登录主布局
    chat/page.tsx
    lesson/
      layout.tsx
      inspiration/page.tsx
      simulation/page.tsx
    office/
      layout.tsx
      comment/page.tsx
      teaching/page.tsx
  api/
    ai/
      chat/route.ts
      inspiration/route.ts
      comments/route.ts
      teaching/route.ts
    me/
      history/route.ts
      preferences/route.ts
      credits/route.ts
```

## 需要修正的路由语义

旧 `ChatAssistant` 的 function call 使用 `setActiveTab(args.workflowName)`，但 `workflowName` 的可能值是 `comment`、`inspiration`、`teaching`，不是主 tab 值。迁移后不在前端直接调用模型 function calling，而由后端返回 workflow 指令；Next.js 前端只负责按指令跳转：

| 后端 workflowName | 应跳转路径            |
| ----------------- | --------------------- |
| `comment`         | `/office/comment`     |
| `inspiration`     | `/lesson/inspiration` |
| `teaching`        | `/office/teaching`    |
