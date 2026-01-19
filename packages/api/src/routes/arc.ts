import { Hono } from 'hono';
import { eq, sql, desc, and, gte } from 'drizzle-orm';
import {
  type Database,
  transfers,
  arcNativeTransfers,
  arcNetworkStats,
  fxSwaps,
  usycActivity,
} from '@usdc-eurc-analytics/db';
import { TOKEN_DECIMALS } from '@usdc-eurc-analytics/shared';

export function createArcRoutes(db: Database) {
  const app = new Hono();

  // GET /api/arc/stats - Arc network overview
  app.get('/stats', async (c) => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get 24h volume from CCTP (to/from Arc)
    const cctpVolume = await db.execute(sql`
      SELECT 
        COALESCE(SUM(CASE WHEN source_chain = 'arc_testnet' OR dest_chain = 'arc_testnet' THEN amount::numeric ELSE 0 END), 0) as total_volume,
        COUNT(*) as transfer_count
      FROM transfers
      WHERE burn_timestamp >= ${yesterday}
        AND (source_chain = 'arc_testnet' OR dest_chain = 'arc_testnet')
    `);

    // Get 24h native transfer volume
    const nativeVolume = await db.execute(sql`
      SELECT 
        token,
        COALESCE(SUM(amount::numeric), 0) as volume,
        COUNT(*) as count
      FROM arc_native_transfers
      WHERE timestamp >= ${yesterday}
      GROUP BY token
    `);

    // Get 24h FX volume
    const fxVolume = await db.execute(sql`
      SELECT 
        COALESCE(SUM(base_amount::numeric), 0) as volume,
        COUNT(*) as swap_count
      FROM fx_swaps
      WHERE timestamp >= ${yesterday}
    `);

    // Get TVL (total supply on Arc from transfers in minus out)
    // This is a simplified version - in production you'd track actual balances
    const tvl = await db.execute(sql`
      SELECT 
        token,
        SUM(CASE WHEN dest_chain = 'arc_testnet' AND status = 'completed' THEN amount::numeric ELSE 0 END) -
        SUM(CASE WHEN source_chain = 'arc_testnet' THEN amount::numeric ELSE 0 END) as balance
      FROM transfers
      WHERE source_chain = 'arc_testnet' OR dest_chain = 'arc_testnet'
      GROUP BY token
    `);

    // Get active wallets
    const activeWallets = await db.execute(sql`
      SELECT COUNT(DISTINCT address) as count FROM (
        SELECT source_address as address FROM transfers 
        WHERE burn_timestamp >= ${yesterday} AND source_chain = 'arc_testnet'
        UNION
        SELECT dest_address as address FROM transfers 
        WHERE mint_timestamp >= ${yesterday} AND dest_chain = 'arc_testnet'
        UNION
        SELECT from_address as address FROM arc_native_transfers 
        WHERE timestamp >= ${yesterday}
        UNION
        SELECT to_address as address FROM arc_native_transfers 
        WHERE timestamp >= ${yesterday}
      ) wallets
    `);

    // Format response
    const cctpData = (cctpVolume as any[])[0] as { total_volume: string; transfer_count: string };
    const fxData = (fxVolume as any[])[0] as { volume: string; swap_count: string };
    const walletsData = (activeWallets as any[])[0] as { count: string };

    // Calculate native volumes by token
    let nativeUsdcVolume = 0n;
    let nativeEurcVolume = 0n;
    let nativeUsycVolume = 0n;
    for (const row of nativeVolume as unknown as { token: string; volume: string }[]) {
      if (row.token === 'USDC') nativeUsdcVolume = BigInt(row.volume || 0);
      if (row.token === 'EURC') nativeEurcVolume = BigInt(row.volume || 0);
      if (row.token === 'USYC') nativeUsycVolume = BigInt(row.volume || 0);
    }

    // Calculate TVL by token
    let usdcTvl = 0n;
    let eurcTvl = 0n;
    for (const row of tvl as unknown as { token: string; balance: string }[]) {
      if (row.token === 'USDC') usdcTvl = BigInt(row.balance || 0);
      if (row.token === 'EURC') eurcTvl = BigInt(row.balance || 0);
    }

    const formatBigInt = (value: bigint, decimals: number) => {
      const num = Number(value) / Math.pow(10, decimals);
      return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
    };

    return c.json({
      tvl: {
        total: formatBigInt(usdcTvl + eurcTvl, TOKEN_DECIMALS.USDC),
        usdc: formatBigInt(usdcTvl, TOKEN_DECIMALS.USDC),
        eurc: formatBigInt(eurcTvl, TOKEN_DECIMALS.EURC),
        raw: {
          usdc: usdcTvl.toString(),
          eurc: eurcTvl.toString(),
        },
      },
      volume24h: {
        total: formatBigInt(
          BigInt(cctpData.total_volume || 0) + nativeUsdcVolume + nativeEurcVolume + BigInt(fxData.volume || 0),
          TOKEN_DECIMALS.USDC
        ),
        crosschain: formatBigInt(BigInt(cctpData.total_volume || 0), TOKEN_DECIMALS.USDC),
        native: formatBigInt(nativeUsdcVolume + nativeEurcVolume, TOKEN_DECIMALS.USDC),
        fx: formatBigInt(BigInt(fxData.volume || 0), TOKEN_DECIMALS.USDC),
      },
      transactions24h: {
        total: parseInt(cctpData.transfer_count || '0') + parseInt(fxData.swap_count || '0'),
        crosschain: parseInt(cctpData.transfer_count || '0'),
        fx: parseInt(fxData.swap_count || '0'),
      },
      activeWallets24h: parseInt(walletsData.count || '0'),
    });
  });

  // GET /api/arc/transfers - Native transfers on Arc
  app.get('/transfers', async (c) => {
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
    const token = c.req.query('token');
    const address = c.req.query('address');
    const offset = (page - 1) * limit;

    let query = db.select().from(arcNativeTransfers);
    
    const conditions = [];
    if (token) {
      conditions.push(eq(arcNativeTransfers.token, token));
    }
    if (address) {
      const lowerAddress = address.toLowerCase();
      conditions.push(
        sql`(LOWER(${arcNativeTransfers.fromAddress}) = ${lowerAddress} OR LOWER(${arcNativeTransfers.toAddress}) = ${lowerAddress})`
      );
    }

    // Get total count
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM arc_native_transfers
      ${conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``}
    `);
    const total = parseInt(((countResult as any[])[0] as { count: string }).count);

    // Get transfers
    const transfersResult = await db
      .select()
      .from(arcNativeTransfers)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(arcNativeTransfers.timestamp))
      .limit(limit)
      .offset(offset);

    return c.json({
      data: transfersResult,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // GET /api/arc/tvl/history - TVL history
  app.get('/tvl/history', async (c) => {
    const days = parseInt(c.req.query('days') || '30');
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await db.execute(sql`
      SELECT 
        DATE(burn_timestamp) as date,
        token,
        SUM(CASE WHEN dest_chain = 'arc_testnet' AND status = 'completed' THEN amount::numeric ELSE 0 END) as inflow,
        SUM(CASE WHEN source_chain = 'arc_testnet' THEN amount::numeric ELSE 0 END) as outflow
      FROM transfers
      WHERE burn_timestamp >= ${since}
        AND (source_chain = 'arc_testnet' OR dest_chain = 'arc_testnet')
      GROUP BY DATE(burn_timestamp), token
      ORDER BY date ASC
    `);

    return c.json({
      data: result as any[],
      period: { days, since: since.toISOString() },
    });
  });

  return app;
}
