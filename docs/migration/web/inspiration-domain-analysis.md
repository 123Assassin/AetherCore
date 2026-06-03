# Web Inspiration Old Page Analysis

## Scope

This analysis covers the old user-side inspiration page for Task 14. Inputs reviewed:

- `docs/migration/web/spec.md`
- `docs/migration/web/routes.md`
- `docs/migration/web/components.md`
- `docs/migration/web/api-assumptions.md`
- `docs/migration/web/chat-domain-analysis.md`
- `source/source-web/src/pages/LessonModule.tsx`
- `source/source-web/src/pages/InspirationLibrary.tsx`
- `source/source-web/src/contexts/UserPreferencesContext.tsx`
- `source/source-web/src/contexts/ChatHistoryContext.tsx`

The current repository does not contain a top-level `source_web` directory. The old web source is available at `source/source-web`.

## Old Route And Page Ownership

The old app has no React Router. `LessonModule.tsx` is rendered from `/` when the app shell has `activeTab === "lesson"`, then chooses the lesson subpage by `subTab`.

| Old logical route | Old condition                                              | Old component            | Notes                                                                |
| ----------------- | ---------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------- |
| `/`               | `activeTab === "lesson"`                                   | `LessonModule.tsx`       | Lesson container; passes the current inspiration session into child. |
| `/`               | `activeTab === "lesson" && activeSubTab === "inspiration"` | `InspirationLibrary.tsx` | Knowledge explanation/inspiration page.                              |
| `/`               | `activeTab === "lesson" && activeSubTab === "simulation"`  | `SimulationLab.tsx`      | Adjacent lesson feature, not part of this analysis.                  |

`LessonModule.tsx` reads `currentSessionIds.inspiration` from `ChatHistoryContext` and passes `setCurrentSessionId('inspiration', id)` to `InspirationLibrary`. The page itself owns the rest of the inspiration workflow: form state, generation, follow-up, copy state, ad gate state, and direct Gemini chat instance state.

## Form Fields

`InspirationLibrary.tsx` collects these fields before generating an inspiration response:

| Field          | Old UI label             | Required | Old state source               | Old behavior                                                                                                                                   |
| -------------- | ------------------------ | -------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `grade`        | `授课对象`               | Yes      | `useUserPreferences().grade`   | Select options: `小学`, `初中`, `高中`, `大学`. Case cards can override it.                                                                    |
| `subject`      | `学科`                   | Yes      | `useUserPreferences().subject` | Select options include `语文`, `数学`, `英语`, `物理`, `化学`, `生物`, `历史`, `地理`, `政治`, `信息技术`, `科学`. Case cards can override it. |
| `topic`        | `今天想讲点啥？(知识点)` | Yes      | Local `topic` state            | Empty value triggers browser `alert('请输入你想讲的知识点哦~')`; generation button is also disabled when empty.                                |
| `context`      | `学情与教学习惯`         | No       | Local `context` state          | If present, old frontend appends it to the Gemini prompt as `我的学情/教学习惯`.                                                               |
| `followUpText` | Bottom follow-up input   | No       | Local `followUpText` state     | Only shown after messages exist; Enter or send button submits a follow-up.                                                                     |

The empty state also has three hard-coded featured cases. Clicking one calls generation with case-provided `topic`, `grade`, and `subject`, then writes the overrides back into page/preference state.

## LocalStorage Preference And Session Dependencies

The old inspiration page depends on two browser-local contexts:

| Dependency                           | Old storage key or state                                          | Used by inspiration page                                                                               | Migration direction                                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Grade preference                     | `localStorage.user_pref_grade`                                    | Default `grade`; updated when the user changes the select or clicks a featured case.                   | Treat as user preference data behind backend/app state, not an authoritative localStorage-only source.                  |
| Subject preference                   | `localStorage.user_pref_subject`                                  | Default `subject`; updated when the user changes the select or clicks a featured case.                 | Treat as user preference data behind backend/app state, not an authoritative localStorage-only source.                  |
| Credits                              | `localStorage.user_credits` and `localStorage.user_credits_reset` | `credits <= 0` opens `ExportAdModal`; otherwise `consumeCredit()` runs before generation or follow-up. | Credit policy should be backend-owned. Frontend displays server-returned credit state and may show the sponsor gate UI. |
| Chat history                         | `localStorage.chatHistory`                                        | Stores inspiration sessions, messages, titles, categories, and timestamps.                             | Move to backend AI conversation/session state. A temporary importer can read old data if needed.                        |
| Current selected inspiration session | React state `currentSessionIds.inspiration`                       | Selects which inspiration session to display and update.                                               | Derive from route/session state backed by backend conversations, not a browser-only context.                            |

Old history persistence stores serialized `timestamp` values through JSON, so restored timestamps are strings rather than `Date` instances. Migration code should normalize timestamps if importing old history.

