# AetherCore

AetherCore 是一个 pnpm workspace + Turborepo monorepo，包含用户端 Web、管理端 Admin、统一后端 Server 和数据库初始化脚本。

## 项目结构

```text
apps/web       用户端，Next.js，默认端口 3000
apps/admin     管理端，Next.js，默认端口 3001
apps/server    后端，NestJS + Fastify + tRPC，默认端口 7001
apps/db-init   数据库迁移和初始化脚本
packages/*     共享包、数据库 schema、认证、UI、类型等
```

## 前置要求

- Node.js `24.14.0`
- pnpm `10.32.1`
- PostgreSQL 16
- Redis 7
- Docker / Docker Compose，用于 VPS 部署

建议使用 corepack 启用项目指定 pnpm：

```bash
corepack enable
corepack prepare pnpm@10.32.1 --activate
```

## 本地开发

### 1. 安装依赖

```bash
pnpm install
```

### 2. 准备环境变量

```bash
cp .env.example .env
```

本地开发默认使用本机服务：

```env
DATABASE_URL=postgresql://aether:aether_secret@localhost:5432/aether_db
REDIS_URL=redis://:redis_secret@localhost:6379/0
SERVER_PORT=7001
WEB_PORT=3000
ADMIN_PORT=3001
INTERNAL_API_URL=http://localhost:7001
NEXT_PUBLIC_API_URL=
```

`NEXT_PUBLIC_API_URL` 保持空值。前端会走同源 `/trpc` 和 `/api/...` 代理，再由 Next.js 服务端代理到 `INTERNAL_API_URL`。

### 3. 准备本地 PostgreSQL 和 Redis

确保本机有 PostgreSQL `5432` 和 Redis `6379` 可用，并且账号密码与 `.env` 一致。

如果用 Docker 临时启动本地依赖，可以参考：

```bash
docker run -d --name aethercore-local-postgres \
  -e POSTGRES_USER=aether \
  -e POSTGRES_PASSWORD=aether_secret \
  -e POSTGRES_DB=aether_db \
  -p 5432:5432 \
  postgres:16-alpine

docker run -d --name aethercore-local-redis \
  -p 6379:6379 \
  redis:7-alpine redis-server --appendonly yes --requirepass redis_secret
```

### 4. 初始化数据库

```bash
pnpm db:init
```

该命令会执行数据库迁移并写入基础种子数据，包括默认管理端账号和 Web 端账号。

默认账号来自 `.env`：

```env
ADMIN_USER=admin
ADMIN_PASSWORD=changeme123
WEB_USER=teacher
WEB_USER_PASSWORD=teacher123
```

本地和 VPS 都建议改掉默认密码。

### 5. 启动开发服务

全部启动：

```bash
pnpm dev
```

或分别启动：

```bash
pnpm dev:server
pnpm dev:web
pnpm dev:admin
```

访问地址：

```text
Web:    http://localhost:3000
Admin:  http://localhost:3001
Server: http://localhost:7001
```

### 6. 常用检查命令

```bash
pnpm lint
pnpm type-check
pnpm build
```

接口健康检查：

```bash
curl http://localhost:3000/trpc/health.ping
curl http://localhost:3001/trpc/health.ping
```

正常返回：

```json
{ "result": { "data": "pong" } }
```

## VPS 部署

当前生产部署使用根目录 `docker-compose.yml`。Compose 会启动 PostgreSQL、Redis、db-init、Server、Web、Admin。

只有 Web 和 Admin 暴露到宿主机：

```text
Web:   ${WEB_PORT:-3000}
Admin: ${ADMIN_PORT:-3001}
```

Server、PostgreSQL、Redis 只在 Docker 网络 `aethercore_net` 内访问。

### 1. 进入项目目录

```bash
cd /path/to/AetherCore
```

### 2. 准备 `.env`

```bash
cp .env.example .env
nano .env
```

VPS 上至少修改这些值：

```env
POSTGRES_PASSWORD=换成强密码
REDIS_PASSWORD=换成强密码
ADMIN_USER=admin
ADMIN_EMAIL=你的管理员邮箱
ADMIN_PASSWORD=换成强密码
AETHERCORE_ENGINE_API_KEY_SECRET=换成足够长的随机字符串
WEB_PORT=3000
ADMIN_PORT=3001
NEXT_PUBLIC_API_URL=
```

如果使用域名或 HTTPS，按实际地址调整：

```env
WEB_HTTP_URL=https://你的-web-域名
CORS_ORIGINS=https://你的-web-域名,https://你的-admin-域名
WECHAT_REDIRECT_URI=https://你的-web-域名/auth/wechat/callback
```

不要把 `NEXT_PUBLIC_API_URL` 设置成 `localhost:7001`。Docker 部署下，Web/Admin 容器会通过内部地址 `http://server:7001` 访问后端。

### 3. 准备 PostgreSQL 持久化目录

当前 compose 使用 Bind Mount：

```text
/home/ubuntu/data/pgsql:/var/lib/postgresql/data
```

首次部署前执行：

