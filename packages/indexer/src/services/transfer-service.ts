import { eq, and, sql } from 'drizzle-orm';
import {
  type Database,
  transfers,
  indexerState,
  arcNativeTransfers,
  usycActivity,
  fxSwaps,
  fxDailyStats,
  type NewTransfer,
  type NewArcNativeTransfer,
  type NewUSYCActivity,
  type NewFXSwap,
} from '@usdc-eurc-analytics/db';
import {
  type DepositForBurnEvent,
  type DepositForBurnV2Event,
  type MintAndWithdrawEvent,
  type ERC20TransferEvent,
  type FXSwapSettledEvent,
  type USYCDepositEvent,
  type USYCWithdrawEvent,
  type ChainConfig,
  formatAmount,
  getChainByDomain,
  getChainById,
  DOMAIN_TO_CHAIN,
  TOKEN_DECIMALS,
} from '@usdc-eurc-analytics/shared';
import type { EvmChainIndexer } from '../chains/evm.js';
import type { StableFXIndexer } from '../chains/arc-stablefx.js';

export class TransferService {
  constructor(private db: Database) {}

  // ============================================
  // Indexer State Management
  // ============================================

  /**
   * Get the last indexed block for a chain and indexer type
   */
  async getLastIndexedBlock(chainId: string, indexerType: string = 'cctp'): Promise<number | null> {
    const result = await this.db
      .select({ lastBlock: indexerState.lastBlock })
      .from(indexerState)
      .where(
        and(
          eq(indexerState.chainId, chainId),
          eq(indexerState.indexerType, indexerType)
        )
      )
      .limit(1);

    return result[0]?.lastBlock ?? null;
  }

  /**
   * Update the last indexed block for a chain and indexer type
   */
  async updateLastIndexedBlock(chainId: string, blockNumber: number, indexerType: string = 'cctp'): Promise<void> {
    // Use raw SQL for upsert with composite unique key (chain_id, indexer_type)
    await this.db.execute(sql`
      INSERT INTO indexer_state (chain_id, indexer_type, last_block, last_updated)
      VALUES (${chainId}, ${indexerType}, ${blockNumber}, NOW())
      ON CONFLICT (chain_id, indexer_type) 
      DO UPDATE SET 
        last_block = ${blockNumber},
        last_updated = NOW()
    `);
  }

  // ============================================
  // CCTP Transfer Processing
  // ============================================

  /**
   * Process burn events and create pending transfers
   */
  async processBurnEvents(
    events: (DepositForBurnEvent | DepositForBurnV2Event)[],
    sourceChainId: string,
    indexer: EvmChainIndexer
  ): Promise<number> {
    let processed = 0;
    const sourceChain = getChainById(sourceChainId);

    for (const event of events) {
      const token = indexer.getTokenType(event.burnToken);
      if (!token) {
        console.warn(`Unknown token address: ${event.burnToken} on ${sourceChainId}`);
        continue;
      }

      // Get destination chain from domain
      const destChain = getChainByDomain(event.destinationDomain);
      const destChainId = destChain?.id ?? DOMAIN_TO_CHAIN[event.destinationDomain] ?? `domain_${event.destinationDomain}`;

      // Get source domain from chain config
      const sourceDomain = sourceChain?.domain ?? 0;

      const transfer: NewTransfer = {
        token,
        amount: event.amount.toString(),
        amountFormatted: formatAmount(event.amount, token),
        sourceChain: sourceChainId,
        sourceTxHash: event.transactionHash,
        sourceAddress: event.depositor.toLowerCase(),
        burnTimestamp: new Date(event.timestamp * 1000),
        burnBlockNumber: Number(event.blockNumber),
        destChain: destChainId,
        destAddress: event.mintRecipient.toLowerCase(),
        nonce: event.nonce.toString(),
        sourceDomain,
        destDomain: event.destinationDomain,
        status: 'pending',
        transferType: 'cctp',
        // V2 specific field
        maxFee: 'maxFee' in event ? event.maxFee.toString() : undefined,
      };

      try {
        await this.db
          .insert(transfers)
          .values(transfer)
          .onConflictDoNothing();

        processed++;
      } catch (error) {
        console.error(`Failed to insert transfer: ${error}`);
      }
    }

    return processed;
  }