## Prompt Ownership

The old frontend owns prompt assembly and provider calls:

- `InspirationLibrary.tsx` imports `GoogleGenAI` from `@google/genai`.
- It creates a browser AI client from `VITE_GEMINI_API_KEY` or `process.env.GEMINI_API_KEY`.
- `actualGenerate()` builds a long system prompt from `grade`, `subject`, `topic`, and optional `context`.
- The prompt instructs the model to output Markdown sections for analogy, scaffolding, insights, visual aid search terms, and an image URL based on `picsum.photos`.
- It creates `ai.chats.create({ model: 'gemini-3-flash-preview' })` in the browser and calls `sendMessage({ message: systemPrompt })`.

Target architecture must not preserve frontend prompt assembly. The migrated page should send structured inputs only: `grade`, `subject`, `topic`, optional `context`, and session/follow-up metadata. Prompt templates, model selection, provider invocation, image/content policy, and error normalization belong in the backend AI layer and dedicated inspiration procedures.

## Follow-Up Behavior

Old follow-up behavior is tied to the browser-held Gemini chat instance:

- `chatRef.current` is created during a fresh generation.
- `handleFollowUp(text)` returns early when text is blank or when `chatRef.current` is missing.
- Follow-up consumes one credit or opens the same ad gate when credits are exhausted.
- `actualFollowUp(text)` appends a user message, calls `chatRef.current.sendMessage({ message: text })`, and appends the assistant response.
- Four hard-coded follow-up suggestion chips are shown only below the last assistant message:
  - `换个更生活化的比喻`
  - `设计一个5分钟的课堂互动小游戏`
  - `针对基础较差的学生，有没有更简单的说法？`
  - `这个知识点在考试中通常怎么出题？`

This means an old restored session can show previous messages from `localStorage.chatHistory`, but it cannot reliably continue the model conversation after refresh because the Gemini chat instance is not persisted. It can also become unreliable after switching between restored sessions in the same browser session because `chatRef.current` is browser-memory state, not session-owned state. Migration should make follow-up server-owned: submit the session id and follow-up message to the AI backend, let the backend rebuild context from persisted messages, and stream or return the assistant response.

## Target Mapping

| Concern              | Target                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Route                | `apps/web/src/app/(app)/lesson/inspiration/page.tsx`                                                                    |
| Backend              | Existing `apps/server` AI service/repository category support plus Task 15's dedicated inspiration tRPC procedures.     |
| Shared category type | `packages/shared/src/types/ai.ts` includes `inspiration` as an AI conversation category.                                |
| Components           | `apps/web/src/components/inspiration` for inspiration-specific business components.                                     |
| Common chat UI       | Existing `apps/web/src/components/chat` can be reused where appropriate for message list, sender, and suggestion chips. |

Suggested inspiration component split under `apps/web/src/components/inspiration`:

| Component                  | Responsibility                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| `InspirationForm`          | `grade`, `subject`, `topic`, `context`, validation state, and submit action.                        |
| `FeaturedInspirationCases` | Empty-state case cards that submit predefined `grade`, `subject`, and `topic`.                      |
| `InspirationChatPanel`     | Assistant/user messages, streaming state, copy action, follow-up suggestions, and follow-up sender. |

## Target Data Flow

1. Page loads `/lesson/inspiration`.
2. Frontend reads the current preference/session state from the migrated app/backend state.
3. User selects `grade` and `subject`, enters required `topic`, and may enter optional `context`.
4. Frontend validates that `topic` is trimmed non-empty.
5. Frontend calls the `apps/server` tRPC inspiration contract; it does not assemble a prompt. Task 15 should add `ai.inspiration.generate` with `sessionId?`, `grade`, `subject`, `topic`, and `context?`, plus `ai.inspiration.followUp` with `sessionId` and `message`. Until those dedicated procedures exist, the generic AI service only provides conversation/category persistence and deterministic mock event support.
6. Backend creates or reuses an inspiration conversation, persists messages, and returns streamed or structured assistant content. Inspiration-specific prompt assembly, real provider invocation, and authoritative credit policy are backend responsibilities to implement or wire in Task 15 and later AI-provider work; they should not be assumed to already exist in the current generic mock AI service.
7. Frontend renders the assistant content and follow-up affordances.
8. Follow-up sends `{ sessionId, message }` or equivalent tRPC input to the backend; frontend does not use a browser model chat instance.

## Migration Constraints

- No frontend `@google/genai` for the inspiration page.
- No browser-owned Gemini API key.
- No frontend prompt assembly for the initial generation or follow-up.
- No localStorage as the authoritative source for `grade`, `subject`, credits, or inspiration history.
- Keep inspiration-specific business components in `apps/web/src/components/inspiration`, not `packages/ui`.
- Keep target route as `apps/web/src/app/(app)/lesson/inspiration/page.tsx`.
