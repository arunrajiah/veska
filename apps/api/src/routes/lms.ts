import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';
import { handleRouteError } from '../lib/api-error.js';

export const lmsRouter = new Hono<{ Variables: TenantContext }>();

// ── Courses ───────────────────────────────────────────────────

const CourseCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.enum(['onboarding', 'compliance', 'technical', 'soft-skills', 'general']).optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  durationMinutes: z.number().int().positive().optional(),
  content: z.array(z.record(z.unknown())).optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
  isMandatory: z.boolean().optional(),
  authorId: z.string().optional().nullable(),
});

const CourseUpdateSchema = CourseCreateSchema.partial();

// GET /lms/summary — before /:id to avoid param collision
lmsRouter.get('/summary', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;

    const [courseStatusRows, enrollmentRows, topCoursesRows, certsRows, mandatoryRows] = await Promise.all([
      sharedDb.execute(sql`
        SELECT status, COUNT(*) AS count
        FROM "lmsCourses"
        WHERE "tenantId" = ${tenantId}
        GROUP BY status
      `),
      sharedDb.execute(sql`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'completed') AS completed,
          ROUND(
            100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0),
            1
          ) AS "completionRate"
        FROM "lmsEnrollments"
        WHERE "tenantId" = ${tenantId}
      `),
      sharedDb.execute(sql`
        SELECT c.id, c.title, COUNT(e.id) AS "enrollmentCount"
        FROM "lmsCourses" c
        LEFT JOIN "lmsEnrollments" e ON e."courseId" = c.id AND e."tenantId" = c."tenantId"
        WHERE c."tenantId" = ${tenantId}
        GROUP BY c.id, c.title
        ORDER BY "enrollmentCount" DESC
        LIMIT 5
      `),
      sharedDb.execute(sql`
        SELECT COUNT(*) AS count
        FROM "lmsCertifications"
        WHERE "tenantId" = ${tenantId}
          AND "issuedAt" >= ${yearStart}::timestamptz
      `),
      sharedDb.execute(sql`
        SELECT COUNT(*) AS count
        FROM "lmsCourses" c
        WHERE c."tenantId" = ${tenantId}
          AND c."isMandatory" = true
          AND EXISTS (
            SELECT 1 FROM "lmsEnrollments" e
            WHERE e."courseId" = c.id
              AND e."tenantId" = c."tenantId"
              AND e.status NOT IN ('completed')
          )
      `),
    ]);

    return c.json({
      coursesByStatus: courseStatusRows,
      enrollments: (enrollmentRows as unknown[])[0],
      topCourses: topCoursesRows,
      certificationsIssuedThisYear: (certsRows as Record<string, unknown>[])[0]?.['count'] ?? 0,
      mandatoryIncompleteCount: (mandatoryRows as Record<string, unknown>[])[0]?.['count'] ?? 0,
    });
  } catch (err) {
    return handleRouteError(c, err, 'GET /lms/summary');
  }
});

const coursesQuerySchema = z.object({
  status: z.string().optional(),
  category: z.string().optional(),
  level: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// GET /lms/courses
lmsRouter.get('/courses', zValidator('query', coursesQuerySchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { status, category, level } = c.req.valid('query');

    const rows = await sharedDb.execute(sql`
      SELECT c.*,
        COUNT(e.id) AS "enrollmentCount"
      FROM "lmsCourses" c
      LEFT JOIN "lmsEnrollments" e ON e."courseId" = c.id AND e."tenantId" = c."tenantId"
      WHERE c."tenantId" = ${tenantId}
        AND (${status ? sql`c.status = ${status}` : sql`TRUE`})
        AND (${category ? sql`c.category = ${category}` : sql`TRUE`})
        AND (${level ? sql`c.level = ${level}` : sql`TRUE`})
      GROUP BY c.id
      ORDER BY c."createdAt" DESC
    `);

    return c.json(rows);
  } catch (err) {
    return handleRouteError(c, err, 'GET /lms/courses');
  }
});

// POST /lms/courses
lmsRouter.post('/courses', zValidator('json', CourseCreateSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const rows = await sharedDb.execute(sql`
      INSERT INTO "lmsCourses" (
        "tenantId", title, description, category, level,
        "durationMinutes", content, "passingScore", "isMandatory", "authorId"
      )
      VALUES (
        ${tenantId},
        ${body.title},
        ${body.description ?? null},
        ${body.category ?? 'general'},
        ${body.level ?? 'beginner'},
        ${body.durationMinutes ?? 60},
        ${JSON.stringify(body.content ?? [])}::jsonb,
        ${body.passingScore ?? 80},
        ${body.isMandatory ?? false},
        ${body.authorId ?? null}
      )
      RETURNING *
    `);

    return c.json((rows as unknown[])[0], 201);
  } catch (err) {
    return handleRouteError(c, err, 'POST /lms/courses');
  }
});

