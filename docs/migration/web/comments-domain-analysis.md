# Web Comments Old Page Analysis

## Scope

This analysis covers the old user-side comments page for Task 21. Inputs reviewed:

- `docs/migration/web/spec.md`
- `docs/migration/web/api-assumptions.md`
- `docs/migration/web/migration-map.md`
- `docs/migration/web/components.md`
- `docs/migration/web/routes.md`
- `docs/migration/execution-index.md`
- `source/source-web/src/pages/CommentAssistant.tsx`

The repository does not contain top-level `source_web` or `source_admin` directories. The old `CommentAssistant` source is available at `source/source-web/src/pages/CommentAssistant.tsx`, so this document uses that file for old UI behavior and the migration docs as the target source of truth.

## Old Route And Page Ownership

The old app has no React Router. `CommentAssistant.tsx` renders from `/` when the app shell has `activeTab === "office"` and `activeSubTab === "comment"`.

The older migration docs map this page to `apps/web/app/(app)/office/comment/page.tsx`.
The current repo uses a `src/app` layout, so the normalized target path is
`apps/web/src/app/(app)/office/comment/page.tsx`.

| Old component      | Old condition                                          | Target route                                     |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------ |
| `CommentAssistant` | `activeTab === "office" && activeSubTab === "comment"` | `apps/web/src/app/(app)/office/comment/page.tsx` |

The page owns the mode tab, single-comment form state, result cards, batch upload state, row queue, generation actions, copy state, and ad gates. Migration should keep comments-specific business components under `apps/web/src/components/comments`, while generic primitives can remain in shared UI packages.

## Step 1: Single Mode

Old `single` mode state and fields:

| Field      | Old UI label   | Required | Old state                           | Notes                                                                                           |
| ---------- | -------------- | -------- | ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| `nickname` | 学生昵称/标识  | No       | local component state               | Used only as an anonymized student marker; prompt falls back to `未指定`.                       |
| `gender`   | 性别           | Yes      | local component state, default `男` | Radio options are `男` and `女`.                                                                |
| `grade`    | 年级           | Yes      | `useUserPreferences().grade`        | Select options are `一年级` through `六年级`, `初中`, `高中`; changes update global preference. |
| `tags`     | 成长画像标签   | No       | local `string[]`                    | Multi-select chips grouped as 学习表现, 品德行为, 社交互动.                                     |
| `keywords` | 个性化细节补充 | No       | local textarea                      | Sent as teacher details; prompt falls back to `未补充具体细节`.                                 |

Tag groups from the old page:

| Group    | Tags                                                                   |
| -------- | ---------------------------------------------------------------------- |
| 学习表现 | 思维活跃, 基础扎实, 勇于探索, 逻辑严密, 表达流利, 需要辅导, 偶尔走神   |
| 品德行为 | 诚实守信, 遵守纪律, 责任心强, 低碳环保, 热心公益, 生活简朴, 独立自强   |
| 社交互动 | 乐于分享, 团结协作, 沟通顺畅, 富有同理心, 领导力强, 善于倾听, 活泼开朗 |

Generation behavior:

- The old browser checks local credits. If `credits <= 0`, it opens `ExportAdModal` as a credit gate and resumes the pending `single` action after confirmation.
- Otherwise it consumes one local credit and calls Gemini directly from the browser.
- The old prompt includes `grade`, `gender`, `nickname`, selected `tags`, `keywords`, and a default tone of `温和鼓励`.
- The old model response is expected as JSON with `comments: string[]`.
- Successful generation displays 3 result cards and writes one `comment` session to local history, joining card text with `\n\n---\n\n`.

Result cards and copy behavior:

- `results` is rendered as one card per generated comment.
- Old cards render through `react-markdown`; the migrated frontend should not depend on `react-markdown` for this page unless a later target architecture explicitly changes that boundary.
- Each card has a hover copy button. Copy uses `navigator.clipboard.writeText(text)`, stores `copiedIndex`, shows `已复制`, and clears the copied state after 2 seconds.

Target single-mode split under `apps/web/src/components/comments`:

| Component            | Responsibility                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `CommentModeTabs`    | Switch between `single` and `batch`.                                                              |
| `SingleCommentForm`  | Own nickname, gender, grade, tags, keywords/details input, validation display, and submit action. |
| `StudentTagSelector` | Render grouped multi-select student tags.                                                         |
| `CommentResultList`  | Render generated result cards and empty/loading states.                                           |
| `CommentResultCard`  | Render one comment result and copy action.                                                        |

## Step 2: Batch Mode

Old `batch` mode state and fields:

