import { Hono } from 'hono';
import { eq, sql, desc, and, gte, lte } from 'drizzle-orm';
import {
  type Database,
  fxSwaps,
  fxDailyStats,
} from '@usdc-eurc-analytics/db';
import { TOKEN_DECIMALS, FXQuerySchema } from '@usdc-eurc-analytics/shared';

export function createFXRoutes(db: Database) {
  const app = new Hono();

  // GET /api/fx/swaps - List FX swaps
  app.get('/swaps', async (c) => {
    const query = FXQuerySchema.parse({
      page: c.req.query('page'),
      limit: c.req.query('limit'),
      maker: c.req.query('maker'),
      taker: c.req.query('taker'),
      baseToken: c.req.query('baseToken'),
      fromDate: c.req.query('fromDate'),
      toDate: c.req.query('toDate'),
      sortBy: c.req.query('sortBy'),
      sortOrder: c.req.query('sortOrder'),
    });

    const offset = (query.page - 1) * query.limit;
    const conditions = [];

    if (query.maker) {
      conditions.push(eq(fxSwaps.maker, query.maker.toLowerCase()));
    }
    if (query.taker) {
      conditions.push(eq(fxSwaps.taker, query.taker.toLowerCase()));
    }
    if (query.baseToken) {
      conditions.push(eq(fxSwaps.baseToken, query.baseToken));
    }
    if (query.fromDate) {
      conditions.push(gte(fxSwaps.timestamp, query.fromDate));
    }
    if (query.toDate) {
      conditions.push(lte(fxSwaps.timestamp, query.toDate));
    }

    // Get total count
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM fx_swaps
      ${conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``}
    `);
    const total = parseInt(((countResult as any[])[0] as { count: string }).count);

    // Get swaps
    const swapsResult = await db
      .select()
      .from(fxSwaps)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(fxSwaps.timestamp))
      .limit(query.limit)
      .offset(offset);

    return c.json({
      data: swapsResult,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  });

  // GET /api/fx/stats - FX statistics
  app.get('/stats', async (c) => {
    const days = parseInt(c.req.query('days') || '30');
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as swap_count,
        COALESCE(SUM(base_amount::numeric), 0) as total_volume,
        COALESCE(SUM(CASE WHEN base_token = 'USDC' THEN base_amount::numeric ELSE 0 END), 0) as usdc_to_eurc_volume,
        COALESCE(SUM(CASE WHEN base_token = 'EURC' THEN base_amount::numeric ELSE 0 END), 0) as eurc_to_usdc_volume,
        COUNT(DISTINCT maker) + COUNT(DISTINCT taker) as unique_traders,
        COALESCE(AVG(effective_rate::numeric), 0) as avg_rate
      FROM fx_swaps
      WHERE timestamp >= ${since}
    `);

    const data = (result as any[])[0] as {
      swap_count: string;
      total_volume: string;
      usdc_to_eurc_volume: string;
      eurc_to_usdc_volume: string;
      unique_traders: string;
      avg_rate: string;
    };

    const formatVolume = (value: string) => {
      const num = Number(value || 0) / Math.pow(10, TOKEN_DECIMALS.USDC);
      return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
    };

    return c.json({
      swapCount: parseInt(data.swap_count || '0'),
      totalVolume: formatVolume(data.total_volume),
      usdcToEurcVolume: formatVolume(data.usdc_to_eurc_volume),
      eurcToUsdcVolume: formatVolume(data.eurc_to_usdc_volume),
      uniqueTraders: parseInt(data.unique_traders || '0'),
      avgRate: parseFloat(data.avg_rate || '0').toFixed(6),
      period: { days, since: since.toISOString() },
    });
  });

  // GET /api/fx/volume - Daily FX volume
  app.get('/volume', async (c) => {
    const days = parseInt(c.req.query('days') || '30');
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await db.execute(sql`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as swap_count,
        COALESCE(SUM(base_amount::numeric), 0) as total_volume,
        COALESCE(SUM(CASE WHEN base_token = 'USDC' THEN base_amount::numeric ELSE 0 END), 0) as usdc_to_eurc,
        COALESCE(SUM(CASE WHEN base_token = 'EURC' THEN base_amount::numeric ELSE 0 END), 0) as eurc_to_usdc,
        COALESCE(AVG(effective_rate::numeric), 0) as avg_rate
      FROM fx_swaps
      WHERE timestamp >= ${since}
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `);

    return c.json({
      data: (result as any[]).map((row: any) => ({
        date: row.date,
        swapCount: parseInt(row.swap_count),
        totalVolume: row.total_volume,
        usdcToEurc: row.usdc_to_eurc,
        eurcToUsdc: row.eurc_to_usdc,
        avgRate: parseFloat(row.avg_rate).toFixed(6),
      })),
      period: { days, since: since.toISOString() },
    });
  });

  // GET /api/fx/rate - Current and historical USDC/EURC rate
  app.get('/rate', async (c) => {
    // Get most recent rate
    const currentRate = await db
      .select({
        rate: fxSwaps.effectiveRate,
        timestamp: fxSwaps.timestamp,
      })
      .from(fxSwaps)
      .orderBy(desc(fxSwaps.timestamp))
      .limit(1);

    // Get rate history (hourly average for last 24h, then daily)
    const hourlyRates = await db.execute(sql`
      SELECT 
        DATE_TRUNC('hour', timestamp) as time,
        AVG(effective_rate::numeric) as avg_rate,
        COUNT(*) as sample_count
      FROM fx_swaps
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
      GROUP BY DATE_TRUNC('hour', timestamp)
      ORDER BY time ASC
    `);

    const dailyRates = await db.execute(sql`
      SELECT 
        DATE(timestamp) as date,
        AVG(effective_rate::numeric) as avg_rate,
        MIN(effective_rate::numeric) as min_rate,
        MAX(effective_rate::numeric) as max_rate,
        COUNT(*) as sample_count
      FROM fx_swaps
      WHERE timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `);

    return c.json({
      current: currentRate[0] ? {
        rate: currentRate[0].rate,
        timestamp: currentRate[0].timestamp,
      } : null,
      hourly: hourlyRates as any[],
      daily: dailyRates as any[],
    });
  });

  // GET /api/fx/traders - Top FX traders
  app.get('/traders', async (c) => {
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);

    const result = await db.execute(sql`
      SELECT 
        address,
        swap_count,
        total_volume,
        last_active
      FROM (
        SELECT 
          address,
          COUNT(*) as swap_count,
          SUM(volume) as total_volume,
          MAX(timestamp) as last_active
        FROM (
          SELECT maker as address, base_amount::numeric as volume, timestamp FROM fx_swaps
          UNION ALL
          SELECT taker as address, quote_amount::numeric as volume, timestamp FROM fx_swaps
        ) trades
        GROUP BY address
      ) stats
      ORDER BY total_volume DESC
      LIMIT ${limit}
    `);

    return c.json({
      data: (result as any[]).map((row: any) => ({
        address: row.address,
        swapCount: parseInt(row.swap_count),
        totalVolume: row.total_volume,
        totalVolumeFormatted: (Number(row.total_volume) / Math.pow(10, TOKEN_DECIMALS.USDC)).toLocaleString('en-US', { maximumFractionDigits: 2 }),
        lastActive: row.last_active,
      })),
    });
  });

  return app;
}
