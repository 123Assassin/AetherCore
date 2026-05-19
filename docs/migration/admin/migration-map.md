# 旧文件到新文件迁移映射

## 页面与布局

| 当前文件                       | 新文件建议                                                  | 说明                                 |
| ------------------------------ | ----------------------------------------------------------- | ------------------------------------ |
| `src/main.tsx`                 | 删除                                                        | Next.js 不需要手动挂载 React root。  |
| `src/App.tsx`                  | `apps/admin/app/page.tsx`                                   | `/` 根据 session redirect。          |
| `src/App.tsx`                  | `apps/admin/app/(admin)/layout.tsx`                         | 后台布局、路由保护、Sidebar/Header。 |
| `src/pages/Login.tsx`          | `apps/admin/app/login/page.tsx`                             | 登录页。                             |
| `src/pages/Dashboard.tsx`      | `apps/admin/app/(admin)/dashboard/page.tsx`                 | 数据看板。                           |
| `src/pages/Agents.tsx`         | `apps/admin/app/(admin)/resources/agents/page.tsx`          | 智能体管理。                         |
| `src/pages/AIPrompts.tsx`      | `apps/admin/app/(admin)/resources/prompts/page.tsx`         | Prompt 管理。                        |
| `src/pages/SensitiveWords.tsx` | `apps/admin/app/(admin)/resources/sensitive-words/page.tsx` | 敏感词库管理。                       |
| `src/pages/Simulations.tsx`    | `apps/admin/app/(admin)/simulations/page.tsx`               | 仿真案例库。                         |
| `src/pages/EngineDispatch.tsx` | `apps/admin/app/(admin)/engine-dispatch/page.tsx`           | 引擎调度。                           |
| `src/pages/Users.tsx`          | `apps/admin/app/(admin)/users/page.tsx`                     | 用户管理。                           |
| `src/pages/Activities.tsx`     | `apps/admin/app/(admin)/operations/activities/page.tsx`     | 活动与通告。                         |
| `src/pages/Fission.tsx`        | `apps/admin/app/(admin)/operations/fission/page.tsx`        | 裂变管理。                           |
| `src/pages/SystemAudit.tsx`    | `apps/admin/app/(admin)/security/system-audit/page.tsx`     | 系统审计。                           |
| `src/pages/ContentAudit.tsx`   | `apps/admin/app/(admin)/security/content-audit/page.tsx`    | 内容审计。                           |
| `src/pages/TrafficMonitor.tsx` | `apps/admin/app/(admin)/security/traffic-monitor/page.tsx`  | 流量监控。                           |
| `src/pages/AlarmCenter.tsx`    | `apps/admin/app/(admin)/alarm/page.tsx`                     | 消息告警。                           |
| `src/pages/Settings.tsx`       | `apps/admin/app/(admin)/settings/page.tsx`                  | 系统设置。                           |

## 已不存在的旧模块

| 旧文档中模块                         | 当前替代                                              |
| ------------------------------------ | ----------------------------------------------------- |
| `src/pages/AIApps.tsx` / `/ai-apps`  | `src/pages/Agents.tsx` / `/resources/agents`          |
| `src/pages/Notices.tsx` / `/notices` | `src/pages/Activities.tsx` / `/operations/activities` |

## 样式与资源

| 当前文件/资源         | 新位置/处理                                                                         |
| --------------------- | ----------------------------------------------------------------------------------- |
| `src/index.css`       | `apps/admin/app/globals.css`；保留 Tailwind v4 theme token 和 `.custom-scrollbar`。 |
| `src/lib/utils.ts`    | `packages/ui/src/lib/utils.ts` 或 `apps/admin/lib/utils.ts`。                       |
| Unsplash 仿真图片 URL | 迁移为后端 `image` 字段，或上传到对象存储/CDN。                                     |
| `lucide-react` 图标   | 保留依赖，可在 UI 包统一导出。                                                      |
| `metadata.json`       | 迁移为 Next metadata。                                                              |

## 配置迁移

| 当前文件                               | 处理                                                      |
| -------------------------------------- | --------------------------------------------------------- |
| `package.json`                         | 迁移依赖到 `apps/admin/package.json` 或 monorepo 根。     |
| `package-lock.json` / `pnpm-lock.yaml` | 目标仓库统一一种包管理器后重新生成 lockfile。             |
| `vite.config.ts`                       | 删除，不迁移；Next.js 16 自带打包工具，不需要 Vite 配置。 |
| `tsconfig.json`                        | 合并到 Next 默认 tsconfig，并保留 paths。                 |
| `index.html`                           | 删除；Next 管理 HTML 文档。                               |
| `README.md`                            | 更新为 Next.js 16 / monorepo 运行说明。                   |

## 依赖迁移判断

| 依赖                                                | 处理                 | 原因                                           |
| --------------------------------------------------- | -------------------- | ---------------------------------------------- |
| `react`, `react-dom`                                | 保留                 | Next 依赖 React。                              |
| `react-router-dom`                                  | 移除                 | App Router 替代。                              |
| `@vitejs/plugin-react`, `vite`, `@tailwindcss/vite` | 移除                 | Next.js 16 自带打包工具。                      |
| `tailwindcss`                                       | 保留                 | 样式依赖。                                     |
| `lucide-react`                                      | 保留                 | 图标大量使用。                                 |
| `motion`                                            | 保留或按目标规范替换 | 当前使用 `motion/react`。                      |
| `clsx`, `tailwind-merge`                            | 保留                 | `cn` 工具依赖。                                |
| `react-markdown`                                    | 新增                 | Prompt 管理 Markdown 内容预览/渲染。           |
| `@google/genai`                                     | 移除                 | 管理平台无 AI 对话需求，当前代码也未调用 SDK。 |
| `express`, `@types/express`, `tsx`, `dotenv`        | 评估后移除           | 当前前端页面未使用。                           |

## 不应遗漏的行为

- `/` 和未知后台路径跳 `/dashboard`。
- 分组导航展开/收起，以及当前路由高亮。
- 智能体绑定引擎、Prompt、敏感词库。
- Prompt 内容迁移为可 Markdown 预览。
- 敏感词逗号分隔输入解析。
- 引擎 API Key 脱敏展示和安全存储。
- 用户黑名单与 active/disabled 状态分离。
- 内容审计软删除，不是物理删除。
- 系统审计和内容审计按日期导出 CSV。
- 裂变奖励配置和邀请树展开。
- 告警阈值、邮箱保存。
