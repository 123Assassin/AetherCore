#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE=".env"
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage:
  scripts/deploy.sh [options] [all|web|admin|server|db-init ...]

Options:
  -e, --env-file FILE  Use a custom env file. Default: .env
      --dry-run        Print commands without running them.
  -h, --help           Show this help message.

Examples:
  scripts/deploy.sh
  scripts/deploy.sh web
  scripts/deploy.sh web admin
  scripts/deploy.sh --env-file .env.production web
  scripts/deploy.sh db-init

Notes:
  db-init rebuilds and reruns database initialization, then restarts server, web, and admin.
EOF
}

die() {
  printf 'Error: %s\n\n' "$1" >&2
  usage >&2
  exit 1
}

print_command() {
  printf '+'
  printf ' %q' "$@"
  printf '\n'
}

run() {
  if [[ "$DRY_RUN" == true ]]; then
    print_command "$@"
    return
  fi

  "$@"
}

services=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -e | --env-file)
      [[ $# -ge 2 ]] || die "$1 requires a file path"
      ENV_FILE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    --)
      shift
      while [[ $# -gt 0 ]]; do
        services+=("$1")
        shift
      done
      ;;
    -*)
      die "unknown option: $1"
      ;;
    *)
      services+=("$1")
      shift
      ;;
  esac
done

if [[ ${#services[@]} -eq 0 ]]; then
  services=("all")
fi

has_all=false
has_db_init=false
app_services=()

for service in "${services[@]}"; do
  case "$service" in
    all)
      has_all=true
      ;;
    db-init)
      has_db_init=true
      ;;
    web | admin | server)
      app_services+=("$service")
      ;;
    *)
      die "unknown service: $service"
      ;;
  esac
done

if [[ "$has_all" == true && ${#services[@]} -gt 1 ]]; then
  die "all cannot be combined with other services"
fi

cd "$ROOT_DIR"

compose=(docker compose --env-file "$ENV_FILE" --profile app)

if [[ "$has_db_init" == true ]]; then
  run "${compose[@]}" up --build --force-recreate db-init
  run "${compose[@]}" up -d --build server web admin
elif [[ "$has_all" == true ]]; then
  run "${compose[@]}" up -d --build
else
  run "${compose[@]}" up -d --build "${app_services[@]}"
fi
