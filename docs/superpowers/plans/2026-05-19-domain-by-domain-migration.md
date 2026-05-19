# Domain-by-Domain Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for crash/resume tracking.

**Goal:** 将旧 `source_web`/`source_admin` 能力按业务域迁移到 AetherCore monorepo，统一使用 Drizzle + NestJS + tRPC + Next.js，并保留前端 mock 自测能力。

**Architecture:** 按业务域纵向迁移，但每个业务域再拆成小提交：旧页面分析 -> DB schema -> tRPC contract -> NestJS module/service -> Next.js 页面 -> 组件抽取 -> 联调验证。API 通信以 tRPC 为主；旧 REST 文档仅作为字段和业务边界参考。

**Tech Stack:** pnpm workspace, Turborepo, Next.js 16 App Router, React 19, NestJS 10 + Fastify, tRPC v11, Drizzle ORM, PostgreSQL, Redis, shadcn/ui + Tailwind, Docker Compose, pgAdmin.

---

## Resume Rules

- 每次恢复后先运行 `git status --short`，打开本计划，继续第一个未勾选 task。
- 每个 task 只处理 `Files` 中列出的文件，不做跨域顺手重构。
- 每个 task 结束前运行该 task 的验证命令，验证通过后提交。
- 当前仓库未发现 `source_web` / `source_admin` 目录；若执行时仍缺失，旧页面分析以 `docs/migration/**` 为准，并在分析文档中记录该事实。
- 当前仓库已存在 `docker-compose.yml`，包含 Postgres、Redis、pgAdmin 以及 `app` profile 下的 `db-init/server/web/admin` 服务；Docker task 只维护和验证该文件。
- 业务组件默认留在 `apps/web/src/components` 或 `apps/admin/src/components`；只有 Button、Dialog、Input、Table、Card、Badge、Form 等通用 UI primitive 可以进入 `packages/ui`。
- 所有涉及 `apps/web` 或 `apps/admin` 页面、布局、路由、交互组件的前端 task，页面级测试必须使用 Playwright MCP 执行；至少覆盖目标路由打开、关键元素可见、主要交互（导航、表单、弹窗、上传等按页面实际能力选择）以及浏览器控制台错误检查，不能只用 type-check、lint 或 build 代替页面测试。

---

## Task 1: 迁移基线核对与执行索引

**Files:**

- Create: `docs/migration/execution-index.md`

- [x] **Step 1: Read baseline files**
  - Read `AGENTS.md`, `package.json`, `docs/AetherCore规范.md`, `docs/migration/web/spec.md`, `docs/migration/admin/spec.md`, `docs/migration/api/backend-design.md`, `docs/migration/api/database-schema.md`.
  - Confirm `source_web` and `source_admin` presence with `test -d source_web; test -d source_admin`.

- [x] **Step 2: Create execution index**
  - Create `docs/migration/execution-index.md` with:
    - source directory availability.
    - business domain list.
    - target app mapping: user pages -> `apps/web`; admin/internal pages -> `apps/admin`.
    - tRPC-over-REST decision.
    - note that `docker-compose.yml` already exists and includes pgAdmin.

- [x] **Testing steps**
  - Verify every business domain from web/admin migration docs appears in the index.
  - Verify no source directory assumption is unstated.

- [x] **Verification commands**

```bash
test -f docs/migration/execution-index.md
rg -n "tRPC|apps/web|apps/admin|pgAdmin|source_web|source_admin" docs/migration/execution-index.md
git diff --check docs/migration/execution-index.md
```

- [x] **Commit**

```bash
git add docs/migration/execution-index.md
git commit -m "docs: add migration execution index"
```

---

## Task 2: tRPC Server Mount

**Files:**

- Create: `apps/server/src/trpc/context.ts`
- Create: `apps/server/src/trpc/router.ts`
- Create: `apps/server/src/trpc/trpc.module.ts`
- Create: `apps/server/src/trpc/trpc.service.ts`
- Modify: `apps/server/src/app.module.ts`
- Modify: `apps/server/src/main.ts`

- [x] **Step 1: Add minimal tRPC context and router**
  - Define request context in `context.ts`.
  - Define an empty root router plus a `health.ping` procedure in `router.ts`.

- [x] **Step 2: Mount tRPC in Nest/Fastify**
  - Add `TrpcModule` and `TrpcService`.
  - Mount the tRPC handler at `/trpc`.

- [x] **Testing steps**
  - Server type-checks with tRPC imports.
  - `health.ping` is callable once server is running.

- [x] **Verification commands**

```bash
pnpm --filter server type-check
pnpm --filter server lint
```

- [x] **Commit**

```bash
git add apps/server/src/trpc apps/server/src/app.module.ts apps/server/src/main.ts
git commit -m "feat: mount server trpc router"
```

---

## Task 3: Shared API Client Contract

**Files:**

- Modify: `packages/api/src/client.ts`
- Modify: `packages/api/src/server.ts`
- Modify: `packages/api/src/index.ts`
- Create: `packages/shared/src/types/api.ts`
- Modify: `packages/shared/src/types/index.ts`
- Modify: `packages/shared/src/index.ts`

- [x] **Step 1: Export typed client helpers**
  - Update `packages/api/src/client.ts` to export generic typed tRPC client helpers.
  - Do not import `AppRouter` from `apps/server` in `packages/api`; app-local tRPC clients/providers bind the concrete `AppRouter` type in later app tasks.
  - Update `server.ts` with a generic server caller factory placeholder that can be wired to a concrete router type outside `packages/api`.

- [x] **Step 2: Add shared API result types**
  - Add common pagination and API error/code types to `packages/shared/src/types/api.ts`.
  - Export them through shared package indexes.

- [x] **Testing steps**
  - Type-check verifies `@package/api` does not import `apps/server` or app-local router definitions.
  - Shared API types export from `@package/shared`.

- [x] **Verification commands**

```bash
pnpm --filter @package/shared type-check
pnpm --filter @package/api type-check
pnpm --filter @package/api lint
```

- [x] **Commit**

```bash
git add packages/api/src packages/shared/src
git commit -m "feat: add shared typed api client"
```

---

## Task 4: App tRPC Providers

**Files:**

- Create: `apps/web/src/trpc/client.ts`
- Create: `apps/web/src/trpc/provider.tsx`
- Create: `apps/admin/src/trpc/client.ts`
- Create: `apps/admin/src/trpc/provider.tsx`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/admin/src/app/layout.tsx`
- Create: `packages/api/src/client.js` (authorized Task 4 Turbopack source-resolution fix)
- Create: `packages/api/src/server.js` (authorized Task 4 Turbopack source-resolution fix)
- Modify: `apps/server/src/main.ts` (Task 4 CORS fix required by quality review)

- [x] **Step 1: Add web tRPC provider**
  - Use `NEXT_PUBLIC_API_URL` with fallback `http://localhost:3000`.
  - Keep provider as a client component.

- [x] **Step 2: Add admin tRPC provider**
  - Mirror web provider behavior for `apps/admin`.
  - Wrap root layout body with provider.

- [x] **Testing steps**
  - Web and admin root layouts type-check as Next.js layouts.
  - Provider imports resolve from `@package/api`.
  - `@package/api` source shims resolve in Next/Turbopack builds.
  - Browser tRPC calls from default web/admin origins receive CORS headers.
  - Playwright MCP opened web/admin root routes and confirmed expected page text; both routes also reported the pre-existing missing `/favicon.ico` console 404.

- [x] **Verification commands**

```bash
pnpm --filter server type-check
pnpm --filter server lint
pnpm --filter @package/api type-check
pnpm --filter @package/api lint
pnpm --filter web type-check
pnpm --filter admin type-check
pnpm --filter web lint
pnpm --filter admin lint
pnpm build:web
pnpm build:admin
```

- [x] **Commit**