| Concern           | Old behavior                                                                                                                                                         | Migration direction                                                                                                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Template download | Browser uses `xlsx` to generate a workbook with sample rows and downloads `红笔AI_评语导入模板_*.xlsx`.                                                              | Frontend calls backend template download; target docs name `GET /api/comments/template` and REST docs also mention `GET /api/comments/batch-template`. Pick one canonical contract during API implementation. |
| Excel upload      | File input and drag/drop accept `.xlsx, .xls`. Browser reads the file with `FileReader.readAsBinaryString` and parses the first sheet with `xlsx`.                   | Frontend must not import `xlsx`; it should upload the file through `FormData` and let the backend parse and validate Excel.                                                                                   |
| Parsed columns    | `昵称`, `性别`, `年级`, `表现标签`, `核心优缺点`.                                                                                                                    | Backend should parse these fields into row data and return a job/row list.                                                                                                                                    |
| Row queue         | Old `batchData` rows have `tempId`, `nickname`, `gender`, `grade`, raw string `tags`, `keywords`, `status`, and optional `results`. Tags are split only for display. | Frontend should display backend job rows and statuses instead of keeping authoritative row state only in memory. Backend DTOs can normalize tags to `string[]`.                                               |
| Row generation    | User can generate one row or all pending rows. Old frontend calls Gemini serially and updates status to `generating`, `success`, or `error`.                         | Backend owns generation, credit deduction, retry policy, and status persistence; frontend triggers row/all generation and polls or subscribes.                                                                |
| Export gate       | Export button is disabled until any row has `success`; click opens `ExportAdModal` for 15 seconds, then old frontend creates an `.xlsx` result file in the browser.  | Keep the export gate UI if product still requires it, but final file should come from backend export after the gate completes. Export should write `评语1`、`评语2`、`评语3` as separate plain-text columns.  |

Old row queue display:

- Header shows imported row count and estimated remaining credit cost as pending row count.
- Toolbar actions are 重新上传, 一键全部生成, and 导出生成结果.
- Table columns are row index, student info, evaluation details/tag summary, current status, and operation.
- Status labels are 等待生成, AI 构思中..., 生成成功, and 生成失败.
- Success rows show a `重新生成` label on hover. The click path calls `generateBatchComment`, which can pass the credit check, but `actualGenerateBatchComment` returns early when `status === "success"`; the old page therefore did not actually regenerate successful rows and could turn that click into a credit-consuming no-op.

Target batch-mode split under `apps/web/src/components/comments`:

| Component             | Responsibility                                                                 |
| --------------------- | ------------------------------------------------------------------------------ |
| `BatchImportGuide`    | Show import guidance, expected Excel columns, and template download action.    |
| `ExcelUploadDropzone` | Accept click/drag upload of `.xlsx/.xls`; no sheet parsing in the frontend.    |
| `BatchCommentTable`   | Render backend row queue, row status, row metadata, and row generation action. |
| `BatchCommentToolbar` | Re-upload, generate all, export, and disabled/export-ready state.              |
| `CommentExportGate`   | Wrap or configure the shared sponsor/export gate for result export.            |

## API And Data Boundary

The comments page should call backend-owned procedures rather than browser AI or Excel libraries.

Expected target capabilities from the migration docs:

| Capability           | Reference contract                                                                                                               | Frontend role                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Single generation    | `POST /api/ai/comments/single` in REST migration docs; Task 22 requires an equivalent `comments.single.generate` tRPC procedure. | Send `sessionId?`, `nickname?`, `gender`, `grade`, `tags`, `keywords?`, and optional tone.     |
| Batch job upload     | `POST /api/comments/batch-jobs`; Task 22 names this as `comments.batch.createFromUpload`.                                        | Upload `.xlsx/.xls` file as `FormData`; do not parse workbook.                                 |
| Batch job status     | `GET /api/comments/batch-jobs/:jobId`                                                                                            | Render row queue and status.                                                                   |
| Batch row generation | `POST /api/comments/batch-jobs/:jobId/rows/:rowId/generate`; Task 22 names this as `comments.batch.generateRow`.                 | Trigger one row generation and update that row from the returned status/comments.              |
| Batch generate all   | `POST /api/comments/batch-jobs/:jobId/generate-all`; Task 22 names this as `comments.batch.generateAll`.                         | Trigger backend generation for pending rows and poll/refresh job status.                       |
| Batch result export  | `GET /api/comments/batch-jobs/:jobId/export`; Task 22 names this as `comments.batch.export`.                                     | Download backend-generated Excel after the export gate and the selected export-readiness rule. |
| Template download    | `GET /api/comments/template` or canonicalized template endpoint                                                                  | Trigger browser download only.                                                                 |

The analysis docs and execution index both say Excel parsing, batch task state, and result export belong to backend/server/database work. The frontend boundary is collecting inputs, uploading files, displaying job state, invoking generation/export actions, and rendering/copying results.

## Migration Constraints

- Do not install or import frontend `xlsx`; the analysis and target architecture require backend Excel template generation, parsing, validation, and export.
- Do not keep browser-owned Gemini calls, model selection, prompt assembly, or response schema parsing in `CommentAssistant`.
- Do not rely on localStorage credits as authoritative; backend credit policy should own real deduction and row-level accounting.
- Keep comments-specific business components in `apps/web/src/components/comments`, not `packages/ui`.
- Keep the comments route as `apps/web/src/app/(app)/office/comment/page.tsx`.
- Preserve the visible `single` and `batch` modes, but move behavior to route/page orchestration plus focused comments components.

## Open Questions

- The migration docs disagree on template endpoint naming: `api-assumptions.md` uses `/api/comments/template`, while `restful-api.md` uses `/api/comments/batch-template`. Implementation should choose one canonical backend/tRPC contract before wiring the button.
- Export readiness is inconsistent across sources. Old `CommentAssistant` and the web spec enable export when any row has `success`; REST docs return `409 JOB_NOT_COMPLETED`, which implies job-level completion. Task 22 should choose the backend rule, and Tasks 23-24 should match the UI disabled state to that rule.
- Existing docs sometimes map feature files under `apps/web/features/comments`; this task requires mapping components to `apps/web/src/components/comments`, so this document uses that component directory for page-level business UI.
