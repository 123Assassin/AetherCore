# Vision Engine Dispatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global vision-engine pre-processing step for AI requests with uploaded images.

**Architecture:** Model engines gain a `category` field. Admin configures both reasoning and vision engines in one engine table, agents only select reasoning engines, and server uses the first enabled vision engine to convert uploaded image URLs into text before calling the agent's reasoning engine.

**Tech Stack:** Next.js admin UI, NestJS server, tRPC routers, Drizzle ORM, PostgreSQL, Node `tsx --test`.

---

### Task 1: Engine Category Data Model

**Files:**

- Modify: `packages/db/src/schema/ai-resources.ts`
- Create: `packages/db/drizzle/0016_model_engine_category.sql`
- Modify: `packages/db/drizzle/meta/_journal.json`
- Modify: `packages/shared/src/types/admin-resources.ts`

- [ ] Add `modelEngineCategories = ['reasoning', 'vision']`.
- [ ] Add `category` to `modelEngines`, defaulting to `reasoning`.
- [ ] Add migration SQL that backfills existing rows as `reasoning`.
- [ ] Export admin shared types for engine categories.

### Task 2: Admin Resource Service and Router

**Files:**

- Modify: `apps/server/src/modules/admin-resources/admin-resources.service.ts`
- Modify: `apps/server/src/modules/admin-resources/admin-resources.repository.ts`
- Modify: `apps/server/src/trpc/routers/admin-resources.router.ts`
- Test: `apps/server/src/modules/admin-resources/admin-resources.service.spec.ts`

- [ ] Add tests for creating/listing a vision engine.
- [ ] Add tests that agent create/update rejects a vision engine.
- [ ] Thread `category` through create/update/list.
- [ ] Add repository lookup for first enabled vision engine.

### Task 3: Admin UI

**Files:**

- Modify: `apps/admin/src/components/engines/engine-form-dialog.tsx`
- Modify: `apps/admin/src/components/engines/engine-table.tsx`
- Modify: `apps/admin/src/components/resources/agent-form-dialog.tsx`
- Modify: `apps/admin/src/app/(admin)/resources/agents/page.tsx`

- [ ] Add engine category select in the engine form.
- [ ] Show engine category in the engine table.
- [ ] Filter agent form engine options to `reasoning`.
- [ ] Keep existing engine edits defaulting to `reasoning` when category is absent.

### Task 4: Vision Pre-processing Runtime

**Files:**

- Modify: `apps/server/src/modules/ai/ai-agent-runtime.ts`
- Modify: `apps/server/src/modules/ai/ai.repository.ts`
- Modify: `apps/server/src/modules/ai/ai.service.ts`
- Test: `apps/server/src/modules/ai/ai.service.spec.ts`

- [ ] Add runtime support for calling an engine without an agent.
- [ ] Add repository method for first enabled vision engine.
- [ ] Add tests that images trigger vision extraction before reasoning.
- [ ] Add tests that images fail clearly when no vision engine is configured.
- [ ] Pass extracted text to reasoning engine and omit image payload from the reasoning call.

### Task 5: Verification

**Files:**

- Related changed files only.

- [ ] Run targeted server tests.
- [ ] Run targeted admin/web tests affected by UI changes.
- [ ] Run `pnpm --filter @package/shared build`.
- [ ] Run `pnpm --filter server type-check`.
- [ ] Run `pnpm --filter admin type-check`.
- [ ] Run server/admin lint if type checks pass.
