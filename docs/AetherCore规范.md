# AetherCore 工程化架构文档 v1

> 本文档聚焦项目的工程化组织方式，不涉及具体业务逻辑。

---

## 目录

- [1. 项目概览](#1-项目概览)
- [2. 目录结构](#2-目录结构)
- [3. Turborepo + pnpm 包管理](#3-turborepo--pnpm-包管理)
- [4. TypeScript 配置](#4-typescript-配置)
- [5. ESLint 代码规范](#5-eslint-代码规范)
- [6. Prettier 格式化](#6-prettier-格式化)
- [7. Husky + Git Hooks](#7-husky--git-hooks)
- [8. 数据库设计（Drizzle ORM + PostgreSQL + Redis）](#8-数据库设计drizzle-orm--postgresql--redis)
- [9. db-init 模块](#9-db-init-模块)
- [10. Docker 部署](#10-docker-部署)

---

## 1. 项目概览

| 项目      | 值                              |
| --------- | ------------------------------- |
| 仓库类型  | pnpm Monorepo (Turborepo)       |
| Node 版本 | `>=24 <27`（`.nvmrc`: 24.14.0） |
| 包管理器  | pnpm >=10（SHA512 锁定）        |
| 构建工具  | Turborepo                       |
| 目录结构  | `apps/*` + `packages/*`         |
| ORM       | Drizzle ORM                     |
| 数据库    | PostgreSQL                      |
| 缓存      | Redis                           |

### Apps

| 应用           | 技术栈                            | 端口 | 说明         |
| -------------- | --------------------------------- | ---- | ------------ |
| `apps/web`     | Next.js 16 (App Router, React 19) | 3000 | 对外用户端   |
| `apps/admin`   | Next.js 16 (App Router, React 19) | 3001 | 对内管理端   |
| `apps/server`  | NestJS 10 + Fastify + tRPC        | 7001 | 统一服务端   |
| `apps/db-init` | TypeScript (ts-node/tsx)          | -    | 数据库初始化 |

### Packages

| 包名                          | 职责                                       |
| ----------------------------- | ------------------------------------------ |
| `packages/api`                | tRPC 客户端 & Provider                     |
| `packages/db`                 | Drizzle ORM schema + client 单例 + DB 类型 |
| `packages/auth`               | 认证配置 (session/JWT + Redis 缓存)        |
| `packages/shared`             | 公共工具 & 类型                            |
| `packages/ui`                 | shadcn/ui 组件库                           |
| `packages/tailwindcss-config` | Tailwind 共享配置                          |
| `packages/eslint-config`      | ESLint 规则集                              |

---

## 2. 目录结构

```
aethercore/
├── .husky/                        # Git hooks
│   ├── commit-msg                 # commitlint 校验
│   ├── pre-commit                 # lint-staged
│   └── pre-push                   # 类型检查
├── apps/
│   ├── web/                       # 用户端 (Next.js 16)
│   │   ├── src/
│   │   │   ├── app/               # App Router 页面
│   │   │   ├── components/        # 页面级组件
│   │   │   ├── lib/               # 工具函数
│   │   │   └── trpc/              # tRPC 客户端封装
│   │   ├── public/
│   │   ├── Dockerfile
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.mjs
│   │   ├── components.json        # shadcn/ui 配置
│   │   └── package.json
│   ├── admin/                     # 管理端 (Next.js 16)
│   │   ├── src/
│   │   │   ├── app/               # App Router 页面
│   │   │   ├── components/        # 页面级组件
│   │   │   ├── lib/               # 工具函数
│   │   │   └── trpc/              # tRPC 客户端封装
│   │   ├── public/
│   │   ├── Dockerfile
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.mjs
│   │   ├── components.json        # shadcn/ui 配置
│   │   └── package.json
│   ├── server/                    # 服务端 (NestJS 10)
│   │   ├── src/
│   │   │   ├── modules/           # 业务模块
│   │   │   ├── trpc/              # tRPC 路由定义
│   │   │   ├── common/            # 公共 (guards/filters/interceptors)
│   │   │   └── main.ts
│   │   ├── Dockerfile
│   │   ├── nest-cli.json
│   │   ├── tsconfig.build.json
│   │   └── package.json
│   └── db-init/                   # 数据库初始化 (纯 TS)
│       ├── src/
│       │   ├── index.ts           # 入口
│       │   ├── seed-admin.ts      # 管理员账号初始化
│       │   ├── seed-data.ts       # 内置数据填充
│       │   └── utils.ts           # 工具函数
│       ├── Dockerfile
│       ├── drizzle.config.ts
│       └── package.json
├── packages/
│   ├── api/                       # tRPC 客户端 & Provider
│   │   ├── src/
│   │   │   ├── client.ts          # tRPC 客户端
│   │   │   ├── server.ts          # tRPC caller (服务端调用)
│   │   │   └── index.ts
│   │   └── package.json
│   ├── db/                        # Drizzle ORM
│   │   ├── src/
│   │   │   ├── schema/            # 数据模型定义
│   │   │   │   ├── users.ts
│   │   │   │   ├── sessions.ts
│   │   │   │   ├── simulations.ts
│   │   │   │   └── index.ts       # 汇总导出
│   │   │   ├── client.ts          # Drizzle 客户端单例
│   │   │   ├── migrate.ts         # 迁移执行
│   │   │   └── index.ts
│   │   ├── drizzle/               # 生成的迁移文件
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   ├── auth/                      # 认证
│   │   ├── src/
│   │   │   ├── session.ts         # Session 管理 (Redis)
│   │   │   ├── passport/          # Passport 策略
│   │   │   └── index.ts
│   │   └── package.json
│   ├── shared/                    # 公共工具
│   │   ├── src/
│   │   │   ├── types/             # 共享类型
│   │   │   ├── utils/             # 工具函数
│   │   │   └── index.ts
│   │   └── package.json
│   ├── ui/                        # shadcn/ui 组件
│   │   ├── src/
│   │   │   ├── components/        # UI 组件
│   │   │   └── index.ts
│   │   ├── components.json        # shadcn/ui 配置
│   │   └── package.json
│   ├── tailwindcss-config/        # Tailwind 共享配置
│   │   ├── src/
│   │   │   ├── base.ts            # 基础配置
│   │   │   ├── web.ts             # web 端配置
│   │   │   └── admin.ts           # admin 端配置
│   │   └── package.json
│   └── eslint-config/             # ESLint 规则集
│       ├── next.js
│       ├── nest.js
│       ├── library.js
│       └── package.json
├── .env.example
├── .nvmrc
├── .prettierrc.json
├── .prettierignore
├── commitlint.config.js
├── docker-compose.yml
├── docker-compose.local.yml
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.json
└── package.json
```

---

## 3. Turborepo + pnpm 包管理

### pnpm 配置 (`.npmrc`)

```ini
registry=https://registry.npmmirror.com/

node-linker=hoisted										# 提升模式，兼容 NestJS
auto-install-peers=true
strict-peer-dependencies=false

# 按需提升的公共包（避免 phantom deps）
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=*prettier*
public-hoist-pattern[]=*typescript*
public-hoist-pattern[]=*react*
public-hoist-pattern[]=*@nestjs/*
public-hoist-pattern[]=*drizzle*
public-hoist-pattern[]=*tailwindcss*
```

### Workspace 配置 (`pnpm-workspace.yaml`)

```yaml
packages:
  - 'apps/*'
  - 'packages/*'

overrides:
  tmp: '^0.2.3'
  lodash: '^4.17.21'
```

### Turborepo 任务编排 (`turbo.json`)

```jsonc
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "globalDependencies": ["tsconfig.json", ".env.*", "pnpm-lock.yaml"],
  "tasks": {
    // 数据库任务 — 全部不缓存，依赖 DATABASE_URL
    "db:generate": { "cache": false, "env": ["DATABASE_URL"] },
    "db:push": { "cache": false, "env": ["DATABASE_URL"] },
    "db:migrate": { "cache": false, "env": ["DATABASE_URL"] },
    "db:seed": { "cache": false, "env": ["DATABASE_URL"] },
    "db:studio": { "cache": false, "env": ["DATABASE_URL"] },
    "db:init": { "cache": false, "env": ["DATABASE_URL"] },
    "db:full": {
      "cache": false,
      "env": ["DATABASE_URL"],
      "dependsOn": ["db:generate", "db:migrate", "db:seed"],
    },

    // 构建 — 依赖拓扑序构建
    "build": {
      "dependsOn": ["db:generate", "^build"],
      "outputs": ["dist/**", ".next/**"],
      "env": ["DATABASE_URL", "APP_HTTP_URL", "REDIS_URL"],
    },

    // 类型声明生成（可缓存）
    "build:types": { "outputs": ["dist/**/*.d.ts"] },

    // 类型检查
    "type-check": { "dependsOn": ["build:types"] },

    // 开发服务器 — 持久化、交互式、不缓存
    "dev": { "persistent": true, "interactive": true, "cache": false },

    // 代码质量
    "lint": { "cache": false },
    "lint:fix": { "cache": false },
  },
}
```

### 根 `package.json` 脚本

```jsonc
{
  "scripts": {
    // 环境初始化
    "setup:local:env": "cp .env.example .env",

    // 数据库
    "db:generate": "dotenv -e .env -- turbo run db:generate",
    "db:push": "dotenv -e .env -- turbo run db:push",
    "db:migrate": "dotenv -e .env -- turbo run db:migrate",
    "db:seed": "dotenv -e .env -- turbo run db:seed",
    "db:init": "dotenv -e .env -- turbo run db:init",
    "db:full": "dotenv -e .env -- turbo run db:full",
    "db:studio": "dotenv -e .env -- turbo run db:studio",

    // 构建
    "build": "dotenv -e .env -- turbo run build",
    "build:packages": "dotenv -e .env -- turbo run build:types --filter='./packages/*'",
    "build:server": "dotenv -e .env -- turbo run build --filter=server",
    "build:web": "dotenv -e .env -- turbo run build --filter=web",
    "build:admin": "dotenv -e .env -- turbo run build --filter=admin",
    "build:db-init": "dotenv -e .env -- turbo run build --filter=db-init",

    // 开发
    "dev": "dotenv -e .env -- turbo run dev",
    "dev:server": "dotenv -e .env -- turbo run dev --filter=server",
    "dev:web": "dotenv -e .env -- turbo run dev --filter=web",
    "dev:admin": "dotenv -e .env -- turbo run dev --filter=admin",

    // 生产启动
    "start:server": "dotenv -e .env -- turbo run start --filter=server",
    "start:web": "dotenv -e .env -- turbo run start --filter=web",
    "start:admin": "dotenv -e .env -- turbo run start --filter=admin",

    // 代码质量
    "lint": "dotenv -e .env -- turbo run lint",
    "lint:fix": "dotenv -e .env -- turbo run lint:fix",
    "format": "prettier --write .",

    // 清理
    "clean": "del-cli node_modules **/node_modules .next .turbo dist coverage",
    "clean:cache": "turbo clean",
    "deep-clean": "pnpm run clean && pnpm run clean:cache && del-cli pnpm-lock.yaml",

    // Git hooks 安装
    "prepare": "husky",
  },

  // Lint-staged 配置
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml,css}": ["prettier --write"],
  },

  "devDependencies": {
    "commitlint": "^19.8.1",
    "commitizen": "^4.3.1",
    "cz-conventional-changelog": "^3.3.0",
    "dotenv-cli": "^8.0.0",
    "husky": "^9.1.7",
    "lint-staged": "^16.1.2",
    "prettier": "^3.6.2",
    "prettier-plugin-tailwindcss": "^0.7.2",
    "turbo": "^2.5.5",
  },
}
```

---

## 4. TypeScript 配置

### 根 `tsconfig.json`

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "noEmit": true,
    "skipLibCheck": true,

    // 路径别名
    "paths": {
      "web/*": ["apps/web/src/*"],
      "admin/*": ["apps/admin/src/*"],
      "server/*": ["apps/server/src/*"],
      "@package/api": ["packages/api/src"],
      "@package/db": ["packages/db/src"],
      "@package/auth": ["packages/auth/src"],
      "@package/shared": ["packages/shared/src"],
      "@package/ui": ["packages/ui/src"],
      "@package/eslint-config": ["packages/eslint-config"],
      "@package/tailwindcss-config": ["packages/tailwindcss-config"],
    },
  },
  "exclude": ["node_modules", "dist", "**/test/**", "**/__tests__/**", "next-env.d.ts"],
}
```

### Next.js 应用 tsconfig (`apps/web/tsconfig.json` / `apps/admin/tsconfig.json`)

```jsonc
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "noEmit": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"],
      "@package/*": ["../../packages/*/src"],
    },
  },
  "include": ["next-env.d.ts", "src", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"],
}
```

### NestJS 服务端 tsconfig (`apps/server/tsconfig.json`)

```jsonc
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "noEmit": false,
    "paths": {
      "@/*": ["./src/*"],
      "@package/*": ["../../packages/*/src"],
    },
  },
  "include": ["src"],
}
```

### db-init tsconfig (`apps/db-init/tsconfig.json`)

```jsonc
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"],
      "@package/db": ["../../packages/db/src"],
      "@package/shared": ["../../packages/shared/src"],
    },
  },
  "include": ["src"],
}
```

---

## 5. ESLint 代码规范

### 架构

采用 **ESLint Flat Config**（`eslint.config.mjs`），根配置仅做忽略：

```js
// 根 eslint.config.mjs
export default [{ ignores: ['*'] }];
```

所有实际规则在 `packages/eslint-config` 中按框架/场景分治。

### 4 套规则集

| 导出路径    | 文件         | 适用场景      | 核心规则                                                                                     |
| ----------- | ------------ | ------------- | -------------------------------------------------------------------------------------------- |
| `./next`    | `next.js`    | Next.js 应用  | `simple-import-sort`, `unused-imports`, `no-console` (warn/error), `prettier`, `react-hooks` |
| `./nest`    | `nest.js`    | NestJS 后端   | `@typescript-eslint/recommended`, `no-explicit-any: warn`                                    |
| `./library` | `library.js` | 共享 packages | `no-explicit-any: error`, `no-default-export: error`, `simple-import-sort`, `unused-imports` |
| `./db-init` | `db-init.js` | 数据库初始化  | `@typescript-eslint/recommended`, `no-explicit-any: warn`, `no-console: warn`                |

### 各应用 ESLint 配置示例

**`apps/web/eslint.config.mjs`**

```js
import config from '@package/eslint-config/next';

export default config;
```

**`apps/server/eslint.config.mjs`**

```js
import config from '@package/eslint-config/nest';

export default config;
```

**`packages/db/eslint.config.mjs`**

```js
import config from '@package/eslint-config/library';

export default config;
```

### Commitlint (`commitlint.config.js`)

```js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
        'translation',
        'security',
        'changeset',
      ],
    ],
    'header-max-length': [2, 'always', 100],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
  },
};
```

---

## 6. Prettier 格式化

### `.prettierrc.json`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### `.prettierignore`

```
node_modules
dist
.next
.turbo
pnpm-lock.yaml
coverage
drizzle
```

---

## 6.1 Node 版本管理 (`.nvmrc`)

```
24.14.0
```

所有开发者必须使用 `nvm use` 或 `fnm use` 切换到项目指定版本，CI/CD 和 Docker 构建也以此为基准。

---

## 7. Husky + Git Hooks

### Hooks 概览

| Hook         | 命令                          | 触发时机     | 作用                                   |
| ------------ | ----------------------------- | ------------ | -------------------------------------- |
| `commit-msg` | `pnpx commitlint --edit "$1"` | `git commit` | 校验提交信息格式                       |
| `pre-commit` | `pnpm lint-staged`            | `git commit` | 对暂存文件执行 eslint --fix + prettier |
| `pre-push`   | `pnpm type-check`             | `git push`   | 推送前全量类型检查                     |

### `.husky/commit-msg`

```sh
pnpx commitlint --edit "$1"
```

### `.husky/pre-commit`

```sh
pnpm lint-staged
```

### `.husky/pre-push`

```sh
pnpm type-check
```

### Commitizen 配置 (`package.json`)

```jsonc
{
  "config": {
    "commitizen": {
      "path": "cz-conventional-changelog",
    },
  },
}
```

使用 `pnpm cz` 或 `git cz` 交互式生成规范提交信息。

---

## 8. 数据库设计（Drizzle ORM + PostgreSQL + Redis）

### Drizzle ORM 配置 (`packages/db/drizzle.config.ts`)

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

### Schema 示例 (`packages/db/src/schema/users.ts`)

```ts
import { pgTable, uuid, varchar, timestamp, boolean, text } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: varchar('username', { length: 64 }).unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 100 }),
  password: text('password').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('user'), // 'user' | 'admin'
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
```

### Schema 示例 (`packages/db/src/schema/sessions.ts`)

```ts
import { pgTable, uuid, varchar, timestamp, boolean, text } from 'drizzle-orm/pg-core';

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  userAgent: text('user_agent'),
  ip: varchar('ip', { length: 45 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### Schema 汇总导出 (`packages/db/src/schema/index.ts`)

```ts
export * from './users';
export * from './sessions';
export * from './simulations';
```

### 仿真资源 Schema (`packages/db/src/schema/simulations.ts`)

当前仿真资源由 `apps/db-init/data.json` 和 `grade.json` 初始化，表结构包含：

| 表                      | 主键                            | 说明                                                                                                   |
| ----------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `simulation_categories` | `id varchar(100)`               | 顶层学科和二级分类；顶层 `parent_id=null`。                                                            |
| `simulation_apps`       | `id varchar(100)`               | 具体仿真实验，关联二级分类，字段包含 `src`、`thumbnail`、`isable`、`topics`、`sample_learning_goals`。 |
| `grades`                | `id serial`                     | 年级字典，`name` 唯一。                                                                                |
| `grade_simulation_apps` | `(grade_id, simulation_app_id)` | 年级与仿真实验多对多关系。                                                                             |

### Drizzle 客户端单例 (`packages/db/src/client.ts`)

```ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
export type Database = typeof db;
```

### Redis 配置 (`packages/auth/src/redis.ts`)

```ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
});

export default redis;

// --- Key 设计规范 ---
// 登录 session:  `session:{token}`         → JSON string   TTL: 7d
// 管理员 session: `admin:session:{token}`   → JSON string   TTL: 2h
// 验证码:        `captcha:{email}`          → string        TTL: 5m
// 限流:          `rate:{ip}:{action}`       → number        TTL: 视场景
```

### `packages/db/package.json` 脚本

```jsonc
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "build:types": "tsc --emitDeclarationOnly",
  },
}
```

---

## 9. db-init 模块

### 概述

`apps/db-init` 是一个纯 TypeScript 脚本模块，负责 PostgreSQL 的初始化工作，包括：

1. 执行数据库迁移
2. 创建管理员账号
3. 填充内置默认数据

### `apps/db-init/package.json`

```jsonc
{
  "name": "db-init",
  "private": true,
  "type": "module",
  "scripts": {
    "db:init": "dotenv -e ../../.env -- tsx src/index.ts",
    "db:seed": "dotenv -e ../../.env -- tsx src/index.ts --seed-only",
    "build": "tsc",
    "build:types": "tsc --emitDeclarationOnly",
  },
  "dependencies": {
    "@package/db": "workspace:*",
    "@package/shared": "workspace:*",
    "bcryptjs": "^2.4.3",
    "dotenv": "^16.5.0",
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.8.0",
  },
}
```

### 入口 (`apps/db-init/src/index.ts`)

```ts
import { db } from '@package/db';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { seedAdmin } from './seed-admin.js';
import { seedData } from './seed-data.js';
import { resolveMigrationsFolder } from './utils.js';

async function main() {
  const seedOnly = process.argv.includes('--seed-only');

  try {
    if (!seedOnly) {
      console.log('Running migrations...');
      await migrate(db, { migrationsFolder: await resolveMigrationsFolder() });
      console.log('Migrations complete');
    }

    console.log('Seeding admin user...');
    await seedAdmin(db);

    console.log('Seeding default data...');
    await seedData(db);

    console.log('Database initialization complete');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

void main();
```

### 管理员初始化 (`apps/db-init/src/seed-admin.ts`)

```ts
import { eq } from 'drizzle-orm';
import { users } from '@package/db/schema';
import type { Database } from '@package/db';
import bcrypt from 'bcryptjs';

export async function seedAdmin(db: Database) {
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminEmail = process.env.ADMIN_EMAIL || `${adminUser}@aethercore.local`;
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin@123';

  const [existingByUser] = await db
    .select()
    .from(users)
    .where(eq(users.username, adminUser))
    .limit(1);
  const [legacyByEmail] = existingByUser
    ? []
    : await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  const existing = existingByUser ?? legacyByEmail;

  if (existing) {
    if (existing.role === 'admin' && existing.username !== adminUser) {
      await db
        .update(users)
        .set({ username: adminUser, updatedAt: new Date() })
        .where(eq(users.id, existing.id));
    }

    console.log(`Admin user already exists: ${adminUser}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  await db.insert(users).values({
    username: adminUser,
    email: adminEmail,
    name: 'System Admin',
    password: hashedPassword,
    role: 'admin',
    isActive: true,
  });

  console.log(`Admin user created: ${adminUser}`);
}
```

### 内置数据填充 (`apps/db-init/src/seed-data.ts`)

`seed-data.ts` 从 `apps/db-init/data.json` 和 `apps/db-init/grade.json` 读取内置仿真资源：

- `data.json` 的顶层学科生成 `simulation_categories.parent_id=null`。
- 二级分类生成 `simulation_categories` 子节点。
- 三级实验生成 `simulation_apps`，字段映射为 `name`、`category_id`、`src`、`thumbnail`、`isable`、`topics`、`sample_learning_goals`。
- `grade.json` 的年级 key 生成 `grades`。
- 年级下的实验名称匹配 `simulation_apps.name`，生成 `grade_simulation_apps`；同名实验出现在多个分类时会关联所有匹配项。
- seed 前会清空 `grade_simulation_apps`、`simulation_apps`、`simulation_categories`、`grades`，再重新写入。

### `apps/db-init/Dockerfile`

```dockerfile
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS pruner
WORKDIR /app
RUN pnpm add -g turbo
COPY . .
RUN turbo prune --scope=db-init --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm run build --filter=db-init

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/apps/db-init/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db/drizzle ./drizzle

CMD ["node", "dist/index.js"]
```

---

## 10. Docker 部署

> 本项目不使用 CI/CD 流水线，采用手动执行 `docker compose` 进行部署。

### 本地开发 (`docker-compose.local.yml`)

```
┌─────────────┐  ┌─────────────┐
│    web      │  │    admin    │
│  Next.js    │  │  Next.js    │
│  :3000      │  │  :3001      │
└──────┬──────┘  └──────┬──────┘
       │                │
       └────────────────┘
               │
        app 网络 (bridge)
               │
       ┌──────┴──────┐
       │   server    │
       │  NestJS     │
       │  :7001      │
       └──────┬──────┘
              │
       data 网络 (bridge)
              │
  ┌───────────┴───────────┐
  │                       │
┌─┴──────────┐  ┌────────┴──────┐
│  postgres  │  │    redis      │
│  :5432     │  │    :6379      │
└────────────┘  └───────────────┘
```

### `docker-compose.local.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: aether-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-aether}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-aether_secret}
      POSTGRES_DB: ${POSTGRES_DB:-aether_db}
    ports:
      - '${POSTGRES_PORT:-5432}:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-aether}']
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - data

  redis:
    image: redis:7-alpine
    container_name: aether-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD:-redis_secret} --appendonly yes
    ports:
      - '${REDIS_PORT:-6379}:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', '-a', '${REDIS_PASSWORD:-redis_secret}', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - data

  db-init:
    build:
      context: .
      dockerfile: apps/db-init/Dockerfile
    container_name: aether-db-init
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-aether}:${POSTGRES_PASSWORD:-aether_secret}@postgres:5432/${POSTGRES_DB:-aether_db}
      ADMIN_USER: ${ADMIN_USER:-admin}
      ADMIN_EMAIL: ${ADMIN_EMAIL:-admin@aethercore.local}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD:-changeme123}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - data

  server:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    container_name: aether-server
    restart: unless-stopped
    ports:
      - '${SERVER_PORT:-7001}:7001'
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-aether}:${POSTGRES_PASSWORD:-aether_secret}@postgres:5432/${POSTGRES_DB:-aether_db}
      REDIS_URL: redis://:${REDIS_PASSWORD:-redis_secret}@redis:6379/0
      SERVER_PORT: ${SERVER_PORT:-7001}
      CORS_ORIGINS: ${CORS_ORIGINS:-http://localhost:3000,http://localhost:3001}
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      db-init:
        condition: service_completed_successfully
    networks:
      - data
      - app

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    container_name: aether-web
    restart: unless-stopped
    ports:
      - '${WEB_PORT:-3000}:3000'
    environment:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:7001}
    depends_on:
      - server
    networks:
      - app

  admin:
    build:
      context: .
      dockerfile: apps/admin/Dockerfile
    container_name: aether-admin
    restart: unless-stopped
    ports:
      - '${ADMIN_PORT:-3001}:3000'
    environment:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:7001}
    depends_on:
      - server
    networks:
      - app

