# AetherCore Codex Instructions

本项目必须遵守 AetherCore 工程化规范。  
详细工程规范见 ``docs/AetherCore规范.md`，迁移细节见 `docs/migration/admin, docs/migration/web, docs/migration/api`。

## Core Stack

- Monorepo: pnpm workspace + Turborepo
- Node: 24.14.0
- Frontend: Next.js 16 App Router + React 19
- Backend: NestJS 10 + Fastify + tRPC
- ORM: Drizzle ORM
- Database: PostgreSQL
- Cache: Redis
- UI: shadcn/ui + Tailwind
- Deployment: Docker Compose

## Apps

- `apps/web`: 用户端，来自 `source_web`，端口 3001
- `apps/admin`: 管理端，来自 `source_admin`，端口 3002
- `apps/server`: 统一后端，NestJS + Fastify + tRPC，端口 3000
- `apps/db-init`: 数据库初始化脚本，不监听端口

## Packages

- `packages/api`: tRPC client / Provider / caller
- `packages/db`: Drizzle schema、client、migration
- `packages/auth`: session、JWT、Redis auth
- `packages/shared`: 公共类型、常量、工具函数
- `packages/ui`: shadcn/ui 通用组件
- `packages/tailwindcss-config`: Tailwind 共享配置
- `packages/eslint-config`: ESLint 共享规则

## Source Migration

本项目有两个待迁移源项目：

- `source_web` 迁移到 `apps/web`
- `source_admin` 迁移到 `apps/admin`
- `apps/server` 是新后端，不从源项目直接复制生成

`source_web` 和 `source_admin` 只作为参考目录，不属于正式 workspace。

迁移规范说明：

- `docs/AetherCore规范.md ` # 放完整 AetherCore 工程说明
- `docs/migration/web` # source_web 迁移说明目录
- `docs/migration/admin` # source_admin 迁移说明目录
- `docs/migration/api` # tRPC / server / db 说明目录

`pnpm-workspace.yaml` 只能包含：

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```