```bash
git add apps/web/src/trpc apps/admin/src/trpc apps/web/src/app/layout.tsx apps/admin/src/app/layout.tsx packages/api/src/client.js packages/api/src/server.js apps/server/src/main.ts docs/superpowers/plans/2026-05-19-domain-by-domain-migration.md
git commit -m "feat: add app trpc providers"
```

---

## Task 5: Auth Package Primitives

**Files:**

- Create: `packages/auth/src/password.ts`
- Create: `packages/auth/src/jwt.ts`
- Create: `packages/auth/src/guards.ts`
- Modify: `packages/auth/src/session.ts`
- Modify: `packages/auth/src/index.ts`
- Modify: `packages/auth/src/redis.ts` (Task 5 quality-review fix: avoid Redis connection on pure root imports)
- Modify: `packages/auth/package.json` (authorized Task 5 bcrypt dependency declaration)
- Modify: `pnpm-lock.yaml` (authorized Task 5 dependency lockfile update)

- [x] **Step 1: Add password helpers**
  - Implement hash and verify helpers in `password.ts`.
  - Keep bcrypt usage centralized in `packages/auth`.

- [x] **Step 2: Add token and guard payload types**
  - Add signed token helpers in `jwt.ts`.
  - Add user/admin payload and guard result types in `guards.ts`.

- [x] **Step 3: Expand session helpers**
  - Keep `session:{token}` and `admin:session:{token}` key builders.
  - Add typed session payload serialization helpers.

- [x] **Testing steps**
  - Password helper verifies a known password against a generated hash.
  - Auth package exports all helper modules.
  - Built-output behavior check verifies password true/false, JWT round trip, empty secret rejection, expiration rejection, malformed session payload rejection, finite JWT time validation, and pure root helper import without Redis connection warnings.

- [x] **Verification commands**

```bash
pnpm --filter @package/auth type-check
pnpm --filter @package/auth lint
pnpm --filter @package/auth build
```

- [x] **Commit**

```bash
git add packages/auth/src packages/auth/package.json pnpm-lock.yaml docs/superpowers/plans/2026-05-19-domain-by-domain-migration.md
git commit -m "feat: add shared auth primitives"
```

---

## Task 6: Auth Database Schema

**Files:**

- Modify: `packages/db/src/schema/users.ts`
- Modify: `packages/db/src/schema/sessions.ts`
- Create: `packages/db/src/schema/user-preferences.ts`
- Create: `packages/db/src/schema/credits.ts`
- Modify: `packages/db/src/schema/index.ts`
- Create: `packages/db/drizzle/0002_productive_dragon_lord.sql`
- Create: `packages/db/drizzle/meta/0002_snapshot.json`
- Modify: `packages/db/drizzle/meta/_journal.json`

- [x] **Step 1: Add user preference schema**
  - Add `user_preferences` with `userId`, `grade`, `subject`, timestamps.

- [x] **Step 2: Add credit schemas**
  - Add `user_credit_accounts` and `credit_transactions`.
  - Use fields from `docs/migration/api/database-schema.md`.
  - Add database checks for credit direction, reason, and numeric invariants.
  - Preserve transaction history by keeping `credit_transactions.user_id` non-cascading.

- [x] **Step 3: Keep existing user/session compatibility**
  - Reuse `users.role` for admin/user distinction.
  - Reuse `sessions` for user/admin session rows.

- [x] **Testing steps**
  - Drizzle schema exports all new tables.
  - Migration generation succeeds.
  - Generated migration includes the three new tables, credit checks, and non-cascading transaction user FK.

- [x] **Verification commands**

```bash
pnpm db:generate
pnpm --filter @package/db type-check
pnpm --filter @package/db lint
```

- [x] **Commit**

```bash
git add packages/db/src/schema packages/db/drizzle
git commit -m "feat: add auth preference and credit schema"
```

---

## Task 7: Auth Server Module And tRPC Procedures

**Files:**

- Create: `apps/server/src/modules/auth/auth.module.ts`
- Create: `apps/server/src/modules/auth/auth.service.ts`
- Create: `apps/server/src/modules/auth/auth.repository.ts`
- Create: `apps/server/src/common/guards/user-session.guard.ts`
- Create: `apps/server/src/common/guards/admin-session.guard.ts`
- Create: `apps/server/src/trpc/routers/auth.router.ts`
- Create: `apps/server/src/trpc/routers/me.router.ts`
- Modify: `apps/server/src/trpc/router.ts`
- Modify: `apps/server/src/app.module.ts`
- Create: `packages/shared/src/types/auth.ts`
- Create: `packages/shared/src/types/me.ts`
- Modify: `packages/shared/src/types/index.ts`
- Modify: `packages/auth/package.json` (authorized Task 7 package export fix)
- Modify: `packages/db/package.json` (authorized Task 7 package export fix)
- Modify: `packages/api/src/client.ts` (Task 7 quality-review credentialed fetch fix)

- [x] **Step 1: Implement auth repository**
  - Read/write users, sessions, preferences, and credit account rows.

- [x] **Step 2: Implement auth service**
  - Add admin login/logout/session.
  - Add mock WeChat login URL and user logout.
  - Use `packages/auth` for password/session helpers.

- [x] **Step 3: Add tRPC routers**
  - Add `auth.wechatLoginUrl`, `auth.logout`.
  - Add `adminAuth.login`, `adminAuth.logout`, `adminAuth.session`.
  - Add `me.profile`, `me.preferences`, `me.credits`.

- [x] **Testing steps**
  - Wrong admin password returns typed auth error.
  - Mock WeChat URL returns no secret to frontend.
  - User/admin sessions use separate Redis keys/cookies.
  - Browser tRPC clients include credentials for cross-origin auth cookies.

- [x] **Verification commands**

```bash
pnpm --filter @package/auth build
pnpm --filter @package/db build
pnpm --filter @package/api type-check
pnpm --filter @package/api lint
pnpm --filter @package/api build
pnpm --filter @package/shared type-check
pnpm --filter server type-check
pnpm --filter server lint
pnpm --filter server build
```

- [x] **Commit**

```bash
git add apps/server/src packages/shared/src/types packages/auth/package.json packages/db/package.json packages/api/src/client.ts docs/superpowers/plans/2026-05-19-domain-by-domain-migration.md
git commit -m "feat: add auth trpc procedures"
```

---

## Task 8: Web And Admin Auth UI

**Files:**

- Create: `apps/web/src/components/auth/wechat-login-modal.tsx`
- Create: `apps/web/src/components/sponsor/donate-modal.tsx`
- Create: `apps/admin/src/app/login/page.tsx`
- Modify: `apps/admin/src/app/page.tsx`
- Modify: `apps/web/src/app/page.tsx` (authorized Task 8 modal route-level test mount)

- [x] **Step 1: Add web login and sponsor modals**
  - Implement mock-friendly WeChat login modal.
  - Implement sponsor modal from web migration docs.

- [x] **Step 2: Add admin login page**
  - Use tRPC admin login.
  - Replace `localStorage.isAdminAuth` behavior with server session flow.

- [x] **Step 3: Update admin root redirect**
  - `/` redirects to `/dashboard` for authenticated admin.
  - `/` redirects to `/login` for unauthenticated admin.
  - Task 31 owns the concrete `/dashboard` page implementation.

- [x] **Testing steps**
  - Admin login rejects invalid credentials.
  - Web modal opens/closes without touching server secrets.
  - Admin root redirect behavior is deterministic.
  - Playwright MCP verified web modal open/close, Escape, focus loop, focus restoration, admin invalid-login UI, and admin root redirects with tRPC route stubs; console checks reported 0 errors after stubbing favicon and future dashboard route.

- [x] **Verification commands**

```bash
pnpm --filter web type-check
pnpm --filter admin type-check
pnpm --filter web lint
pnpm --filter admin lint
rg -n "localStorage|isAdminAuth|WECHAT_APP_SECRET|SECRET|process\\.env" apps/admin/src/app apps/web/src/components/auth apps/web/src/app/page.tsx apps/web/src/components/sponsor -S
git diff --check
```