volumes:
  postgres_data:
  redis_data:

networks:
  data:
    driver: bridge
  app:
    driver: bridge
```

### 生产部署 (`docker-compose.yml`)

```
┌──────────────────────────────────────────────────────────┐
│                    Nginx Proxy Manager                    │
│                    :80 / :81 / :443                       │
└─────────────────────────┬────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐
  │     web     │  │    admin    │  │   server    │
  │  Next.js    │  │  Next.js    │  │  NestJS     │
  │  :3000      │  │  :3000      │  │  :7001      │
  └─────────────┘  └─────────────┘  └──────┬──────┘
                                          │
                                   data 网络 (bridge)
                                          │
                          ┌───────────────┼───────────────┐
                          │                               │
                   ┌──────┴──────┐                ┌──────┴──────┐
                   │  postgres   │                │    redis    │
                   │  :5432      │                │    :6379    │
                   └─────────────┘                └─────────────┘
```

### `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: ${PROD_NAME:-aether}-postgres
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER}']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - data

  redis:
    image: redis:7-alpine
    container_name: ${PROD_NAME:-aether}-redis
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', '-a', '${REDIS_PASSWORD}', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - data

  db-init:
    image: ${DOCKER_USER:-aether}/${PROD_NAME:-aether}-db-init:latest
    container_name: ${PROD_NAME:-aether}-db-init
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      ADMIN_USER: ${ADMIN_USER}
      ADMIN_EMAIL: ${ADMIN_EMAIL}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - data

  server:
    image: ${DOCKER_USER:-aether}/${PROD_NAME:-aether}-server:latest
    container_name: ${PROD_NAME:-aether}-server
    restart: always
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      db-init:
        condition: service_completed_successfully
    networks:
      - data
      - app

  web:
    image: ${DOCKER_USER:-aether}/${PROD_NAME:-aether}-web:latest
    container_name: ${PROD_NAME:-aether}-web
    restart: always
    environment:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    depends_on:
      - server
    networks:
      - app

  admin:
    image: ${DOCKER_USER:-aether}/${PROD_NAME:-aether}-admin:latest
    container_name: ${PROD_NAME:-aether}-admin
    restart: always
    environment:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_ADMIN_API_URL}
    depends_on:
      - server
    networks:
      - app

