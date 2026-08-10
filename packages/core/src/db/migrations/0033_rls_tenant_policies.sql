-- Row-level security policies for tenant isolation.
--
-- RLS was enabled on these tables from the first migration but only one policy was
-- ever written, and nothing set the app.tenant_id it reads — so isolation was really
-- enforced only by application middleware, and the database guarantee was absent.
--
-- Each policy constrains every row to the tenant on the current connection.
-- tenantContext reserves a connection per request and sets app.tenant_id on it.
-- When the setting is absent (migrations, seeding, maintenance) the policies match
-- nothing, so those paths must run as a superuser or the table owner, which bypasses
-- RLS. The application role must NOT be a superuser or none of this is enforced.

DROP POLICY IF EXISTS "auditLogTenantIsolation" ON "auditLog";
CREATE POLICY "auditLogTenantIsolation" ON "auditLog"
  USING ("tenantId"::text = current_setting('app.tenant_id', TRUE))
  WITH CHECK ("tenantId"::text = current_setting('app.tenant_id', TRUE));

DROP POLICY IF EXISTS "channelConfigsTenantIsolation" ON "channelConfigs";
CREATE POLICY "channelConfigsTenantIsolation" ON "channelConfigs"
  USING ("tenantId"::text = current_setting('app.tenant_id', TRUE))
  WITH CHECK ("tenantId"::text = current_setting('app.tenant_id', TRUE));

DROP POLICY IF EXISTS "configVersionsTenantIsolation" ON "configVersions";
CREATE POLICY "configVersionsTenantIsolation" ON "configVersions"
  USING ("tenantId"::text = current_setting('app.tenant_id', TRUE))
  WITH CHECK ("tenantId"::text = current_setting('app.tenant_id', TRUE));

DROP POLICY IF EXISTS "entityDefinitionsTenantIsolation" ON "entityDefinitions";
CREATE POLICY "entityDefinitionsTenantIsolation" ON "entityDefinitions"
  USING ("tenantId"::text = current_setting('app.tenant_id', TRUE))
  WITH CHECK ("tenantId"::text = current_setting('app.tenant_id', TRUE));

DROP POLICY IF EXISTS "entityRecordsTenantIsolation" ON "entityRecords";
CREATE POLICY "entityRecordsTenantIsolation" ON "entityRecords"
  USING ("tenantId"::text = current_setting('app.tenant_id', TRUE))
  WITH CHECK ("tenantId"::text = current_setting('app.tenant_id', TRUE));

DROP POLICY IF EXISTS "identitiesTenantIsolation" ON "identities";
CREATE POLICY "identitiesTenantIsolation" ON "identities"
  USING ("tenantId"::text = current_setting('app.tenant_id', TRUE))
  WITH CHECK ("tenantId"::text = current_setting('app.tenant_id', TRUE));

DROP POLICY IF EXISTS "integrationInstancesTenantIsolation" ON "integrationInstances";
CREATE POLICY "integrationInstancesTenantIsolation" ON "integrationInstances"
  USING ("tenantId"::text = current_setting('app.tenant_id', TRUE))
  WITH CHECK ("tenantId"::text = current_setting('app.tenant_id', TRUE));

DROP POLICY IF EXISTS "ledgerEntriesTenantIsolation" ON "ledgerEntries";
CREATE POLICY "ledgerEntriesTenantIsolation" ON "ledgerEntries"
  USING ("tenantId"::text = current_setting('app.tenant_id', TRUE))
  WITH CHECK ("tenantId"::text = current_setting('app.tenant_id', TRUE));

DROP POLICY IF EXISTS "magicLinksTenantIsolation" ON "magicLinks";
CREATE POLICY "magicLinksTenantIsolation" ON "magicLinks"
  USING ("tenantId"::text = current_setting('app.tenant_id', TRUE))
  WITH CHECK ("tenantId"::text = current_setting('app.tenant_id', TRUE));

DROP POLICY IF EXISTS "rolesTenantIsolation" ON "roles";
CREATE POLICY "rolesTenantIsolation" ON "roles"
  USING ("tenantId"::text = current_setting('app.tenant_id', TRUE))
  WITH CHECK ("tenantId"::text = current_setting('app.tenant_id', TRUE));

DROP POLICY IF EXISTS "workflowDefinitionsTenantIsolation" ON "workflowDefinitions";
CREATE POLICY "workflowDefinitionsTenantIsolation" ON "workflowDefinitions"
  USING ("tenantId"::text = current_setting('app.tenant_id', TRUE))
  WITH CHECK ("tenantId"::text = current_setting('app.tenant_id', TRUE));

DROP POLICY IF EXISTS "workflowRunsTenantIsolation" ON "workflowRuns";
CREATE POLICY "workflowRunsTenantIsolation" ON "workflowRuns"
  USING ("tenantId"::text = current_setting('app.tenant_id', TRUE))
  WITH CHECK ("tenantId"::text = current_setting('app.tenant_id', TRUE));

DROP POLICY IF EXISTS "tenantsSelfIsolation" ON "tenants";
CREATE POLICY "tenantsSelfIsolation" ON "tenants"
  USING ("id"::text = current_setting('app.tenant_id', TRUE))
  WITH CHECK ("id"::text = current_setting('app.tenant_id', TRUE));
