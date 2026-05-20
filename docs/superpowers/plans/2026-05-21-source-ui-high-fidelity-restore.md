# Source UI High-Fidelity Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `source/source-web` 和 `source/source-admin` 的页面布局、视觉样式、图标、动效和主要交互外壳高保真还原到 `apps/web` 与 `apps/admin`。

**Architecture:** 采用“源 UI 外壳移植 + Next/tRPC 数据适配”的方式：优先复刻源项目的 Tailwind utility class、lucide 图标、布局尺寸、色彩和页面结构，再把已有 tRPC 调用接回页面事件。不要继续沿用当前 AetherCore/teal/inline-style 的简化视觉系统作为基础。

**Tech Stack:** pnpm workspace, Next.js 16 App Router, React 19, Tailwind CSS v4, lucide-react, motion/react, tRPC, Playwright MCP or Playwright CLI.

---

## Assumptions And Scope

- 源目录以当前仓库实际路径为准：`source/source-web` 和 `source/source-admin`。用户口中的 `source/web`、`source/admin` 指这两个源项目。
- 用户已在本地启动源项目：`source/source-admin` 在 `http://127.0.0.1:3000`，用户名 `admin`，密码 `admin123`；`source/source-web` 在 `http://127.0.0.1:3001`。
- 本计划只做迁移修复计划，不执行页面代码修改。
- 后续实现必须保留 AetherCore 目标栈：Next.js App Router、tRPC、服务端 AI/Excel 处理、现有认证接口。不要重新引入旧项目的前端 `@google/genai` 直连逻辑；不要把 `xlsx` 解析放回用户端。
- 高保真优先级高于当前迁移后的组件抽象。当前 `apps/web` 和 `apps/admin` 中大量 inline style、AetherCore brand、teal 主色、简化表单和卡片都应被源项目视觉系统替换。

## Source Visual Baseline

### Web Global Shell

- 根容器：`flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative`。
- 左侧主导航：固定 `w-[80px]` 白底窄侧栏，右边框 `border-slate-200`，品牌图标为红/玫红/橙渐变圆角方块，内部 `PenTool` 图标。
- 主导航图标：`MessageSquare` 对应 AI 助手，`BookOpen` 对应备课精讲，`PenTool` 对应办公提效；底部有 `Heart` 赞助、`LogIn`/`LogOut` 登录图标。
- 侧栏状态：激活项是 `bg-red-50 text-red-600 ring-1 ring-red-100/50 rounded-2xl`；悬停显示深色 tooltip。
- 顶栏：`h-[64px] bg-white border-b border-slate-100 px-6 sticky top-0`；左侧 `PanelLeft` 历史按钮，品牌文字为 `红笔AI` 和副标题 `你的AI教学搭档`。
- 二级导航：仅 lesson/office 显示，位于顶栏内，`bg-slate-50 p-1 rounded-[14px] ring-1 ring-slate-100`；激活按钮白底、红字、轻阴影。
- 内容区域：`main flex-1 overflow-auto relative p-6 bg-slate-50/50`；主要页面都限制 `max-w-[1400px] mx-auto`，使用 `rounded-2xl shadow-sm ring-1 ring-slate-200/60`。
- 历史侧栏：从主侧栏右侧展开 `w-64 bg-white border-r`，含“新建对话”、模块筛选会话、删除按钮和空状态。
- 全局弹窗：微信扫码登录、赞助合作、广告导出弹窗和生成 loading 广告卡都要保留源项目的尺寸、圆角、文案和图标。

### Web Pages