  /**
   * Process mint events and complete transfers
   */
  async processMintEvents(
    events: MintAndWithdrawEvent[],
    destChainId: string,
    indexer: EvmChainIndexer
  ): Promise<number> {
    let completed = 0;

    for (const event of events) {
      const token = indexer.getTokenType(event.mintToken);
      if (!token) {
        console.warn(`Unknown token address: ${event.mintToken} on ${destChainId}`);
        continue;
      }

      // Find matching pending transfer
      const pendingTransfers = await this.db
        .select()
        .from(transfers)
        .where(
          and(
            eq(transfers.destChain, destChainId),
            eq(transfers.destAddress, event.mintRecipient.toLowerCase()),
            eq(transfers.amount, event.amount.toString()),
            eq(transfers.token, token),
            eq(transfers.status, 'pending')
          )
        )
        .limit(1);

      if (pendingTransfers.length > 0) {
        const transfer = pendingTransfers[0];

        await this.db
          .update(transfers)
          .set({
            destTxHash: event.transactionHash,
            mintTimestamp: new Date(event.timestamp * 1000),
            mintBlockNumber: Number(event.blockNumber),
            status: 'completed',
            updatedAt: new Date(),
          })
          .where(eq(transfers.id, transfer.id));

        completed++;
      }
    }

    return completed;
  }

  // ============================================
  // Arc Native Transfer Processing
  // ============================================

  /**
   * Process native token transfers on Arc
   */
  async processNativeTransfers(
    events: ERC20TransferEvent[],
    token: 'USDC' | 'EURC' | 'USYC'
  ): Promise<number> {
    let processed = 0;

    for (const event of events) {
      const transfer: NewArcNativeTransfer = {
        token,
        amount: event.value.toString(),
        amountFormatted: formatAmount(event.value, token),
        fromAddress: event.from.toLowerCase(),
        toAddress: event.to.toLowerCase(),
        txHash: event.transactionHash,
        blockNumber: Number(event.blockNumber),
        timestamp: new Date(event.timestamp * 1000),
      };

      try {
        await this.db
          .insert(arcNativeTransfers)
          .values(transfer)
          .onConflictDoNothing();

        processed++;
      } catch (error) {
        console.error(`Failed to insert native transfer: ${error}`);
      }
    }

    return processed;
  }

  // ============================================
  // USYC Activity Processing
  // ============================================

  /**
   * Process USYC deposit (mint) events
   */
  async processUSYCDeposits(events: USYCDepositEvent[]): Promise<number> {
    let processed = 0;

    for (const event of events) {
      const activity: NewUSYCActivity = {
        action: 'mint',
        amount: event.usycAmount.toString(),
        amountFormatted: formatAmount(event.usycAmount, 'USYC'),
        usdcAmount: event.usdcAmount.toString(),
        usdcAmountFormatted: formatAmount(event.usdcAmount, 'USDC'),
        walletAddress: event.depositor.toLowerCase(),
        txHash: event.transactionHash,
        blockNumber: Number(event.blockNumber),
        timestamp: new Date(event.timestamp * 1000),
      };

      try {
        await this.db
          .insert(usycActivity)
          .values(activity)
          .onConflictDoNothing();

        processed++;
      } catch (error) {
        console.error(`Failed to insert USYC deposit: ${error}`);
      }
    }

    return processed;
  }

  /**
   * Process USYC withdrawal (redeem) events
   */
  async processUSYCWithdrawals(events: USYCWithdrawEvent[]): Promise<number> {
    let processed = 0;

    for (const event of events) {
      const activity: NewUSYCActivity = {
        action: 'redeem',
        amount: event.usycAmount.toString(),
        amountFormatted: formatAmount(event.usycAmount, 'USYC'),
        usdcAmount: event.usdcAmount.toString(),
        usdcAmountFormatted: formatAmount(event.usdcAmount, 'USDC'),
        walletAddress: event.withdrawer.toLowerCase(),
        txHash: event.transactionHash,
        blockNumber: Number(event.blockNumber),
        timestamp: new Date(event.timestamp * 1000),
      };

      try {
        await this.db
          .insert(usycActivity)
          .values(activity)
          .onConflictDoNothing();

        processed++;
      } catch (error) {
        console.error(`Failed to insert USYC withdrawal: ${error}`);
      }
    }

    return processed;
  }