- [x] **Commit**

```bash
git add apps/web/src/components/auth apps/web/src/components/sponsor apps/web/src/app/page.tsx apps/admin/src/app docs/superpowers/plans/2026-05-19-domain-by-domain-migration.md
git commit -m "feat: add auth user interfaces"
```

---

## Task 9: Web Chat Old Page Analysis

**Files:**

- Create: `docs/migration/web/chat-domain-analysis.md`

- [x] **Step 1: Analyze old chat and app shell**
  - Read `docs/migration/web/spec.md`, `docs/migration/web/routes.md`, `docs/migration/web/components.md`, `docs/migration/web/api-assumptions.md`.
  - Record source availability and target files for `App.tsx`, `ChatAssistant.tsx`, `Sidebar.tsx`, `HistorySidebar.tsx`.

- [x] **Step 2: Record decisions**
  - Target route: `apps/web/src/app/(app)/chat/page.tsx`.
  - Business components stay in `apps/web/src/components`.
  - No frontend `@google/genai` or `react-markdown`.
  - Workflow mapping: `comment`, `inspiration`, `teaching` map to real routes.

- [x] **Testing steps**
  - Analysis doc mentions route, API, components, storage migration, and workflow mapping.

- [x] **Verification commands**

```bash
test -f docs/migration/web/chat-domain-analysis.md
rg -n "ChatAssistant|/chat|workflow|@google/genai|HistorySidebar" docs/migration/web/chat-domain-analysis.md
git diff --check docs/migration/web/chat-domain-analysis.md
```

- [x] **Commit**

```bash
git add docs/migration/web/chat-domain-analysis.md
git commit -m "docs: analyze web chat migration"
```

---

## Task 10: AI Conversation Schema

**Files:**

- Create: `packages/db/src/schema/ai-conversations.ts`
- Create: `packages/db/src/schema/ai-messages.ts`
- Modify: `packages/db/src/schema/index.ts`

- [x] **Step 1: Add conversation schema**
  - Add category values for `chat`, `inspiration`, `comment`, `teaching`.
  - Include user id, title, timestamps, and soft-delete or archive marker if aligned with schema docs.

- [x] **Step 2: Add message schema**
  - Add role, content, raw payload JSON, suggestions, workflow metadata, timestamps.

- [x] **Testing steps**
  - Schema supports all four AI domains without separate duplicated message tables.
  - Drizzle migration generation succeeds.

- [x] **Verification commands**

```bash
pnpm db:generate
pnpm --filter @package/db type-check
pnpm --filter @package/db lint
```

- [x] **Commit**

```bash
git add packages/db/src/schema packages/db/drizzle
git commit -m "feat: add ai conversation schema"
```

---

## Task 11: AI Base Service And Chat tRPC

**Files:**

- Create: `apps/server/src/modules/ai/ai.module.ts`
- Create: `apps/server/src/modules/ai/ai.service.ts`
- Create: `apps/server/src/modules/ai/ai.repository.ts`
- Create: `apps/server/src/trpc/routers/ai.router.ts`
- Modify: `apps/server/src/trpc/router.ts`
- Create: `packages/shared/src/types/ai.ts`
- Modify: `packages/shared/src/types/index.ts`

- [x] **Step 1: Add AI repository**
  - Read/write conversation and message rows.
  - Filter history by category.

- [x] **Step 2: Add chat procedures**
  - Add `ai.chat.create`, `ai.chat.send`, `ai.history.list`, `ai.history.delete`.
  - Return deterministic mock stream-compatible events in development.

- [x] **Step 3: Add workflow mapping**
  - `comment` -> `/office/comment`.
  - `inspiration` -> `/lesson/inspiration`.
  - `teaching` -> `/office/teaching`.

- [x] **Testing steps**
  - `ai.chat.send` creates a conversation when `sessionId` is absent.
  - History list only returns category `chat` for chat filter.
  - Workflow event returns correct route.

- [x] **Verification commands**

```bash
pnpm --filter @package/shared type-check
pnpm --filter server type-check
pnpm --filter server lint
```

- [x] **Commit**

```bash
git add apps/server/src packages/shared/src/types
git commit -m "feat: add chat ai trpc backend"
```

---

## Task 12: Web App Shell Routes

**Files:**