- `/chat`：一个大聊天面板，顶部默认 assistant 欢迎气泡，头像为橙/玫渐变 `Bot`，建议追问 chips 在气泡下，底部一行输入框和 `Send` 图标。
- `/lesson/inspiration`：左侧 `lg:w-[340px]` 表单卡，右侧输出卡；红/橙渐变主按钮；空状态中间有 `Sparkles` 图标和三张案例卡。
- `/lesson/simulation`：左侧 `w-72` 科目/年级筛选栏，右侧结果区；顶部显示结果数、筛选 chips、搜索框；资源卡为 `rounded-3xl` 图片卡，hover 出现“立即开始”，点击打开全屏 iframe 覆盖层。
- `/office/comment`：顶部 tab 为“单人评语精编 / 批量表格导入”，单人模式左侧表单 `lg:col-span-5`，右侧结果区 `lg:col-span-7`，主色 emerald；批量模式为左侧导入指南、右侧大面积虚线上传区，导入后显示表格工具栏。
- `/office/teaching`：左侧 `lg:w-[420px]` 三步控制面板，右侧大圆角输出区；主色 blue；有“原题变式 / 知识点出题” segmented control、三档力度卡片和三张案例卡。

### Admin Global Shell

- 全局主题来自 `source/source-admin/src/index.css`：`--color-primary: #2563eb`、`--color-primary-dark: #1d4ed8`、`--color-bg-light: #f8fafc`、`--color-sidebar-dark: #0f172a`。
- 登录页：深色全屏背景，居中深色玻璃卡，`ShieldCheck` logo，标题 `Nexus 管理后台`，固定用户名 `admin`，密码框，蓝色 `登录系统` 按钮，底部 `系统版本 v4.12.0 // AES-256 加密保护`。
- 后台侧栏：`w-64 bg-sidebar-dark h-screen sticky top-0 shadow-2xl`；顶部 `ShieldCheck` logo 和 `Nexus 管理后台 / 管理中心`；底部管理员卡片和 `LogOut`。
- 导航图标必须使用源项目 lucide 列表：`LayoutDashboard`、`FolderOpen`、`Bot`、`TerminalSquare`、`ShieldAlert`、`Database`、`ServerCog`、`UsersIcon`、`Activity`、`Bell`、`Share2`、`Shield`、`FileText`、`FileSearch`、`LineChart`、`BellRing`、`SettingsIcon`。
- 导航分组默认展开：`内容与资源管理`、`运营配置`、`安全与系统监控`。父级按钮用 `ChevronDown`/`ChevronRight`，子项激活态 `bg-primary text-white shadow-md shadow-primary/20`。
- 顶栏：`h-20 border-b border-slate-200 bg-white/90 backdrop-blur-xl sticky top-0 z-40 px-10`，只显示当前页面中文标题。
- 内容区：`p-8 flex-1 max-w-7xl mx-auto w-full overflow-x-hidden`。

### Admin Pages

- `/dashboard`：顶部标题和说明；四个统计卡片横排，图标色块和趋势 badge；下方大图表占位卡 + 右侧“流量来源 Top 5”。
- `/resources/agents`：大标题 `智能体管理`，右上 `新增智能体` 蓝色按钮；智能体使用大尺寸白色圆角卡片，含芯片图标、模型、temperature/top-p、状态 badge 和日期。
- `/resources/prompts`：Prompt 版本卡片/预览保留源项目卡片式结构，Markdown 预览可以继续使用目标项目已有后端数据。
- `/resources/sensitive-words`：敏感词库列表和新增/编辑弹窗保留源项目圆角、tag 和确认删除样式。
- `/simulations`：管理端仿真库不是用户端实验页；它是左侧资源分类筛选树 + 右侧资源卡网格，带启用开关、卡片图片、视图切换按钮。
- `/engine-dispatch`：引擎表格/卡片、API Key hover 显示、CRUD 弹窗还原源项目蓝色后台风格。
- `/users`：用户管理控制台的统计卡、搜索区、表格、状态/黑名单按钮还原源视觉。
- `/operations/activities`：活动通告列表项、右上新增按钮、编辑弹窗、空状态还原源布局。
- `/operations/fission`：顶部 `邀请链路 / 奖励配置` segmented control，裂变树节点、奖励配置表单、开关和滑条还原源样式。
- `/security/system-audit` 与 `/security/content-audit`：表格、导出日期弹窗、内容删除确认弹窗还原源项目。
- `/security/traffic-monitor`：引擎监控卡片、Token/延迟/费用指标和状态样式还原源项目。
- `/alarm`：费用告警阈值和邮箱表单采用源项目白卡片、橙色告警提示和蓝色主按钮。
- `/settings`：密码设置和退出登录面板还原源项目 spacing、卡片和按钮层级。

