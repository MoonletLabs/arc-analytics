import { Hono } from 'hono';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { type Database, transfers, dailyStats, routeStats, walletStats, hourlyStats, arcNativeTransfers } from '@usdc-eurc-analytics/db';
import { StatsQuerySchema, formatAmount, TOKEN_DECIMALS } from '@usdc-eurc-analytics/shared';

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

  // ============================================
  // Volume & Activity Endpoints
  // ============================================

  // GET /api/stats/volume/hourly - Get hourly volume stats
  router.get('/volume/hourly', async (c) => {
    try {
      const token = c.req.query('token');
      const hours = Math.min(parseInt(c.req.query('hours') || '168', 10), 720); // Default 7 days, max 30 days
      const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);

      // Query hourly stats from the pre-aggregated table
      const results = await db
        .select()
        .from(hourlyStats)
        .where(
          and(
            gte(hourlyStats.hour, hoursAgo),
            token ? eq(hourlyStats.token, token) : undefined
          )
        )
        .orderBy(desc(hourlyStats.hour));

      // If no pre-aggregated data, compute from raw transfers
      if (results.length === 0) {
        const rawResults = await db.execute(sql`
          SELECT 
            date_trunc('hour', timestamp) as hour,
            token,
            COUNT(*) as transfer_count,
            COALESCE(SUM(amount::numeric), 0) as total_volume,
            COUNT(DISTINCT from_address) as unique_senders,
            COUNT(DISTINCT to_address) as unique_receivers,
            COALESCE(MIN(amount::numeric), 0) as min_amount,
            COALESCE(MAX(amount::numeric), 0) as max_amount
          FROM arc_native_transfers
          WHERE timestamp >= ${hoursAgo.toISOString()}::timestamp
          ${token ? sql`AND token = ${token}` : sql``}
          GROUP BY date_trunc('hour', timestamp), token
          ORDER BY hour DESC
        `);

        return c.json({ 
          data: rawResults as any[],
          source: 'computed'
        });
      }

      return c.json({ 
        data: results,
        source: 'aggregated'
      });
    } catch (error) {
      console.error('Error fetching hourly volume:', error);
      return c.json({ error: 'Failed to fetch hourly volume' }, 500);
    }
  });

  // GET /api/stats/transfers/metrics - Get transfer metrics (count, median, p90)
  router.get('/transfers/metrics', async (c) => {
    try {
      const token = c.req.query('token');
      const days = Math.min(parseInt(c.req.query('days') || '7', 10), 90);
      const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get transfer metrics from native transfers
      // Note: We use FLOOR for percentile/avg values since formatAmount expects integers (raw token amounts)
      const metricsResult = await db.execute(sql`
        SELECT 
          token,
          COUNT(*) as transfer_count,
          COALESCE(SUM(amount::numeric), 0)::text as total_volume,
          COALESCE(FLOOR(AVG(amount::numeric)), 0)::text as avg_amount,
          COALESCE(MIN(amount::numeric), 0)::text as min_amount,
          COALESCE(MAX(amount::numeric), 0)::text as max_amount,
          COALESCE(FLOOR(percentile_cont(0.5) WITHIN GROUP (ORDER BY amount::numeric)), 0)::text as median_amount,
          COALESCE(FLOOR(percentile_cont(0.90) WITHIN GROUP (ORDER BY amount::numeric)), 0)::text as p90_amount,
          COALESCE(FLOOR(percentile_cont(0.10) WITHIN GROUP (ORDER BY amount::numeric)), 0)::text as p10_amount
        FROM arc_native_transfers
        WHERE timestamp >= ${daysAgo.toISOString()}::timestamp
        ${token ? sql`AND token = ${token}` : sql``}
        GROUP BY token
      `);

      // Get unique wallets
      const walletsResult = await db.execute(sql`
        SELECT 
          COUNT(DISTINCT from_address) as unique_senders,
          COUNT(DISTINCT to_address) as unique_receivers,
          COUNT(DISTINCT from_address) + COUNT(DISTINCT to_address) - 
            COUNT(DISTINCT CASE WHEN from_address = to_address THEN from_address END) as total_unique_wallets
        FROM arc_native_transfers
        WHERE timestamp >= ${daysAgo.toISOString()}::timestamp
        ${token ? sql`AND token = ${token}` : sql``}
      `);

      const metrics = metricsResult as any[];
      const wallets = (walletsResult as any[])[0] || { unique_senders: 0, unique_receivers: 0, total_unique_wallets: 0 };

      // Format amounts
      const formatted = metrics.map(m => ({
        token: m.token,
        transferCount: parseInt(m.transfer_count),
        totalVolume: m.total_volume,
        totalVolumeFormatted: formatAmount(m.total_volume, m.token as 'USDC' | 'EURC'),
        avgAmount: m.avg_amount,
        avgAmountFormatted: formatAmount(m.avg_amount, m.token as 'USDC' | 'EURC'),
        medianAmount: m.median_amount,
        medianAmountFormatted: formatAmount(m.median_amount, m.token as 'USDC' | 'EURC'),
        p90Amount: m.p90_amount,
        p90AmountFormatted: formatAmount(m.p90_amount, m.token as 'USDC' | 'EURC'),
        p10Amount: m.p10_amount,
        p10AmountFormatted: formatAmount(m.p10_amount, m.token as 'USDC' | 'EURC'),
        minAmount: m.min_amount,
        maxAmount: m.max_amount,
      }));

      return c.json({
        data: {
          byToken: formatted,
          wallets: {
            uniqueSenders: parseInt(wallets.unique_senders || '0'),
            uniqueReceivers: parseInt(wallets.unique_receivers || '0'),
            totalUniqueWallets: parseInt(wallets.total_unique_wallets || '0'),
          },
          period: { days, since: daysAgo.toISOString() },
        },
      });
    } catch (error) {
      console.error('Error fetching transfer metrics:', error);
      return c.json({ error: 'Failed to fetch transfer metrics' }, 500);
    }
  });

  // GET /api/stats/wallets/daily - Get daily unique wallets
  router.get('/wallets/daily', async (c) => {
    try {
      const token = c.req.query('token');
      const days = Math.min(parseInt(c.req.query('days') || '30', 10), 90);
      const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const results = await db.execute(sql`
        SELECT 
          DATE(timestamp) as date,
          token,
          COUNT(DISTINCT from_address) as unique_senders,
          COUNT(DISTINCT to_address) as unique_receivers,
          COUNT(*) as transfer_count
        FROM arc_native_transfers
        WHERE timestamp >= ${daysAgo.toISOString()}::timestamp
        ${token ? sql`AND token = ${token}` : sql``}
        GROUP BY DATE(timestamp), token
        ORDER BY date DESC
      `);

      return c.json({ data: results as any[] });
    } catch (error) {
      console.error('Error fetching daily wallets:', error);
      return c.json({ error: 'Failed to fetch daily wallets' }, 500);
    }
  });

  // ============================================
  // Net Flows Endpoints
  // ============================================

  // GET /api/stats/flows/net - Get net flow per address
  router.get('/flows/net', async (c) => {
    try {
      const token = c.req.query('token');
      const days = Math.min(parseInt(c.req.query('days') || '7', 10), 90);
      const limit = Math.min(parseInt(c.req.query('limit') || '100', 10), 500);
      const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const results = await db.execute(sql`
        WITH inflows AS (
          SELECT 
            to_address as address,
            token,
            SUM(amount::numeric) as inflow,
            COUNT(*) as inflow_count
          FROM arc_native_transfers
          WHERE timestamp >= ${daysAgo.toISOString()}::timestamp
          ${token ? sql`AND token = ${token}` : sql``}
          GROUP BY to_address, token
        ),
        outflows AS (
          SELECT 
            from_address as address,
            token,
            SUM(amount::numeric) as outflow,
            COUNT(*) as outflow_count
          FROM arc_native_transfers
          WHERE timestamp >= ${daysAgo.toISOString()}::timestamp
          ${token ? sql`AND token = ${token}` : sql``}
          GROUP BY from_address, token
        )
        SELECT 
          COALESCE(i.address, o.address) as address,
          COALESCE(i.token, o.token) as token,
          COALESCE(i.inflow, 0) as inflow,
          COALESCE(o.outflow, 0) as outflow,
          COALESCE(i.inflow, 0) - COALESCE(o.outflow, 0) as net_flow,
          COALESCE(i.inflow_count, 0) as inflow_count,
          COALESCE(o.outflow_count, 0) as outflow_count
        FROM inflows i
        FULL OUTER JOIN outflows o ON i.address = o.address AND i.token = o.token
        ORDER BY ABS(COALESCE(i.inflow, 0) - COALESCE(o.outflow, 0)) DESC
        LIMIT ${limit}
      `);

      const formatted = (results as any[]).map(r => ({
        address: r.address,
        token: r.token,
        inflow: r.inflow,
        inflowFormatted: formatAmount(r.inflow, r.token as 'USDC' | 'EURC'),
        outflow: r.outflow,
        outflowFormatted: formatAmount(r.outflow, r.token as 'USDC' | 'EURC'),
        netFlow: r.net_flow,
        netFlowFormatted: formatAmount(r.net_flow, r.token as 'USDC' | 'EURC'),
        inflowCount: parseInt(r.inflow_count),
        outflowCount: parseInt(r.outflow_count),
      }));

      return c.json({ 
        data: formatted,
        period: { days, since: daysAgo.toISOString() },
      });
    } catch (error) {
      console.error('Error fetching net flows:', error);
      return c.json({ error: 'Failed to fetch net flows' }, 500);
    }
  });

  // GET /api/stats/flows/top-sinks - Get top 20 net receivers
  router.get('/flows/top-sinks', async (c) => {
    try {
      const token = c.req.query('token');
      const days = Math.min(parseInt(c.req.query('days') || '7', 10), 90);
      const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
      const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const results = await db.execute(sql`
        WITH inflows AS (
          SELECT 
            to_address as address,
            token,
            SUM(amount::numeric) as inflow,
            COUNT(*) as inflow_count
          FROM arc_native_transfers
          WHERE timestamp >= ${daysAgo.toISOString()}::timestamp
          ${token ? sql`AND token = ${token}` : sql``}
          GROUP BY to_address, token
        ),
        outflows AS (
          SELECT 
            from_address as address,
            token,
            SUM(amount::numeric) as outflow,
            COUNT(*) as outflow_count
          FROM arc_native_transfers
          WHERE timestamp >= ${daysAgo.toISOString()}::timestamp
          ${token ? sql`AND token = ${token}` : sql``}
          GROUP BY from_address, token
        )
        SELECT 
          COALESCE(i.address, o.address) as address,
          COALESCE(i.token, o.token) as token,
          COALESCE(i.inflow, 0) as inflow,
          COALESCE(o.outflow, 0) as outflow,
          COALESCE(i.inflow, 0) - COALESCE(o.outflow, 0) as net_flow,
          COALESCE(i.inflow_count, 0) as inflow_count,
          COALESCE(o.outflow_count, 0) as outflow_count
        FROM inflows i
        FULL OUTER JOIN outflows o ON i.address = o.address AND i.token = o.token
        WHERE COALESCE(i.inflow, 0) > COALESCE(o.outflow, 0)
        ORDER BY (COALESCE(i.inflow, 0) - COALESCE(o.outflow, 0)) DESC
        LIMIT ${limit}
      `);

      const formatted = (results as any[]).map(r => ({
        address: r.address,
        token: r.token,
        inflow: r.inflow,
        inflowFormatted: formatAmount(r.inflow, r.token as 'USDC' | 'EURC'),
        outflow: r.outflow,
        outflowFormatted: formatAmount(r.outflow, r.token as 'USDC' | 'EURC'),
        netFlow: r.net_flow,
        netFlowFormatted: formatAmount(r.net_flow, r.token as 'USDC' | 'EURC'),
        inflowCount: parseInt(r.inflow_count),
        outflowCount: parseInt(r.outflow_count),
      }));

      return c.json({ 
        data: formatted,
        period: { days, since: daysAgo.toISOString() },
      });
    } catch (error) {
      console.error('Error fetching top sinks:', error);
      return c.json({ error: 'Failed to fetch top sinks' }, 500);
    }
  });

  // GET /api/stats/flows/top-sources - Get top 20 net senders
  router.get('/flows/top-sources', async (c) => {
    try {
      const token = c.req.query('token');
      const days = Math.min(parseInt(c.req.query('days') || '7', 10), 90);
      const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
      const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const results = await db.execute(sql`
        WITH inflows AS (
          SELECT 
            to_address as address,
            token,
            SUM(amount::numeric) as inflow,
            COUNT(*) as inflow_count
          FROM arc_native_transfers
          WHERE timestamp >= ${daysAgo.toISOString()}::timestamp
          ${token ? sql`AND token = ${token}` : sql``}
          GROUP BY to_address, token
        ),
        outflows AS (
          SELECT 
            from_address as address,
            token,
            SUM(amount::numeric) as outflow,
            COUNT(*) as outflow_count
          FROM arc_native_transfers
          WHERE timestamp >= ${daysAgo.toISOString()}::timestamp
          ${token ? sql`AND token = ${token}` : sql``}
          GROUP BY from_address, token
        )
        SELECT 
          COALESCE(i.address, o.address) as address,
          COALESCE(i.token, o.token) as token,
          COALESCE(i.inflow, 0) as inflow,
          COALESCE(o.outflow, 0) as outflow,
          COALESCE(i.inflow, 0) - COALESCE(o.outflow, 0) as net_flow,
          COALESCE(i.inflow_count, 0) as inflow_count,
          COALESCE(o.outflow_count, 0) as outflow_count
        FROM inflows i
        FULL OUTER JOIN outflows o ON i.address = o.address AND i.token = o.token
        WHERE COALESCE(o.outflow, 0) > COALESCE(i.inflow, 0)
        ORDER BY (COALESCE(o.outflow, 0) - COALESCE(i.inflow, 0)) DESC
        LIMIT ${limit}
      `);

      const formatted = (results as any[]).map(r => ({
        address: r.address,
        token: r.token,
        inflow: r.inflow,
        inflowFormatted: formatAmount(r.inflow, r.token as 'USDC' | 'EURC'),
        outflow: r.outflow,
        outflowFormatted: formatAmount(r.outflow, r.token as 'USDC' | 'EURC'),
        netFlow: r.net_flow,
        netFlowFormatted: formatAmount(r.net_flow, r.token as 'USDC' | 'EURC'),
        inflowCount: parseInt(r.inflow_count),
        outflowCount: parseInt(r.outflow_count),
      }));

      return c.json({ 
        data: formatted,
        period: { days, since: daysAgo.toISOString() },
      });
    } catch (error) {
      console.error('Error fetching top sources:', error);
      return c.json({ error: 'Failed to fetch top sources' }, 500);
    }
  });

  // ============================================
  // Velocity & Retention Endpoints
  // ============================================

  // GET /api/stats/velocity - Get velocity metrics (volume / circulating supply proxy)
  router.get('/velocity', async (c) => {
    try {
      const token = c.req.query('token');
      const days = Math.min(parseInt(c.req.query('days') || '7', 10), 90);
      const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get total volume for the period
      const volumeResult = await db.execute(sql`
        SELECT 
          token,
          SUM(amount::numeric) as total_volume,
          COUNT(*) as transfer_count
        FROM arc_native_transfers
        WHERE timestamp >= ${daysAgo.toISOString()}::timestamp
        ${token ? sql`AND token = ${token}` : sql``}
        GROUP BY token
      `);

      // Get approximate "active balances" - wallets that have had activity
      // We use the sum of absolute net flows as a proxy for "active supply"
      const activeBalancesResult = await db.execute(sql`
        WITH wallet_activity AS (
          SELECT 
            address,
            token,
            ABS(SUM(inflow) - SUM(outflow)) as net_balance
          FROM (
            SELECT to_address as address, token, amount::numeric as inflow, 0 as outflow
            FROM arc_native_transfers
            WHERE timestamp >= ${daysAgo.toISOString()}::timestamp
            ${token ? sql`AND token = ${token}` : sql``}
            UNION ALL
            SELECT from_address as address, token, 0 as inflow, amount::numeric as outflow
            FROM arc_native_transfers
            WHERE timestamp >= ${daysAgo.toISOString()}::timestamp
            ${token ? sql`AND token = ${token}` : sql``}
          ) combined
          GROUP BY address, token
          HAVING ABS(SUM(inflow) - SUM(outflow)) > 0
        )
        SELECT 
          token,
          SUM(net_balance) as active_supply,
          COUNT(DISTINCT address) as active_wallets
        FROM wallet_activity
        GROUP BY token
      `);

      const volumeMap = new Map((volumeResult as any[]).map(v => [v.token, v]));
      const balancesMap = new Map((activeBalancesResult as any[]).map(b => [b.token, b]));

      const tokens = token ? [token] : ['USDC', 'EURC'];
      const velocityData = tokens.map(t => {
        const vol = volumeMap.get(t) || { total_volume: '0', transfer_count: 0 };
        const bal = balancesMap.get(t) || { active_supply: '1', active_wallets: 0 };
        
        const totalVolume = parseFloat(vol.total_volume || '0');
        const activeSupply = parseFloat(bal.active_supply || '1') || 1; // Avoid division by zero
        const velocity = totalVolume / activeSupply;

        return {
          token: t,
          totalVolume: vol.total_volume,
          totalVolumeFormatted: formatAmount(vol.total_volume, t as 'USDC' | 'EURC'),
          transferCount: parseInt(vol.transfer_count || '0'),
          activeSupply: bal.active_supply,
          activeSupplyFormatted: formatAmount(bal.active_supply, t as 'USDC' | 'EURC'),
          activeWallets: parseInt(bal.active_wallets || '0'),
          velocity: velocity.toFixed(4),
          velocityDescription: velocity > 5 ? 'High' : velocity > 2 ? 'Medium' : 'Low',
        };
      });

      return c.json({
        data: velocityData,
        period: { days, since: daysAgo.toISOString() },
      });
    } catch (error) {
      console.error('Error fetching velocity:', error);
      return c.json({ error: 'Failed to fetch velocity metrics' }, 500);
    }
  });

  // GET /api/stats/dormancy - Get dormancy metrics (share of supply not moved in X days)
  router.get('/dormancy', async (c) => {
    try {
      const token = c.req.query('token');
      const thresholds = [7, 14, 30, 60]; // Days of inactivity

      const results = await Promise.all(
        thresholds.map(async (threshold) => {
          const cutoff = new Date(Date.now() - threshold * 24 * 60 * 60 * 1000);

          // Get wallets that haven't moved funds since the cutoff
          const dormantResult = await db.execute(sql`
            WITH all_wallets AS (
              SELECT DISTINCT address, token FROM (
                SELECT from_address as address, token FROM arc_native_transfers
                UNION
                SELECT to_address as address, token FROM arc_native_transfers
              ) combined
              ${token ? sql`WHERE token = ${token}` : sql``}
            ),
            active_wallets AS (
              SELECT DISTINCT 
                CASE WHEN from_address IS NOT NULL THEN from_address ELSE to_address END as address,
                token
              FROM arc_native_transfers
              WHERE timestamp >= ${cutoff.toISOString()}::timestamp
              ${token ? sql`AND token = ${token}` : sql``}
            ),
            dormant_wallets AS (
              SELECT a.address, a.token
              FROM all_wallets a
              LEFT JOIN active_wallets act ON a.address = act.address AND a.token = act.token
              WHERE act.address IS NULL
            )
            SELECT 
              token,
              (SELECT COUNT(*) FROM all_wallets WHERE token = dw.token) as total_wallets,
              COUNT(*) as dormant_wallets
            FROM dormant_wallets dw
            GROUP BY token
          `);

          return {
            threshold,
            data: (dormantResult as any[]).map(r => ({
              token: r.token,
              totalWallets: parseInt(r.total_wallets || '0'),
              dormantWallets: parseInt(r.dormant_wallets || '0'),
              dormancyRate: r.total_wallets > 0 
                ? ((parseInt(r.dormant_wallets) / parseInt(r.total_wallets)) * 100).toFixed(2)
                : '0',
            })),
          };
        })
      );

      return c.json({ data: results });
    } catch (error) {
      console.error('Error fetching dormancy:', error);
      return c.json({ error: 'Failed to fetch dormancy metrics' }, 500);
    }
  });

  // GET /api/stats/wallet-retention - Get new vs returning wallet metrics
  router.get('/wallet-retention', async (c) => {
    try {
      const token = c.req.query('token');
      const days = Math.min(parseInt(c.req.query('days') || '14', 10), 90);

      const results = await db.execute(sql`
        WITH daily_activity AS (
          SELECT 
            DATE(timestamp) as activity_date,
            token,
            from_address as address
          FROM arc_native_transfers
          WHERE timestamp >= (NOW() - INTERVAL '${sql.raw(String(days))} days')
          ${token ? sql`AND token = ${token}` : sql``}
        ),
        first_seen AS (
          SELECT 
            from_address as address,
            token,
            DATE(MIN(timestamp)) as first_activity_date
          FROM arc_native_transfers
          ${token ? sql`WHERE token = ${token}` : sql``}
          GROUP BY from_address, token
        ),
        daily_breakdown AS (
          SELECT 
            da.activity_date,
            da.token,
            COUNT(DISTINCT da.address) as total_active,
            COUNT(DISTINCT CASE WHEN fs.first_activity_date = da.activity_date THEN da.address END) as new_wallets,
            COUNT(DISTINCT CASE WHEN fs.first_activity_date < da.activity_date THEN da.address END) as returning_wallets
          FROM daily_activity da
          LEFT JOIN first_seen fs ON da.address = fs.address AND da.token = fs.token
          GROUP BY da.activity_date, da.token
        )
        SELECT * FROM daily_breakdown
        ORDER BY activity_date DESC
      `);

      const formatted = (results as any[]).map(r => ({
        date: r.activity_date,
        token: r.token,
        totalActive: parseInt(r.total_active || '0'),
        newWallets: parseInt(r.new_wallets || '0'),
        returningWallets: parseInt(r.returning_wallets || '0'),
        retentionRate: r.total_active > 0 
          ? ((parseInt(r.returning_wallets) / parseInt(r.total_active)) * 100).toFixed(2)
          : '0',
      }));

      return c.json({ 
        data: formatted,
        period: { days },
      });
    } catch (error) {
      console.error('Error fetching wallet retention:', error);
      return c.json({ error: 'Failed to fetch wallet retention' }, 500);
    }
  });

  // ============================================
  // Concentration / Risk Endpoints
  // ============================================

  // GET /api/stats/concentration/top-holders - Get top holders share
  router.get('/concentration/top-holders', async (c) => {
    try {
      const token = c.req.query('token');
      const topN = Math.min(parseInt(c.req.query('top') || '10', 10), 100);
      const days = Math.min(parseInt(c.req.query('days') || '30', 10), 90);
      const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Calculate net holdings (inflow - outflow) for each wallet
      const holdersResult = await db.execute(sql`
        WITH wallet_balances AS (
          SELECT 
            address,
            token,
            SUM(inflow) - SUM(outflow) as balance
          FROM (
            SELECT to_address as address, token, amount::numeric as inflow, 0 as outflow
            FROM arc_native_transfers
            WHERE timestamp >= ${daysAgo.toISOString()}::timestamp
            ${token ? sql`AND token = ${token}` : sql``}
            UNION ALL
            SELECT from_address as address, token, 0 as inflow, amount::numeric as outflow
            FROM arc_native_transfers
            WHERE timestamp >= ${daysAgo.toISOString()}::timestamp
            ${token ? sql`AND token = ${token}` : sql``}
          ) combined
          GROUP BY address, token
          HAVING SUM(inflow) - SUM(outflow) > 0
        ),
        ranked_holders AS (
          SELECT 
            address,
            token,
            balance,
            ROW_NUMBER() OVER (PARTITION BY token ORDER BY balance DESC) as rank,
            SUM(balance) OVER (PARTITION BY token) as total_supply
          FROM wallet_balances
        )
        SELECT 
          address,
          token,
          balance,
          rank,
          total_supply,
          (balance / NULLIF(total_supply, 0) * 100) as share_pct
        FROM ranked_holders
        WHERE rank <= ${topN}
        ORDER BY token, rank
      `);

      // Group by token and calculate totals
      const byToken = new Map<string, any[]>();
      for (const r of holdersResult as any[]) {
        const list = byToken.get(r.token) || [];
        list.push({
          rank: parseInt(r.rank),
          address: r.address,
          balance: r.balance,
          balanceFormatted: formatAmount(r.balance, r.token as 'USDC' | 'EURC'),
          sharePct: parseFloat(r.share_pct || '0').toFixed(2),
        });
        byToken.set(r.token, list);
      }

      // Calculate top 10/50 shares
      const summary = [];
      for (const [tokenKey, holders] of byToken) {
        const totalSupply = holders.length > 0 ? parseFloat((holdersResult as any[]).find(r => r.token === tokenKey)?.total_supply || '0') : 0;
        const top10Share = holders.slice(0, 10).reduce((sum, h) => sum + parseFloat(h.sharePct), 0);
        const top50Share = holders.slice(0, 50).reduce((sum, h) => sum + parseFloat(h.sharePct), 0);

        summary.push({
          token: tokenKey,
          totalSupply: totalSupply.toString(),
          totalSupplyFormatted: formatAmount(totalSupply.toString(), tokenKey as 'USDC' | 'EURC'),
          totalHolders: holders.length,
          top10Share: top10Share.toFixed(2),
          top50Share: top50Share.toFixed(2),
          holders: holders,
        });
      }

      return c.json({ 
        data: summary,
        period: { days, since: daysAgo.toISOString() },
      });
    } catch (error) {
      console.error('Error fetching top holders:', error);
      return c.json({ error: 'Failed to fetch top holders' }, 500);
    }
  });

  // GET /api/stats/concentration/hhi - Get Herfindahl-Hirschman Index (concentration measure)
  router.get('/concentration/hhi', async (c) => {
    try {
      const token = c.req.query('token');
      const days = Math.min(parseInt(c.req.query('days') || '30', 10), 90);
      const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // HHI = sum of squared market shares
      const hhiResult = await db.execute(sql`
        WITH wallet_balances AS (
          SELECT 
            address,
            token,
            SUM(inflow) - SUM(outflow) as balance
          FROM (
            SELECT to_address as address, token, amount::numeric as inflow, 0 as outflow
            FROM arc_native_transfers
            WHERE timestamp >= ${daysAgo.toISOString()}::timestamp
            ${token ? sql`AND token = ${token}` : sql``}
            UNION ALL
            SELECT from_address as address, token, 0 as inflow, amount::numeric as outflow
            FROM arc_native_transfers
            WHERE timestamp >= ${daysAgo.toISOString()}::timestamp
            ${token ? sql`AND token = ${token}` : sql``}
          ) combined
          GROUP BY address, token
          HAVING SUM(inflow) - SUM(outflow) > 0
        ),
        market_shares AS (
          SELECT 
            address,
            token,
            balance,
            balance / NULLIF(SUM(balance) OVER (PARTITION BY token), 0) as market_share
          FROM wallet_balances
        )
        SELECT 
          token,
          SUM(market_share * market_share) * 10000 as hhi,
          COUNT(*) as holder_count,
          1.0 / COUNT(*) * 10000 as min_hhi
        FROM market_shares
        GROUP BY token
      `);

      const formatted = (hhiResult as any[]).map(r => ({
        token: r.token,
        hhi: parseFloat(r.hhi || '0').toFixed(2),
        holderCount: parseInt(r.holder_count || '0'),
        minHhi: parseFloat(r.min_hhi || '0').toFixed(2), // Perfect distribution
        concentration: parseFloat(r.hhi || '0') > 2500 ? 'High' : parseFloat(r.hhi || '0') > 1500 ? 'Moderate' : 'Low',
      }));

      return c.json({ 
        data: formatted,
        period: { days, since: daysAgo.toISOString() },
        interpretation: {
          low: 'HHI < 1500: Low concentration (competitive)',
          moderate: 'HHI 1500-2500: Moderate concentration',
          high: 'HHI > 2500: High concentration',
        },
      });
    } catch (error) {
      console.error('Error fetching HHI:', error);
      return c.json({ error: 'Failed to fetch HHI' }, 500);
    }
  });

  // GET /api/stats/whale-alerts - Get large transfers above threshold
  router.get('/whale-alerts', async (c) => {
    try {
      const token = c.req.query('token');
      const days = Math.min(parseInt(c.req.query('days') || '7', 10), 30);
      // Default threshold: 100,000 USDC/EURC (with 6 decimals = 100000000000)
      const threshold = c.req.query('threshold') || '100000000000';
      const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);
      const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const whaleTransfers = await db.execute(sql`
        SELECT 
          id,
          token,
          amount,
          from_address,
          to_address,
          tx_hash,
          block_number,
          timestamp
        FROM arc_native_transfers
        WHERE timestamp >= ${daysAgo.toISOString()}::timestamp
        AND amount::numeric >= ${threshold}::numeric
        ${token ? sql`AND token = ${token}` : sql``}
        ORDER BY amount::numeric DESC
        LIMIT ${limit}
      `);

      const formatted = (whaleTransfers as any[]).map(t => ({
        id: t.id,
        token: t.token,
        amount: t.amount,
        amountFormatted: formatAmount(t.amount, t.token as 'USDC' | 'EURC'),
        fromAddress: t.from_address,
        toAddress: t.to_address,
        txHash: t.tx_hash,
        blockNumber: t.block_number,
        timestamp: t.timestamp,
      }));

      // Summary stats
      const totalWhaleVolume = formatted.reduce((sum, t) => sum + BigInt(t.amount), BigInt(0));
      const avgWhaleSize = formatted.length > 0 
        ? (totalWhaleVolume / BigInt(formatted.length)).toString() 
        : '0';

      return c.json({
        data: {
          transfers: formatted,
          summary: {
            count: formatted.length,
            totalVolume: totalWhaleVolume.toString(),
            totalVolumeFormatted: formatAmount(totalWhaleVolume.toString(), token as 'USDC' | 'EURC' || 'USDC'),
            avgSize: avgWhaleSize,
            avgSizeFormatted: formatAmount(avgWhaleSize, token as 'USDC' | 'EURC' || 'USDC'),
          },
        },
        period: { days, since: daysAgo.toISOString() },
        threshold: {
          raw: threshold,
          formatted: formatAmount(threshold, token as 'USDC' | 'EURC' || 'USDC'),
        },
      });
    } catch (error) {
      console.error('Error fetching whale alerts:', error);
      return c.json({ error: 'Failed to fetch whale alerts' }, 500);
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