// GET /lms/courses/:id
lmsRouter.get('/courses/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();

    const [courseRows, statsRows] = await Promise.all([
      sharedDb.execute(sql`
        SELECT * FROM "lmsCourses"
        WHERE id = ${id} AND "tenantId" = ${tenantId}
        LIMIT 1
      `),
      sharedDb.execute(sql`
        SELECT
          COUNT(*) AS "enrolledCount",
          COUNT(*) FILTER (WHERE status = 'completed') AS "completedCount",
          ROUND(
            100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0),
            1
          ) AS "completionRate",
          ROUND(AVG(score) FILTER (WHERE score IS NOT NULL), 1) AS "avgScore"
        FROM "lmsEnrollments"
        WHERE "courseId" = ${id} AND "tenantId" = ${tenantId}
      `),
    ]);

    if ((courseRows as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);

    return c.json({
      ...(courseRows as Record<string, unknown>[])[0],
      stats: (statsRows as unknown[])[0],
    });
  } catch (err) {
    return handleRouteError(c, err, 'GET /lms/courses/:id');
  }
});

// PUT /lms/courses/:id
lmsRouter.put('/courses/:id', zValidator('json', CourseUpdateSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();
    const body = c.req.valid('json');

    const existing = await sharedDb.execute(sql`
      SELECT id FROM "lmsCourses" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    if ((existing as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);

    const parts: ReturnType<typeof sql>[] = [sql`"updatedAt" = now()`];

    if (body.title !== undefined) parts.push(sql`title = ${body.title}`);
    if (body.description !== undefined) parts.push(sql`description = ${body.description}`);
    if (body.category !== undefined) parts.push(sql`category = ${body.category}`);
    if (body.level !== undefined) parts.push(sql`level = ${body.level}`);
    if (body.durationMinutes !== undefined) parts.push(sql`"durationMinutes" = ${body.durationMinutes}`);
    if (body.content !== undefined) parts.push(sql`content = ${JSON.stringify(body.content)}::jsonb`);
    if (body.passingScore !== undefined) parts.push(sql`"passingScore" = ${body.passingScore}`);
    if (body.isMandatory !== undefined) parts.push(sql`"isMandatory" = ${body.isMandatory}`);
    if (body.authorId !== undefined) parts.push(sql`"authorId" = ${body.authorId}`);

    const setClauses = parts.reduce((acc, p) => sql`${acc}, ${p}`);

    const rows = await sharedDb.execute(sql`
      UPDATE "lmsCourses"
      SET ${setClauses}
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING *
    `);

    return c.json((rows as unknown[])[0]);
  } catch (err) {
    return handleRouteError(c, err, 'PUT /lms/courses/:id');
  }
});

// DELETE /lms/courses/:id
lmsRouter.delete('/courses/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();

    const enrollments = await sharedDb.execute(sql`
      SELECT id FROM "lmsEnrollments" WHERE "courseId" = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    if ((enrollments as unknown[]).length > 0) {
      return c.json({ error: 'Cannot delete a course with enrollments' }, 409);
    }

    await sharedDb.execute(sql`
      DELETE FROM "lmsCourses" WHERE id = ${id} AND "tenantId" = ${tenantId}
    `);

    return c.json({ success: true });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /lms/courses/:id');
  }
});