```bash
sudo mkdir -p /home/ubuntu/data/pgsql
sudo chown -R 70:70 /home/ubuntu/data/pgsql
sudo chmod 700 /home/ubuntu/data/pgsql
```

首次部署时该目录应为空。只要不删除 `/home/ubuntu/data/pgsql`，数据库数据会持续保留。

### 4. 构建并启动

```bash
docker compose --env-file .env --profile app up -d --build
```

启动顺序：

1. PostgreSQL 和 Redis 启动并通过 healthcheck
2. `db-init` 执行迁移和种子数据
3. `db-init` 正常退出后启动 Server
4. Web 和 Admin 启动

`db-init` 的正常状态是 `Exited (0)`。

### 5. 查看状态和日志

```bash
docker compose --env-file .env --profile app ps -a
```

正常状态应类似：

```text
aethercore-postgres   Up ... healthy
aethercore-redis      Up ... healthy
aethercore-db-init    Exited (0)
aethercore-server     Up
aethercore-web        Up    0.0.0.0:3000->3000
aethercore-admin      Up    0.0.0.0:3001->3001
```

查看数据库初始化日志：

```bash
docker compose --env-file .env --profile app logs db-init
```

查看后端日志：

```bash
docker compose --env-file .env --profile app logs server
```

持续跟踪全部日志：

```bash
docker compose --env-file .env --profile app logs -f
```

### 6. 验证部署

在 VPS 本机执行：

```bash
curl -I http://127.0.0.1:3000/chat
curl -I http://127.0.0.1:3001/login
curl http://127.0.0.1:3000/trpc/health.ping
```

`health.ping` 正常返回：

```json
{ "result": { "data": "pong" } }
```

### 7. 防火墙和反向代理

如果直接用端口访问：

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
```

如果使用 Nginx 或 Caddy，建议只开放 `80/443`，然后反代：

```text
Web   -> 127.0.0.1:3000
Admin -> 127.0.0.1:3001
```

Server 不需要对公网暴露。

### 8. 更新部署

项目提供了部署脚本 `scripts/deploy.sh`，用于包装当前生产 `docker compose` 命令。

全量更新：

```bash
git pull
./scripts/deploy.sh
```

也可以显式写成：

```bash
./scripts/deploy.sh all
```

只更新指定服务：

```bash
./scripts/deploy.sh web
./scripts/deploy.sh admin
./scripts/deploy.sh server
./scripts/deploy.sh web admin
```

如果只调整了 Web 端代码或根目录 `phetsims_apps` 里的仿真静态文件，通常只需要：

```bash
git pull
./scripts/deploy.sh web
```

使用其他环境文件：

```bash
./scripts/deploy.sh --env-file .env.production web
```

预览将要执行的命令，不真正部署：

```bash
./scripts/deploy.sh --dry-run web
```

### 9. 停止服务

```bash
docker compose --env-file .env --profile app down
```

该命令不会删除 `/home/ubuntu/data/pgsql` 中的数据库数据。

### 10. 重新执行数据库初始化

如果 `apps/db-init`、`apps/db-init/data.json`、`apps/db-init/grade.json`、`packages/db` schema 或迁移文件有调整，需要重新构建并执行 `db-init`：

```bash
git pull
./scripts/deploy.sh db-init
```

这个命令会先执行：

```bash
docker compose --env-file .env --profile app up --build --force-recreate db-init
```

然后重新启动应用服务：

```bash
docker compose --env-file .env --profile app up -d --build server web admin
```

`db-init` 不会删除 PostgreSQL 持久化目录 `/home/ubuntu/data/pgsql`。它会按当前初始化逻辑执行迁移和种子数据；其中仿真资源 seed 会重建仿真相关表数据，适合 `data.json`、`grade.json` 或仿真字段映射变化后的更新。

## 常见问题

### 前端请求后端失败

检查 `.env`：

```env
NEXT_PUBLIC_API_URL=
```

本地开发时检查：

```env
INTERNAL_API_URL=http://localhost:7001
```

Docker 部署时无需在 `.env` 里写 `INTERNAL_API_URL`，compose 会给 Web/Admin 容器注入 `http://server:7001`。

### Redis 报 NOAUTH

检查 `REDIS_URL` 和 `REDIS_PASSWORD` 是否一致。

本地开发示例：

```env
REDIS_PASSWORD=redis_secret
REDIS_URL=redis://:redis_secret@localhost:6379/0
```

Docker 部署下 compose 会生成容器内地址：

```text
redis://:<REDIS_PASSWORD>@redis:6379/0
```

### Admin 密码不生效

确认 `.env` 中字段名是：

```env
ADMIN_PASSWORD=你的密码
```

不要写成其他拼写。`db-init` 读取的是 `ADMIN_PASSWORD`。

### PostgreSQL 数据目录权限错误

重新设置 VPS 上的数据目录权限：

```bash
sudo chown -R 70:70 /home/ubuntu/data/pgsql
sudo chmod 700 /home/ubuntu/data/pgsql
```

然后重启：

```bash
docker compose --env-file .env --profile app up -d
```
