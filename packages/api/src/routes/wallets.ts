import { Hono } from 'hono';
import { eq, or, and, desc, sql, ilike } from 'drizzle-orm';
import { type Database, transfers, walletStats } from '@usdc-eurc-analytics/db';
import { formatAmount } from '@usdc-eurc-analytics/shared';

export function walletsRouter(db: Database) {
  const router = new Hono();

  // GET /api/wallets/top - Get top wallets by volume
  router.get('/top', async (c) => {
    try {
      const token = c.req.query('token');
      const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);

      const results = await db
        .select({
          address: walletStats.address,
          token: walletStats.token,
          totalTransfers: walletStats.totalTransfers,
          totalVolume: walletStats.totalVolume,
          firstSeen: walletStats.firstSeen,
          lastSeen: walletStats.lastSeen,
        })
        .from(walletStats)
        .where(token ? eq(walletStats.token, token) : undefined)
        .orderBy(desc(sql`total_volume::numeric`))
        .limit(limit);

      return c.json({
        data: results.map((r) => ({
          ...r,
          totalVolumeFormatted: formatAmount(r.totalVolume, r.token as 'USDC' | 'EURC'),
        })),
      });
    } catch (error) {
      console.error('Error fetching top wallets:', error);
      return c.json({ error: 'Failed to fetch top wallets' }, 500);
    }
  });

  // GET /api/wallets/stats - Get global wallet statistics
  router.get('/stats', async (c) => {
    try {
      const token = c.req.query('token');

      const result = await db
        .select({
          totalWallets: sql<number>`count(DISTINCT address)::int`,
          avgTransfersPerWallet: sql<number>`avg(total_transfers)::int`,
          avgVolumePerWallet: sql<string>`COALESCE(avg(total_volume::numeric), 0)::text`,
        })
        .from(walletStats)
        .where(token ? eq(walletStats.token, token) : undefined);

      // Active wallets (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const activeResult = await db
        .select({
          activeWallets: sql<number>`count(DISTINCT address)::int`,
        })
        .from(walletStats)
        .where(
          and(
            sql`last_seen >= ${sevenDaysAgo}`,
            token ? eq(walletStats.token, token) : undefined
          )
        );

      return c.json({
        data: {
          totalWallets: result[0].totalWallets,
          avgTransfersPerWallet: result[0].avgTransfersPerWallet || 0,
          avgVolumePerWallet: result[0].avgVolumePerWallet,
          activeWalletsLast7Days: activeResult[0].activeWallets,
        },
      });
    } catch (error) {
      console.error('Error fetching wallet stats:', error);
      return c.json({ error: 'Failed to fetch wallet stats' }, 500);
    }
  });

  // GET /api/wallets/:address - Get wallet details
  router.get('/:address', async (c) => {
    try {
      const address = c.req.param('address').toLowerCase();

      // Get wallet stats
      const stats = await db
        .select()
        .from(walletStats)
        .where(ilike(walletStats.address, address));

      // Get recent transfers
      const recentTransfers = await db
        .select()
        .from(transfers)
        .where(
          or(
            ilike(transfers.sourceAddress, address),
            ilike(transfers.destAddress, address)
          )
        )
        .orderBy(desc(transfers.burnTimestamp))
        .limit(20);

      // Get transfer breakdown by chain
      const outboundByChain = await db
        .select({
          chain: transfers.sourceChain,
          count: sql<number>`count(*)::int`,
          volume: sql<string>`COALESCE(sum(amount::numeric), 0)::text`,
        })
        .from(transfers)
        .where(ilike(transfers.sourceAddress, address))
        .groupBy(transfers.sourceChain);

      const inboundByChain = await db
        .select({
          chain: transfers.destChain,
          count: sql<number>`count(*)::int`,
          volume: sql<string>`COALESCE(sum(amount::numeric), 0)::text`,
        })
        .from(transfers)
        .where(ilike(transfers.destAddress, address))
        .groupBy(transfers.destChain);

      // Summary stats
      const summaryResult = await db
        .select({
          totalOutbound: sql<number>`count(*) FILTER (WHERE LOWER(source_address) = ${address})::int`,
          totalInbound: sql<number>`count(*) FILTER (WHERE LOWER(dest_address) = ${address})::int`,
          outboundVolume: sql<string>`COALESCE(sum(amount::numeric) FILTER (WHERE LOWER(source_address) = ${address}), 0)::text`,
          inboundVolume: sql<string>`COALESCE(sum(amount::numeric) FILTER (WHERE LOWER(dest_address) = ${address}), 0)::text`,
        })
        .from(transfers)
        .where(
          or(
            ilike(transfers.sourceAddress, address),
            ilike(transfers.destAddress, address)
          )
        );

      return c.json({
        data: {
          address,
          stats: stats.length > 0 ? stats : null,
          summary: {
            totalOutboundTransfers: summaryResult[0].totalOutbound,
            totalInboundTransfers: summaryResult[0].totalInbound,
            outboundVolume: summaryResult[0].outboundVolume,
            outboundVolumeFormatted: formatAmount(summaryResult[0].outboundVolume, 'USDC'),
            inboundVolume: summaryResult[0].inboundVolume,
            inboundVolumeFormatted: formatAmount(summaryResult[0].inboundVolume, 'USDC'),
          },
          breakdown: {
            outboundByChain,
            inboundByChain,
          },
          recentTransfers,
        },
      });
    } catch (error) {
      console.error('Error fetching wallet:', error);
      return c.json({ error: 'Failed to fetch wallet' }, 500);
    }
  });

  // GET /api/wallets/:address/transfers - Get wallet transfers with pagination
  router.get('/:address/transfers', async (c) => {
    try {
      const address = c.req.param('address').toLowerCase();
      const page = parseInt(c.req.query('page') || '1', 10);
      const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
      const offset = (page - 1) * limit;

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(transfers)
        .where(
          or(
            ilike(transfers.sourceAddress, address),
            ilike(transfers.destAddress, address)
          )
        );

      const total = countResult[0]?.count || 0;

      // Get paginated transfers
      const results = await db
        .select()
        .from(transfers)
        .where(
          or(
            ilike(transfers.sourceAddress, address),
            ilike(transfers.destAddress, address)
          )
        )
        .orderBy(desc(transfers.burnTimestamp))
        .limit(limit)
        .offset(offset);

      return c.json({
        data: results,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching wallet transfers:', error);
      return c.json({ error: 'Failed to fetch wallet transfers' }, 500);
    }
  });

  return router;
}
