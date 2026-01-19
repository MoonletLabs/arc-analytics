import 'dotenv/config';
import { getDb } from '@usdc-eurc-analytics/db';
import { sleep } from '@usdc-eurc-analytics/shared';
import { config } from './config.js';
import { createEvmIndexers, type EvmChainIndexer } from './chains/evm.js';
import { TransferService } from './services/transfer-service.js';

// ============================================
// Main Indexer
// ============================================

class Indexer {
  private db: ReturnType<typeof getDb>;
  private transferService: TransferService;
  private evmIndexers: Map<string, EvmChainIndexer>;
  private isRunning = false;

  constructor() {
    this.db = getDb(config.databaseUrl);
    this.transferService = new TransferService(this.db);
    this.evmIndexers = createEvmIndexers(config.chains, config.batchSize);
  }

  /**
   * Start the indexer
   */
  async start(): Promise<void> {
    console.log('Starting USDC/EURC Analytics Indexer...');
    console.log(`Configured chains: ${Array.from(this.evmIndexers.keys()).join(', ')}`);
    console.log(`Poll interval: ${config.pollIntervalMs}ms`);
    console.log(`Batch size: ${config.batchSize} blocks`);
    console.log(`Sync days (first run): ${config.syncDays} days`);

    this.isRunning = true;

    while (this.isRunning) {
      try {
        await this.indexAllChains();
      } catch (error) {
        console.error('Error during indexing cycle:', error);
      }

      await sleep(config.pollIntervalMs);
    }
  }

  /**
   * Stop the indexer
   */
  stop(): void {
    console.log('Stopping indexer...');
    this.isRunning = false;
  }

  /**
   * Index all configured chains
   */
  private async indexAllChains(): Promise<void> {
    const indexPromises = Array.from(this.evmIndexers.entries()).map(
      ([chainId, indexer]) => this.indexChain(chainId, indexer)
    );

    await Promise.allSettled(indexPromises);
  }

  /**
   * Index a single chain
   */
  private async indexChain(chainId: string, indexer: EvmChainIndexer): Promise<void> {
    try {
      // Get current block and last indexed block
      const currentBlock = await indexer.getCurrentBlock();
      let lastIndexedBlock = await this.transferService.getLastIndexedBlock(chainId);

      // If first time indexing, calculate start block based on INDEXER_SYNC_DAYS
      if (lastIndexedBlock === null) {
        lastIndexedBlock = indexer.calculateStartBlockForDays(currentBlock, config.syncDays);
        const blocksToSync = currentBlock - lastIndexedBlock;
        const estimatedDays = blocksToSync / indexer.getBlocksPerDay();
        console.log(`[${chainId}] First run, syncing ~${estimatedDays.toFixed(1)} days (${blocksToSync.toLocaleString()} blocks)`);
        console.log(`[${chainId}] Starting from block ${lastIndexedBlock} (current: ${currentBlock})`);
      }

      // Calculate block range
      const range = indexer.calculateBlockRange(lastIndexedBlock, currentBlock);
      if (!range) {
        return; // Already up to date
      }

      console.log(`[${chainId}] Indexing blocks ${range.fromBlock} to ${range.toBlock}`);

      // Fetch and process events
      const events = await indexer.indexBlockRange(range.fromBlock, range.toBlock);

      // Process burn events (outgoing transfers)
      if (events.burns.length > 0) {
        const processed = await this.transferService.processBurnEvents(
          events.burns,
          chainId,
          indexer
        );
        console.log(`[${chainId}] Processed ${processed} burn events`);
      }

      // Process mint events (incoming transfers)
      if (events.mints.length > 0) {
        const completed = await this.transferService.processMintEvents(
          events.mints,
          chainId,
          indexer
        );
        console.log(`[${chainId}] Completed ${completed} mint events`);
      }

      // Update last indexed block
      await this.transferService.updateLastIndexedBlock(chainId, range.toBlock);

      // Update stats for today
      await this.transferService.updateStats(new Date());

    } catch (error) {
      console.error(`[${chainId}] Error indexing:`, error);
    }
  }
}

// ============================================
// Entry Point
// ============================================

const indexer = new Indexer();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT');
  indexer.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM');
  indexer.stop();
  process.exit(0);
});

// Start the indexer
indexer.start().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
