# Admin Resource Domain Analysis

## Source Availability

Legacy source pages are available under `source/source-admin/src/pages` and were read for this analysis:

- `Dashboard.tsx`
- `Agents.tsx`
- `AIPrompts.tsx`
- `SensitiveWords.tsx`
- `EngineDispatch.tsx`

The current repo uses `apps/admin/src/app`, not bare `apps/admin/app`. Existing `apps/admin/src/app/(admin)` content currently covers simulations only; the resource and engine pages below are target paths for the next migration tasks.

## Route and Component Mapping

| Domain          | Old route                    | Old component                                      | Target route file                                               | Target components                                                                                                                                                                      |
| --------------- | ---------------------------- | -------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard       | `/dashboard`                 | `source/source-admin/src/pages/Dashboard.tsx`      | `apps/admin/src/app/(admin)/dashboard/page.tsx`                 | Dashboard components are owned by Task 31 under `apps/admin/src/components/dashboard`                                                                                                  |
| Agents          | `/resources/agents`          | `source/source-admin/src/pages/Agents.tsx`         | `apps/admin/src/app/(admin)/resources/agents/page.tsx`          | `apps/admin/src/components/resources/agent-card.tsx`, `apps/admin/src/components/resources/agent-form-dialog.tsx`                                                                      |
| Prompt          | `/resources/prompts`         | `source/source-admin/src/pages/AIPrompts.tsx`      | `apps/admin/src/app/(admin)/resources/prompts/page.tsx`         | `apps/admin/src/components/resources/prompt-card.tsx`, `apps/admin/src/components/resources/prompt-form-dialog.tsx`, `apps/admin/src/components/resources/prompt-markdown-preview.tsx` |
| Sensitive Words | `/resources/sensitive-words` | `source/source-admin/src/pages/SensitiveWords.tsx` | `apps/admin/src/app/(admin)/resources/sensitive-words/page.tsx` | `apps/admin/src/components/resources/sensitive-word-list-card.tsx`, `apps/admin/src/components/resources/sensitive-word-form-dialog.tsx`                                               |
| Engine          | `/engine-dispatch`           | `source/source-admin/src/pages/EngineDispatch.tsx` | `apps/admin/src/app/(admin)/engine-dispatch/page.tsx`           | `apps/admin/src/components/engines/engine-table.tsx`, `apps/admin/src/components/engines/engine-form-dialog.tsx`                                                                       |

## CRUD Behavior and Fields

### Dashboard

- Behavior: read-only metrics page. Legacy data is local mock state; `activeNow` randomly changes every 3 seconds.
- Metrics: current online users, daily model token consumption, UV, average visit duration, traffic source Top 5, and reserved trend chart area.
- Target metric payload also includes PV; preserve this even though Task 31 owns the Dashboard UI.
- Target API: `GET /api/admin/dashboard/overview`.
- Validation: no form validation; backend should provide numeric metrics and stable traffic source ratios.

### Agents

- Behavior: list cards, create, edit, delete with custom delete confirmation.
- Create: client generates `id`, `createdAt`, and default `status: "stopped"` in legacy code.
- Edit: replaces the full item with form state.
- Delete: removes item locally after confirmation.
- Form fields: name, engineId, promptId, sensitiveListId, config.temperature, config.topP. `config.maxTokens` exists in type/default values but has no legacy UI input.
- Target-only fields: backend/API docs require a stable `key` such as `comment`. The migrated admin UI exposes this as a required select, but the options must come from the shared `WEB_AGENT_MAPPING` constant instead of a local string array.
- Supported mapping keys: `chat` = AI 助手智能体, `inspiration` = 知识精讲智能体, `comment` = 学生评语智能体, `teaching` = 题目变身智能体.
- Classification rules: `inspiration` and `teaching` require grade + subject; `comment` requires grade only; `chat` is a general agent without grade or subject. `comment`、`inspiration`、`teaching` 的 grade options are `小学` and `初中`; `inspiration` and `teaching` expose subject classification. The allowed grade/subject option lists are maintained beside `WEB_AGENT_MAPPING` in `packages/shared/src/types/agent-mapping.ts`.
- Validation and relationships: name is required in legacy UI. Target backend must validate engine, Prompt, and Sensitive Words list references; missing relations should return `404`, duplicate key + classification should return `409 AGENT_KEY_EXISTS`, and in-use deletes should return `409 RESOURCE_IN_USE`.
- Target APIs: `GET /api/admin/agents` with `q`, `status`, `engineId`, `page`, `pageSize`; `POST /api/admin/agents`; `PUT /api/admin/agents/:id`; `DELETE /api/admin/agents/:id`.

