#!/usr/bin/env bash
# Runs a Docker-free Supabase-compatible stack for end-to-end tests:
#   Postgres (yours) + Supabase Auth (GoTrue) + PostgREST + a tiny gateway
# that serves them at http://127.0.0.1:54321/{auth,rest}/v1 like Supabase does.
#
# Prefer `supabase start` when Docker is available (that is what CI uses).
# This script exists for environments where container registries are blocked.
#
# Requires: psql, node, and the binaries below (downloaded on first run).
# Usage: DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres scripts/local-stack.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="${STACK_BIN_DIR:-$ROOT/.stack}"
ADMIN_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/postgres}"
DB="dewe_e2e"
DB_URL="${ADMIN_URL%/*}/${DB}"
HOSTPORT="$(echo "$ADMIN_URL" | sed -E 's#.*@([^/]+)/.*#\1#')"
JWT_SECRET="${LOCAL_JWT_SECRET:-local-only-jwt-secret-at-least-32-characters}"
PGRST_VERSION=v12.2.12
AUTH_VERSION=v2.197.0
PSQL=(psql -X -q -v ON_ERROR_STOP=1)

mkdir -p "$BIN"
LOG_DIR="${STACK_LOG_DIR:-$BIN/logs}"
mkdir -p "$LOG_DIR"

# Stop a stack left over from a previous run.
for pidfile in "$LOG_DIR"/*.pid; do
  [[ -e "$pidfile" ]] || continue
  kill "$(cat "$pidfile")" 2>/dev/null || true
  rm -f "$pidfile"
done
if [[ ! -x "$BIN/postgrest" ]]; then
  curl -fsSL "https://github.com/PostgREST/postgrest/releases/download/${PGRST_VERSION}/postgrest-${PGRST_VERSION}-linux-static-x86-64.tar.xz" | tar xJ -C "$BIN"
fi
if [[ ! -x "$BIN/auth/auth" ]]; then
  mkdir -p "$BIN/auth"
  curl -fsSL "https://github.com/supabase/auth/releases/download/${AUTH_VERSION}/auth-${AUTH_VERSION}-x86.tar.gz" | tar xz -C "$BIN/auth"
fi

"${PSQL[@]}" "$ADMIN_URL" <<SQL
drop database if exists ${DB} with (force);
create database ${DB};
do \$\$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then create role authenticator login noinherit password 'authenticator'; end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then create role supabase_auth_admin login createrole password 'auth_admin'; end if;
end \$\$;
grant anon, authenticated, service_role to authenticator;
SQL

"${PSQL[@]}" "$DB_URL" <<'SQL'
create schema if not exists auth authorization supabase_auth_admin;
grant usage on schema auth to anon, authenticated, service_role, postgres;
grant create on database dewe_e2e to supabase_auth_admin;
alter role supabase_auth_admin set search_path = auth;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
SQL

# Supabase Auth owns the auth schema: run its migrations first (auth.users,
# auth.uid(), ...), because the app's migrations reference them.
auth_env=(
  GOTRUE_DB_DRIVER=postgres
  DATABASE_URL="postgres://supabase_auth_admin:auth_admin@${HOSTPORT}/${DB}?search_path=auth&sslmode=disable"
  GOTRUE_DB_MIGRATIONS_PATH="$BIN/auth/migrations"
  GOTRUE_JWT_SECRET="$JWT_SECRET" GOTRUE_JWT_EXP=3600 GOTRUE_JWT_AUD=authenticated
  GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated GOTRUE_JWT_ADMIN_ROLES=service_role
  GOTRUE_SITE_URL="${SITE_URL:-http://localhost:3000}" GOTRUE_URI_ALLOW_LIST="http://localhost:3000/**"
  API_EXTERNAL_URL="http://127.0.0.1:54321/auth/v1"
  GOTRUE_API_HOST=127.0.0.1 PORT=9999
  GOTRUE_EXTERNAL_EMAIL_ENABLED=true GOTRUE_MAILER_AUTOCONFIRM=true GOTRUE_DISABLE_SIGNUP=false
  GOTRUE_RATE_LIMIT_EMAIL_SENT=1000 GOTRUE_LOG_LEVEL=warn
)
(cd "$BIN/auth" && env "${auth_env[@]}" ./auth migrate >"$LOG_DIR/auth-migrate.log" 2>&1) \
  || { echo "auth migrations failed"; cat "$LOG_DIR/auth-migrate.log"; exit 1; }
(cd "$BIN/auth"; env "${auth_env[@]}" ./auth serve >"$LOG_DIR/auth.log" 2>&1 & echo $! >"$LOG_DIR/auth.pid")

for _ in $(seq 1 60); do
  curl -fsS http://127.0.0.1:9999/health >/dev/null 2>&1 && break
  sleep 0.5
done
curl -fsS http://127.0.0.1:9999/health >/dev/null || { echo "auth failed to start"; cat "$LOG_DIR/auth.log"; exit 1; }

for migration in "$ROOT"/supabase/migrations/*.sql; do
  "${PSQL[@]}" "$DB_URL" -f "$migration"
done
"${PSQL[@]}" "$DB_URL" -f "$ROOT/supabase/seed.sql"

PGRST_DB_URI="postgres://authenticator:authenticator@${HOSTPORT}/${DB}" \
PGRST_DB_SCHEMAS=public PGRST_DB_ANON_ROLE=anon PGRST_JWT_SECRET="$JWT_SECRET" \
PGRST_SERVER_HOST=127.0.0.1 PGRST_SERVER_PORT=3001 PGRST_DB_EXTRA_SEARCH_PATH=public \
"$BIN/postgrest" >"$LOG_DIR/postgrest.log" 2>&1 &
echo $! >"$LOG_DIR/postgrest.pid"

node "$ROOT/scripts/local-gateway.mjs" >"$LOG_DIR/gateway.log" 2>&1 &
echo $! >"$LOG_DIR/gateway.pid"

for _ in $(seq 1 40); do
  curl -fsS http://127.0.0.1:54321/rest/v1/ >/dev/null 2>&1 && break
  sleep 0.5
done

ANON_KEY="$(node "$ROOT/scripts/local-gateway.mjs" --sign anon "$JWT_SECRET")"
echo "Local stack ready at http://127.0.0.1:54321"
echo "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321"
echo "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY"
