import { Hono } from 'hono';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { type Database, transfers, dailyStats, routeStats, walletStats } from '@usdc-eurc-analytics/db';
import { StatsQuerySchema, formatAmount } from '@usdc-eurc-analytics/shared';

export function statsRouter(db: Database) {
  const router = new Hono();

  // GET /api/stats/overview - Get overall statistics
  router.get('/overview', async (c) => {
    try {
      const token = c.req.query('token');

      const conditions = token ? [eq(transfers.token, token)] : [];

      // Total stats
      const totalResult = await db
        .select({
          totalTransfers: sql<number>`count(*)::int`,
          totalVolume: sql<string>`COALESCE(sum(amount::numeric), 0)::text`,
          uniqueWallets: sql<number>`count(DISTINCT source_address)::int`,
          completedTransfers: sql<number>`count(*) FILTER (WHERE status = 'completed')::int`,
          pendingTransfers: sql<number>`count(*) FILTER (WHERE status = 'pending')::int`,
        })
        .from(transfers)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const stats = totalResult[0];

      // Calculate average transfer size
      const avgAmount =
        stats.totalTransfers > 0
          ? (BigInt(stats.totalVolume) / BigInt(stats.totalTransfers)).toString()
          : '0';

      // Get 24h stats
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const last24hResult = await db
        .select({
          transfers24h: sql<number>`count(*)::int`,
          volume24h: sql<string>`COALESCE(sum(amount::numeric), 0)::text`,
        })
        .from(transfers)
        .where(
          and(
            gte(transfers.burnTimestamp, oneDayAgo),
            ...(conditions.length > 0 ? conditions : [])
          )
        );

      return c.json({
        data: {
          totalTransfers: stats.totalTransfers,
          totalVolume: stats.totalVolume,
          totalVolumeFormatted: formatAmount(stats.totalVolume, 'USDC'),
          uniqueWallets: stats.uniqueWallets,
          avgTransferSize: avgAmount,
          avgTransferSizeFormatted: formatAmount(avgAmount, 'USDC'),
          completedTransfers: stats.completedTransfers,
          pendingTransfers: stats.pendingTransfers,
          successRate:
            stats.totalTransfers > 0
              ? ((stats.completedTransfers / stats.totalTransfers) * 100).toFixed(2)
              : '0',
          last24h: {
            transfers: last24hResult[0].transfers24h,
            volume: last24hResult[0].volume24h,
            volumeFormatted: formatAmount(last24hResult[0].volume24h, 'USDC'),
          },
        },
      });
    } catch (error) {
      console.error('Error fetching overview stats:', error);
      return c.json({ error: 'Failed to fetch overview stats' }, 500);
    }
  });

  // GET /api/stats/volume/daily - Get daily volume stats
  router.get('/volume/daily', async (c) => {
    try {
      const query = StatsQuerySchema.parse(c.req.query());
      const conditions = [];

      if (query.token) {
        conditions.push(eq(dailyStats.token, query.token));
      }
      if (query.chain) {
        conditions.push(eq(dailyStats.chain, query.chain));
      }
      if (query.fromDate) {
        conditions.push(gte(dailyStats.date, query.fromDate.toISOString().split('T')[0]));
      }
      if (query.toDate) {
        conditions.push(lte(dailyStats.date, query.toDate.toISOString().split('T')[0]));
      }

      const results = await db
        .select()
        .from(dailyStats)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(dailyStats.date))
        .limit(90); // Last 90 days max

      return c.json({ data: results });
    } catch (error) {
      console.error('Error fetching daily volume:', error);
      return c.json({ error: 'Failed to fetch daily volume' }, 500);
    }
  });

  // GET /api/stats/volume/by-chain - Get volume grouped by chain
  router.get('/volume/by-chain', async (c) => {
    try {
      const token = c.req.query('token');

      const results = await db
        .select({
          chain: transfers.sourceChain,
          outboundTransfers: sql<number>`count(*)::int`,
          outboundVolume: sql<string>`COALESCE(sum(amount::numeric), 0)::text`,
        })
        .from(transfers)
        .where(token ? eq(transfers.token, token) : undefined)
        .groupBy(transfers.sourceChain);

      // Also get inbound
      const inboundResults = await db
        .select({
          chain: transfers.destChain,
          inboundTransfers: sql<number>`count(*) FILTER (WHERE status = 'completed')::int`,
          inboundVolume: sql<string>`COALESCE(sum(amount::numeric) FILTER (WHERE status = 'completed'), 0)::text`,
        })
        .from(transfers)
        .where(token ? eq(transfers.token, token) : undefined)
        .groupBy(transfers.destChain);

      // Merge results
      const chainMap = new Map<string, any>();

      for (const r of results) {
        chainMap.set(r.chain, {
          chain: r.chain,
          outboundTransfers: r.outboundTransfers,
          outboundVolume: r.outboundVolume,
          inboundTransfers: 0,
          inboundVolume: '0',
        });
      }

      for (const r of inboundResults) {
        const existing = chainMap.get(r.chain);
        if (existing) {
          existing.inboundTransfers = r.inboundTransfers;
          existing.inboundVolume = r.inboundVolume;
        } else {
          chainMap.set(r.chain, {
            chain: r.chain,
            outboundTransfers: 0,
            outboundVolume: '0',
            inboundTransfers: r.inboundTransfers,
            inboundVolume: r.inboundVolume,
          });
        }
      }

      return c.json({ data: Array.from(chainMap.values()) });
    } catch (error) {
      console.error('Error fetching volume by chain:', error);
      return c.json({ error: 'Failed to fetch volume by chain' }, 500);
    }
  });

  // GET /api/stats/routes - Get popular routes
  router.get('/routes', async (c) => {
    try {
      const token = c.req.query('token');
      const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);

      const results = await db
        .select({
          sourceChain: transfers.sourceChain,
          destChain: transfers.destChain,
          transferCount: sql<number>`count(*)::int`,
          totalVolume: sql<string>`COALESCE(sum(amount::numeric), 0)::text`,
          avgAmount: sql<string>`COALESCE(avg(amount::numeric), 0)::text`,
        })
        .from(transfers)
        .where(token ? eq(transfers.token, token) : undefined)
        .groupBy(transfers.sourceChain, transfers.destChain)
        .orderBy(desc(sql`count(*)`))
        .limit(limit);

      return c.json({ data: results });
    } catch (error) {
      console.error('Error fetching routes:', error);
      return c.json({ error: 'Failed to fetch routes' }, 500);
    }
  });

  // GET /api/stats/routes/heatmap - Get route heatmap data
  router.get('/routes/heatmap', async (c) => {
    try {
      const token = c.req.query('token');

      const results = await db
        .select({
          sourceChain: transfers.sourceChain,
          destChain: transfers.destChain,
          volume: sql<string>`COALESCE(sum(amount::numeric), 0)::text`,
          count: sql<number>`count(*)::int`,
        })
        .from(transfers)
        .where(token ? eq(transfers.token, token) : undefined)
        .groupBy(transfers.sourceChain, transfers.destChain);

      return c.json({ data: results });
    } catch (error) {
      console.error('Error fetching heatmap:', error);
      return c.json({ error: 'Failed to fetch heatmap' }, 500);
    }
  });

  // GET /api/stats/performance - Get bridge performance metrics
  router.get('/performance', async (c) => {
    try {
      const token = c.req.query('token');

      // Get completed transfers with timing
      const timingResult = await db
        .select({
          avgBridgeTime: sql<number>`COALESCE(
            avg(EXTRACT(EPOCH FROM (mint_timestamp - burn_timestamp)))::int,
            0
          )`,
          minBridgeTime: sql<number>`COALESCE(
            min(EXTRACT(EPOCH FROM (mint_timestamp - burn_timestamp)))::int,
            0
          )`,
          maxBridgeTime: sql<number>`COALESCE(
            max(EXTRACT(EPOCH FROM (mint_timestamp - burn_timestamp)))::int,
            0
          )`,
          completedCount: sql<number>`count(*)::int`,
        })
        .from(transfers)
        .where(
          and(
            eq(transfers.status, 'completed'),
            token ? eq(transfers.token, token) : undefined
          )
        );

      // Get status counts
      const statusResult = await db
        .select({
          status: transfers.status,
          count: sql<number>`count(*)::int`,
        })
        .from(transfers)
        .where(token ? eq(transfers.token, token) : undefined)
        .groupBy(transfers.status);

      const statusMap = Object.fromEntries(
        statusResult.map((r) => [r.status, r.count])
      );

      const total =
        (statusMap['completed'] || 0) +
        (statusMap['pending'] || 0) +
        (statusMap['failed'] || 0);

      return c.json({
        data: {
          avgBridgeTimeSeconds: timingResult[0].avgBridgeTime,
          minBridgeTimeSeconds: timingResult[0].minBridgeTime,
          maxBridgeTimeSeconds: timingResult[0].maxBridgeTime,
          totalCompleted: statusMap['completed'] || 0,
          totalPending: statusMap['pending'] || 0,
          totalFailed: statusMap['failed'] || 0,
          successRate:
            total > 0
              ? (((statusMap['completed'] || 0) / total) * 100).toFixed(2)
              : '0',
        },
      });
    } catch (error) {
      console.error('Error fetching performance stats:', error);
      return c.json({ error: 'Failed to fetch performance stats' }, 500);
    }
  });

  return router;
}
