#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_SH="$ROOT_DIR/scripts/deploy.sh"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

assert_contains() {
  local haystack="$1"
  local needle="$2"

  [[ "$haystack" == *"$needle"* ]] || fail "expected output to contain: $needle"
}

assert_not_contains() {
  local haystack="$1"
  local needle="$2"

  [[ "$haystack" != *"$needle"* ]] || fail "expected output not to contain: $needle"
}

run_dry() {
  "$DEPLOY_SH" --dry-run "$@"
}

output="$(run_dry web)"
assert_contains "$output" 'docker compose --env-file .env --profile app up -d --build web'

output="$(run_dry web admin)"
assert_contains "$output" 'docker compose --env-file .env --profile app up -d --build web admin'

output="$(run_dry all)"
assert_contains "$output" 'docker compose --env-file .env --profile app up -d --build'
assert_not_contains "$output" ' db-init'

output="$(run_dry --env-file .env.production web)"
assert_contains "$output" 'docker compose --env-file .env.production --profile app up -d --build web'

output="$(run_dry db-init)"
assert_contains "$output" 'docker compose --env-file .env --profile app up --build --force-recreate db-init'
assert_contains "$output" 'docker compose --env-file .env --profile app up -d --build server web admin'

output="$(run_dry server db-init)"
assert_contains "$output" 'docker compose --env-file .env --profile app up --build --force-recreate db-init'
assert_contains "$output" 'docker compose --env-file .env --profile app up -d --build server web admin'

if run_dry cache >/dev/null 2>&1; then
  fail 'expected unknown service to fail'
fi

printf 'deploy script tests passed\n'
