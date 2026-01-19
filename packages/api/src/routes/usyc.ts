import { Hono } from 'hono';
import { eq, sql, desc, and, gte, lte } from 'drizzle-orm';
import {
  type Database,
  usycActivity,
} from '@usdc-eurc-analytics/db';
import { TOKEN_DECIMALS, USYCQuerySchema } from '@usdc-eurc-analytics/shared';

export function createUSYCRoutes(db: Database) {
  const app = new Hono();

  // GET /api/usyc/activity - List USYC activity
  app.get('/activity', async (c) => {
    const query = USYCQuerySchema.parse({
      page: c.req.query('page'),
      limit: c.req.query('limit'),
      action: c.req.query('action'),
      wallet: c.req.query('wallet'),
      fromDate: c.req.query('fromDate'),
      toDate: c.req.query('toDate'),
      sortBy: c.req.query('sortBy'),
      sortOrder: c.req.query('sortOrder'),
    });

    const offset = (query.page - 1) * query.limit;
    const conditions = [];

    if (query.action) {
      conditions.push(eq(usycActivity.action, query.action));
    }
    if (query.wallet) {
      conditions.push(eq(usycActivity.walletAddress, query.wallet.toLowerCase()));
    }
    if (query.fromDate) {
      conditions.push(gte(usycActivity.timestamp, query.fromDate));
    }
    if (query.toDate) {
      conditions.push(lte(usycActivity.timestamp, query.toDate));
    }

    // Get total count
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM usyc_activity
      ${conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``}
    `);
    const total = parseInt(((countResult as any[])[0] as { count: string }).count);

    // Get activity
    const activityResult = await db
      .select()
      .from(usycActivity)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(usycActivity.timestamp))
      .limit(query.limit)
      .offset(offset);

    return c.json({
      data: activityResult,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  });

  // GET /api/usyc/stats - USYC statistics
  app.get('/stats', async (c) => {
    const days = parseInt(c.req.query('days') || '30');
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get activity counts
    const activityStats = await db.execute(sql`
      SELECT 
        action,
        COUNT(*) as count,
        COALESCE(SUM(amount::numeric), 0) as total_usyc,
        COALESCE(SUM(usdc_amount::numeric), 0) as total_usdc
      FROM usyc_activity
      WHERE timestamp >= ${since}
      GROUP BY action
    `);

    // Get unique wallets
    const walletStats = await db.execute(sql`
      SELECT COUNT(DISTINCT wallet_address) as unique_wallets
      FROM usyc_activity
      WHERE timestamp >= ${since}
    `);

    // Parse results
    let mintCount = 0, redeemCount = 0, transferCount = 0;
    let mintVolume = 0n, redeemVolume = 0n, transferVolume = 0n;
    let mintUsdcVolume = 0n, redeemUsdcVolume = 0n;

    for (const row of activityStats as unknown as { action: string; count: string; total_usyc: string; total_usdc: string }[]) {
      if (row.action === 'mint') {
        mintCount = parseInt(row.count);
        mintVolume = BigInt(row.total_usyc || 0);
        mintUsdcVolume = BigInt(row.total_usdc || 0);
      } else if (row.action === 'redeem') {
        redeemCount = parseInt(row.count);
        redeemVolume = BigInt(row.total_usyc || 0);
        redeemUsdcVolume = BigInt(row.total_usdc || 0);
      } else if (row.action === 'transfer') {
        transferCount = parseInt(row.count);
        transferVolume = BigInt(row.total_usyc || 0);
      }
    }

    const uniqueWallets = parseInt(((walletStats as any[])[0] as { unique_wallets: string }).unique_wallets || '0');

    const formatVolume = (value: bigint, decimals: number) => {
      const num = Number(value) / Math.pow(10, decimals);
      return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
    };

    // Estimate TVL (mints - redeems)
    const tvl = mintVolume - redeemVolume;

    return c.json({
      tvl: {
        usyc: formatVolume(tvl > 0n ? tvl : 0n, TOKEN_DECIMALS.USYC),
        raw: (tvl > 0n ? tvl : 0n).toString(),
      },
      activity: {
        mints: {
          count: mintCount,
          usycVolume: formatVolume(mintVolume, TOKEN_DECIMALS.USYC),
          usdcVolume: formatVolume(mintUsdcVolume, TOKEN_DECIMALS.USDC),
        },
        redeems: {
          count: redeemCount,
          usycVolume: formatVolume(redeemVolume, TOKEN_DECIMALS.USYC),
          usdcVolume: formatVolume(redeemUsdcVolume, TOKEN_DECIMALS.USDC),
        },
        transfers: {
          count: transferCount,
          volume: formatVolume(transferVolume, TOKEN_DECIMALS.USYC),
        },
      },
      uniqueWallets,
      period: { days, since: since.toISOString() },
    });
  });

  // GET /api/usyc/volume - Daily USYC volume
  app.get('/volume', async (c) => {
    const days = parseInt(c.req.query('days') || '30');
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await db.execute(sql`
      SELECT 
        DATE(timestamp) as date,
        action,
        COUNT(*) as count,
        COALESCE(SUM(amount::numeric), 0) as usyc_volume,
        COALESCE(SUM(usdc_amount::numeric), 0) as usdc_volume
      FROM usyc_activity
      WHERE timestamp >= ${since}
      GROUP BY DATE(timestamp), action
      ORDER BY date ASC, action
    `);

    // Group by date
    const byDate: Record<string, any> = {};
    for (const row of result as any[]) {
      if (!byDate[row.date]) {
        byDate[row.date] = {
          date: row.date,
          mints: { count: 0, usycVolume: '0', usdcVolume: '0' },
          redeems: { count: 0, usycVolume: '0', usdcVolume: '0' },
          transfers: { count: 0, volume: '0' },
        };
      }
      
      if (row.action === 'mint') {
        byDate[row.date].mints = {
          count: parseInt(row.count),
          usycVolume: row.usyc_volume,
          usdcVolume: row.usdc_volume,
        };
      } else if (row.action === 'redeem') {
        byDate[row.date].redeems = {
          count: parseInt(row.count),
          usycVolume: row.usyc_volume,
          usdcVolume: row.usdc_volume,
        };
      } else if (row.action === 'transfer') {
        byDate[row.date].transfers = {
          count: parseInt(row.count),
          volume: row.usyc_volume,
        };
      }
    }

    return c.json({
      data: Object.values(byDate),
      period: { days, since: since.toISOString() },
    });
  });

  // GET /api/usyc/holders - Top USYC holders (based on activity)
  app.get('/holders', async (c) => {
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);

    const result = await db.execute(sql`
      SELECT 
        wallet_address as address,
        COUNT(*) as activity_count,
        SUM(CASE WHEN action = 'mint' THEN amount::numeric ELSE 0 END) as total_minted,
        SUM(CASE WHEN action = 'redeem' THEN amount::numeric ELSE 0 END) as total_redeemed,
        MAX(timestamp) as last_active
      FROM usyc_activity
      GROUP BY wallet_address
      ORDER BY (SUM(CASE WHEN action = 'mint' THEN amount::numeric ELSE 0 END) - 
                SUM(CASE WHEN action = 'redeem' THEN amount::numeric ELSE 0 END)) DESC
      LIMIT ${limit}
    `);

    return c.json({
      data: (result as any[]).map((row: any) => {
        const netBalance = BigInt(row.total_minted || 0) - BigInt(row.total_redeemed || 0);
        return {
          address: row.address,
          activityCount: parseInt(row.activity_count),
          totalMinted: row.total_minted,
          totalRedeemed: row.total_redeemed,
          estimatedBalance: netBalance > 0n ? netBalance.toString() : '0',
          estimatedBalanceFormatted: (Number(netBalance > 0n ? netBalance : 0n) / Math.pow(10, TOKEN_DECIMALS.USYC)).toLocaleString('en-US', { maximumFractionDigits: 2 }),
          lastActive: row.last_active,
        };
      }),
    });
  });

  return app;
}
