import { Hono } from 'hono';
import { eq, and, isNull } from 'drizzle-orm';
import { schema } from '@veska/core';
import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../middleware/tenant-context.js';
import { handleRouteError } from '../lib/api-error.js';

export const importExportRouter = new Hono<{ Variables: TenantContext }>();

// ── CSV utilities ────────────────────────────────────────────

function toCSV(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.join(',');
  const lines = rows.map(row =>
    columns.map(col => {
      const val = (row.data as Record<string, unknown>)?.[col] ?? row[col] ?? '';
      const str = String(val).replace(/"/g, '""');
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
    }).join(',')
  );
  return [header, ...lines].join('\n');
}

function parseCSV(text: string): Record<string, string>[] {
  const [headerLine, ...dataLines] = text.trim().split('\n');
  if (!headerLine) return [];
  const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return dataLines
    .filter(line => line.trim())
    .map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
    });
}

// ── Export: Invoices ─────────────────────────────────────────

importExportRouter.get('/export/invoices', async (c) => {
  try {
    const { db } = c.get('tenantCtx');
    const tenantId = c.req.query('tenantId');
    if (!tenantId) return c.json({ error: 'tenantId is required' }, 400);

    const records = await db.query.entityRecords.findMany({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'invoice'),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    const columns = ['id', 'number', 'customerName', 'amount', 'currency', 'status', 'dueDate', 'createdAt'];
    const rows = records.map(r => ({ ...r, ...(r.data as Record<string, unknown>) }));
    const csv = toCSV(rows, columns);

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="invoices.csv"',
      },
    });
  } catch (err) {
    return handleRouteError(c, err, 'GET /export/invoices');
  }
});

// ── Export: Employees ────────────────────────────────────────

importExportRouter.get('/export/employees', async (c) => {
  try {
    const { db } = c.get('tenantCtx');
    const tenantId = c.req.query('tenantId');
    if (!tenantId) return c.json({ error: 'tenantId is required' }, 400);

    const records = await db.query.entityRecords.findMany({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'employee'),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    const columns = ['id', 'name', 'email', 'department', 'position', 'startDate', 'status', 'salary'];
    const rows = records.map(r => ({ ...r, ...(r.data as Record<string, unknown>) }));
    const csv = toCSV(rows, columns);

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="employees.csv"',
      },
    });
  } catch (err) {
    return handleRouteError(c, err, 'GET /export/employees');
  }
});

// ── Export: Inventory ────────────────────────────────────────

importExportRouter.get('/export/inventory', async (c) => {
  try {
    const { db } = c.get('tenantCtx');
    const tenantId = c.req.query('tenantId');
    if (!tenantId) return c.json({ error: 'tenantId is required' }, 400);

    const records = await db.query.entityRecords.findMany({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'inventory_item'),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    const columns = ['id', 'sku', 'name', 'category', 'unit', 'costPrice', 'reorderLevel'];
    const rows = records.map(r => ({ ...r, ...(r.data as Record<string, unknown>) }));
    const csv = toCSV(rows, columns);

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="inventory.csv"',
      },
    });
  } catch (err) {
    return handleRouteError(c, err, 'GET /export/inventory');
  }
});

// ── Export: Expenses ─────────────────────────────────────────

importExportRouter.get('/export/expenses', async (c) => {
  try {
    const { db } = c.get('tenantCtx');
    const tenantId = c.req.query('tenantId');
    if (!tenantId) return c.json({ error: 'tenantId is required' }, 400);

    const records = await db.query.entityRecords.findMany({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'Expense'),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    const columns = ['id', 'title', 'amount', 'currency', 'category', 'status', 'employeeId', 'submittedAt'];
    const rows = records.map(r => ({ ...r, ...(r.data as Record<string, unknown>) }));
    const csv = toCSV(rows, columns);

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="expenses.csv"',
      },
    });
  } catch (err) {
    return handleRouteError(c, err, 'GET /export/expenses');
  }
});

// ── Import: Employees ────────────────────────────────────────