- Modify: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/(app)/layout.tsx`
- Create: `apps/web/src/components/layout/app-shell.tsx`
- Create: `apps/web/src/components/layout/app-sidebar.tsx`
- Create: `apps/web/src/components/layout/app-header.tsx`

- [x] **Step 1: Add root redirect**
  - Redirect `/` to `/chat`.

- [x] **Step 2: Add app layout**
  - Add `(app)/layout.tsx` with app shell.
  - Add sidebar and header components with route-aware active state.

- [x] **Testing steps**
  - `/` redirects to `/chat`.
  - Layout renders children.
  - Sidebar links point to documented web routes.

- [x] **Verification commands**

```bash
pnpm --filter web type-check
pnpm --filter web lint
pnpm build:web
```

- [x] **Commit**

```bash
git add apps/web/src/app apps/web/src/components/layout
git commit -m "feat: add web app shell"
```

---

## Task 13: Web Chat Page

**Files:**

- Create: `apps/web/src/app/(app)/chat/page.tsx`
- Create: `apps/web/src/components/chat/chat-message-list.tsx`
- Create: `apps/web/src/components/chat/ai-message-bubble.tsx`
- Create: `apps/web/src/components/chat/ai-sender.tsx`
- Create: `apps/web/src/components/chat/suggestion-chips.tsx`

- [x] **Step 1: Add chat page**
  - Page connects to chat tRPC procedures.
  - It renders current conversation, input, loading state, and suggestions.

- [x] **Step 2: Extract chat components**
  - Keep all components in `apps/web/src/components/chat`.
  - Do not move them to `packages/ui`.

- [x] **Testing steps**
  - Empty input does not call tRPC.
  - Mock response appends assistant message.
  - Suggestion click sends a new message.

- [x] **Verification commands**

```bash
pnpm --filter web type-check
pnpm --filter web lint
pnpm build:web
```

- [x] **Commit**

```bash
git add apps/web/src/app/'(app)'/chat apps/web/src/components/chat
git commit -m "feat: add web chat page"
```

---

## Task 14: Inspiration Old Page Analysis

**Files:**

- Create: `docs/migration/web/inspiration-domain-analysis.md`

- [x] **Step 1: Analyze old inspiration pages**
  - Read docs for `LessonModule.tsx` and `InspirationLibrary.tsx`.
  - Record route, form fields, localStorage preference dependency, prompt ownership, and follow-up behavior.

- [x] **Step 2: Record target mapping**
  - Route: `apps/web/src/app/(app)/lesson/inspiration/page.tsx`.
  - Backend: existing AI service with category `inspiration`.
  - Components: `apps/web/src/components/inspiration`.

- [x] **Testing steps**
  - Analysis doc mentions grade, subject, topic, context, follow-up, and no frontend prompt assembly.

- [x] **Verification commands**

```bash
test -f docs/migration/web/inspiration-domain-analysis.md
rg -n "InspirationLibrary|grade|subject|topic|follow-up|prompt" docs/migration/web/inspiration-domain-analysis.md
git diff --check docs/migration/web/inspiration-domain-analysis.md
```

- [x] **Commit**

```bash
git add docs/migration/web/inspiration-domain-analysis.md
git commit -m "docs: analyze inspiration migration"
```

---

## Task 15: Inspiration tRPC Procedures

**Files:**

- Modify: `apps/server/src/modules/ai/ai.service.ts`
- Modify: `apps/server/src/trpc/routers/ai.router.ts`
- Create: `packages/shared/src/types/inspiration.ts`
- Modify: `packages/shared/src/types/index.ts`

- [x] **Step 1: Add inspiration types**
  - Define generate input: `sessionId?`, `grade`, `subject`, `topic`, `context?`.
  - Define follow-up input: `sessionId`, `message`.

- [x] **Step 2: Add procedures**
  - Add `ai.inspiration.generate`.
  - Add `ai.inspiration.followUp`.
  - Use AI conversation category `inspiration`.

- [x] **Testing steps**
  - Empty `topic` returns typed validation error.
  - Follow-up without `sessionId` returns typed validation error.
  - Mock response includes credit and assistant message.

- [x] **Verification commands**

```bash
pnpm --filter @package/shared type-check
pnpm --filter server type-check
pnpm --filter server lint
```

- [x] **Commit**

```bash
git add apps/server/src/modules/ai apps/server/src/trpc/routers/ai.router.ts packages/shared/src/types
git commit -m "feat: add inspiration trpc backend"
```

---

## Task 16: Inspiration Web Page

**Files:**

- Create: `apps/web/src/app/(app)/lesson/layout.tsx`
- Create: `apps/web/src/app/(app)/lesson/inspiration/page.tsx`
- Create: `apps/web/src/components/lesson/lesson-sub-nav.tsx`
- Create: `apps/web/src/components/inspiration/inspiration-form.tsx`
- Create: `apps/web/src/components/inspiration/featured-inspiration-cases.tsx`
- Create: `apps/web/src/components/inspiration/inspiration-chat-panel.tsx`
- Create: `apps/web/src/components/inspiration/inspiration.data.ts`

- [x] **Step 1: Add lesson layout**
  - Add secondary navigation for `/lesson/inspiration` and `/lesson/simulation`.

- [x] **Step 2: Add inspiration page and components**
  - Form collects grade, subject, topic, context.
  - Featured cases trigger the same generation path as manual input.
  - Chat panel renders generated result and follow-up suggestions.

- [x] **Testing steps**
  - Empty topic blocks submit.
  - Featured case populates/generates.
  - Follow-up appends a response using `sessionId`.

- [x] **Verification commands**

```bash
pnpm --filter web type-check
pnpm --filter web lint
pnpm build:web
```

- [x] **Commit**

```bash
git add apps/web/src/app/'(app)'/lesson apps/web/src/components/lesson apps/web/src/components/inspiration
git commit -m "feat: add inspiration web page"
```

---

## Task 17: Simulation Old Page Analysis

**Files:**

- Create: `docs/migration/simulations-domain-analysis.md`

- [x] **Step 1: Analyze web simulation behavior**
  - Read docs for `SimulationLab.tsx`.
  - Record filters, search, cards, iframe overlay, and user-facing route.

- [x] **Step 2: Analyze admin simulation behavior**
  - Read docs for `Simulations.tsx`.
  - Record enable/disable behavior and admin route.

- [x] **Testing steps**
  - Analysis doc distinguishes web browse/player from admin management.

- [x] **Verification commands**

```bash
test -f docs/migration/simulations-domain-analysis.md
rg -n "SimulationLab|Simulations|apps/web|apps/admin|iframe|isable" docs/migration/simulations-domain-analysis.md
git diff --check docs/migration/simulations-domain-analysis.md
```

- [x] **Commit**

```bash
git add docs/migration/simulations-domain-analysis.md
git commit -m "docs: analyze simulations migration"
```

---

## Task 18: Simulations Backend

**Files:**

- Modify: `packages/db/src/schema/simulations.ts`
- Modify: `packages/db/src/schema/index.ts`
- Create: `apps/server/src/modules/simulations/simulations.module.ts`
- Create: `apps/server/src/modules/simulations/simulations.service.ts`
- Create: `apps/server/src/modules/simulations/simulations.repository.ts`
- Create: `apps/server/src/trpc/routers/simulations.router.ts`
- Modify: `apps/server/src/trpc/router.ts`
- Create: `packages/shared/src/types/simulations.ts`
- Modify: `packages/shared/src/types/index.ts`

- [x] **Step 1: Confirm schema fit**
  - Reuse existing simulation tables where possible.
  - Add only missing columns proven by analysis docs.

- [x] **Step 2: Add public procedures**
  - `simulations.list`.
  - `simulations.filters`.

- [x] **Step 3: Add admin procedures**
  - `adminSimulations.list`.
  - `adminSimulations.filters`.
  - `adminSimulations.setEnabled`.
  - `adminSimulations.update`.

- [x] **Testing steps**
  - Public list excludes disabled simulations.
  - Admin list includes disabled simulations.
  - Filter procedure returns subject/category/grade options.

- [x] **Verification commands**

```bash
pnpm db:generate
pnpm --filter @package/db type-check
pnpm --filter @package/shared type-check
pnpm --filter server type-check
pnpm --filter server lint
```

- [x] **Commit**

```bash
git add packages/db/src/schema packages/db/drizzle apps/server/src packages/shared/src/types
git commit -m "feat: add simulations backend"
```

---

## Task 19: Web Simulation Page

**Files:**

- Create: `apps/web/src/app/(app)/lesson/simulation/page.tsx`
- Create: `apps/web/src/components/simulations/simulation-filters.tsx`
- Create: `apps/web/src/components/simulations/simulation-results-header.tsx`
- Create: `apps/web/src/components/simulations/simulation-card.tsx`
- Create: `apps/web/src/components/simulations/simulation-empty-state.tsx`
- Create: `apps/web/src/components/simulations/simulation-player-overlay.tsx`
- Create: `apps/web/src/components/simulations/simulations.data.ts`

- [x] **Step 1: Add simulation page**
  - Connect to public simulation tRPC procedures.
  - Support subject/category/grade/search filtering.

- [x] **Step 2: Add player overlay**
  - Open iframe overlay from card action.
  - Close overlay without route change.

- [x] **Testing steps**
  - Search and filters combine correctly.
  - Empty results render reset UI.
  - Overlay opens and closes.

- [x] **Verification commands**

```bash
pnpm --filter web type-check
pnpm --filter web lint
pnpm build:web
```

- [x] **Commit**

```bash
git add apps/web/src/app/'(app)'/lesson/simulation apps/web/src/components/simulations
git commit -m "feat: add web simulations page"
```

---

## Task 20: Admin Simulation Page

**Files:**

- Create: `apps/admin/src/app/(admin)/simulations/page.tsx`
- Create: `apps/admin/src/components/simulations/simulation-tree-filter.tsx`
- Create: `apps/admin/src/components/simulations/simulation-card.tsx`

- [x] **Step 1: Add admin simulation page**
  - Connect to admin simulation tRPC procedures.
  - Render tree/filter and resource cards.

- [x] **Step 2: Add enable/disable action**
  - Toggle `isable` through admin tRPC.
  - Reflect changed state in the list.

- [x] **Testing steps**
  - Disabled item remains visible in admin.
  - Toggling disabled state updates UI.
  - Web public list behavior remains unaffected.

- [x] **Verification commands**

```bash
pnpm --filter admin type-check
pnpm --filter admin lint
pnpm build:admin
```

- [x] **Commit**

```bash
git add apps/admin/src/app/'(admin)'/simulations apps/admin/src/components/simulations
git commit -m "feat: add admin simulations page"
```

---

## Task 21: Comments Old Page Analysis

**Files:**

- Create: `docs/migration/web/comments-domain-analysis.md`

- [x] **Step 1: Analyze single comment mode**
  - Record nickname, gender, grade, tags, keywords/details, result cards, copy behavior.

- [x] **Step 2: Analyze batch mode**
  - Record template download, Excel upload, row queue, row generation, export gate.

- [x] **Testing steps**
  - Analysis doc states frontend must not import `xlsx`.
  - Analysis doc maps components to `apps/web/src/components/comments`.

- [x] **Verification commands**

```bash
test -f docs/migration/web/comments-domain-analysis.md
rg -n "CommentAssistant|single|batch|xlsx|Excel|apps/web/src/components/comments" docs/migration/web/comments-domain-analysis.md
git diff --check docs/migration/web/comments-domain-analysis.md
```

- [x] **Commit**

```bash
git add docs/migration/web/comments-domain-analysis.md
git commit -m "docs: analyze comments migration"
```

---

## Task 22: Comments Backend And Batch Schema

**Files:**

- Create: `packages/db/src/schema/comment-batches.ts`
- Modify: `packages/db/src/schema/index.ts`
- Create: `apps/server/src/modules/comments/comments.module.ts`
- Create: `apps/server/src/modules/comments/comments.service.ts`
- Create: `apps/server/src/modules/comments/comments.repository.ts`
- Create: `apps/server/src/trpc/routers/comments.router.ts`
- Modify: `apps/server/src/trpc/router.ts`
- Create: `packages/shared/src/types/comments.ts`
- Modify: `packages/shared/src/types/index.ts`

- [x] **Step 1: Add batch schema**
  - Add batch job and batch row tables.
  - Store row status and generated results.

- [x] **Step 2: Add tRPC procedures**
  - `comments.single.generate`.
  - `comments.batch.createFromUpload`.
  - `comments.batch.generateRow`.
  - `comments.batch.generateAll`.
  - `comments.batch.export`.

- [x] **Testing steps**
  - Single generate validates gender, grade, and tags.
  - Batch upload accepts file metadata and returns row previews in mock mode.
  - Row generation updates status to `success`.

- [x] **Verification commands**

```bash
pnpm db:generate
pnpm --filter @package/db type-check
pnpm --filter @package/shared type-check
pnpm --filter server type-check
pnpm --filter server lint
```

- [x] **Commit**

```bash
git add packages/db/src/schema packages/db/drizzle apps/server/src packages/shared/src/types
git commit -m "feat: add comments backend"
```

---

## Task 23: Office Layout And Single Comment UI

**Files:**

- Create: `apps/web/src/app/(app)/office/layout.tsx`
- Create: `apps/web/src/app/(app)/office/comment/page.tsx`
- Create: `apps/web/src/components/office/office-sub-nav.tsx`
- Create: `apps/web/src/components/comments/comment-mode-tabs.tsx`
- Create: `apps/web/src/components/comments/single-comment-form.tsx`
- Create: `apps/web/src/components/comments/student-tag-selector.tsx`
- Create: `apps/web/src/components/comments/comment-result-list.tsx`
- Create: `apps/web/src/components/comments/comment-tags.data.ts`

- [x] **Step 1: Add office layout**
  - Add secondary navigation for `/office/comment` and `/office/teaching`.

- [x] **Step 2: Add single comment mode**
  - Form validates required fields.
  - Results render as copyable cards.

- [x] **Testing steps**
  - Missing required fields block submit.
  - Mock generation renders three result cards.
  - Copy button changes visible copy state.

- [x] **Verification commands**

```bash
pnpm --filter web type-check
pnpm --filter web lint
pnpm build:web
```

- [x] **Commit**

```bash
git add apps/web/src/app/'(app)'/office apps/web/src/components/office apps/web/src/components/comments
git commit -m "feat: add single comment ui"
```

---

## Task 24: Batch Comment UI

**Files:**

- Modify: `apps/web/src/app/(app)/office/comment/page.tsx`
- Create: `apps/web/src/components/comments/batch-import-guide.tsx`
- Create: `apps/web/src/components/comments/excel-upload-dropzone.tsx`
- Create: `apps/web/src/components/comments/batch-comment-table.tsx`
- Create: `apps/web/src/components/comments/batch-comment-toolbar.tsx`

- [x] **Step 1: Add batch upload UI**
  - Accept `.xlsx` and `.xls`.
  - Reject unsupported file extensions client-side.

- [x] **Step 2: Add batch queue UI**
  - Render pending/generating/success/error row states.
  - Support generate one and generate all.

- [x] **Step 3: Add export gate**
  - Reuse sponsored gate before export call.

- [x] **Testing steps**
  - Unsupported file does not call tRPC.
  - Generate all updates rows in sequence.
  - Export button is disabled until at least one success row exists.

- [x] **Verification commands**

```bash
pnpm --filter web type-check
pnpm --filter web lint
pnpm build:web
pnpm why xlsx
```

- [x] **Commit**

```bash
git add apps/web/src/app/'(app)'/office/comment/page.tsx apps/web/src/components/comments
git commit -m "feat: add batch comment ui"
```

---

## Task 25: Teaching Old Page Analysis

**Files:**

- Create: `docs/migration/web/teaching-domain-analysis.md`

- [x] **Step 1: Analyze teaching page**
  - Record original-question transformation mode.
  - Record knowledge-point generation mode.
  - Record level/difficulty options, examples, result panel, and follow-up behavior.

- [x] **Testing steps**
  - Analysis doc states route `/office/teaching`.
  - Analysis doc states backend owns prompt assembly.

- [x] **Verification commands**

```bash
test -f docs/migration/web/teaching-domain-analysis.md
rg -n "TeachingAssist|/office/teaching|原题|知识点|prompt|follow" docs/migration/web/teaching-domain-analysis.md
git diff --check docs/migration/web/teaching-domain-analysis.md
```

- [x] **Commit**

```bash
git add docs/migration/web/teaching-domain-analysis.md
git commit -m "docs: analyze teaching migration"
```

---

## Task 26: Teaching Backend

**Files:**

- Modify: `apps/server/src/modules/ai/ai.service.ts`
- Modify: `apps/server/src/modules/ai/ai.repository.ts` (Task 26 quality-review fix: stable message ordering)
- Modify: `apps/server/src/trpc/routers/ai.router.ts`
- Create: `packages/shared/src/types/teaching.ts`
- Modify: `packages/shared/src/types/index.ts`
- Modify: `packages/db/src/schema/ai-messages.ts` (Task 26 quality-review fix: persisted message order)
- Create: `packages/db/drizzle/0005_woozy_karnak.sql` (Task 26 quality-review fix)
- Create: `packages/db/drizzle/meta/0005_snapshot.json` (Task 26 quality-review fix)
- Modify: `packages/db/drizzle/meta/_journal.json` (Task 26 quality-review fix)

- [x] **Step 1: Add teaching types**
  - Define `subject`, `stage`, `mode`, `prompt`, `level`, `sessionId?`.

- [x] **Step 2: Add procedures**
  - Add `ai.teaching.generate`.
  - Add `ai.teaching.followUp`.
  - Use AI conversation category `teaching`.

- [x] **Testing steps**
  - Empty prompt returns typed validation error.
  - Both modes return deterministic mock results.
  - Follow-up appends to existing teaching session.
  - Invalid mode/level pairing is rejected.
  - Wrong-category follow-up is rejected.
  - Same-timestamp multi-turn follow-up context preserves persisted message order.

- [x] **Verification commands**

```bash
pnpm db:generate
pnpm exec tsx --test apps/server/src/modules/ai/ai.service.spec.ts
pnpm --filter @package/db type-check
pnpm --filter @package/db lint
pnpm --filter @package/shared type-check
pnpm --filter server type-check
pnpm --filter server lint
git diff --check
```

- [x] **Commit**

```bash
git add apps/server/src/modules/ai apps/server/src/trpc/routers/ai.router.ts packages/shared/src/types packages/db/src/schema/ai-messages.ts packages/db/drizzle docs/superpowers/plans/2026-05-19-domain-by-domain-migration.md
git commit -m "feat: add teaching backend"
```

---

## Task 27: Teaching Web Page

**Files:**

- Create: `apps/web/src/app/(app)/office/teaching/page.tsx`
- Create: `apps/web/src/components/teaching/teaching-context-form.tsx`
- Create: `apps/web/src/components/teaching/teaching-input-mode-toggle.tsx`
- Create: `apps/web/src/components/teaching/teaching-prompt-input.tsx`
- Create: `apps/web/src/components/teaching/transformation-level-selector.tsx`
- Create: `apps/web/src/components/teaching/teaching-example-cards.tsx`
- Create: `apps/web/src/components/teaching/teaching-result-panel.tsx`
- Create: `apps/web/src/components/teaching/teaching.data.ts`

- [x] **Step 1: Add teaching page**
  - Connect page to teaching tRPC procedures.
  - Support both input modes.

- [x] **Step 2: Add teaching components**
  - Keep all teaching components in `apps/web/src/components/teaching`.
  - Examples trigger same generation path as manual form.

- [x] **Testing steps**
  - Switching mode changes labels/options.
  - Empty prompt blocks submit.
  - Mock generation renders result and follow-up suggestions.
  - Playwright MCP verified `/office/teaching`, empty prompt blocking with zero tRPC calls, mode switch labels/options, mocked generation, old follow-up suggestion chips, follow-up mutation, fresh session behavior for repeated generation, mobile overflow, and browser console errors.

- [x] **Verification commands**

```bash
pnpm --filter web type-check
pnpm --filter web lint
pnpm build:web
```

- [x] **Commit**

```bash
git add apps/web/src/app/'(app)'/office/teaching apps/web/src/components/teaching
git commit -m "feat: add teaching web page"
```

---

## Task 28: Admin Resource Old Page Analysis

**Files:**

- Create: `docs/migration/admin/resources-domain-analysis.md`

- [x] **Step 1: Analyze resource pages**
  - Read docs for Dashboard, Agents, AIPrompts, SensitiveWords, EngineDispatch.
  - Record CRUD operations, form fields, and API key masking requirement.

- [x] **Step 2: Record target mapping**
  - Routes under `apps/admin/src/app/(admin)`.
  - Components under `apps/admin/src/components/resources` and `apps/admin/src/components/engines`.

- [x] **Testing steps**
  - Analysis doc includes agents, prompts, sensitive words, engines, dashboard.
  - Analysis doc states API keys never return plaintext.

- [x] **Verification commands**

```bash
test -f docs/migration/admin/resources-domain-analysis.md
rg -n "Agents|Prompt|Sensitive|Engine|Dashboard|API Key|plaintext" docs/migration/admin/resources-domain-analysis.md
git diff --check docs/migration/admin/resources-domain-analysis.md
```

- [x] **Commit**

```bash
git add docs/migration/admin/resources-domain-analysis.md
git commit -m "docs: analyze admin resource migration"
```

---

## Task 29: Admin Resource Schema

**Files:**

- Create: `packages/db/src/schema/ai-resources.ts`
- Modify: `packages/db/src/schema/index.ts`

- [x] **Step 1: Add resource schemas**
  - Add `model_engines`.
  - Add `ai_prompts`.
  - Add `sensitive_word_lists`.
  - Add `ai_agents`.

- [x] **Step 2: Add constraints**
  - Prompt title/version uniqueness.
  - Agent key uniqueness.
  - Engine name uniqueness.

- [x] **Testing steps**
  - Drizzle migration generation succeeds.
  - New schema exports from `@package/db/schema`.

- [x] **Verification commands**

```bash
pnpm db:generate
pnpm --filter @package/db type-check
pnpm --filter @package/db lint
```

- [x] **Commit**

```bash
git add packages/db/src/schema packages/db/drizzle
git commit -m "feat: add admin resource schema"
```

---

## Task 30: Admin Resource Backend

**Files:**

- Create: `apps/server/src/modules/admin-resources/admin-resources.module.ts`
- Create: `apps/server/src/modules/admin-resources/admin-resources.service.ts`
- Create: `apps/server/src/modules/admin-resources/admin-resources.repository.ts`
- Create: `apps/server/src/trpc/routers/admin-resources.router.ts`
- Modify: `apps/server/src/trpc/router.ts`
- Create: `packages/shared/src/types/admin-resources.ts`
- Modify: `packages/shared/src/types/index.ts`

- [x] **Step 1: Add CRUD service**
  - Implement agents, prompts, sensitive word lists, and engines CRUD.
  - Validate agent references before save.

- [x] **Step 2: Add tRPC procedures**
  - All admin resource procedures require admin session.
  - Engine API key responses return masked value only.

- [x] **Testing steps**
  - Creating agent with nonexistent engine returns typed error.
  - Engine list masks API keys.
  - Deleting referenced prompt returns conflict.

- [x] **Verification commands**

```bash
pnpm --filter @package/shared type-check
pnpm --filter server type-check
pnpm --filter server lint
```

- [x] **Commit**

```bash
git add apps/server/src packages/shared/src/types
git commit -m "feat: add admin resource backend"
```

---

## Task 31: Admin Shell And Dashboard

**Files:**

- Create: `apps/admin/src/app/(admin)/layout.tsx`
- Create: `apps/admin/src/app/(admin)/dashboard/page.tsx`
- Create: `apps/admin/src/components/layout/admin-shell.tsx`
- Create: `apps/admin/src/components/layout/admin-sidebar.tsx`
- Create: `apps/admin/src/components/layout/admin-header.tsx`
- Create: `apps/admin/src/components/dashboard/dashboard-stat-card.tsx`
- Create: `apps/admin/src/components/dashboard/traffic-source-list.tsx`

- [x] **Step 1: Add protected admin shell**
  - Add grouped navigation and active route highlight.
  - Preserve documented admin routes.

- [x] **Step 2: Add dashboard**
  - Render overview metrics from admin tRPC or deterministic mock until backend metrics are connected.

- [x] **Testing steps**
  - Unauthenticated access redirects to `/login`.
  - `/dashboard` renders inside admin shell.
  - Sidebar groups expand/collapse.

- [x] **Verification commands**

```bash
pnpm --filter admin type-check
pnpm --filter admin lint
pnpm build:admin
```

- [x] **Commit**

```bash
git add apps/admin/src/app/'(admin)' apps/admin/src/components/layout apps/admin/src/components/dashboard
git commit -m "feat: add admin shell dashboard"
```

---

## Task 32: Admin Agents And Prompts UI

**Files:**

- Create: `apps/admin/src/app/(admin)/resources/agents/page.tsx`
- Create: `apps/admin/src/app/(admin)/resources/prompts/page.tsx`
- Create: `apps/admin/src/components/resources/agent-card.tsx`
- Create: `apps/admin/src/components/resources/agent-form-dialog.tsx`
- Create: `apps/admin/src/components/resources/prompt-card.tsx`
- Create: `apps/admin/src/components/resources/prompt-form-dialog.tsx`
- Create: `apps/admin/src/components/resources/prompt-markdown-preview.tsx`

- [x] **Step 1: Add agents page**
  - List, create, edit, delete agents.
  - Bind engine, prompt, and sensitive word list.

- [x] **Step 2: Add prompts page**
  - List, create, edit, delete prompts.
  - Render Markdown preview in admin only.

- [x] **Testing steps**
  - Agent form requires name and engine.
  - Prompt form requires title, version, content.
  - Prompt preview renders Markdown content.

- [x] **Verification commands**

```bash
pnpm --filter admin type-check
pnpm --filter admin lint
pnpm build:admin
```

- [x] **Commit**

```bash
git add apps/admin/src/app/'(admin)'/resources apps/admin/src/components/resources
git commit -m "feat: add admin agents prompts ui"
```

---

## Task 33: Admin Sensitive Words And Engines UI

**Files:**

- Create: `apps/admin/src/app/(admin)/resources/sensitive-words/page.tsx`
- Create: `apps/admin/src/app/(admin)/engine-dispatch/page.tsx`
- Create: `apps/admin/src/components/resources/sensitive-word-list-card.tsx`
- Create: `apps/admin/src/components/resources/sensitive-word-form-dialog.tsx`
- Create: `apps/admin/src/components/engines/engine-table.tsx`
- Create: `apps/admin/src/components/engines/engine-form-dialog.tsx`

- [ ] **Step 1: Add sensitive words page**
  - List, create, edit, delete word lists.
  - Parse comma-separated words into arrays.

- [ ] **Step 2: Add engine dispatch page**
  - List, create, edit, delete engines.
  - Mask API key in table and edit flows.

- [ ] **Testing steps**
  - Empty word list is rejected.
  - API key plaintext is not displayed after save.
  - Engine URL is validated.

- [ ] **Verification commands**

```bash
pnpm --filter admin type-check
pnpm --filter admin lint
pnpm build:admin
```

- [ ] **Commit**

```bash
git add apps/admin/src/app/'(admin)'/resources/sensitive-words apps/admin/src/app/'(admin)'/engine-dispatch apps/admin/src/components/resources apps/admin/src/components/engines
git commit -m "feat: add admin sensitive words engines ui"
```

---

## Task 34: Admin Operations Old Page Analysis

**Files:**

- Create: `docs/migration/admin/operations-domain-analysis.md`

- [ ] **Step 1: Analyze remaining admin pages**
  - Read docs for Users, Activities, Fission, SystemAudit, ContentAudit, TrafficMonitor, AlarmCenter, Settings.

- [ ] **Step 2: Record behavior boundaries**
  - User status and blacklist are separate.
  - Content audit delete is soft delete.
  - High-risk mutations write system audit logs.

- [ ] **Testing steps**
  - Analysis doc mentions every remaining admin route.
  - Analysis doc identifies soft delete and audit requirements.

- [ ] **Verification commands**

```bash
test -f docs/migration/admin/operations-domain-analysis.md
rg -n "Users|Activities|Fission|SystemAudit|ContentAudit|TrafficMonitor|Alarm|Settings|soft delete|audit" docs/migration/admin/operations-domain-analysis.md
git diff --check docs/migration/admin/operations-domain-analysis.md
```

- [ ] **Commit**

```bash
git add docs/migration/admin/operations-domain-analysis.md
git commit -m "docs: analyze admin operations migration"
```

---

## Task 35: Admin Operations Schema

**Files:**

- Create: `packages/db/src/schema/operations.ts`
- Create: `packages/db/src/schema/audit.ts`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 1: Add operations schema**
  - Add activities/notices.
  - Add fission config/invite tree storage.
  - Add alarm settings.

- [ ] **Step 2: Add audit schema**
  - Add system audit logs.
  - Add content audit session metadata.
  - Include soft-delete marker for content audit rows.

- [ ] **Testing steps**
  - Drizzle migration generation succeeds.
  - Schema exports from `@package/db/schema`.

- [ ] **Verification commands**

```bash
pnpm db:generate
pnpm --filter @package/db type-check
pnpm --filter @package/db lint
```

- [ ] **Commit**

```bash
git add packages/db/src/schema packages/db/drizzle
git commit -m "feat: add admin operations schema"
```

---

## Task 36: Admin Operations Backend

**Files:**

- Create: `apps/server/src/modules/admin-operations/admin-operations.module.ts`
- Create: `apps/server/src/modules/admin-operations/admin-operations.service.ts`
- Create: `apps/server/src/modules/admin-operations/admin-operations.repository.ts`
- Create: `apps/server/src/trpc/routers/admin-operations.router.ts`
- Modify: `apps/server/src/trpc/router.ts`
- Create: `packages/shared/src/types/admin-operations.ts`
- Modify: `packages/shared/src/types/index.ts`

- [ ] **Step 1: Add users and operations procedures**
  - Admin users query/status/blacklist/delete/invite/activity.
  - Activity CRUD.
  - Fission read/update.
  - Alarm config read/update.

- [ ] **Step 2: Add audit procedures**
  - System audit query/export.
  - Content audit query/export/soft-delete.
  - Traffic stats query.

- [ ] **Testing steps**
  - User status and blacklist mutate independently.
  - Content audit delete sets soft-delete marker.
  - High-risk mutations write system audit log.

- [ ] **Verification commands**

```bash
pnpm --filter @package/shared type-check
pnpm --filter server type-check
pnpm --filter server lint
```

- [ ] **Commit**

```bash
git add apps/server/src packages/shared/src/types
git commit -m "feat: add admin operations backend"
```

---

## Task 37: Admin Users And Settings UI

**Files:**

- Create: `apps/admin/src/app/(admin)/users/page.tsx`
- Create: `apps/admin/src/app/(admin)/settings/page.tsx`
- Create: `apps/admin/src/components/users/users-stats.tsx`
- Create: `apps/admin/src/components/users/users-table.tsx`
- Create: `apps/admin/src/components/users/quota-badge.tsx`
- Create: `apps/admin/src/components/settings/password-settings-form.tsx`
- Create: `apps/admin/src/components/settings/sign-out-panel.tsx`

- [ ] **Step 1: Add users page**
  - List users, search/filter, status toggle, blacklist toggle, delete.

- [ ] **Step 2: Add settings page**
  - Password update form.
  - Sign-out panel.

- [ ] **Testing steps**
  - Status and blacklist buttons are independent.
  - Password confirmation mismatch blocks submit.
  - Sign-out clears admin session.

- [ ] **Verification commands**

```bash
pnpm --filter admin type-check
pnpm --filter admin lint
pnpm build:admin
```

- [ ] **Commit**

```bash
git add apps/admin/src/app/'(admin)'/users apps/admin/src/app/'(admin)'/settings apps/admin/src/components/users apps/admin/src/components/settings
git commit -m "feat: add admin users settings ui"
```

---

## Task 38: Admin Activities And Fission UI

**Files:**

- Create: `apps/admin/src/app/(admin)/operations/activities/page.tsx`
- Create: `apps/admin/src/app/(admin)/operations/fission/page.tsx`
- Create: `apps/admin/src/components/operations/activity-notice-list-item.tsx`
- Create: `apps/admin/src/components/operations/activity-notice-form-dialog.tsx`
- Create: `apps/admin/src/components/operations/invite-tree.tsx`
- Create: `apps/admin/src/components/operations/reward-config-form.tsx`

- [ ] **Step 1: Add activities page**
  - List, create, edit, delete, publish/draft activities.

- [ ] **Step 2: Add fission page**
  - Invite chain tab.
  - Reward config tab.

- [ ] **Testing steps**
  - Activity title/body are required.
  - Fission reward numbers validate as non-negative.
  - Invite tree expands/collapses.

- [ ] **Verification commands**

```bash
pnpm --filter admin type-check
pnpm --filter admin lint
pnpm build:admin
```

- [ ] **Commit**

```bash
git add apps/admin/src/app/'(admin)'/operations apps/admin/src/components/operations
git commit -m "feat: add admin activities fission ui"
```

---

## Task 39: Admin Security, Traffic, Alarm UI

**Files:**

- Create: `apps/admin/src/app/(admin)/security/system-audit/page.tsx`
- Create: `apps/admin/src/app/(admin)/security/content-audit/page.tsx`
- Create: `apps/admin/src/app/(admin)/security/traffic-monitor/page.tsx`
- Create: `apps/admin/src/app/(admin)/alarm/page.tsx`
- Create: `apps/admin/src/components/security/audit-log-table.tsx`
- Create: `apps/admin/src/components/security/content-audit-table.tsx`
- Create: `apps/admin/src/components/security/export-csv-dialog.tsx`
- Create: `apps/admin/src/components/security/traffic-engine-card.tsx`
- Create: `apps/admin/src/components/alarm/alarm-config-form.tsx`

- [ ] **Step 1: Add audit pages**
  - System audit table with date export.
  - Content audit table with soft delete and export.

- [ ] **Step 2: Add traffic and alarm pages**
  - Traffic cards per engine.
  - Alarm threshold/email form.

- [ ] **Testing steps**
  - Export date range validates start <= end.
  - Content delete hides row without physical deletion.
  - Alarm email validates before save.

- [ ] **Verification commands**

```bash
pnpm --filter admin type-check
pnpm --filter admin lint
pnpm build:admin
```

- [ ] **Commit**

```bash
git add apps/admin/src/app/'(admin)'/security apps/admin/src/app/'(admin)'/alarm apps/admin/src/components/security apps/admin/src/components/alarm
git commit -m "feat: add admin security traffic alarm ui"
```

---

## Task 40: Shared UI Primitive Extraction

**Files:**

- Modify: `packages/ui/src/components/button.tsx`
- Create: `packages/ui/src/components/dialog.tsx`
- Create: `packages/ui/src/components/input.tsx`
- Create: `packages/ui/src/components/textarea.tsx`
- Create: `packages/ui/src/components/table.tsx`
- Create: `packages/ui/src/components/badge.tsx`
- Create: `packages/ui/src/components/card.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Extract only generic primitives**
  - Move only generic UI primitives with no business text or data.
  - Keep business components in app directories.