## Current Migration Gaps

- `apps/web` 当前外壳是 `AetherCore` 品牌、248px 文本侧栏、teal 主色和普通 CSS class，和源用户端 80px 图标侧栏完全不一致。
- `apps/web` 当前页面将源项目的左右分栏、大圆角卡片、模块主色、登录/赞助/历史侧栏和广告 loading 简化掉了。
- `apps/admin` 当前外壳是 inline style、teal 主色、`AetherCore Admin Console`，和源后台 `Nexus 管理后台`、蓝色主色、深色 lucide 分组导航不一致。
- `apps/admin` 当前页面组件普遍是功能可用优先，缺少源项目的 32px 大圆角卡片、阴影、分组标题、图标和 modal 动效。
- `apps/web/package.json` 与 `apps/admin/package.json` 目前没有 `lucide-react`；`motion` 也未接入目标端，导致源项目图标和折叠/弹窗动效无法 1:1 复用。
- 两个 Next app 目前没有全局 Tailwind v4 CSS 入口；后续如果直接移植源项目 className，需要先补齐 Tailwind/PostCSS 接入。

## Approach Decision

Recommended: **源 UI 移植优先，数据适配其次。** 先把源项目的页面结构、className、图标和动效迁到目标 Next client components，再把事件处理接到已有 tRPC。这个方式最接近 1:1，并能避免在当前简化组件上反复调样式。

Rejected alternative: **在现有 AetherCore 组件上逐项微调。** 当前视觉骨架和源项目差距太大，微调会产生大量局部补丁，仍难达到高保真。

Rejected alternative: **完整复制旧 Vite 项目逻辑。** 这会把 `@google/genai` 前端直连、`xlsx` 前端解析和旧本地状态模式带回目标项目，违反 AetherCore 迁移方向。

## Task 1: Visual Baseline And Diff Matrix

**Files:**

- Create: `docs/migration/visual-parity/source-ui-baseline.md`

- [x] **Step 1: Confirm source servers**

Run:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:3001 -sTCP:LISTEN
```

Expected: `3000` and `3001` both have a `node` listener.

- [x] **Step 2: Capture source screenshots**

Use Playwright MCP if available. If MCP reports an existing profile lock, use Playwright CLI/Node with Chrome channel. Capture these states:

```text
web: chat, lesson/inspiration, lesson/simulation, office/comment, office/teaching, history-open
admin: login, dashboard, agents, prompts, sensitive-words, simulations, engine-dispatch, users, activities, fission, system-audit, content-audit, traffic-monitor, alarm, settings
```

Admin login credentials:

```text
username: admin
password: admin123
```

- [x] **Step 3: Write baseline matrix**

Document each route with:

```markdown
| Target route | Source state       | Must-match layout                      | Must-match color/icon/style    | Main interactions                      |
| ------------ | ------------------ | -------------------------------------- | ------------------------------ | -------------------------------------- |
| /chat        | source-web AI 助手 | 80px sidebar + 64px header + chat card | red/rose/orange, Bot/User/Send | send, suggestion chips, history toggle |
```

Repeat rows for every source state listed in Step 2.

- [x] **Step 4: Verify baseline file**

Run:

```bash
rg -n "80px|64px|Nexus|红笔AI|lucide|source-web|source-admin|admin123" docs/migration/visual-parity/source-ui-baseline.md
git diff --check docs/migration/visual-parity/source-ui-baseline.md
```

Expected: all key visual anchors are present and no whitespace errors are reported.

## Task 2: Enable Target Visual Stack

**Files:**

- Modify: `apps/web/package.json`
- Modify: `apps/admin/package.json`
- Modify: `apps/web/postcss.config.mjs`
- Modify: `apps/admin/postcss.config.mjs`
- Create: `apps/web/src/app/globals.css`
- Create: `apps/admin/src/app/globals.css`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/admin/src/app/layout.tsx`
- Modify: `pnpm-lock.yaml`

- [x] **Step 1: Add visual dependencies**

