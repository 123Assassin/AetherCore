# Source UI Baseline And Diff Matrix

Task 1 baseline for migrating source UI behavior into AetherCore.

## Capture Context

- Source web: `source/source-web`, captured from `http://127.0.0.1:3001`.
- Source admin: `source/source-admin`, captured from `http://127.0.0.1:3000`.
- Admin login baseline uses username `admin` and password `admin123`.
- Source servers confirmed before capture:
  - `3000`: `node` listener.
  - `3001`: `node` listener.
- Playwright MCP reported an existing Chrome profile lock, so screenshots were captured with a Playwright Node script using the Chrome channel.
- Screenshot artifacts are stored under `docs/migration/visual-parity/screenshots/source-web` and `docs/migration/visual-parity/screenshots/source-admin`.

## Global Source Anchors

- `source-web` shell: fixed 80px icon sidebar, 64px sticky header, slate background, white content cards, red/rose/orange brand gradient, `红笔AI` wordmark, and lucide icons including `PenTool`, `MessageSquare`, `BookOpen`, `PanelLeft`, `Bot`, `User`, and `Send`.
- `source-admin` shell: dark `#0f172a` 256px sidebar, 80px white sticky header, blue primary `#2563eb`, `Nexus 管理后台` brand, grouped navigation, rounded white cards, and lucide icons including `ShieldCheck`, `LayoutDashboard`, `Bot`, `TerminalSquare`, `ShieldAlert`, `ServerCog`, `Users`, `BellRing`, and `Settings`.

## Visual Diff Matrix

| Target route                 | Source state                     | Must-match layout                                                                                                                | Must-match color/icon/style                                                                                             | Main interactions                                                                                                            |
| ---------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `/chat`                      | `source-web` AI 助手             | 80px sidebar + 64px header + centered chat card; welcome assistant message over scroll area; fixed bottom input row              | red/rose/orange brand, `红笔AI`, lucide `Bot`/`User` avatars, `Send`, rounded 2xl cards, slate borders                  | send by button or Enter, suggestion chips, create chat session, history toggle                                               |
| `/lesson/inspiration`        | `source-web` 备课精讲 / 知识精讲 | 80px sidebar + 64px header + header segmented subnav; two-column tool with 340px input panel and output showcase                 | red/orange gradient CTA, `Lightbulb`, `Sparkles`, emoji case cards, white cards with slate rings                        | select grade/subject, enter topic/context, generate, click featured cases, copy output, follow-up chips                      |
| `/lesson/simulation`         | `source-web` 备课精讲 / 互动实验 | 80px sidebar + 64px header + header segmented subnav; 288px filter sidebar + simulation result grid                              | red active filters, lucide `Search`, `CheckSquare`, `Box`, `ExternalLink`, image thumbnails, rounded cards              | search, subject/grade filters, clear filters, open simulation overlay, close/fullscreen controls                             |
| `/office/comment`            | `source-web` 办公提效 / 评语助手 | 80px sidebar + 64px header + header segmented subnav; card shell with single/batch tabs and form/results columns                 | emerald active tab, red/rose action accents, lucide `Sparkles`, `UploadCloud`, `FileSpreadsheet`, `Download`, `Copy`    | switch single/batch mode, select tags, generate comments, copy result, download template, upload xlsx, batch generate/export |
| `/office/teaching`           | `source-web` 办公提效 / 题目变身 | 80px sidebar + 64px header + header segmented subnav; left configuration panel + right examples/output chat                      | blue active mode chips, rose/orange/blue difficulty cards, lucide `BookOpen`, `Briefcase`, `Bot`, `Send`, `Copy`        | switch 原题变式/知识点出题, choose grade/subject, choose level, generate, click examples, follow up, copy result             |
| `/chat?history=open`         | `source-web` history-open        | 80px sidebar + 64px header + slide-in history drawer between sidebar and content; active history button in header                | red active `PanelLeft`, white history panel, slate list rows, lucide `MessageSquare`, `Trash2`, `X`, `Plus`             | toggle history, select session, create new session, delete session, close drawer                                             |
| `/login`                     | `source-admin` login             | full-screen centered login panel; dark background with blurred blue/primary glows; disabled admin account field + password field | `Nexus 管理后台`, blue primary, dark slate card, lucide `ShieldCheck`, `User`, `Lock`, large rounded 40px panel         | enter password `admin123`, submit login, show invalid-password error                                                         |
| `/dashboard`                 | `source-admin` dashboard         | dark 256px sidebar + 80px sticky header + max-width content; KPI cards row + chart/source panels                                 | blue primary active nav, lucide `LayoutDashboard`, `Users`, `Zap`, `Clock`, `Activity`; white cards, slate text         | inspect KPI cards, chart/source panels, navigate via sidebar                                                                 |
| `/resources/agents`          | `source-admin` agents            | dark sidebar/header shell; 3-column responsive app-card grid; modal overlay for create/edit/delete                               | blue primary CTA, lucide `Bot`, `Plus`, `Cpu`, `Globe`, `Settings2`, `Eye`, `Trash2`; rounded app icons                 | add agent, edit agent, delete confirmation, view/settings buttons                                                            |
| `/resources/prompts`         | `source-admin` prompts           | dark sidebar/header shell; 3-column prompt-card grid; create/edit modal with text fields                                         | blue primary CTA, lucide `TerminalSquare`, `Plus`, `Edit`, `Trash2`, `AlertTriangle`; white cards                       | create prompt, edit prompt, delete confirmation, save/cancel                                                                 |
| `/resources/sensitive-words` | `source-admin` sensitive-words   | dark sidebar/header shell; 2-column sensitive word-list cards; create/edit modal                                                 | blue primary CTA, lucide `ShieldAlert`, `Plus`, `Edit`, `Trash2`, `AlertTriangle`; tag-like word display                | create list, edit list, delete confirmation, save/cancel                                                                     |
| `/simulations`               | `source-admin` simulations       | dark sidebar/header shell; left taxonomy tree + scrollable 4-column simulation grid; compact view toggles                        | blue primary active category, lucide `Search`, `Filter`, `LayoutGrid`, `List`, `Zap`, `BookOpen`; thumbnail cards       | expand/collapse categories, search/filter, toggle view, enable switches, row/card action buttons                             |
| `/engine-dispatch`           | `source-admin` engine-dispatch   | dark sidebar/header shell; engine rows/cards with create/edit modal for API endpoint/key                                         | blue primary CTA, lucide `ServerCog`, `Plus`, `Edit`, `Trash2`; mono API fields, status chips                           | add engine, edit engine, delete confirmation, save/cancel                                                                    |
| `/users`                     | `source-admin` users             | dark sidebar/header shell; search/action bar; 3-column user cards with usage/history/action controls                             | blue primary CTA, lucide `Users`, `Search`, `Clock`, `ShieldCheck`, action icons; avatar blocks                         | search by email, add user, view history, adjust status/credits, card action buttons                                          |
| `/operations/activities`     | `source-admin` activities        | dark sidebar/header shell; single-column announcement list; large publish/edit modal                                             | blue primary CTA, lucide `Bell`, `MessageSquare`, `Eye`, `Clock`, `Mail`, `Activity`; list separators                   | publish announcement, edit, delete, choose channel/status, preview/view                                                      |
| `/operations/fission`        | `source-admin` fission           | dark sidebar/header shell; split layout with user fission tree and reward-rule configuration                                     | slate/blue primary buttons, lucide `Share2`, `Users`, `Gift`, `Network`, `Anchor`, `Save`; toggles and nested tree rows | expand tree nodes, edit reward values, toggle rules, save settings                                                           |
| `/security/system-audit`     | `source-admin` system-audit      | dark sidebar/header shell; audit table/list with export modal                                                                    | blue primary export, lucide `FileText`, `Download`, `X`; white table card                                               | export records, open/close export modal, confirm/cancel                                                                      |
| `/security/content-audit`    | `source-admin` content-audit     | dark sidebar/header shell; content audit rows with details/delete and export modal                                               | blue primary detail/export, red delete, lucide `FileSearch`, `Download`, `Trash2`, `AlertTriangle`                      | view detail, export records, delete confirmation, confirm/cancel                                                             |
| `/security/traffic-monitor`  | `source-admin` traffic-monitor   | dark sidebar/header shell; 3-column traffic/stat cards grouped by engine                                                         | blue primary metric accents, lucide `Activity`, `Zap`, `Clock`, `DollarSign`; white stat cards                          | scan engine traffic metrics, navigate sidebar                                                                                |
| `/alarm`                     | `source-admin` alarm             | dark sidebar/header shell; alarm configuration form cards with channel and threshold controls                                    | blue primary save, lucide `BellRing`, `Mail`, `AlertTriangle`, `Save`; rounded inputs/toggles                           | edit mail/alarm thresholds, save alarm settings                                                                              |
| `/settings`                  | `source-admin` settings          | dark sidebar/header shell; admin password card, system info grid, logout danger area                                             | blue primary save, red logout panel, lucide `ShieldCheck`, `Lock`, `HardDrive`, `Cpu`, `Calendar`, `LogOut`             | update password, save settings, logout                                                                                       |