- [ ] **Step 2: Export primitives**
  - Export all primitives from `packages/ui/src/index.ts`.

- [ ] **Testing steps**
  - `packages/ui` builds independently.
  - No component in `packages/ui` imports `apps/*` or business types.

- [ ] **Verification commands**

```bash
pnpm --filter @package/ui type-check
pnpm --filter @package/ui build
pnpm --filter @package/ui lint
rg -n "apps/|@package/shared.*(comments|teaching|simulations|admin)" packages/ui/src || true
```

- [ ] **Commit**

```bash
git add packages/ui/src
git commit -m "feat: extract shared ui primitives"
```

---

## Task 41: Frontend Dependency Convergence

**Files:**

- Modify: `apps/web/package.json`
- Modify: `apps/admin/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/admin/src/app/layout.tsx`

- [ ] **Step 1: Add allowed frontend dependencies**
  - Web may use `@ant-design/x` and `@fontsource/inter`.
  - Admin may use `react-markdown` for prompt preview.

- [ ] **Step 2: Remove forbidden frontend dependencies**
  - Web must not depend on `@google/genai`, `react-markdown`, or `xlsx`.
  - Admin must not depend on `@google/genai` or Vite packages.

- [ ] **Testing steps**
  - Font import works in layouts.
  - Forbidden frontend packages are absent or not direct dependencies.

