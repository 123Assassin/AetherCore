# Web Teaching Old Page Analysis

## Scope

This analysis covers the old user-side teaching page for Task 25. Inputs reviewed:

- `docs/migration/web/spec.md`
- `docs/migration/web/api-assumptions.md`
- `docs/migration/web/migration-map.md`
- `docs/migration/web/components.md`
- `docs/migration/web/routes.md`
- `docs/migration/api/restful-api.md`
- `source/source-web/src/pages/TeachingAssist.tsx`
- `source/source-web/src/pages/OfficeModule.tsx`
- `source/source-web/src/App.tsx`
- `docs/migration/web/comments-domain-analysis.md`

The repository does not contain top-level `source_web` or `source_admin` directories. The old `TeachingAssist` source is available at `source/source-web/src/pages/TeachingAssist.tsx`, so this document uses that file for old UI behavior and the migration docs as the target source of truth.

## Old Route And Page Ownership

The old app has no React Router. `TeachingAssist.tsx` renders from `/` when the app shell has `activeTab === "office"` and `activeSubTab === "teaching"`. `OfficeModule.tsx` owns the office sub-tab branch and passes the `teaching` session id from `ChatHistoryContext` into `TeachingAssist`.

The migration route is `/office/teaching`.

The older migration docs map this page to `apps/web/app/(app)/office/teaching/page.tsx`.
The current repo uses a `src/app` layout, so the normalized target path is
`apps/web/src/app/(app)/office/teaching/page.tsx`.

| Old component    | Old condition                                           | Target route                                      |
| ---------------- | ------------------------------------------------------- | ------------------------------------------------- |
| `TeachingAssist` | `activeTab === "office" && activeSubTab === "teaching"` | `apps/web/src/app/(app)/office/teaching/page.tsx` |

The old page owns teaching mode selection, subject/grade selection, input text, transformation level, result messages, copy state, follow-up input, local credit/ad gating, and the browser AI chat instance. Migration should keep teaching-specific business components under `apps/web/src/components/teaching` or the already documented teaching feature folder, while generic primitives can remain in shared UI packages.

## Teaching Context And Input Modes

Old mode state:

| Concern      | Old value                                                                  | Required behavior                                    |
| ------------ | -------------------------------------------------------------------------- | ---------------------------------------------------- |
| State key    | `inputType`                                                                | Defaults to `variant`.                               |
| Type union   | `'variant' \| 'knowledge'`                                                 | Selects both input copy and level option collection. |
| UI labels    | `原题变式`, `知识点出题`                                                   | Segmented button in Step 2.                          |
| Input state  | `inputContent`                                                             | Shared textarea for both modes.                      |
| Submit guard | `handleGenerate` returns early when `finalContent.trim()` is empty.        | The generate button is disabled when empty/loading.  |
| Manual clear | `actualGenerate` clears `inputContent` only for manual input, not example. | Clicking an example does not write textarea state.   |

### Original-Question Transformation Mode

`variant` is the old original-question transformation mode.

Old visible labels and copy:

| UI area       | Old label or text                                     |
| ------------- | ----------------------------------------------------- |
| Mode button   | `原题变式`                                            |
| Step 2 label  | `置入内容`                                            |
| Textarea hint | `在此粘贴原题文字或描述需求...`                       |
| Step 3 label  | `选择变身力度`                                        |
| User message  | `原题内容`                                            |
| Task prompt   | `请根据以下原题内容进行变式生成：\n\n${finalContent}` |

Old prompt differences:

- The system prompt says the teacher provides an `原题` and the task is high-quality `【题目变身】`.
- The output heading is `【变式新题】`, with 1-2 reference-quality new questions.
- The design-intent line asks why the variant matches the selected student stage.
- The mode label is inserted as `当前变身模式`.
- The mode description is inserted as `模式说明`.

### Knowledge-Point Generation Mode

`knowledge` is the old knowledge-point generation mode.

Old visible labels and copy:

| UI area       | Old label or text                                           |
| ------------- | ----------------------------------------------------------- |
| Mode button   | `知识点出题`                                                |
| Step 2 label  | `输入知识点`                                                |
| Textarea hint | `在此输入要考察的知识点，例如“牛顿第二定律”、“定语从句”...` |
| Step 3 label  | `选择出题难度`                                              |
| User message  | `考查知识点`                                                |
| Task prompt   | `请针对以下知识点进行原创出题：\n\n${finalContent}`         |

Old prompt differences:

- The system prompt says the teacher provides a `知识点` and the task is to create original high-quality `【启发式探究题】`.
- The output heading is `【原创好题】`, with 1-2 deep and inspiring new questions.
- The design-intent line asks how the assessment design matches the selected student stage.
- The mode label is inserted as `当前出题难度参照模式`.
- The mode description is inserted as `模式说明`.