  /**
   * Process USYC transfer events
   */
  async processUSYCTransfers(events: ERC20TransferEvent[]): Promise<number> {
    let processed = 0;

    for (const event of events) {
      const activity: NewUSYCActivity = {
        action: 'transfer',
        amount: event.value.toString(),
        amountFormatted: formatAmount(event.value, 'USYC'),
        walletAddress: event.from.toLowerCase(),
        toAddress: event.to.toLowerCase(),
        txHash: event.transactionHash,
        blockNumber: Number(event.blockNumber),
        timestamp: new Date(event.timestamp * 1000),
      };

      try {
        await this.db
          .insert(usycActivity)
          .values(activity)
          .onConflictDoNothing();

        processed++;
      } catch (error) {
        console.error(`Failed to insert USYC transfer: ${error}`);
      }
    }

    return processed;
  }

  // ============================================
  // StableFX Processing
  // ============================================

  /**
   * Process FX swap events
   */
  async processFXSwaps(
    events: FXSwapSettledEvent[],
    indexer: StableFXIndexer
  ): Promise<number> {
    let processed = 0;

    for (const event of events) {
      const baseToken = indexer.getTokenType(event.baseToken);
      const quoteToken = indexer.getTokenType(event.quoteToken);

      if (!baseToken || !quoteToken) {
        console.warn(`Unknown token in FX swap: ${event.baseToken} / ${event.quoteToken}`);
        continue;
      }

      // Calculate effective rate
      const baseAmountNum = Number(event.baseAmount) / Math.pow(10, TOKEN_DECIMALS[baseToken]);
      const quoteAmountNum = Number(event.quoteAmount) / Math.pow(10, TOKEN_DECIMALS[quoteToken]);
      const effectiveRate = quoteAmountNum / baseAmountNum;

      const swap: NewFXSwap = {
        tradeId: event.tradeId,
        maker: event.maker.toLowerCase(),
        taker: event.taker.toLowerCase(),
        baseToken,
        quoteToken,
        baseAmount: event.baseAmount.toString(),
        baseAmountFormatted: formatAmount(event.baseAmount, baseToken),
        quoteAmount: event.quoteAmount.toString(),
        quoteAmountFormatted: formatAmount(event.quoteAmount, quoteToken),
        effectiveRate: effectiveRate.toFixed(8),
        txHash: event.transactionHash,
        blockNumber: Number(event.blockNumber),
        timestamp: new Date(event.timestamp * 1000),
      };

      try {
        await this.db
          .insert(fxSwaps)
          .values(swap)
          .onConflictDoNothing();

        processed++;
      } catch (error) {
        console.error(`Failed to insert FX swap: ${error}`);
      }
    }

    return processed;
  }

  // ============================================
  // Statistics Updates
  // ============================================

  /**
   * Update aggregated statistics
   */
  async updateStats(date: Date): Promise<void> {
    const dateStr = date.toISOString().split('T')[0];

    // Update daily stats for each chain/token/direction
    await this.db.execute(sql`
      INSERT INTO daily_stats (date, token, chain, direction, transfer_count, total_volume, unique_wallets, avg_amount)
      SELECT 
        DATE(burn_timestamp) as date,
        token,
        source_chain as chain,
        'outbound' as direction,
        COUNT(*) as transfer_count,
        SUM(amount::numeric) as total_volume,
        COUNT(DISTINCT source_address) as unique_wallets,
        AVG(amount::numeric) as avg_amount
      FROM transfers
      WHERE DATE(burn_timestamp) = ${dateStr}
      GROUP BY DATE(burn_timestamp), token, source_chain
      ON CONFLICT (date, token, chain, direction)
      DO UPDATE SET
        transfer_count = EXCLUDED.transfer_count,
        total_volume = EXCLUDED.total_volume,
        unique_wallets = EXCLUDED.unique_wallets,
        avg_amount = EXCLUDED.avg_amount
    `);

    // Update route stats
    await this.db.execute(sql`
      INSERT INTO route_stats (date, token, source_chain, dest_chain, transfer_count, total_volume)
      SELECT 
        DATE(burn_timestamp) as date,
        token,
        source_chain,
        dest_chain,
        COUNT(*) as transfer_count,
        SUM(amount::numeric) as total_volume
      FROM transfers
      WHERE DATE(burn_timestamp) = ${dateStr}
      GROUP BY DATE(burn_timestamp), token, source_chain, dest_chain
      ON CONFLICT (date, token, source_chain, dest_chain)
      DO UPDATE SET
        transfer_count = EXCLUDED.transfer_count,
        total_volume = EXCLUDED.total_volume
    `);
  }

