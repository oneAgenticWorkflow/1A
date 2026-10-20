#!/bin/bash
# Runs the migration on a throwaway local Postgres and checks the access rules.
set -e
export PATH=/usr/lib/postgresql/16/bin:$PATH
D=/tmp/pgtest; rm -rf $D; mkdir -p $D; chown postgres $D; chmod 755 /home/claude /home/claude/portal /home/claude/portal/tests 2>/dev/null || true
su postgres -c "/usr/lib/postgresql/16/bin/initdb -D $D/data -A trust >/dev/null" && su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D $D/data -o '-p 5544 -k $D' -l $D/log start -w >/dev/null"
P="psql -h $D -p 5544 -U postgres -v ON_ERROR_STOP=1 -q"
$P -c "create database t" postgres
P="$P -d t"
$P -f "$(dirname $0)/shim.sql"
$P -f "$(dirname $0)/../supabase/migrations/001_schema.sql"
$P -f "$(dirname $0)/rls_test.sql"
su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D $D/data stop >/dev/null"
