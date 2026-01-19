import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { type Database, chains, transfers } from '@usdc-eurc-analytics/db';
import { TESTNET_CHAINS, MAINNET_CHAINS } from '@usdc-eurc-analytics/shared';

export function chainsRouter(db: Database) {
  const router = new Hono();

  // GET /api/chains - Get all supported chains
  router.get('/', async (c) => {
    try {
      const isTestnet = c.req.query('testnet') !== 'false';
      const chainConfigs = isTestnet ? TESTNET_CHAINS : MAINNET_CHAINS;

      // Get transfer counts per chain
      const outboundCounts = await db
        .select({
          chain: transfers.sourceChain,
          count: sql<number>`count(*)::int`,
        })
        .from(transfers)
        .groupBy(transfers.sourceChain);

      const inboundCounts = await db
        .select({
          chain: transfers.destChain,
          count: sql<number>`count(*) FILTER (WHERE status = 'completed')::int`,
        })
        .from(transfers)
        .groupBy(transfers.destChain);

      const outboundMap = Object.fromEntries(
        outboundCounts.map((r) => [r.chain, r.count])
      );
      const inboundMap = Object.fromEntries(
        inboundCounts.map((r) => [r.chain, r.count])
      );

      // Combine with chain configs
      const chainsWithStats = Object.values(chainConfigs).map((chain) => ({
        ...chain,
        stats: {
          outboundTransfers: outboundMap[chain.id] || 0,
          inboundTransfers: inboundMap[chain.id] || 0,
          totalTransfers:
            (outboundMap[chain.id] || 0) + (inboundMap[chain.id] || 0),
        },
      }));

      return c.json({ data: chainsWithStats });
    } catch (error) {
      console.error('Error fetching chains:', error);
      return c.json({ error: 'Failed to fetch chains' }, 500);
    }
  });

  // GET /api/chains/:id - Get single chain details
  router.get('/:id', async (c) => {
    try {
      const chainId = c.req.param('id');
      const isTestnet = c.req.query('testnet') !== 'false';
      const chainConfigs = isTestnet ? TESTNET_CHAINS : MAINNET_CHAINS;

      const chainConfig = chainConfigs[chainId];
      if (!chainConfig) {
        return c.json({ error: 'Chain not found' }, 404);
      }

      // Get detailed stats for this chain
      const outboundStats = await db
        .select({
          totalTransfers: sql<number>`count(*)::int`,
          totalVolume: sql<string>`COALESCE(sum(amount::numeric), 0)::text`,
          uniqueSenders: sql<number>`count(DISTINCT source_address)::int`,
        })
        .from(transfers)
        .where(eq(transfers.sourceChain, chainId));

      const inboundStats = await db
        .select({
          totalTransfers: sql<number>`count(*) FILTER (WHERE status = 'completed')::int`,
          totalVolume: sql<string>`COALESCE(sum(amount::numeric) FILTER (WHERE status = 'completed'), 0)::text`,
          uniqueReceivers: sql<number>`count(DISTINCT dest_address) FILTER (WHERE status = 'completed')::int`,
        })
        .from(transfers)
        .where(eq(transfers.destChain, chainId));

      // Get top routes from this chain
      const topOutboundRoutes = await db
        .select({
          destChain: transfers.destChain,
          count: sql<number>`count(*)::int`,
          volume: sql<string>`COALESCE(sum(amount::numeric), 0)::text`,
        })
        .from(transfers)
        .where(eq(transfers.sourceChain, chainId))
        .groupBy(transfers.destChain)
        .orderBy(sql`count(*) DESC`)
        .limit(5);

      const topInboundRoutes = await db
        .select({
          sourceChain: transfers.sourceChain,
          count: sql<number>`count(*)::int`,
          volume: sql<string>`COALESCE(sum(amount::numeric), 0)::text`,
        })
        .from(transfers)
        .where(eq(transfers.destChain, chainId))
        .groupBy(transfers.sourceChain)
        .orderBy(sql`count(*) DESC`)
        .limit(5);

      return c.json({
        data: {
          ...chainConfig,
          stats: {
            outbound: {
              totalTransfers: outboundStats[0].totalTransfers,
              totalVolume: outboundStats[0].totalVolume,
              uniqueSenders: outboundStats[0].uniqueSenders,
            },
            inbound: {
              totalTransfers: inboundStats[0].totalTransfers,
              totalVolume: inboundStats[0].totalVolume,
              uniqueReceivers: inboundStats[0].uniqueReceivers,
            },
            topOutboundRoutes,
            topInboundRoutes,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching chain:', error);
      return c.json({ error: 'Failed to fetch chain' }, 500);
    }
  });

  return router;
}