// PUT /lms/courses/:id/publish
lmsRouter.put('/courses/:id/publish', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();

    const rows = await sharedDb.execute(sql`
      UPDATE "lmsCourses"
      SET status = 'published', "publishedAt" = now(), "updatedAt" = now()
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING *
    `);

    if ((rows as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);
    return c.json((rows as unknown[])[0]);
  } catch (err) {
    return handleRouteError(c, err, 'PUT /lms/courses/:id/publish');
  }
});

// ── Enrollments ───────────────────────────────────────────────

const enrollmentsQuerySchema = z.object({
  courseId: z.string().optional(),
  userId: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// GET /lms/enrollments
lmsRouter.get('/enrollments', zValidator('query', enrollmentsQuerySchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { courseId, userId, status } = c.req.valid('query');

    const rows = await sharedDb.execute(sql`
      SELECT e.*, c.title AS "courseTitle", c."passingScore"
      FROM "lmsEnrollments" e
      JOIN "lmsCourses" c ON c.id = e."courseId"
      WHERE e."tenantId" = ${tenantId}
        AND (${courseId ? sql`e."courseId" = ${courseId}` : sql`TRUE`})
        AND (${userId ? sql`e."userId" = ${userId}` : sql`TRUE`})
        AND (${status ? sql`e.status = ${status}` : sql`TRUE`})
      ORDER BY e."enrolledAt" DESC
    `);

    return c.json(rows);
  } catch (err) {
    return handleRouteError(c, err, 'GET /lms/enrollments');
  }
});

// POST /lms/enrollments
lmsRouter.post(
  '/enrollments',
  zValidator('json', z.object({ courseId: z.string(), userId: z.string(), dueDate: z.string().optional() })),
  async (c) => {
    try {
      const { tenantId } = c.get('tenantCtx');
      const { courseId, userId, dueDate } = c.req.valid('json');

      // Check if course exists
      const course = await sharedDb.execute(sql`
        SELECT id FROM "lmsCourses" WHERE id = ${courseId} AND "tenantId" = ${tenantId} LIMIT 1
      `);
      if ((course as unknown[]).length === 0) return c.json({ error: 'Course not found' }, 404);

      // Check unique — return existing if already enrolled
      const existing = await sharedDb.execute(sql`
        SELECT * FROM "lmsEnrollments"
        WHERE "tenantId" = ${tenantId} AND "courseId" = ${courseId} AND "userId" = ${userId}
        LIMIT 1
      `);
      if ((existing as unknown[]).length > 0) {
        return c.json((existing as unknown[])[0], 200);
      }

      const rows = await sharedDb.execute(sql`
        INSERT INTO "lmsEnrollments" ("tenantId", "courseId", "userId", "dueDate")
        VALUES (
          ${tenantId},
          ${courseId},
          ${userId},
          ${dueDate ?? null}
        )
        RETURNING *
      `);

      return c.json((rows as unknown[])[0], 201);
    } catch (err) {
      return handleRouteError(c, err, 'POST /lms/enrollments');
    }
  },
);

// GET /lms/enrollments/:id
lmsRouter.get('/enrollments/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();

    const rows = await sharedDb.execute(sql`
      SELECT e.*, c.title AS "courseTitle", c."passingScore"
      FROM "lmsEnrollments" e
      JOIN "lmsCourses" c ON c.id = e."courseId"
      WHERE e.id = ${id} AND e."tenantId" = ${tenantId}
      LIMIT 1
    `);

    if ((rows as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);
    return c.json((rows as unknown[])[0]);
  } catch (err) {
    return handleRouteError(c, err, 'GET /lms/enrollments/:id');
  }
});