Add `lucide-react` to both `apps/web` and `apps/admin`. Add `motion` to `apps/admin`; add it to `apps/web` only if restoring source modal/loading animation requires it. Add `@tailwindcss/postcss` where PostCSS processing needs Tailwind v4.

Run:

```bash
pnpm --filter web add lucide-react
pnpm --filter admin add lucide-react motion
pnpm add -D @tailwindcss/postcss -w
```

Expected: `pnpm-lock.yaml` updates and no workspace package is removed.

- [x] **Step 2: Enable Tailwind v4 PostCSS**

Set both app PostCSS configs to use Tailwind v4:

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

- [x] **Step 3: Add web global CSS**

Create `apps/web/src/app/globals.css` from `source/source-web/src/index.css`, replacing Google Fonts import with existing `@fontsource/inter` imports in layout:

```css
@import 'tailwindcss';

@theme {
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
}

@utility custom-scrollbar {
  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 10px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #cbd5e1;
  }
}

body {
  font-family: var(--font-sans);
  background-color: #f9fafb;
}
```

- [x] **Step 4: Add admin global CSS**

Create `apps/admin/src/app/globals.css` from `source/source-admin/src/index.css`:

```css
@import 'tailwindcss';

@theme {
  --color-primary: #2563eb;
  --color-primary-dark: #1d4ed8;
  --color-bg-light: #f8fafc;
  --color-sidebar-dark: #0f172a;
}

body {
  background: #f8fafc;
  color: #1e293b;
  font-family:
    'Inter',
    system-ui,
    -apple-system,
    sans-serif;
}

.card-hover {
  transition: all 300ms;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 999px;
}
```

- [x] **Step 5: Import global CSS**

Import each `globals.css` in its app root layout directly after font imports:

```ts
import './globals.css';
```

- [x] **Step 6: Verify visual stack**

Run:

```bash
pnpm --filter web type-check
pnpm --filter admin type-check
pnpm --filter web lint
pnpm --filter admin lint
```

Expected: all commands pass.

## Task 3: Restore Web Shell, Navigation, History, And Modals

**Files:**

- Replace: `apps/web/src/components/layout/app-shell.tsx`
- Replace: `apps/web/src/components/layout/app-sidebar.tsx`
- Replace: `apps/web/src/components/layout/app-header.tsx`
- Create: `apps/web/src/components/layout/history-sidebar.tsx`
- Modify: `apps/web/src/components/auth/wechat-login-modal.tsx`
- Modify: `apps/web/src/components/sponsor/donate-modal.tsx`
- Create: `apps/web/src/components/sponsor/ad-system.tsx`
- Create: `apps/web/src/contexts/chat-history-context.tsx`
- Create: `apps/web/src/contexts/user-preferences-context.tsx`
- Modify: `apps/web/src/app/(app)/layout.tsx`

- [x] **Step 1: Port source contexts**

Port `source/source-web/src/contexts/ChatHistoryContext.tsx` and `UserPreferencesContext.tsx` into `apps/web/src/contexts`, keeping localStorage keys and behavior compatible with source UI.

- [x] **Step 2: Restore 80px sidebar**

Implement the `AppSidebar` using the source `Sidebar.tsx` layout, with Next route navigation:

```text
chat -> /chat
lesson -> /lesson/inspiration
office -> /office/comment
```

Use exact icons and active classes from source.

- [x] **Step 3: Restore 64px header and subnav**

Implement `AppHeader` with source brand, history button and segmented subnav. Map subnav routes:

```text
lesson inspiration -> /lesson/inspiration
lesson simulation -> /lesson/simulation
office comment -> /office/comment
office teaching -> /office/teaching
```

- [x] **Step 4: Restore history sidebar**

Port `HistorySidebar` visual structure and filter sessions by source categories:

```text
chat -> chat
lesson -> inspiration, simulation
office -> comment, teaching
```

- [x] **Step 5: Restore modals**

Replace current login and sponsor modal styling with source `LoginModal.tsx` and `DonateModal.tsx` visuals. Port `AdSystem.tsx` as `ad-system.tsx` for loading and export-ad surfaces.

- [x] **Step 6: Verify web shell**

Run app and inspect:

