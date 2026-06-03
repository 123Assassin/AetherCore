# Web Integration Checklist

Use this checklist for manual validation after the web app and tRPC server are running with mock-compatible data.

## Route and Navigation Checks

- Open `/` and confirm it redirects to `/chat`.
- Open `/chat`, `/lesson/inspiration`, `/lesson/simulation`, `/office/comment`, and `/office/teaching`; each route should render without a Next.js error page.
- On each of the five routes, the sidebar should expose all five route links and mark only the current route active with `aria-current="page"`.
- On each of the five routes, the header title should match the route:
  - `/chat`: `对话`
  - `/lesson/inspiration`: `灵感课程`
  - `/lesson/simulation`: `仿真实训`
  - `/office/comment`: `评语办公`
  - `/office/teaching`: `教案办公`
- On desktop width, the header route label should show the current pathname.
- On `/lesson/inspiration` and `/lesson/simulation`, the lesson sub-nav should be visible and should mark the current lesson route active.
- On `/office/comment` and `/office/teaching`, the office sub-nav should be visible and should mark the current office route active.
- If child routes are added later under any of these paths, sidebar/header/sub-nav prefix matching should keep the parent route active.

## Workflow Checks

- `/chat`: send a non-empty message and confirm the assistant response, suggestion chips, loading state, and error state render correctly.
- `/chat`: when the backend returns an `AiStreamEvent` of type `workflow`, the web app should navigate by `redirectTo` and land on the matching route:
  - `comment` -> `/office/comment`
  - `inspiration` -> `/lesson/inspiration`
  - `teaching` -> `/office/teaching`
- `/chat`: unknown workflow `redirectTo` values should be ignored; only the documented internal workflow routes above should trigger navigation.
- `/lesson/inspiration`: verify empty topic validation, manual form generation, featured-case generation, result rendering, suggestions, and follow-up after a session is created.
- `/lesson/simulation`: verify filters load, search debounces, subject/category/grade toggles update results, reset clears filters, and opening/closing a simulation overlay restores focus.
- `/office/comment`: verify single mode validation, single comment generation, result copy controls, remaining credit display, and result replacement on a second generation.
- `/office/comment`: verify batch mode upload accepts `.xlsx`/`.xls` metadata, row preview rendering, single-row generation, generate-all, export gate modal, and file download after confirming export.
- `/office/teaching`: verify mode toggle, level selector updates per mode, empty prompt validation, example-card generation, result rendering, suggestions, and follow-up after a session is created.

## Mock Data Expectations

- AI text routes should run against the server-side mock provider in local development. In production-like runs, set `AI_PROVIDER=mock` or `AI_MOCK_ENABLED=true` unless a real provider is configured.
- Chat mock responses use `[mock:chat]` content and default suggestions such as `继续提问`, `总结要点`, and `生成下一步`.
- Inspiration mock responses use `[mock:inspiration]` content and return a session id, suggestions, credit event, and done event.
- Teaching mock responses use `[mock:teaching]` content, preserve session context for follow-up, and return suggestions including `生成解析`, `调整难度`, and `继续追问`.
- Comment single generation returns three mock comments and `credit.remaining = 999`.
- Comment batch upload without parsed rows returns three preview rows for `小林`, `小雨`, and `小航`; row/all generation fills each row with three mock comments.
- Simulation filters and lists come from the server/database. Use seeded enabled simulation records for full filter/card/overlay checks; if no records are seeded, the empty state should render without crashing.