volumes:
  postgres_data:
  redis_data:

networks:
  data:
    driver: bridge
  app:
    driver: bridge
```

### Dockerfile 构建策略

所有 Dockerfile 使用 **Turborepo prune** 实现最小化构建上下文：

```
Stage 1: base       → 安装 pnpm + turbo
Stage 2: pruner     → turbo prune --scope=<app> --docker（仅提取所需包）
Stage 3: builder    → pnpm install --frozen-lockfile + turbo build
Stage 4: runner     → 仅复制 standalone 输出，非 root 用户运行
```

### `apps/server/Dockerfile`

```dockerfile
FROM node:24-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS pruner
WORKDIR /app
RUN pnpm add -g turbo
COPY . .
RUN turbo prune --scope=server --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm run build --filter=server

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nestjs && adduser --system --uid 1001 nestjs
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/package.json ./package.json
USER nestjs
EXPOSE 7001
ENV SERVER_PORT=7001
CMD ["node", "dist/main.js"]
```

### `apps/web/Dockerfile`

```dockerfile
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS pruner
WORKDIR /app
RUN pnpm add -g turbo
COPY . .
RUN turbo prune --scope=web --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build --filter=web

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nextjs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/apps/web/.next/static ./apps/web/.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"
CMD ["node", "apps/web/server.js"]
```

### `apps/admin/Dockerfile`

```dockerfile
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS pruner
WORKDIR /app
RUN pnpm add -g turbo
COPY . .
RUN turbo prune --scope=admin --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build --filter=admin

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nextjs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/admin/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/apps/admin/.next/static ./apps/admin/.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"
CMD ["node", "apps/admin/server.js"]
```

### `.dockerignore`

```
node_modules
dist
.next
.turbo
.env.local
.env.docker.local
coverage
```

### 部署流程

```bash
# 1. 构建 Docker 镜像（在项目根目录执行）
docker compose build