importExportRouter.post('/import/employees', async (c) => {
  try {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = await c.req.parseBody();
    const file = body['file'] as File | undefined;

    if (!file || typeof file === 'string') {
      return c.json({ error: 'file field is required' }, 400);
    }

    const text = await file.text();
    const rows = parseCSV(text);
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const name = (row['name'] ?? '').trim();
      const email = (row['email'] ?? '').trim();

      if (!name || !email) {
        skipped++;
        continue;
      }

      const parts = name.split(' ');
      const firstName = parts[0] ?? name;
      const lastName = parts.slice(1).join(' ') || '';

      try {
        await db.insert(schema.entityRecords).values({
          id: randomUUID(),
          tenantId,
          entityType: 'employee',
          data: {
            firstName,
            lastName,
            email,
            department: row['department'] ?? '',
            position: row['role'] ?? '',
            salary: row['salary'] ? parseFloat(row['salary']) : undefined,
            startDate: row['startDate'] ?? '',
            status: 'active',
            source: 'csv_import',
          },
          createdBy: identityId,
        });
        imported++;
      } catch (err) {
        errors.push(`Row for "${name}" (${email}): ${String(err)}`);
      }
    }

    return c.json({ imported, skipped, errors });
  } catch (err) {
    return handleRouteError(c, err, 'POST /import/employees');
  }
});

// ── Import: Contacts ────────────────────────────────────────

importExportRouter.post('/import/contacts', async (c) => {
  try {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = await c.req.parseBody();
    const file = body['file'] as File | undefined;

    if (!file || typeof file === 'string') {
      return c.json({ error: 'file field is required' }, 400);
    }

    const text = await file.text();
    const rows = parseCSV(text);
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const name = (row['name'] ?? '').trim();
      const email = (row['email'] ?? '').trim();

      if (!name || !email) {
        skipped++;
        continue;
      }

      // Split name into first/last
      const parts = name.split(' ');
      const firstName = parts[0] ?? name;
      const lastName = parts.slice(1).join(' ') || '';

      try {
        await db.insert(schema.entityRecords).values({
          id: randomUUID(),
          tenantId,
          entityType: 'Contact',
          data: {
            firstName,
            lastName,
            email,
            phone: row['phone'] ?? '',
            company: row['company'] ?? '',
            title: row['role'] ?? '',
            source: 'csv_import',
            status: 'active',
          },
          createdBy: identityId,
        });
        imported++;
      } catch (err) {
        errors.push(`Row "${name}" (${email}): ${String(err)}`);
      }
    }

    return c.json({ imported, skipped, errors });
  } catch (err) {
    return handleRouteError(c, err, 'POST /import/contacts');
  }
});

// ── Import: Inventory ────────────────────────────────────────

importExportRouter.post('/import/inventory', async (c) => {
  try {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = await c.req.parseBody();
    const file = body['file'] as File | undefined;

    if (!file || typeof file === 'string') {
      return c.json({ error: 'file field is required' }, 400);
    }

    const text = await file.text();
    const rows = parseCSV(text);
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      if (!row['name']) { skipped++; continue; }
      try {
        await db.insert(schema.entityRecords).values({
          id: randomUUID(),
          tenantId,
          entityType: 'inventory_item',
          data: row,
          createdBy: identityId,
        });
        imported++;
      } catch (err) {
        errors.push(`Row for "${row['sku'] ?? row['name'] ?? '?'}": ${String(err)}`);
      }
    }

    return c.json({ imported, skipped, errors });
  } catch (err) {
    return handleRouteError(c, err, 'POST /import/inventory');
  }
});

// ── Import: Products ─────────────────────────────────────────

importExportRouter.post('/import/products', async (c) => {
  try {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = await c.req.parseBody();
    const file = body['file'] as File | undefined;

    if (!file || typeof file === 'string') {
      return c.json({ error: 'file field is required' }, 400);
    }

    const text = await file.text();
    const rows = parseCSV(text);
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const name = (row['name'] ?? '').trim();
      if (!name) { skipped++; continue; }

      try {
        await db.insert(schema.entityRecords).values({
          id: randomUUID(),
          tenantId,
          entityType: 'inventory_item',
          data: {
            name,
            sku: row['sku'] ?? '',
            price: row['price'] ? parseFloat(row['price']) : undefined,
            stockQuantity: row['stock'] ? parseInt(row['stock'], 10) : 0,
            category: row['category'] ?? '',
            status: 'active',
            currency: 'USD',
            source: 'csv_import',
          },
          createdBy: identityId,
        });
        imported++;
      } catch (err) {
        errors.push(`Row "${name}": ${String(err)}`);
      }
    }

    return c.json({ imported, skipped, errors });
  } catch (err) {
    return handleRouteError(c, err, 'POST /import/products');
  }
});