For both modes, the old browser assembled the full prompt by combining `systemPrompt` and `taskPrompt`, created `ai.chats.create({ model: 'gemini-3.1-pro-preview' })`, and called `sendMessage`. The migrated backend must own prompt assembly, model calls, model name selection, session context reconstruction, credit deduction, and stream persistence. The older REST docs name this capability as `POST /api/ai/teaching`, but this repo's current migrated frontend/server boundary is tRPC. Tasks 26+ should map the capability to `ai.teaching.generate` unless the project deliberately adds REST compatibility. The browser/frontend should send structured inputs through the typed client and render the returned stream; it should not import `@google/genai`, build the prompt, or hold a model chat instance.

## Teaching Context And Levels

Old teaching context fields:

| Field                 | Old UI label      | Required | Old state/source               | Options                                                |
| --------------------- | ----------------- | -------- | ------------------------------ | ------------------------------------------------------ |
| `subject`             | 学科选择          | Yes      | `useUserPreferences().subject` | `语文`, `数学`, `英语`, `物理`, `化学`, `生物`, `其他` |
| `grade`               | 学段选择          | Yes      | `useUserPreferences().grade`   | `小学`, `初中`, `高中`                                 |
| `inputType`           | 输入模式          | Yes      | local state                    | `variant`, `knowledge`                                 |
| `inputContent`        | 原题/知识点       | Yes      | local state                    | Free text textarea                                     |
| `transformationLevel` | 变身力度/出题难度 | Yes      | local state, default `similar` | Depends on `inputType`.                                |

When `inputType` changes, the old `useEffect` validates the current `transformationLevel`. If the selected level is not in the new mode's level collection, it switches to `similar` for `variant` or `foundation` for `knowledge`.

Original-question transformation levels:

| ID          | Old label | Description                    |
| ----------- | --------- | ------------------------------ |
| `similar`   | 同类变式  | 微调数据与表达，保持难度一致   |
| `challenge` | 难度进阶  | 增加复合考点，提升思维深度     |
| `creative`  | 情境跨界  | 结合时事、动漫、游戏或生活点滴 |

Knowledge-point generation levels:

| ID            | Old label | Description                  |
| ------------- | --------- | ---------------------------- |
| `foundation`  | 基础巩固  | 立足核心概念，强化记忆与理解 |
| `application` | 综合运用  | 结合实际场景，考察应用能力   |
| `expansion`   | 拓展拔高  | 拓展关联知识，适合培优与选拔 |

The old target API examples in `restful-api.md` show a human-readable `transformationLevel` value such as `中等变式`, but `TeachingAssist.tsx` sends the state id and uses the label only inside prompt/user-message text. Implementation should canonicalize whether the backend accepts ids, labels, or both before wiring the page.

## Examples And Empty State

The result panel starts in an empty state when `messages.length === 0 && !loading`. It shows the heading `选择一个经典案例开始`, explanatory copy about transforming a plain exercise into a deeper heuristic question, and three hardcoded example cards.

Old example cards:

| Title          | Subject | Description                                  | Content                                                          |
| -------------- | ------- | -------------------------------------------- | ---------------------------------------------------------------- |
| 数学：勾股定理 | 数学    | 从基础长度计算，变身为生活中的梯子安全距离。 | `在一个直角三角形中，两条直角边的长度分别为3和4，求斜边的长度。` |
| 英语：时态填空 | 英语    | 将枯燥的语料变身为“假如我在火星”的科幻背景。 | `I ______ (visit) my grandparents yesterday.`                    |
| 语文：古诗赏析 | 语文    | 把思乡之情转化为现代“朋友圈”的打卡感悟。     | `请赏析《静夜思》中“举头望明月，低头思故乡”所表达的感情。`       |

Clicking an example calls `setSubject(item.subject)` and immediately calls `handleGenerate(item.content)`. Because React state updates are asynchronous, the old prompt/user-message assembly can still read the previous selected subject when credits are available and generation starts immediately. Migration should treat this as a source quirk and intentionally pass the example card subject into the generate request. The old handler does not explicitly set `inputType`, so examples use whichever mode is currently selected. Because the default is `variant`, the default experience is example-driven 原题 transformation.

## Result Panel, Copy, Loading, And Error Behavior

Old generation behavior:

- `handleGenerate` accepts optional `contentOverride`, checks required content, checks local `credits`, and either opens `ExportAdModal` or consumes one local credit.
- `actualGenerate` creates or reuses a `teaching` session by calling `createNewSession('teaching')` when no current session exists.
- The old page replaces the message list with the generated user message, then appends the assistant message after the model response.
- It stores messages into the current session with `updateSession(currentSessionId, messages)`.
- Loading uses `loading` state, the submit button text `命题专家思考中...`, a spinning icon, and the shared top-level `GenerationAdOverlay` while AI generation is gated by advertising.
- Initial-generation errors append an assistant message: `变身遇到了一点障碍，请检查网络或稍后再试。`

Old result rendering:

