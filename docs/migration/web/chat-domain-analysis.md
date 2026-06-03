# Web Chat Old Page Analysis

## Scope

This analysis covers the old user-side chat entry and application shell for Task 9. Inputs reviewed:

- `docs/migration/web/spec.md`
- `docs/migration/web/routes.md`
- `docs/migration/web/components.md`
- `docs/migration/web/api-assumptions.md`
- `source/source-web/src/App.tsx`
- `source/source-web/src/pages/ChatAssistant.tsx`
- `source/source-web/src/components/Sidebar.tsx`
- `source/source-web/src/components/HistorySidebar.tsx`
- `source/source-web/src/contexts/ChatHistoryContext.tsx`
- `source/source-web/src/contexts/UserPreferencesContext.tsx`

The current repository does not contain a top-level `source_web` directory. It does contain the old web source at `source/source-web`, so the four requested old files are available there.

## Source Availability And Targets

| Old file             | Source availability                                                | Old responsibility                                                                                                                                                                                                              | Target file or area                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `App.tsx`            | Available at `source/source-web/src/App.tsx`                       | Vite single-page application shell, active main tab and sub-tab state, providers, header, history toggle, login modal, donate modal, and page selection.                                                                        | App shell should move to `apps/web/src/app/(app)/layout.tsx`, with business shell pieces in `apps/web/src/components`.                                         |
| `ChatAssistant.tsx`  | Available at `source/source-web/src/pages/ChatAssistant.tsx`       | Default AI assistant page, local message state, history session creation/update, credit gate, direct Gemini call through `@google/genai`, `react-markdown` rendering, suggestions parsing, and workflow function-call handling. | Target route: `apps/web/src/app/(app)/chat/page.tsx`. Reusable chat UI and business logic stay under `apps/web/src/components` or app-local feature folders.   |
| `Sidebar.tsx`        | Available at `source/source-web/src/components/Sidebar.tsx`        | Narrow left navigation for `chat`, `lesson`, and `office`, login/logout entry, sponsor entry, and remaining credits display.                                                                                                    | Business component under `apps/web/src/components`, likely as `AppSidebar`; it should drive real route navigation instead of `activeTab` state.                |
| `HistorySidebar.tsx` | Available at `source/source-web/src/components/HistorySidebar.tsx` | Session list, new conversation, delete, selected session, and filtering by current module.                                                                                                                                      | Business component under `apps/web/src/components`, likely `history/history-sidebar.tsx`; it should filter by pathname/category and use migrated session APIs. |

Current `apps/web` uses `src/app`, not root `app`, so the target route for this task should be interpreted as `apps/web/src/app/(app)/chat/page.tsx`.

## Route Decision

Old web has no React Router. `App.tsx` renders everything from `/` by switching on `activeTab` and `activeSubTab`.

The chat migration should create a real Next.js App Router page:

- `/chat` -> `apps/web/src/app/(app)/chat/page.tsx`
- `/` can redirect to `/chat` in a later route task.
- Shared app shell should live at `apps/web/src/app/(app)/layout.tsx`.
- Business components stay in `apps/web/src/components`, not `packages/ui`, because they depend on RedPenAI/AetherCore domain concepts such as credits, sessions, sponsor gates, and workflow categories.

The old tab state should be replaced by routes:

| Old state                                                  | New route             |
| ---------------------------------------------------------- | --------------------- |
| `activeTab === "chat"`                                     | `/chat`               |
| `activeTab === "lesson" && activeSubTab === "inspiration"` | `/lesson/inspiration` |
| `activeTab === "lesson" && activeSubTab === "simulation"`  | `/lesson/simulation`  |
| `activeTab === "office" && activeSubTab === "comment"`     | `/office/comment`     |
| `activeTab === "office" && activeSubTab === "teaching"`    | `/office/teaching`    |

## Chat Page Behavior

`ChatAssistant.tsx` currently owns too many concerns:

- renders the chat page UI;
- reads and writes the current `chat` session;
- creates the welcome assistant message when no session is selected;
- consumes a local credit before sending;
- opens an ad modal when credits are exhausted;
- calls Gemini directly in the browser through `@google/genai`;
- parses `###SUGGESTIONS###` from model output;
- renders assistant Markdown with `react-markdown`;
- handles model function calls by calling `setActiveTab(args.workflowName)`.

Migration decision:

- The route page at `apps/web/src/app/(app)/chat/page.tsx` should assemble the chat view.
- Model selection, prompt construction, function/tool calling, suggestions extraction, and workflow decisions should move behind API/server code.
- The frontend should render streamed assistant content with `@ant-design/x` components such as `Bubble`, `Sender`, `Conversations`, and `Prompts`.
- There should be no frontend `@google/genai`.
- There should be no frontend `react-markdown`.

## API Boundary

The chat route should call the unified backend rather than calling Gemini directly. In this
monorepo that means `apps/server` NestJS + tRPC procedures, not a new browser-owned Gemini
client and not a standalone Next API implementation.

The old migration assumptions describe the behavior as REST:

- `POST /api/ai/chat`
- Request contains `sessionId`, prior `messages`, and current `input`.
- Response should stream assistant deltas and structured events, including session id, suggestions, workflow instructions, credit updates, done, and error events.

