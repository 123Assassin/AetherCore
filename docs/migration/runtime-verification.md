# Docker Compose Runtime Verification

Verification date: 2026-05-20 18:53 CST.

## Service Profile And Port Summary

`docker-compose.yml` matches the Task 44 runtime layout:

| Service    | Profile | Published port | Notes                                              |
| ---------- | ------- | -------------- | -------------------------------------------------- |
| `postgres` | default | `5432`         | PostgreSQL 16, database `aether_db`, user `aether` |
| `redis`    | default | `6379`         | Redis 7 with password auth                         |
| `pgadmin`  | default | `5050`         | Depends on healthy `postgres`                      |
| `db-init`  | `app`   | none           | Depends on healthy `postgres` and `redis`          |
| `server`   | `app`   | `7001`         | Depends on healthy `postgres` and `redis`          |
| `web`      | `app`   | `3000`         | Depends on `server`                                |
| `admin`    | `app`   | `3001`         | Depends on `server`                                |

`.env.example` provides the expected default credentials and ports:

- PostgreSQL: `POSTGRES_USER=aether`, `POSTGRES_DB=aether_db`, `POSTGRES_PORT=5432`
- Redis: `REDIS_PORT=6379`
- pgAdmin: `PGADMIN_DEFAULT_EMAIL=admin@example.com`, `PGADMIN_PORT=5050`

## pgAdmin Usage

- URL: `http://localhost:5050`
- Login user: `admin`
- Login password: value of `PGADMIN_DEFAULT_PASSWORD` from `.env.example`
- Server host: `postgres`
- Database: `aether_db`
- User: `aether`
- Password: value of `POSTGRES_PASSWORD` from `.env.example`

## Verification Results

| Command                                                       | Result | Observed outcome                                                                                                                                                               |
| ------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docker compose --env-file .env.example config`               | PASS   | Default-profile config rendered successfully with `postgres`, `redis`, and `pgadmin`. Ports rendered as `5432`, `6379`, and `5050`.                                            |
| `docker compose --env-file .env.example --profile app config` | PASS   | App-profile config rendered successfully with `db-init`, `server`, `web`, and `admin` under `profiles: ["app"]`. Ports rendered as `7001`, `3000`, and `3001`.                 |
| `docker compose --env-file .env.example up -d`                | PASS   | Default-profile services started after local image availability was resolved. `postgres` and `redis` reached healthy state; `pgadmin` started after `postgres` became healthy. |
| `docker compose --env-file .env.example ps`                   | PASS   | Showed `aethercore-postgres` on `5432`, `aethercore-redis` on `6379`, and `aethercore-pgadmin` on `5050`. Postgres and Redis were `healthy`.                                   |
| `curl -f http://localhost:5050/misc/ping`                     | PASS   | Returned `PING` after pgAdmin finished initialization.                                                                                                                         |
| `docker compose --env-file .env.example down`                 | PASS   | Removed the default-profile containers and network.                                                                                                                            |

## Health Check Status

Runtime health was observed with:

```bash
docker inspect --format '{{.Name}} {{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' aethercore-postgres aethercore-redis aethercore-pgadmin
```

Observed status:

```text
/aethercore-postgres running healthy
/aethercore-redis running healthy
/aethercore-pgadmin running no-healthcheck
```

`pgadmin` has no Docker healthcheck in `docker-compose.yml`; its HTTP health endpoint was verified with `curl -f http://localhost:5050/misc/ping`.

## Environment Notes

- No `docker-compose.yml` changes were required.
- No `.env.example` changes were required.
- Docker Hub access from this machine returned registry EOF/SSL errors during the first run. The final run used locally available images:
  - `postgres:16-alpine`
  - `redis:7-alpine`
  - `dpage/pgadmin4:latest`
- Existing local containers `pg15` and `redis` occupied ports `5432` and `6379`; they were temporarily stopped for fixed-port verification and restarted after `docker compose --env-file .env.example down`.
