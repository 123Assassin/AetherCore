# Simulations Domain Old Page Analysis

## Scope

This analysis covers Task 17 and distinguishes the old user-side simulation browser/player from the old admin-side simulation management page. Inputs reviewed:

- `docs/migration/web/spec.md`
- `docs/migration/web/routes.md`
- `docs/migration/web/components.md`
- `docs/migration/web/migration-map.md`
- `docs/migration/web/api-assumptions.md`
- `docs/migration/admin/spec.md`
- `docs/migration/admin/routes.md`
- `docs/migration/admin/components.md`
- `docs/migration/admin/migration-map.md`
- `docs/migration/admin/api-assumptions.md`
- `source/source-web/src/pages/SimulationLab.tsx`
- `source/source-admin/src/pages/Simulations.tsx`

The current repository does not contain top-level `source_web` or `source_admin` directories. The old source snapshots are available under `source/source-web` and `source/source-admin`.

## Route Ownership

| Surface                | Old route behavior                                                                                                                               | Old component       | Target app   | Target URL           | Target file                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | ------------ | -------------------- | --------------------------------------------------- |
| User web browse/player | The old web app is a Vite SPA at `/`; `SimulationLab` renders when `activeTab === "lesson" && activeSubTab === "simulation"`.                    | `SimulationLab.tsx` | `apps/web`   | `/lesson/simulation` | `apps/web/src/app/(app)/lesson/simulation/page.tsx` |
| Admin management       | The old admin app uses React Router; `/simulations` renders the simulation resource library management page behind the admin layout/login guard. | `Simulations.tsx`   | `apps/admin` | `/simulations`       | `apps/admin/src/app/(admin)/simulations/page.tsx`   |

The user web page is for browsing and launching simulations. The admin page is for filtering managed resources and toggling whether a resource is enabled. They should share backend data concepts, but they are separate products and routes.

## Web SimulationLab Behavior

`SimulationLab.tsx` owns a hard-coded `SIMULATIONS` list with title, subject, category, grades, thumbnail, iframe URL, and description. The current data includes PhET URLs and `picsum.photos` thumbnails.

User-facing state:

| State              | Source                                                        | Behavior                                                                                                                                   |
| ------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `selectedSubjects` | Initialized from `useUserPreferences().subject` when present. | Multi-select list that can contain top-level subjects or subcategories. A simulation matches when its `subject` or `category` is selected. |
| `selectedGrades`   | Initialized from `useUserPreferences().grade` when present.   | Multi-select grade filter. A simulation matches when any simulation grade is selected.                                                     |
| `searchQuery`      | Local input.                                                  | Filters by case-insensitive title or description.                                                                                          |
| `activeSim`        | Local selected simulation.                                    | Opens and closes the iframe overlay.                                                                                                       |

Filters and search:

- The left sidebar has a subject section and a grade section.
- Subjects are grouped as `物理`, `数学`, `化学`, `地球科学`, and `生物`; several have nested category filters such as `运动`, `电场、磁场、电路`, `数学概念`, and `普通化学`.
- Grades are `小学`, `中学`, `高中`, and `大学`.
- Selecting a filter adds it to the local selected list and also writes the latest selected value to the global user preference through `setSubject` or `setGrade`.
- Selected filters render as chips in the header, with per-chip removal and a `清除全部` action.
- Search input placeholder is `搜索仿真实验...`.
- Empty state says `没有找到匹配的仿真实验` and provides a reset action that clears subjects, grades, and search.

Cards and player:

- Results are shown as cards in a responsive grid.
- Each card displays thumbnail, subject badge, title, description, HTML5/fullscreen affordance icons, and grade initials.
- Hovering the image reveals a `立即开始` action.
- Starting a simulation sets `activeSim` and opens a fixed full-screen dark overlay.
- The overlay header shows a back button, simulation title, subject, grades, a `全屏演示` button, and a `关闭` button.
- The content area is an `iframe` with `src={activeSim.url}`, `title={activeSim.title}`, and `allowFullScreen`.
- The old `全屏演示` button is visual only; it does not call `requestFullscreen`.

## Admin Simulations Behavior

`Simulations.tsx` owns local mock `items`, `activeFilter`, and `expandedNodes` state. Items include `id`, `title`, `category`, `grade`, `enabled`, and image URL. The page uses Unsplash URLs for thumbnails.

Management state:

| State           | Source                   | Behavior                                                                                                                                                                                  |
| --------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `items`         | Local mock array.        | Holds simulation resources and their `enabled` status.                                                                                                                                    |
| `activeFilter`  | Local `{ type, value }`. | Filters the resource grid by all/category/grade.                                                                                                                                          |
| `expandedNodes` | Local string array.      | Controls expansion of the category and grade tree nodes. Defaults to `root` and `subjects`; `root` is non-rendered, `subjects` starts expanded, and `grades` exists but starts collapsed. |