That REST path is source-domain reference only. The target contract should be an `apps/server`
tRPC chat procedure with equivalent inputs and structured outputs. A REST/SSE endpoint or thin
Next proxy should only be introduced if a later streaming implementation proves tRPC cannot carry
the required transport behavior cleanly, and that exception should still keep provider calls and
prompt logic on the backend.

Frontend responsibilities:

- submit user input and session context;
- append streamed `delta` content to the current assistant message;
- render streaming state through Ant Design X;
- persist or refresh the selected session based on API results;
- route to a workflow when the API returns a workflow event;
- avoid parsing model-native function calls.

Backend responsibilities:

- invoke the AI provider;
- build system and user prompts;
- run tool/function calling or equivalent workflow classification;
- parse suggestions;
- enforce credit policy;
- persist or return session updates.

## Components

Business components should stay in `apps/web/src/components`. They should not be promoted to `packages/ui` unless they are free of AetherCore business state, copy, and data contracts.

Likely business components for the chat shell:

| Component            | Origin                                | Notes                                                                                            |
| -------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `AppSidebar`         | `Sidebar.tsx`                         | Use Next navigation and route active state. Keep credits, login, and sponsor behavior app-local. |
| `AppHeader`          | `App.tsx` header                      | Own history toggle, brand title, and route-aware sub-navigation.                                 |
| `HistorySidebar`     | `HistorySidebar.tsx`                  | Filter sessions by route/category instead of `activeTab`; support new, select, and delete.       |
| `ChatMessageList`    | `ChatAssistant.tsx` message loop      | Render user/assistant messages and loading state.                                                |
| `AiSender`           | `ChatAssistant.tsx` input             | Wrap Ant Design X `Sender` or the chosen app-local sender component.                             |
| `SuggestionChips`    | `ChatAssistant.tsx` suggestions block | Send selected suggestion through the same chat API path.                                         |
| `SponsoredGateModal` | `ExportAdModal` usage                 | Gate sending when local/server credit policy requires it.                                        |

Only generic primitives such as buttons, modal shells, tabs, inputs, and file dropzones are candidates for `packages/ui`.

## Storage Migration

Old storage is browser-only:

| Old key or state                | Source                       | Current meaning                                                                            | Migration direction                                                                                                            |
| ------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `localStorage.chatHistory`      | `ChatHistoryContext.tsx`     | All sessions, messages, categories, titles, and timestamps.                                | Move to backend-backed history/session APIs. A temporary client importer can read this key once after login or first app load. |
| `currentSessionIds` React state | `ChatHistoryContext.tsx`     | Selected session per category: `chat`, `comment`, `inspiration`, `simulation`, `teaching`. | Derive from route plus URL/search param or app state backed by session APIs.                                                   |
| `user_pref_grade`               | `UserPreferencesContext.tsx` | Default grade for lesson and simulation flows.                                             | Move to the `me.preferences` tRPC procedure; `/api/me/preferences` is legacy reference naming only.                            |
| `user_pref_subject`             | `UserPreferencesContext.tsx` | Default subject for lesson and simulation flows.                                           | Move to the `me.preferences` tRPC procedure; `/api/me/preferences` is legacy reference naming only.                            |
| `user_credits`                  | `UserPreferencesContext.tsx` | Local remaining credit count.                                                              | Move to server-side credit state. Frontend displays server-returned credit updates.                                            |
| `user_credits_reset`            | `UserPreferencesContext.tsx` | Local 180-day reset timestamp.                                                             | Move reset policy to server. Frontend should not calculate authoritative reset eligibility.                                    |

The migrated chat route should not rely on localStorage as the source of truth for history or credits. If localStorage migration is implemented, it should be scoped to importing old data and then deferring to API state. Importers must normalize serialized timestamps: old `Message.timestamp` values are strings after `localStorage` deserialization, not `Date` instances, so persisted history should use ISO strings or another explicit server timestamp format.

## Workflow Mapping

Old `ChatAssistant.tsx` declares an `openWorkflow` function with `workflowName` values of `comment`, `inspiration`, and `teaching`. The old handler calls `setActiveTab(args.workflowName)`, but those values are not valid main tab ids. This is a known routing mismatch.

Migration decision: the backend should return a workflow event with both `workflowName` and `redirectTo`; the frontend should route to the real page.

| Workflow      | Target route          | Notes                                       |
| ------------- | --------------------- | ------------------------------------------- |
| `comment`     | `/office/comment`     | Opens the real comment assistant route.     |
| `inspiration` | `/lesson/inspiration` | Opens the real knowledge explanation route. |
| `teaching`    | `/office/teaching`    | Opens the real teaching assist route.       |

The chat page should not set main tab state directly. It should call the Next router with the mapped route from the API event or a local allowlisted mapping.

## Migration Constraints

- Do not install or use frontend `@google/genai`.
- Do not install or use frontend `react-markdown`.
- Do not parse Gemini function calls in the browser.
- Do not put RedPenAI/AetherCore business components into `packages/ui`.
- Keep `apps/web/src/components` as the home for app shell, chat, history, sponsor, login, and workflow-aware components.
- Keep the first chat route target as `apps/web/src/app/(app)/chat/page.tsx`.

## Open Questions

- The migration docs name `apps/web/app/...`, while the current repo uses `apps/web/src/app/...`. This analysis uses the current repo convention and the task's explicit target route.
- The server contract should be implemented in `apps/server` tRPC first. Any REST/SSE route or Next proxy is an explicit transport exception, not the default architecture.