- [ ] **Verification commands**

```bash
pnpm install
pnpm --filter web type-check
pnpm --filter admin type-check
pnpm why @google/genai
pnpm why xlsx
pnpm why react-markdown
```

- [ ] **Commit**

```bash
git add apps/web/package.json apps/admin/package.json pnpm-lock.yaml apps/web/src/app/layout.tsx apps/admin/src/app/layout.tsx
git commit -m "chore: align frontend dependencies"
```

---

## Task 42: Cross-Domain Web Integration

**Files:**

- Modify: `apps/web/src/components/layout/app-sidebar.tsx`
- Modify: `apps/web/src/components/layout/app-header.tsx`
- Create: `docs/migration/web/integration-checklist.md`

- [ ] **Step 1: Wire final web navigation**
  - Ensure sidebar/header routes cover `/chat`, `/lesson/inspiration`, `/lesson/simulation`, `/office/comment`, `/office/teaching`.

- [ ] **Step 2: Create web integration checklist**
  - Record manual checks for all user-facing workflows.
  - Record mock data expectations.

- [ ] **Testing steps**
  - Every web route loads.
  - Navigation active state is correct.
  - Workflow redirect from chat reaches correct page.

- [ ] **Verification commands**

```bash
pnpm --filter web type-check
pnpm --filter web lint
pnpm build:web
rg -n "/chat|/lesson/inspiration|/lesson/simulation|/office/comment|/office/teaching" docs/migration/web/integration-checklist.md
```

