#!/bin/bash
# Creates the non-superuser role the API uses for request-scoped queries, so the
# row-level-security policies are enforced (the veska superuser bypasses them).
# Runs only on first initialisation of the Postgres volume.
set -e
APP_PASSWORD="${POSTGRES_APP_PASSWORD:-veska_app}"
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<SQL
CREATE ROLE veska_app LOGIN PASSWORD '${APP_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE;
GRANT USAGE ON SCHEMA public TO veska_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO veska_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO veska_app;
-- Tables created by later migrations (run as $POSTGRES_USER) inherit the grants.
ALTER DEFAULT PRIVILEGES FOR ROLE "$POSTGRES_USER" IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO veska_app;
ALTER DEFAULT PRIVILEGES FOR ROLE "$POSTGRES_USER" IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO veska_app;
SQL