```bash
pnpm --filter web dev
```

Open:

```text
http://127.0.0.1:3001/chat
http://127.0.0.1:3001/lesson/inspiration
http://127.0.0.1:3001/office/comment
```

Expected: left sidebar is 80px, top header is 64px, brand is `红笔AI`, active icons and subnav match source screenshots.

## Task 4: Restore Web Chat Page

**Files:**

- Replace: `apps/web/src/app/(app)/chat/page.tsx`
- Modify: `apps/web/src/components/chat/ai-message-bubble.tsx`
- Modify: `apps/web/src/components/chat/ai-sender.tsx`
- Modify: `apps/web/src/components/chat/chat-message-list.tsx`
- Modify: `apps/web/src/components/chat/suggestion-chips.tsx`

- [x] **Step 1: Restore chat layout**

Use source `ChatAssistant.tsx` JSX structure:

```text
flex h-full max-w-[1400px] mx-auto pb-4 md:pb-6 gap-4 bg-white
panel: flex-1 bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/60 min-h-[500px]
messages: p-4 md:p-6 space-y-6 bg-slate-50/30
input: p-4 bg-white border-t border-slate-100
```

- [x] **Step 2: Keep tRPC send path**

Keep the existing `client.ai.chat.send.mutate` call, session id handling and workflow redirect mapping. Only replace the visual shell and message rendering.

- [x] **Step 3: Restore default assistant message**

When no messages exist, render the source welcome copy:

```text
老师您好！我是红笔AI，您的专属教学AI助手。您可以直接和我聊天，或者告诉我您的需求（比如：“帮我写个评语”、“我想备课”），我会为您打开对应的专业工具。
```

Suggestions:

```text
帮我写一份期末评语
我想找点备课灵感
如何处理课堂上的突发情况？
```

- [x] **Step 4: Verify chat page**

Run:

```bash
pnpm --filter web type-check
pnpm --filter web lint
```

Expected: chat page compiles, no lint errors, visual structure matches source chat.

## Task 5: Restore Web Lesson Pages

**Files:**

- Modify: `apps/web/src/app/(app)/lesson/layout.tsx`
- Replace: `apps/web/src/app/(app)/lesson/inspiration/page.tsx`
- Replace: `apps/web/src/app/(app)/lesson/simulation/page.tsx`
- Modify: `apps/web/src/components/inspiration/featured-inspiration-cases.tsx`
- Modify: `apps/web/src/components/inspiration/inspiration-chat-panel.tsx`
- Modify: `apps/web/src/components/inspiration/inspiration-form.tsx`
- Modify: `apps/web/src/components/inspiration/inspiration.data.ts`
- Modify: `apps/web/src/components/simulations/simulation-card.tsx`
- Modify: `apps/web/src/components/simulations/simulation-empty-state.tsx`
- Modify: `apps/web/src/components/simulations/simulation-filters.tsx`
- Modify: `apps/web/src/components/simulations/simulation-player-overlay.tsx`
- Modify: `apps/web/src/components/simulations/simulation-results-header.tsx`

- [x] **Step 1: Restore lesson wrapper**

Use source `LessonModule.tsx` wrapper:

```text
flex flex-col h-full bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/60 overflow-hidden mb-4 md:mb-6
```

- [x] **Step 2: Restore inspiration split view**

Port source `InspirationLibrary.tsx` visual layout. Keep existing tRPC calls:

```text
client.ai.inspiration.generate.mutate
client.ai.inspiration.followUp.mutate
```

Keep source card copy and examples: 三角函数、氧化还原反应、楞次定律.

- [x] **Step 3: Restore simulation lab layout**

Port source `SimulationLab.tsx` visual layout. Keep target server-backed simulation list if available, but present it through the source filter/sidebar/card/overlay UI.

- [x] **Step 4: Verify lesson pages**

Run:

```bash
pnpm --filter web type-check
pnpm --filter web lint
```

Open:

```text
/lesson/inspiration
/lesson/simulation
```

Expected: source left-form/right-output layout and source simulation filter/sidebar/card layout are restored.

## Task 6: Restore Web Office Pages

**Files:**

