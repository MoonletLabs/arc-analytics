import { eq, and, sql } from 'drizzle-orm';
import {
  type Database,
  transfers,
  indexerState,
  dailyStats,
  routeStats,
  walletStats,
  type NewTransfer,
} from '@usdc-eurc-analytics/db';
import {
  type DepositForBurnEvent,
  type MintAndWithdrawEvent,
  type ChainConfig,
  formatAmount,
  getChainByDomain,
  DOMAIN_TO_CHAIN,
} from '@usdc-eurc-analytics/shared';
import type { EvmChainIndexer } from '../chains/evm.js';

export class TransferService {
  constructor(private db: Database) {}

  /**
   * Get the last indexed block for a chain
   */
  async getLastIndexedBlock(chainId: string): Promise<number | null> {
    const result = await this.db
      .select({ lastBlock: indexerState.lastBlock })
      .from(indexerState)
      .where(eq(indexerState.chainId, chainId))
      .limit(1);

    return result[0]?.lastBlock ?? null;
  }

  /**
   * Update the last indexed block for a chain
   */
  async updateLastIndexedBlock(chainId: string, blockNumber: number): Promise<void> {
    await this.db
      .insert(indexerState)
      .values({
        chainId,
        lastBlock: blockNumber,
        lastUpdated: new Date(),
      })
      .onConflictDoUpdate({
        target: indexerState.chainId,
        set: {
          lastBlock: blockNumber,
          lastUpdated: new Date(),
        },
      });
  }

  /**
   * Process burn events and create pending transfers
   */
  async processBurnEvents(
    events: DepositForBurnEvent[],
    sourceChainId: string,
    indexer: EvmChainIndexer
  ): Promise<number> {
    let processed = 0;

    for (const event of events) {
      const token = indexer.getTokenType(event.burnToken);
      if (!token) {
        console.warn(`Unknown token address: ${event.burnToken} on ${sourceChainId}`);
        continue;
      }

      // Get destination chain from domain
      const destChain = getChainByDomain(event.destinationDomain, true);
      const destChainId = destChain?.id ?? DOMAIN_TO_CHAIN[event.destinationDomain] ?? `domain_${event.destinationDomain}`;

      const transfer: NewTransfer = {
        token,
        amount: event.amount.toString(),
        amountFormatted: formatAmount(event.amount, token),
        sourceChain: sourceChainId,
        sourceTxHash: event.transactionHash,
        sourceAddress: event.depositor,
        burnTimestamp: new Date(event.timestamp * 1000),
        burnBlockNumber: Number(event.blockNumber),
        destChain: destChainId,
        destAddress: event.mintRecipient,
        nonce: event.nonce.toString(),
        sourceDomain: destChain ? indexer.chainId === 'ethereum_sepolia' ? 0 : 
          Object.values(getChainByDomain(0, true) || {}).length : event.destinationDomain, // Will fix this
        destDomain: event.destinationDomain,
        status: 'pending',
      };

      // Get source domain from chain config
      const sourceChain = getChainByDomain(0, true); // Placeholder - need to get from indexer
      
      try {
        await this.db
          .insert(transfers)
          .values(transfer)
          .onConflictDoNothing(); // Skip if already exists (idempotent)

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

      // Find matching pending transfer by amount and recipient
      // Note: In production, you'd match by message hash/nonce for accuracy
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
   * Update wallet statistics for a specific address
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