  /**
   * Update FX daily statistics
   */
  async updateFXStats(date: Date): Promise<void> {
    const dateStr = date.toISOString().split('T')[0];

    await this.db.execute(sql`
      INSERT INTO fx_daily_stats (date, swap_count, usdc_to_eurc_volume, eurc_to_usdc_volume, total_volume, unique_traders, avg_rate)
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as swap_count,
        SUM(CASE WHEN base_token = 'USDC' THEN base_amount::numeric ELSE 0 END) as usdc_to_eurc_volume,
        SUM(CASE WHEN base_token = 'EURC' THEN base_amount::numeric ELSE 0 END) as eurc_to_usdc_volume,
        SUM(base_amount::numeric) as total_volume,
        COUNT(DISTINCT maker) + COUNT(DISTINCT taker) as unique_traders,
        AVG(effective_rate::numeric) as avg_rate
      FROM fx_swaps
      WHERE DATE(timestamp) = ${dateStr}
      GROUP BY DATE(timestamp)
      ON CONFLICT (date)
      DO UPDATE SET
        swap_count = EXCLUDED.swap_count,
        usdc_to_eurc_volume = EXCLUDED.usdc_to_eurc_volume,
        eurc_to_usdc_volume = EXCLUDED.eurc_to_usdc_volume,
        total_volume = EXCLUDED.total_volume,
        unique_traders = EXCLUDED.unique_traders,
        avg_rate = EXCLUDED.avg_rate
    `);
  }

  /**
   * Update hourly statistics for native transfers
   */
  async updateHourlyStats(hour: Date): Promise<void> {
    const hourStr = hour.toISOString();
    const hourStart = new Date(hour);
    hourStart.setMinutes(0, 0, 0);
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

    await this.db.execute(sql`
      INSERT INTO hourly_stats (hour, token, transfer_count, total_volume, unique_senders, unique_receivers, min_amount, max_amount, median_amount, p90_amount)
      SELECT 
        date_trunc('hour', timestamp) as hour,
        token,
        COUNT(*) as transfer_count,
        COALESCE(SUM(amount::numeric), 0) as total_volume,
        COUNT(DISTINCT from_address) as unique_senders,
        COUNT(DISTINCT to_address) as unique_receivers,
        COALESCE(MIN(amount::numeric), 0) as min_amount,
        COALESCE(MAX(amount::numeric), 0) as max_amount,
        COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY amount::numeric), 0) as median_amount,
        COALESCE(percentile_cont(0.90) WITHIN GROUP (ORDER BY amount::numeric), 0) as p90_amount
      FROM arc_native_transfers
      WHERE timestamp >= ${hourStart.toISOString()}::timestamp
        AND timestamp < ${hourEnd.toISOString()}::timestamp
      GROUP BY date_trunc('hour', timestamp), token
      ON CONFLICT (hour, token)
      DO UPDATE SET
        transfer_count = EXCLUDED.transfer_count,
        total_volume = EXCLUDED.total_volume,
        unique_senders = EXCLUDED.unique_senders,
        unique_receivers = EXCLUDED.unique_receivers,
        min_amount = EXCLUDED.min_amount,
        max_amount = EXCLUDED.max_amount,
        median_amount = EXCLUDED.median_amount,
        p90_amount = EXCLUDED.p90_amount
    `);
  }

  /**
   * Update wallet statistics
   */
  async updateWalletStats(address: string, token: string): Promise<void> {
    await this.db.execute(sql`
      INSERT INTO wallet_stats (address, token, total_transfers, total_volume, first_seen, last_seen)
      SELECT 
        ${address.toLowerCase()} as address,
        ${token} as token,
        COUNT(*) as total_transfers,
        SUM(amount::numeric) as total_volume,
        MIN(burn_timestamp) as first_seen,
        MAX(burn_timestamp) as last_seen
      FROM transfers
      WHERE (LOWER(source_address) = ${address.toLowerCase()} OR LOWER(dest_address) = ${address.toLowerCase()})
        AND token = ${token}
      ON CONFLICT (address, token)
      DO UPDATE SET
        total_transfers = EXCLUDED.total_transfers,
        total_volume = EXCLUDED.total_volume,
        last_seen = EXCLUDED.last_seen
    `);
  }
}
