# 路由迁移映射

## 当前 React 路由/页面结构

当前项目仍是 Vite + React + `react-router-dom`，路由集中在 `src/App.tsx`。登录状态来自 `localStorage.isAdminAuth`。

| 当前路径                     | 当前组件                       | 说明                                       |
| ---------------------------- | ------------------------------ | ------------------------------------------ |
| `/login`                     | `src/pages/Login.tsx`          | 登录页，不包后台布局。                     |
| `/`                          | `Navigate`                     | 已登录跳 `/dashboard`，未登录跳 `/login`。 |
| `/dashboard`                 | `src/pages/Dashboard.tsx`      | 数据看板。                                 |
| `/resources/agents`          | `src/pages/Agents.tsx`         | 智能体管理。                               |
| `/resources/prompts`         | `src/pages/AIPrompts.tsx`      | AI Prompt 管理。                           |
| `/resources/sensitive-words` | `src/pages/SensitiveWords.tsx` | 敏感词库管理。                             |
| `/simulations`               | `src/pages/Simulations.tsx`    | 仿真案例库管理。                           |
| `/engine-dispatch`           | `src/pages/EngineDispatch.tsx` | 模型引擎调度中心。                         |
| `/users`                     | `src/pages/Users.tsx`          | 用户管理。                                 |
| `/operations/activities`     | `src/pages/Activities.tsx`     | 活动与通告管理。                           |
| `/operations/fission`        | `src/pages/Fission.tsx`        | 裂变管理。                                 |
| `/security/system-audit`     | `src/pages/SystemAudit.tsx`    | 系统审计日志。                             |
| `/security/content-audit`    | `src/pages/ContentAudit.tsx`   | AI 内容审计。                              |
| `/security/traffic-monitor`  | `src/pages/TrafficMonitor.tsx` | 流量监控。                                 |
| `/alarm`                     | `src/pages/AlarmCenter.tsx`    | 消息告警中心。                             |
| `/settings`                  | `src/pages/Settings.tsx`       | 系统设置。                                 |
| `*`                          | `Navigate`                     | 后台未知路径跳 `/dashboard`。              |

后台布局组件仍内联在 `src/App.tsx`：

- `Sidebar`：支持分组展开/收起。
- `Header`：根据路径显示标题。
- `Layout`：后台侧栏 + 顶栏 + 内容容器。

## Next.js 16 App Router 目标路径

假设目标仓库是 monorepo，并有 `apps/web` 与 `apps/admin`。当前项目是管理后台，页面应整体迁移到 `apps/admin`。目标为 Next.js 16 App Router；Next.js 16 自带打包工具，不迁移 Vite 配置。

| 当前路径                     | 新 App Router 路径           | 建议文件                                                    | 迁移到       |
| ---------------------------- | ---------------------------- | ----------------------------------------------------------- | ------------ |
| `/login`                     | `/login`                     | `apps/admin/app/login/page.tsx`                             | `apps/admin` |
| `/`                          | `/`                          | `apps/admin/app/page.tsx`，根据 session redirect            | `apps/admin` |
| 后台公共布局                 | route group layout           | `apps/admin/app/(admin)/layout.tsx`                         | `apps/admin` |
| `/dashboard`                 | `/dashboard`                 | `apps/admin/app/(admin)/dashboard/page.tsx`                 | `apps/admin` |
| `/resources/agents`          | `/resources/agents`          | `apps/admin/app/(admin)/resources/agents/page.tsx`          | `apps/admin` |
| `/resources/prompts`         | `/resources/prompts`         | `apps/admin/app/(admin)/resources/prompts/page.tsx`         | `apps/admin` |
| `/resources/sensitive-words` | `/resources/sensitive-words` | `apps/admin/app/(admin)/resources/sensitive-words/page.tsx` | `apps/admin` |
| `/simulations`               | `/simulations`               | `apps/admin/app/(admin)/simulations/page.tsx`               | `apps/admin` |
| `/engine-dispatch`           | `/engine-dispatch`           | `apps/admin/app/(admin)/engine-dispatch/page.tsx`           | `apps/admin` |
| `/users`                     | `/users`                     | `apps/admin/app/(admin)/users/page.tsx`                     | `apps/admin` |
| `/operations/activities`     | `/operations/activities`     | `apps/admin/app/(admin)/operations/activities/page.tsx`     | `apps/admin` |
| `/operations/fission`        | `/operations/fission`        | `apps/admin/app/(admin)/operations/fission/page.tsx`        | `apps/admin` |
| `/security/system-audit`     | `/security/system-audit`     | `apps/admin/app/(admin)/security/system-audit/page.tsx`     | `apps/admin` |
| `/security/content-audit`    | `/security/content-audit`    | `apps/admin/app/(admin)/security/content-audit/page.tsx`    | `apps/admin` |
| `/security/traffic-monitor`  | `/security/traffic-monitor`  | `apps/admin/app/(admin)/security/traffic-monitor/page.tsx`  | `apps/admin` |
| `/alarm`                     | `/alarm`                     | `apps/admin/app/(admin)/alarm/page.tsx`                     | `apps/admin` |
| `/settings`                  | `/settings`                  | `apps/admin/app/(admin)/settings/page.tsx`                  | `apps/admin` |

## 推荐目录结构

```text
apps/admin/app/
  layout.tsx
  page.tsx
  login/page.tsx
  (admin)/
    layout.tsx
    dashboard/page.tsx
    resources/
      agents/page.tsx
      prompts/page.tsx
      sensitive-words/page.tsx
    simulations/page.tsx
    engine-dispatch/page.tsx
    users/page.tsx
    operations/
      activities/page.tsx
      fission/page.tsx
    security/
      system-audit/page.tsx
      content-audit/page.tsx
      traffic-monitor/page.tsx
    alarm/page.tsx
    settings/page.tsx
```

## apps/web 归属判断

当前所有页面都是后台管理能力，迁移到 `apps/admin`。`apps/web` 只可能消费以下公开或用户侧数据：

| 数据/能力           | `apps/web` 可能用途                  | 当前后台来源             |
| ------------------- | ------------------------------------ | ------------------------ |
| 已启用仿真案例      | 前台展示可用仿真资源                 | `/simulations`           |
| 已发布活动/通告     | 前台公告或活动入口                   | `/operations/activities` |
| 邀请码/裂变奖励状态 | 用户侧邀请活动                       | `/operations/fission`    |
| 用户可用智能体名称  | 前台选择可用智能体；不得暴露 API Key | `/resources/agents`      |