- Modify: `apps/web/src/app/(app)/office/layout.tsx`
- Replace: `apps/web/src/app/(app)/office/comment/page.tsx`
- Replace: `apps/web/src/app/(app)/office/teaching/page.tsx`
- Modify: `apps/web/src/components/comments/batch-comment-table.tsx`
- Modify: `apps/web/src/components/comments/batch-comment-toolbar.tsx`
- Modify: `apps/web/src/components/comments/batch-import-guide.tsx`
- Modify: `apps/web/src/components/comments/comment-mode-tabs.tsx`
- Modify: `apps/web/src/components/comments/comment-result-list.tsx`
- Modify: `apps/web/src/components/comments/excel-upload-dropzone.tsx`
- Modify: `apps/web/src/components/comments/single-comment-form.tsx`
- Modify: `apps/web/src/components/comments/student-tag-selector.tsx`
- Modify: `apps/web/src/components/teaching/teaching-context-form.tsx`
- Modify: `apps/web/src/components/teaching/teaching-example-cards.tsx`
- Modify: `apps/web/src/components/teaching/teaching-input-mode-toggle.tsx`
- Modify: `apps/web/src/components/teaching/teaching-prompt-input.tsx`
- Modify: `apps/web/src/components/teaching/teaching-result-panel.tsx`
- Modify: `apps/web/src/components/teaching/transformation-level-selector.tsx`

- [x] **Step 1: Restore office wrapper**

Use source `OfficeModule.tsx` wrapper with the same `rounded-2xl shadow-sm ring-1` visual treatment as lesson.

- [x] **Step 2: Restore comment assistant**

Port source `CommentAssistant.tsx` visual states:

```text
single tabs, left form, right empty/loading/result cards
batch guide + upload dropzone
batch queue table toolbar
emerald active color
```

Keep existing tRPC calls for single generation, batch upload, row generation and export.

- [x] **Step 3: Restore teaching assist**

Port source `TeachingAssist.tsx` visual layout:

```text
420px control panel
three numbered sections
blue segmented input mode
three transformation cards
large rounded output panel
example cards
```

Keep existing tRPC calls for generation and follow-up.

- [x] **Step 4: Verify office pages**

Run:

```bash
pnpm --filter web type-check
pnpm --filter web lint
```

Open:

```text
/office/comment
/office/teaching
```

Expected: comment and teaching pages match source screenshots in layout, color and icon hierarchy.

## Task 7: Restore Admin Login And Shell

**Files:**

- Replace: `apps/admin/src/app/login/page.tsx`
- Replace: `apps/admin/src/components/layout/admin-shell.tsx`
- Replace: `apps/admin/src/components/layout/admin-sidebar.tsx`
- Replace: `apps/admin/src/components/layout/admin-header.tsx`
- Modify: `apps/admin/src/app/(admin)/layout.tsx`

- [x] **Step 1: Restore login visual**

Port `source/source-admin/src/pages/Login.tsx` visual design. Keep target admin auth mutation/session behavior, but preserve source copy and layout:

```text
Nexus 管理后台
需要进行身份验证
授权账号 admin
访问凭据 password
登录系统
系统版本 v4.12.0 // AES-256 加密保护
```

- [x] **Step 2: Restore dark sidebar**

Port source `Sidebar` from `source/source-admin/src/App.tsx`, replacing React Router `Link` with Next `Link`. Preserve default expanded group names and exact lucide icons.

- [x] **Step 3: Restore header/content shell**

Use source header and content sizing:

```text
header h-20 px-10 bg-white/90 backdrop-blur-xl
content p-8 flex-1 max-w-7xl mx-auto w-full overflow-x-hidden
```

- [x] **Step 4: Verify admin shell**

Run:

```bash
pnpm --filter admin type-check
pnpm --filter admin lint
```

Open:

```text
/login
/dashboard
/resources/agents
```

Expected: login is dark Nexus page; authenticated shell uses blue/dark Nexus sidebar and source top header.

## Task 8: Restore Admin Dashboard And Resource Pages

**Files:**

