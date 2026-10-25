#!/usr/bin/env bash
# Applies the Supabase migrations and seed to a throwaway Postgres database
# and runs the SQL test suite, including a concurrent "last unit" race.
#
# Usage: DATABASE_URL=postgres://user:pass@localhost:5432/postgres scripts/test-db.sh
# The script creates and drops a database named dewe_test on that server.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ADMIN_URL="${DATABASE_URL:-postgres://postgres@localhost:5432/postgres}"
TEST_DB="dewe_test"
TEST_URL="${ADMIN_URL%/*}/${TEST_DB}"
PSQL=(psql -X -q -v ON_ERROR_STOP=1)

"${PSQL[@]}" "$ADMIN_URL" -c "drop database if exists ${TEST_DB} with (force)" -c "create database ${TEST_DB}"
trap '"${PSQL[@]}" "$ADMIN_URL" -c "drop database if exists ${TEST_DB} with (force)" >/dev/null' EXIT

"${PSQL[@]}" "$TEST_URL" -f "$ROOT/supabase/tests/supabase_stub.sql"
for migration in "$ROOT"/supabase/migrations/*.sql; do
  echo "applying $(basename "$migration")"
  "${PSQL[@]}" "$TEST_URL" -f "$migration"
done
"${PSQL[@]}" "$TEST_URL" -f "$ROOT/supabase/seed.sql"

for test in "$ROOT"/supabase/tests/[0-9]*.sql; do
  echo "running $(basename "$test")"
  "${PSQL[@]}" "$TEST_URL" -f "$test"
done

echo "running concurrent last-unit race"
"${PSQL[@]}" "$TEST_URL" <<'SQL'
update public.product_variants set stock = 1 where sku = 'SMP-DLN-MOI-50';
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'race1@example.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'race2@example.test');
SQL

buy() {
  local user="$1" hold="$2"
  "${PSQL[@]}" "$TEST_URL" -t <<SQL 2>&1 || true
begin;
select set_config('request.jwt.claim.sub', '${user}', true);
set local role authenticated;
select 'ORDER_OK' from public.place_cod_order(
  jsonb_build_array(jsonb_build_object('variant_id', (select id from public.product_variants where sku = 'SMP-DLN-MOI-50'), 'quantity', 1)),
  '{"customer_name":"Race","phone":"+20 100 000 0000","address_line1":"1 Nile St","city":"Cairo","zone":"C"}',
  gen_random_uuid());
select pg_sleep(${hold});
commit;
SQL
}

out1="$(mktemp)"; out2="$(mktemp)"
buy 00000000-0000-0000-0000-0000000000c1 2 >"$out1" &
sleep 0.5
buy 00000000-0000-0000-0000-0000000000c2 0 >"$out2" &
wait

ok_count=$(cat "$out1" "$out2" | grep -c ORDER_OK || true)
stock=$("${PSQL[@]}" "$TEST_URL" -tA -c "select stock from public.product_variants where sku = 'SMP-DLN-MOI-50'")
if [[ "$ok_count" != "1" || "$stock" != "0" ]] || ! grep -q "insufficient_stock" "$out2"; then
  echo "race test failed: orders=$ok_count stock=$stock"
  cat "$out1" "$out2"
  exit 1
fi
echo "race test passed: one order, stock 0, second buyer refused"
echo "all database tests passed"