- [ ] **Commit**

```bash
git add apps/web/src/components/layout docs/migration/web/integration-checklist.md
git commit -m "test: add web integration checklist"
```

---

## Task 43: Cross-Domain Admin Integration

**Files:**

- Modify: `apps/admin/src/components/layout/admin-sidebar.tsx`
- Modify: `apps/admin/src/components/layout/admin-header.tsx`
- Create: `docs/migration/admin/integration-checklist.md`

- [ ] **Step 1: Wire final admin navigation**
  - Ensure every documented admin route appears in sidebar.
  - Ensure unknown admin route redirects to `/dashboard`.

- [ ] **Step 2: Create admin integration checklist**
  - Record manual checks for auth, resource CRUD, simulations, users, operations, security, alarm, settings.

- [ ] **Testing steps**
  - Every admin route loads.
  - Sidebar active state is correct.
  - Unauthenticated access redirects to `/login`.

- [ ] **Verification commands**

```bash
pnpm --filter admin type-check
pnpm --filter admin lint
pnpm build:admin
rg -n "/dashboard|/resources/agents|/resources/prompts|/resources/sensitive-words|/simulations|/engine-dispatch|/users|/settings" docs/migration/admin/integration-checklist.md
```

- [ ] **Commit**

```bash
git add apps/admin/src/components/layout docs/migration/admin/integration-checklist.md
git commit -m "test: add admin integration checklist"
```

