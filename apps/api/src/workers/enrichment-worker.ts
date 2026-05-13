import type { Job } from 'bullmq';
import { and, eq } from 'drizzle-orm';
import type {
  Database,
  QueueService,
  AnthropicProvider,
  AuditService,
} from '@veska/core';
import { schema } from '@veska/core';
import type { EnrichEntityJob } from '@veska/core';

// ──────────────────────────────────────────────────────────────
// Enrichment worker
// ──────────────────────────────────────────────────────────────

/**
 * BullMQ worker for `ai.enrich_entity` jobs.
 *
 * Job payload: { tenantId, entityType, entityId, fields: string[] }
 *
 * Steps:
 * 1. Load the entity record from entity_records by id = entityId.
 * 2. Load the entity definition by tenantId + name = entityType.
 * 3. Build a prompt asking Claude to fill in the `fields` array based
 *    on existing record.data values.
 * 4. Call the LLM for a structured JSON response.
 * 5. Parse Claude's JSON and merge enriched fields into record.data.
 * 6. Persist the updated data.
 * 7. Log an audit event: ai.entity.enriched with before/after.
 */
export function registerEnrichmentWorker(
  queueService: QueueService,
  db: Database,
  llm: AnthropicProvider,
  auditService: AuditService,
): void {
  queueService.registerWorker<'ai.enrich_entity'>(
    'ai',
    async (job: Job<EnrichEntityJob>) => {
      const { tenantId, entityType, entityId, fields } = job.data;

      // 1. Load the entity record
      const record = await db.query.entityRecords.findFirst({
        where: and(
          eq(schema.entityRecords.tenantId, tenantId),
          eq(schema.entityRecords.id, entityId),
        ),
      });

      if (!record) {
        console.warn(
          `[EnrichmentWorker] Entity record not found: tenantId=${tenantId} entityId=${entityId}`,
        );
        return;
      }

      // 2. Load the entity definition
      const definition = await db.query.entityDefinitions.findFirst({
        where: and(
          eq(schema.entityDefinitions.tenantId, tenantId),
          eq(schema.entityDefinitions.name, entityType),
        ),
      });

      if (!definition) {
        console.warn(
          `[EnrichmentWorker] Entity definition not found: tenantId=${tenantId} entityType=${entityType}`,
        );
        return;
      }

      const existingData = (record.data ?? {}) as Record<string, unknown>;
      const fieldsJson = JSON.stringify(fields);
      const existingJson = JSON.stringify(existingData);

      // 3. Build the LLM prompt
      const system = [
        `You are a CRM data enrichment assistant.`,
        `You are given an entity of type "${entityType}" (${definition.label}).`,
        definition.aiDescription
          ? `Entity description: ${definition.aiDescription}`
          : '',
        `Your task is to infer likely values for the requested fields based on whatever`,
        `information is already present in the entity's data.`,
        `Respond ONLY with a valid JSON object containing the requested fields as keys.`,
        `If you cannot determine a value for a field, omit it from the response.`,
        `Do not include any explanation — only the JSON object.`,
      ]
        .filter(Boolean)
        .join(' ');

      const userMessage = [
        `Existing entity data:`,
        existingJson,
        ``,
        `Please infer values for these fields: ${fieldsJson}`,
        ``,
        `Respond with a JSON object, e.g. {"industry": "SaaS", "size": "50-200 employees"}`,
      ].join('\n');

      // 4. Call the LLM
      let enrichedFields: Record<string, unknown> = {};

      try {
        const result = await llm.complete({
          system,
          messages: [{ role: 'user', content: userMessage }],
          maxTokens: 512,
        });

        const responseText = result.text.trim();

        // Strip markdown code fences if present
        const jsonText = responseText
          .replace(/^```(?:json)?\n?/i, '')
          .replace(/\n?```$/i, '')
          .trim();

        enrichedFields = JSON.parse(jsonText) as Record<string, unknown>;
      } catch (err) {
        console.error(
          `[EnrichmentWorker] LLM call or JSON parse failed for entityId=${entityId}:`,
          err,
        );
        return;
      }

      // 5. Merge enriched fields into existing data
      const beforeData = { ...existingData };
      const mergedData = { ...existingData, ...enrichedFields };

      // 6. Persist the updated entity record
      await db
        .update(schema.entityRecords)
        .set({
          data: mergedData,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.entityRecords.tenantId, tenantId),
            eq(schema.entityRecords.id, entityId),
          ),
        );

      // 7. Audit log
      await auditService.log({
        tenantId,
        actorType: 'agent',
        action: 'ai.entity.enriched',
        resourceType: entityType,
        resourceId: entityId,
        before: beforeData,
        after: mergedData,
        metadata: {
          requestedFields: fields,
          enrichedFields: Object.keys(enrichedFields),
        },
      });

      console.log(
        `[EnrichmentWorker] Enriched ${entityType}/${entityId} with fields: ${Object.keys(enrichedFields).join(', ')}`,
      );
    },
    5,
  );
}
