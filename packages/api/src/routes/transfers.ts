import { Hono } from 'hono';
import { eq, and, or, gte, lte, desc, asc, sql, ilike } from 'drizzle-orm';
import { type Database, transfers } from '@usdc-eurc-analytics/db';
import { TransferQuerySchema } from '@usdc-eurc-analytics/shared';

export function transfersRouter(db: Database) {
  const router = new Hono();

  // GET /api/transfers - List transfers with filters
  router.get('/', async (c) => {
    try {
      const query = TransferQuerySchema.parse(c.req.query());

      // Build where conditions
      const conditions = [];

      if (query.token) {
        conditions.push(eq(transfers.token, query.token));
      }
      if (query.sourceChain) {
        conditions.push(eq(transfers.sourceChain, query.sourceChain));
      }
      if (query.destChain) {
        conditions.push(eq(transfers.destChain, query.destChain));
      }
      if (query.status) {
        conditions.push(eq(transfers.status, query.status));
      }
      if (query.address) {
        const addressLower = query.address.toLowerCase();
        conditions.push(
          or(
            ilike(transfers.sourceAddress, addressLower),
            ilike(transfers.destAddress, addressLower)
          )!
        );
      }
      if (query.fromDate) {
        conditions.push(gte(transfers.burnTimestamp, query.fromDate));
      }
      if (query.toDate) {
        conditions.push(lte(transfers.burnTimestamp, query.toDate));
      }

      // Build order by
      const orderColumn =
        query.sortBy === 'amount'
          ? transfers.amount
          : query.sortBy === 'status'
          ? transfers.status
          : transfers.burnTimestamp;

      const orderDir = query.sortOrder === 'asc' ? asc : desc;

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(transfers)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = countResult[0]?.count || 0;

      // Get paginated results
      const offset = (query.page - 1) * query.limit;
      const results = await db
        .select()
        .from(transfers)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(orderDir(orderColumn))
        .limit(query.limit)
        .offset(offset);

      return c.json({
        data: results,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      });
    } catch (error) {
      console.error('Error fetching transfers:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return c.json({ error: 'Invalid query parameters', details: error }, 400);
      }
      return c.json({ error: 'Failed to fetch transfers' }, 500);
    }
  });

  // GET /api/transfers/recent - Get recent transfers
  // NOTE: This must be defined BEFORE /:id to avoid "recent" being treated as an ID
  router.get('/recent', async (c) => {
    try {
      const limit = Math.min(parseInt(c.req.query('limit') || '10', 10), 50);

      const results = await db
        .select()
        .from(transfers)
        .orderBy(desc(transfers.burnTimestamp))
        .limit(limit);

      return c.json({ data: results });
    } catch (error) {
      console.error('Error fetching recent transfers:', error);
      return c.json({ error: 'Failed to fetch recent transfers' }, 500);
    }
  });

  // GET /api/transfers/tx/:txHash - Get transfer by transaction hash
  // NOTE: This must be defined BEFORE /:id to avoid "tx" being treated as an ID
  router.get('/tx/:txHash', async (c) => {
    try {
      const txHash = c.req.param('txHash');

      const result = await db
        .select()
        .from(transfers)
        .where(
          or(
            eq(transfers.sourceTxHash, txHash),
            eq(transfers.destTxHash, txHash)
          )
        )
        .limit(1);

      if (result.length === 0) {
        return c.json({ error: 'Transfer not found' }, 404);
      }

      return c.json({ data: result[0] });
    } catch (error) {
      console.error('Error fetching transfer by tx hash:', error);
      return c.json({ error: 'Failed to fetch transfer' }, 500);
    }
  });

  // GET /api/transfers/:id - Get single transfer by UUID
  // NOTE: This must be defined AFTER specific routes like /recent and /tx/:txHash
  router.get('/:id', async (c) => {
    try {
      const id = c.req.param('id');

      const result = await db
        .select()
        .from(transfers)
        .where(eq(transfers.id, id))
        .limit(1);

      if (result.length === 0) {
        return c.json({ error: 'Transfer not found' }, 404);
      }

      return c.json({ data: result[0] });
    } catch (error) {
      console.error('Error fetching transfer:', error);
      return c.json({ error: 'Failed to fetch transfer' }, 500);
    }
  });

  return router;
}