- Replace: `apps/admin/src/app/(admin)/dashboard/page.tsx`
- Replace: `apps/admin/src/app/(admin)/resources/agents/page.tsx`
- Replace: `apps/admin/src/app/(admin)/resources/prompts/page.tsx`
- Replace: `apps/admin/src/app/(admin)/resources/sensitive-words/page.tsx`
- Modify: `apps/admin/src/components/dashboard/dashboard-stat-card.tsx`
- Modify: `apps/admin/src/components/dashboard/traffic-source-list.tsx`
- Modify: `apps/admin/src/components/resources/agent-card.tsx`
- Modify: `apps/admin/src/components/resources/agent-form-dialog.tsx`
- Modify: `apps/admin/src/components/resources/prompt-card.tsx`
- Modify: `apps/admin/src/components/resources/prompt-form-dialog.tsx`
- Modify: `apps/admin/src/components/resources/prompt-markdown-preview.tsx`
- Modify: `apps/admin/src/components/resources/sensitive-word-form-dialog.tsx`
- Modify: `apps/admin/src/components/resources/sensitive-word-list-card.tsx`

- [x] **Step 1: Restore dashboard**

Port source `Dashboard.tsx` layout and visual tokens. Keep target data source if available; when API returns no data, use the same source-style placeholders instead of current inline-style placeholders.

- [x] **Step 2: Restore agents**

Port source `Agents.tsx` card grid and modal style. Keep target CRUD event handlers and tRPC calls.

- [x] **Step 3: Restore prompts**

Port source `AIPrompts.tsx` list, action buttons and modal style. Keep current `react-markdown` preview if it already works.

- [x] **Step 4: Restore sensitive words**

Port source `SensitiveWords.tsx` list card, tag chips and delete confirmation style.

- [x] **Step 5: Verify dashboard/resources**

Run:

```bash
pnpm --filter admin type-check
pnpm --filter admin lint
```

Expected: dashboard and resource routes use source card radius, blue primary color, lucide icons and spacing.

## Task 9: Restore Admin Simulation, Engine, Users, And Operations Pages

**Files:**

- Replace: `apps/admin/src/app/(admin)/simulations/page.tsx`
- Replace: `apps/admin/src/app/(admin)/engine-dispatch/page.tsx`
- Replace: `apps/admin/src/app/(admin)/users/page.tsx`
- Replace: `apps/admin/src/app/(admin)/operations/activities/page.tsx`
- Replace: `apps/admin/src/app/(admin)/operations/fission/page.tsx`
- Modify: `apps/admin/src/components/simulations/simulation-card.tsx`
- Modify: `apps/admin/src/components/simulations/simulation-tree-filter.tsx`
- Modify: `apps/admin/src/components/engines/engine-form-dialog.tsx`
- Modify: `apps/admin/src/components/engines/engine-table.tsx`
- Modify: `apps/admin/src/components/users/quota-badge.tsx`
- Modify: `apps/admin/src/components/users/users-stats.tsx`
- Modify: `apps/admin/src/components/users/users-table.tsx`
- Modify: `apps/admin/src/components/operations/activity-notice-form-dialog.tsx`
- Modify: `apps/admin/src/components/operations/activity-notice-list-item.tsx`
- Modify: `apps/admin/src/components/operations/invite-tree.tsx`
- Modify: `apps/admin/src/components/operations/reward-config-form.tsx`

- [x] **Step 1: Restore admin simulations**

Use source admin `Simulations.tsx` visual, not source web `SimulationLab.tsx`. Preserve left resource taxonomy and right card grid with enable toggles.

- [x] **Step 2: Restore engine dispatch and users**

Port source `EngineDispatch.tsx` and `Users.tsx` structure, using existing tRPC data and mutations.

- [x] **Step 3: Restore activities and fission**

Port source `Activities.tsx` and `Fission.tsx` visuals, including `motion/react` collapses and segmented control.

- [x] **Step 4: Verify admin mid-section pages**

Run:

```bash
pnpm --filter admin type-check
pnpm --filter admin lint
```

Expected: routes match source blue/dark admin visual system and page-specific cards/modals.

## Task 10: Restore Admin Security, Alarm, And Settings Pages

**Files:**