### Prompt

- Behavior: list cards, create, edit, delete with custom delete confirmation.
- Create: client generates `id` and `updatedAt` in legacy code.
- Edit: replaces the full prompt with form state.
- Delete: removes prompt locally after confirmation.
- Form fields: title, version, content.
- Validation and relationships: title is required in legacy UI; target backend should require title/content/version, enforce unique `(title, version)` for non-deleted prompts, and return `409` when deleting a Prompt referenced by Agents.
- Target APIs: `GET /api/admin/prompts` with `q`, `page`, `pageSize`; `POST /api/admin/prompts`; `PUT /api/admin/prompts/:id`; `DELETE /api/admin/prompts/:id`.
- UI note: Prompt content should support Markdown preview with `react-markdown`.

### Sensitive Words

- Behavior: list cards, create, edit, delete with custom delete confirmation.
- Create: client generates `id` and `updatedAt` in legacy code.
- Edit: joins existing words with commas for the textarea, then saves parsed words.
- Delete: removes list locally after confirmation.
- Form fields: name, words textarea.
- Validation and relationships: name is required in legacy UI. The legacy textarea parses comma-separated text with `split(",").map(trim).filter(Boolean)`. Target backend should store `words: string[]`, reject empty names, normalize blank entries, reject the save when the parsed `words` array is empty, and return `409` when deleting a Sensitive Words list referenced by Agents.
- Target APIs: `GET /api/admin/sensitive-word-lists` with no query parameters currently documented; `POST /api/admin/sensitive-word-lists`; `PUT /api/admin/sensitive-word-lists/:id`; `DELETE /api/admin/sensitive-word-lists/:id`.

### Engine

- Behavior: table list, create, edit, delete with custom delete confirmation.
- Create: client generates `id` and `createdAt` in legacy code.
- Edit: replaces the full engine with form state.
- Delete: removes engine locally after confirmation, though the warning says dependent agents may be affected.
- Legacy form fields: name, apiUrl, API Key.
- Target create fields: name, apiBaseUrl, plaintext API Key, and modelName; provider is not exposed in the admin form and defaults to `custom` for model API calls.
- Target update fields: name, apiBaseUrl, optional replacement API Key, modelName, and status; provider remains an internal persisted field.
- Response and persisted fields also include status; the DB schema stores `api_base_url`, encrypted `api_key_ciphertext`, `model_name`, optional pricing, status, timestamps, and soft-delete state.
- Validation and relationships: legacy UI requires name, apiUrl, and API Key before save. Target backend should validate URL/API Key, default provider to `custom`, reject duplicate engine names, and return `409` when deleting an Engine referenced by Agents.
- Target APIs: `GET /api/admin/engines` with no query parameters currently documented; `POST /api/admin/engines`; `PUT /api/admin/engines/:id`; `DELETE /api/admin/engines/:id`.

## API Key Security Rule

Engine API Key handling must be stricter than the legacy UI. The old table stores and displays `apiKey: "sk-********"` with CSS blur/hover, which is only visual masking.

- Backend must never return plaintext API keys in list, detail, or edit responses.
- Responses must return only a masked value such as `apiKeyMasked`; no response field should contain the raw secret.
- Create accepts plaintext `apiKey` once and stores it securely.
- Update accepts an optional replacement `apiKey`; if omitted, the backend keeps the existing stored key.
- Edit forms should show only the masked API Key and provide an empty replacement field or explicit replacement flow.

## Downstream Ownership

- Schema: add durable tables/entities for Agents, Prompt versions, Sensitive Words lists, and Engine configs; model foreign keys from Agents to engines, prompts, and sensitive word lists; include the agent `key + grade + subject` uniqueness constraint; store engine API keys encrypted or otherwise secret-managed using `api_key_ciphertext`.
- Backend: implement authenticated admin tRPC/API procedures with pagination/filter inputs where documented, relationship checks, conflict handling, and the API Key masking rule.
- UI: add App Router pages under `apps/admin/src/app/(admin)`, resource components under `apps/admin/src/components/resources`, engine components under `apps/admin/src/components/engines`, and preserve the legacy CRUD/dialog behavior while replacing local mock state with backend data. Agent key labels/options are read from `packages/shared/src/types/agent-mapping.ts`.