Admin filter and enable/disable behavior:

- The left sidebar is a tree-style browser with `所有仿真资源`, `科目分类`, and `年级筛选`.
- Category filters are `数学`, `物理`, `化学`, and `生物`.
- Grade filters are `小学`, `初中`, `高中`, and `大学`.
- Clicking a parent tree node expands/collapses it; clicking a leaf changes `activeFilter`.
- The page title displays `{activeFilter.value} 资源` and the current result count.
- The grid/list segmented control is present visually, but only grid rendering is implemented.
- Each simulation card shows image, grade badge, title, category module label, a settings icon button, and an enable switch.
- Clicking the switch toggles `item.enabled` locally. Enabled cards are full opacity and show `已启用`; disabled cards have `opacity-50 grayscale` and show `已禁用`. This `enabled` field is old admin mock state only; the migration/API contract uses `isable`.
- The settings button has no implemented edit behavior in the old page.
- Empty state says `在该过滤条件下未找到任何资源`.

## Backend And Data Implications

Likely shared migration/API domain model:

```ts
type Simulation = {
  id: string;
  name: string;
  subject: string;
  category: { id: string; name: string };
  grades: string[];
  thumbnail?: string | null;
  src?: string | null;
  isable: boolean;
  topics?: unknown[] | null;
  sampleLearningGoals?: unknown[] | null;
};
```

Old source field mapping:

| Old source                  | Migration/API field                                                                                                           | Notes                                                                                                                                                                                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SimulationLab.thumbnail`   | `thumbnail`                                                                                                                   | Old web card image URL.                                                                                                                                                                                                                                        |
| `SimulationLab.url`         | `src`                                                                                                                         | Old web iframe URL; rendered as iframe `src` in the player.                                                                                                                                                                                                    |
| `SimulationLab.title`       | `name`                                                                                                                        | Resource display name in migration docs.                                                                                                                                                                                                                       |
| `SimulationLab.description` | No dedicated field in `docs/migration/web/api-assumptions.md`; use an existing text field only if available from seeded data. | Old web used this for search and card copy. Current API assumptions include `sampleLearningGoals`, so Tasks 18-20 can conservatively derive description/search text from `sampleLearningGoals` or other returned content without adding a hard DB requirement. |
| `Simulations.item.image`    | `thumbnail`                                                                                                                   | Old admin mock image URL.                                                                                                                                                                                                                                      |
| `Simulations.item.enabled`  | `isable`                                                                                                                      | Old admin local mock flag; backend/admin API uses `isable`.                                                                                                                                                                                                    |

Target responsibilities:

| Concern                                                                     | Target owner                                          |
| --------------------------------------------------------------------------- | ----------------------------------------------------- |
| User browse route and iframe player                                         | `apps/web`                                            |
| Admin resource filtering and enable/disable management                      | `apps/admin`                                          |
| Authoritative simulation records, category/grade facets, and enabled status | `apps/server` plus `packages/db`                      |
| Shared TypeScript types/constants                                           | `packages/shared` when they are consumed by both apps |

The user route should list only `isable` resources, while the admin route should be able to see enabled and disabled resources and update the `isable` flag. The migration docs already mention `GET /api/simulations` for replacing `SimulationLab.tsx` hard-coded data and admin-side simulation resource APIs for replacing `Simulations.tsx` local mock state, including `PATCH /api/admin/simulations/:id/isable` with `{ isable }`. In this monorepo, those should become `apps/server` tRPC procedures rather than new frontend-owned provider logic.

Do not move iframe security assumptions into frontend-only code. PhET and other external simulation providers must allow embedding. `src` may be an external PhET URL or a stored/relative asset path depending on seeded data and provider. If URL validation is introduced, the backend owns that validation, while the browser still depends on provider `X-Frame-Options`/CSP behavior.

## Suggested Task 18-20 Direction

- Build `apps/web` simulation browse/player around route state and reusable components such as filters, cards, and iframe overlay.
- Build `apps/admin` simulation management around an admin list/tree filter and `isable` status mutation.
- Keep a single backend data contract so admin changes affect what the user web route can browse.
- Treat old `picsum.photos` and Unsplash thumbnails as seed/mock data only; production data should use stored URLs or uploaded assets.
- Preserve visible user/admin behavior first. Editing metadata, real fullscreen behavior, uploads, and list view can be separate follow-up work unless explicitly included in later tasks.