- Messages render as a chat-style panel with user messages on the right and assistant messages on the left.
- Message content is rendered through `react-markdown`; migration docs say target long AI text should stream into Ant Design X components instead.
- The old prompt asks the model to include a `picsum.photos` image URL under `【重要配图】`. Migration should treat any image/link strategy as backend response policy, not frontend prompt behavior.
- Assistant messages show a copy button. Copy uses `navigator.clipboard.writeText`, sets `copiedIndex`, displays `已复制`, and resets after 2 seconds.

Target result-panel split from migration docs:

| Old file/section      | Suggested target component    | Responsibility                          |
| --------------------- | ----------------------------- | --------------------------------------- |
| Teaching context form | `TeachingContextForm`         | Subject and grade selection.            |
| Mode switch           | `TeachingInputModeToggle`     | `原题变式` / `知识点出题`.              |
| Input textarea        | `TeachingPromptInput`         | Original question or knowledge point.   |
| Level buttons         | `TransformationLevelSelector` | Mode-specific level/difficulty options. |
| Empty examples        | `TeachingExampleCards`        | Three hardcoded examples.               |
| Output panel          | `TeachingResultPanel`         | Streaming messages, copy, follow-up.    |

## Follow-Up Behavior

Old follow-up state and behavior:

| Concern      | Old behavior                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------- |
| State key    | `followUpText`                                                                                      |
| Visibility   | Follow-up input appears only when `messages.length > 0`.                                            |
| Placeholder  | `请输入追问要求，例如：换成选择题、增加难度、替换情境...`                                           |
| Submit paths | Press Enter or click the send button.                                                               |
| Guard        | `handleFollowUp` returns early when text is empty or `chatRef.current` is missing.                  |
| Credit gate  | If local credits are empty, it stores pending action `{ type: 'followup' }` and opens the ad modal. |
| Error copy   | Follow-up failure appends `追问失败了，请稍后再试。`                                                |

Old follow-up suggestion chips appear after the latest assistant message when not loading:

- `把情境换成“三体”风格`
- `再出一道填空题形式的`
- `帮我提炼本题考查的核心素养`
- `帮我生成配套的批改评语`
- `把难度再提高两个等级`

The old browser follow-up sends only the new text to the in-memory `chatRef.current` chat instance. Refreshing or restoring a displayed session cannot restore the true provider-side chat context. The REST reference docs name this capability as `POST /api/ai/teaching/follow-up`, but the target contract in this repo should be tRPC `ai.teaching.followUp`. The backend owns session context reconstruction from persisted messages and should stream the follow-up answer back to the frontend.

## API And Data Boundary

Expected target capabilities from the migration docs:

| Capability           | Reference contract                                                                   | Frontend role                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Initial generation   | REST reference `POST /api/ai/teaching`; target tRPC `ai.teaching.generate`           | Send `sessionId?`, `inputType`, `subject`, `grade`, `transformationLevel`, and `content`; render stream events. |
| Follow-up generation | REST reference `POST /api/ai/teaching/follow-up`; target tRPC `ai.teaching.followUp` | Send `sessionId` and follow-up `message`; render streamed assistant answer.                                     |
| Session history      | Future `me/sessions` or equivalent                                                   | Display existing teaching messages and pass session id to generation/follow-up calls.                           |
| Credits              | Backend credit/quota API                                                             | Display remaining credits and react to `402`/credit events; do not treat localStorage as authoritative.         |

Migration boundary:

- Frontend owns input collection, mode/level selection UI, example cards, submit/copy interactions, loading states, and route-local rendering.
- Backend owns prompt assembly, model calls, provider/model choice, follow-up context, quota deduction, response streaming, and persistence.
- The target frontend should not keep `chatRef`, call Gemini directly, or rely on browser-only provider context.

## Migration Constraints

- Keep the route as `/office/teaching`, implemented at `apps/web/src/app/(app)/office/teaching/page.tsx`.
- Preserve the two visible modes: `原题变式` and `知识点出题`.
- Preserve required input behavior: empty `inputContent` disables/blocks initial generation; empty follow-up input disables/blocks follow-up submission.
- Preserve the mode-specific level/difficulty option sets and reset behavior when switching modes.
- Preserve the three example cards unless product changes them in a later task.
- Preserve result copy feedback, loading affordance, error copy, follow-up suggestions, and free-text follow-up input.
- Do not move prompt text into frontend components. Backend prompt templates should encode the original-question and knowledge-point differences.
- Do not expose model names or provider SDK calls in `apps/web`.

## Open Questions

- Migration docs currently list teaching feature components under `apps/web/features/teaching`, while this task asks for the normalized page under `apps/web/src/app`. The implementation task should decide whether business components live under `apps/web/src/components/teaching` or `apps/web/src/features/teaching` and keep imports consistent.
- The REST example uses `transformationLevel: "中等变式"`, but old state ids are `similar`, `challenge`, `creative`, `foundation`, `application`, and `expansion`. Backend validation should choose a canonical enum before the frontend is wired.
- The old example cards call generation without forcing `inputType === "variant"`. That means examples can run as `knowledge` if the teacher switches modes first. Product should decide whether to preserve this exact behavior or pin examples to original-question transformation mode.