## Screenshot Index

### source-web

- `chat`: `docs/migration/visual-parity/screenshots/source-web/chat.png`
- `lesson/inspiration`: `docs/migration/visual-parity/screenshots/source-web/lesson-inspiration.png`
- `lesson/simulation`: `docs/migration/visual-parity/screenshots/source-web/lesson-simulation.png`
- `office/comment`: `docs/migration/visual-parity/screenshots/source-web/office-comment.png`
- `office/teaching`: `docs/migration/visual-parity/screenshots/source-web/office-teaching.png`
- `history-open`: `docs/migration/visual-parity/screenshots/source-web/history-open.png`

### source-admin

- `login`: `docs/migration/visual-parity/screenshots/source-admin/login.png`
- `dashboard`: `docs/migration/visual-parity/screenshots/source-admin/dashboard.png`
- `agents`: `docs/migration/visual-parity/screenshots/source-admin/agents.png`
- `prompts`: `docs/migration/visual-parity/screenshots/source-admin/prompts.png`
- `sensitive-words`: `docs/migration/visual-parity/screenshots/source-admin/sensitive-words.png`
- `simulations`: `docs/migration/visual-parity/screenshots/source-admin/simulations.png`
- `engine-dispatch`: `docs/migration/visual-parity/screenshots/source-admin/engine-dispatch.png`
- `users`: `docs/migration/visual-parity/screenshots/source-admin/users.png`
- `activities`: `docs/migration/visual-parity/screenshots/source-admin/activities.png`
- `fission`: `docs/migration/visual-parity/screenshots/source-admin/fission.png`
- `system-audit`: `docs/migration/visual-parity/screenshots/source-admin/system-audit.png`
- `content-audit`: `docs/migration/visual-parity/screenshots/source-admin/content-audit.png`
- `traffic-monitor`: `docs/migration/visual-parity/screenshots/source-admin/traffic-monitor.png`
- `alarm`: `docs/migration/visual-parity/screenshots/source-admin/alarm.png`
- `settings`: `docs/migration/visual-parity/screenshots/source-admin/settings.png`