- Replace: `apps/admin/src/app/(admin)/security/system-audit/page.tsx`
- Replace: `apps/admin/src/app/(admin)/security/content-audit/page.tsx`
- Replace: `apps/admin/src/app/(admin)/security/traffic-monitor/page.tsx`
- Replace: `apps/admin/src/app/(admin)/alarm/page.tsx`
- Replace: `apps/admin/src/app/(admin)/settings/page.tsx`
- Modify: `apps/admin/src/components/security/audit-log-table.tsx`
- Modify: `apps/admin/src/components/security/content-audit-table.tsx`
- Modify: `apps/admin/src/components/security/export-csv-dialog.tsx`
- Modify: `apps/admin/src/components/security/traffic-engine-card.tsx`
- Modify: `apps/admin/src/components/alarm/alarm-config-form.tsx`
- Modify: `apps/admin/src/components/settings/password-settings-form.tsx`
- Modify: `apps/admin/src/components/settings/sign-out-panel.tsx`

- [ ] **Step 1: Restore audit pages**

Port source table layouts and export/delete modals from `SystemAudit.tsx` and `ContentAudit.tsx`.

- [ ] **Step 2: Restore traffic monitor**

Port source `TrafficMonitor.tsx` card layout and status colors.

- [ ] **Step 3: Restore alarm/settings**

Port source `AlarmCenter.tsx` and `Settings.tsx` visual structure while keeping target auth/password APIs.

- [ ] **Step 4: Verify admin final pages**

Run:

```bash
pnpm --filter admin type-check
pnpm --filter admin lint
```

Expected: security, alarm and settings pages match source page hierarchy, card styling and modal treatments.

## Task 11: Visual Regression Verification

**Files:**

- Create: `docs/migration/visual-parity/final-visual-verification.md`

- [ ] **Step 1: Run static checks**

Run:

```bash
pnpm --filter web type-check
pnpm --filter admin type-check
pnpm --filter web lint
pnpm --filter admin lint
pnpm build:web
pnpm build:admin
```

Expected: all commands pass.

- [ ] **Step 2: Capture target screenshots**

Run target apps on non-source ports to avoid conflict:

```bash
pnpm --filter web dev -- -p 3101
pnpm --filter admin dev -- -p 3102
```

Capture the same route/state list from Task 1.

- [ ] **Step 3: Compare source and target**

Write `docs/migration/visual-parity/final-visual-verification.md` with:

```markdown
| Route/state | Source screenshot | Target screenshot | Result | Notes                            |
| ----------- | ----------------- | ----------------- | ------ | -------------------------------- |
| web chat    | captured          | captured          | pass   | Sidebar/header/panel/input match |
```

Every row must be `pass` or include a concrete follow-up patch reference.

- [ ] **Step 4: Browser console check**

Use Playwright MCP when available. For every target route, verify:

```text
no hydration error
no uncaught runtime error
no missing icon import error
no layout-blocking 404 except favicon
```

## Task 12: Cleanup And Handoff

**Files:**

- Modify: `docs/migration/visual-parity/final-visual-verification.md`
- Modify: `docs/superpowers/plans/2026-05-21-source-ui-high-fidelity-restore.md`

- [ ] **Step 1: Remove temporary artifacts**

Remove screenshots outside `docs/migration/visual-parity` and stop local dev servers started by the implementation session.

- [ ] **Step 2: Confirm dependency direction**

Run:

```bash
rg -n "@google/genai|from 'xlsx'|from \"xlsx\"" apps/web apps/admin
```

Expected: no matches in `apps/web`; no accidental frontend Gemini direct calls in `apps/admin`.

- [ ] **Step 3: Final git diff review**

Run:

```bash
git status --short
git diff --stat
git diff --check
```

Expected: changed files only match this plan, generated temp files are absent, no whitespace errors.

- [ ] **Step 4: Commit**

Commit once visual verification passes:

```bash
git add apps/web apps/admin pnpm-lock.yaml docs/migration/visual-parity docs/superpowers/plans/2026-05-21-source-ui-high-fidelity-restore.md
git commit -m "fix: restore source ui visual fidelity"
```