---

## Task 44: Docker Compose Runtime Verification

**Files:**

- Modify: `docker-compose.yml`
- Modify: `.env.example`
- Create: `docs/migration/runtime-verification.md`

- [ ] **Step 1: Verify Compose services**
  - Keep Postgres, Redis, and pgAdmin in the default profile.
  - Keep `db-init`, `server`, `web`, and `admin` under the `app` profile.
  - Keep ports: server `3000`, web `3001`, admin `3002`, Postgres `5432`, Redis `6379`, pgAdmin `5050`.

- [ ] **Step 2: Document pgAdmin usage**
  - URL: `http://localhost:5050`.
  - Server host: `postgres`.
  - Database: `aether_db`.
  - User: `aether`.

- [ ] **Testing steps**
  - Default Compose config validates.
  - App profile Compose config validates.
  - pgAdmin health endpoint responds.
  - Postgres and Redis health checks pass.

- [ ] **Verification commands**

```bash
docker compose --env-file .env.example config
docker compose --env-file .env.example --profile app config
docker compose --env-file .env.example up -d
docker compose --env-file .env.example ps
curl -f http://localhost:5050/misc/ping
docker compose --env-file .env.example down
```

- [ ] **Commit**

```bash
git add docker-compose.yml .env.example docs/migration/runtime-verification.md
git commit -m "test: document docker compose runtime"
```

---

## Task 45: Full Workspace Verification

**Files:**

- Create: `docs/migration/final-verification.md`

- [ ] **Step 1: Run workspace checks**
  - Run DB generation, type-check, builds, and lint.
  - Run Docker app profile smoke checks after successful build.

- [ ] **Step 2: Record final verification**
  - Save command outputs summary in `docs/migration/final-verification.md`.
  - Record unresolved issues with exact failing command and owner task.

- [ ] **Testing steps**
  - Web smoke routes load.
  - Admin smoke routes load.
  - Server tRPC endpoint responds.
  - pgAdmin remains accessible.

- [ ] **Verification commands**

```bash
pnpm db:generate
pnpm type-check
pnpm build
pnpm lint
docker compose --env-file .env.example --profile app up -d
curl -f http://localhost:3000/trpc
curl -f http://localhost:3001
curl -f http://localhost:3002
curl -f http://localhost:5050/misc/ping
docker compose --env-file .env.example logs --tail=100
docker compose --env-file .env.example down
```

- [ ] **Commit**

```bash
git add docs/migration/final-verification.md
git commit -m "test: record final migration verification"
```

---

## Assumptions And Defaults

- 本计划保存路径为 `docs/superpowers/plans/2026-05-19-domain-by-domain-migration.md`。
- 每个业务域先产生分析文档，再进入 schema/backend/frontend 实现，方便 Codex 崩溃或 resume 后恢复上下文。
- 缺失 `source_web` / `source_admin` 时，以 `docs/migration/web`、`docs/migration/admin`、`docs/migration/api` 作为旧项目分析来源。
- API 迁移以 tRPC 为准；旧 REST 文档只提供字段、错误语义和业务边界参考。
- 开发期允许 mock 数据自测；真实模型、微信、Excel 解析、API Key 加密可在对应服务接口内替换，不改变前端调用方式。
- `packages/ui` 只收通用 UI primitive，不收业务组件。