# 2. 启动所有服务
docker compose up -d

# 3. 查看日志
docker compose logs -f

# 4. 重新构建并重启单个服务
docker compose up -d --build server

# 5. 停止所有服务
docker compose down

# 6. 停止并清除数据卷
docker compose down -v
```

---

## 环境变量

### `.env.example`

```env
# === PostgreSQL ===
POSTGRES_USER=aether
POSTGRES_PASSWORD=aether_secret
POSTGRES_DB=aether_db
POSTGRES_PORT=5432
DATABASE_URL=postgresql://aether:aether_secret@localhost:5432/aether_db

# === Redis ===
REDIS_PASSWORD=redis_secret
REDIS_PORT=6379
REDIS_URL=redis://:redis_secret@localhost:6379/0

# === Admin Seed ===
ADMIN_USER=admin
ADMIN_EMAIL=admin@aethercore.local
ADMIN_PASSWORD=changeme123

# === App ===
SERVER_PORT=7001
WEB_PORT=3000
ADMIN_PORT=3001
APP_HTTP_URL=http://localhost:7001
NODE_ENV=development

# === Next.js ===
NEXT_PUBLIC_API_URL=http://localhost:7001
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# === Docker (生产) ===
DOCKER_USER=aether
PROD_NAME=aether
```

---

## 总结

该项目的工程化体系具备以下特点：

1. **Monorepo 治理**: Turborepo 统一任务编排，pnpm workspace 管理依赖拓扑，`turbo prune` 实现 Docker 最小构建上下文
2. **Drizzle ORM**: 类型安全的数据库操作，schema-first 的建模方式，与 TypeScript 深度集成
3. **PostgreSQL + Redis 双存储**: PG 负责持久化，Redis 负责会话缓存与热数据加速
4. **db-init 独立模块**: 纯 TypeScript 运行，职责单一，Docker 化后通过 `service_completed_successfully` 确保初始化顺序
5. **多层代码质量保障**: Husky commit-msg → Commitlint 校验格式；pre-commit → lint-staged (ESLint + Prettier)；pre-push → 全量类型检查
6. **按场景分治的 ESLint 规则**: 4 套 Flat Config 分别对应 Next.js / NestJS / Library / db-init
7. **手动 Docker Compose 部署**: 无 CI/CD 依赖，`docker compose up -d` 一键启停，适合小团队 VPS 部署
8. **shadcn/ui + Tailwind**: 统一 UI 组件规范，共享 Tailwind 配置跨 web/admin 端