// PUT /lms/enrollments/:id/progress
lmsRouter.put(
  '/enrollments/:id/progress',
  zValidator('json', z.object({ progress: z.number().int().min(0).max(100), score: z.number().int().optional() })),
  async (c) => {
    try {
      const { tenantId } = c.get('tenantCtx');
      const { id } = c.req.param();
      const { progress, score } = c.req.valid('json');

      // Fetch enrollment + course passingScore
      const existing = await sharedDb.execute(sql`
        SELECT e.*, c."passingScore", c.title AS "courseTitle"
        FROM "lmsEnrollments" e
        JOIN "lmsCourses" c ON c.id = e."courseId"
        WHERE e.id = ${id} AND e."tenantId" = ${tenantId}
        LIMIT 1
      `);
      if ((existing as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);

      const enrollment = (existing as Record<string, unknown>[])[0];
      const passingScore = enrollment['passingScore'] as number;
      const courseId = enrollment['courseId'] as string;
      const userId = enrollment['userId'] as string;
      const courseTitle = enrollment['courseTitle'] as string;

      let newStatus = enrollment['status'] as string;
      let completedAt: string | null = null;

      if (progress === 100) {
        if (score !== undefined) {
          newStatus = score >= passingScore ? 'completed' : 'failed';
        } else {
          newStatus = 'completed';
        }
        if (newStatus === 'completed') {
          completedAt = new Date().toISOString();
        }
      } else if (progress > 0 && newStatus === 'enrolled') {
        newStatus = 'in-progress';
      }

      const parts: ReturnType<typeof sql>[] = [
        sql`progress = ${progress}`,
        sql`status = ${newStatus}`,
        sql`"lastActivityAt" = now()`,
      ];
      if (score !== undefined) parts.push(sql`score = ${score}`);
      if (completedAt) parts.push(sql`"completedAt" = ${completedAt}::timestamptz`);

      const setClauses = parts.reduce((acc, p) => sql`${acc}, ${p}`);

      const rows = await sharedDb.execute(sql`
        UPDATE "lmsEnrollments"
        SET ${setClauses}
        WHERE id = ${id} AND "tenantId" = ${tenantId}
        RETURNING *
      `);

      const updatedEnrollment = (rows as unknown[])[0];

      // Auto-issue certificate on completion with passing score
      if (newStatus === 'completed' && score !== undefined && score >= passingScore) {
        // Get next certificate number
        const countRows = await sharedDb.execute(sql`
          SELECT COUNT(*) AS count FROM "lmsCertifications" WHERE "tenantId" = ${tenantId}
        `);
        const certCount = Number((countRows as Record<string, unknown>[])[0]?.['count'] ?? 0) + 1;
        const year = new Date().getFullYear();
        const certNumber = `CERT-${year}-${String(certCount).padStart(4, '0')}`;

        await sharedDb.execute(sql`
          INSERT INTO "lmsCertifications" (
            "tenantId", "enrollmentId", "userId", "courseId", "courseTitle", "certificateNumber"
          )
          VALUES (
            ${tenantId},
            ${id},
            ${userId},
            ${courseId},
            ${courseTitle},
            ${certNumber}
          )
          ON CONFLICT DO NOTHING
        `);
      }

      return c.json(updatedEnrollment);
    } catch (err) {
      return handleRouteError(c, err, 'PUT /lms/enrollments/:id/progress');
    }
  },
);

// ── Certifications ────────────────────────────────────────────

const certificationsQuerySchema = z.object({
  userId: z.string().optional(),
  courseId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// GET /lms/certifications
lmsRouter.get('/certifications', zValidator('query', certificationsQuerySchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { userId, courseId } = c.req.valid('query');

    const rows = await sharedDb.execute(sql`
      SELECT * FROM "lmsCertifications"
      WHERE "tenantId" = ${tenantId}
        AND (${userId ? sql`"userId" = ${userId}` : sql`TRUE`})
        AND (${courseId ? sql`"courseId" = ${courseId}` : sql`TRUE`})
      ORDER BY "issuedAt" DESC
    `);

    return c.json(rows);
  } catch (err) {
    return handleRouteError(c, err, 'GET /lms/certifications');
  }
});

// GET /lms/certifications/:id
lmsRouter.get('/certifications/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();

    const rows = await sharedDb.execute(sql`
      SELECT * FROM "lmsCertifications"
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      LIMIT 1
    `);

    if ((rows as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);
    return c.json((rows as unknown[])[0]);
  } catch (err) {
    return handleRouteError(c, err, 'GET /lms/certifications/:id');
  }
});
