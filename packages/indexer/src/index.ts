import 'dotenv/config';
import { getDb } from '@usdc-eurc-analytics/db';
import { sleep, isArcChain } from '@usdc-eurc-analytics/shared';
import { config } from './config.js';
import { createEvmIndexers, type EvmChainIndexer } from './chains/evm.js';
import { ArcNativeIndexer, createArcNativeIndexer } from './chains/arc-native.js';
import { USYCIndexer, createUSYCIndexer } from './chains/arc-usyc.js';
import { StableFXIndexer, createStableFXIndexer } from './chains/arc-stablefx.js';
import { TransferService } from './services/transfer-service.js';

// ============================================
// Main Indexer
// ============================================

class Indexer {
  private db: ReturnType<typeof getDb>;
  private transferService: TransferService;
  private evmIndexers: Map<string, EvmChainIndexer>;
  
  // Arc-specific indexers
  private arcNativeIndexer: ArcNativeIndexer | null = null;
  private usycIndexer: USYCIndexer | null = null;
  private stableFXIndexer: StableFXIndexer | null = null;
  
  private isRunning = false;

  constructor() {
    this.db = getDb(config.databaseUrl);
    this.transferService = new TransferService(this.db);
    this.evmIndexers = createEvmIndexers(config.chains, config.batchSize);

    // Initialize Arc-specific indexers
    if (config.arcConfig) {
      if (config.enableArcNative) {
        this.arcNativeIndexer = createArcNativeIndexer(config.arcConfig, config.batchSize);
        console.log('Arc Native Transfer indexer enabled');
      }

      if (config.enableUSYC && config.arcConfig.usyc) {
        this.usycIndexer = createUSYCIndexer(config.arcConfig, config.batchSize);
        console.log('USYC Activity indexer enabled');
      }

      if (config.enableStableFX && config.arcConfig.fxEscrow) {
        this.stableFXIndexer = createStableFXIndexer(config.arcConfig, config.batchSize);
        console.log('StableFX indexer enabled');
      }
    }
  }

  /**
   * Start the indexer
   */
  async start(): Promise<void> {
    console.log('');
    console.log('========================================');
    console.log('   Arc Analytics Indexer Starting...   ');
    console.log('========================================');
    console.log('');
    console.log(`CCTP Chains: ${Array.from(this.evmIndexers.keys()).join(', ')}`);
    console.log(`Poll interval: ${config.pollIntervalMs}ms`);
    console.log(`Batch size: ${config.batchSize} blocks`);
    console.log(`Sync days (first run): ${config.syncDays} days`);
    console.log('');
    console.log('Indexers:');
    console.log(`  - CCTP (V1/V2): ${this.evmIndexers.size} chains`);
    console.log(`  - Arc Native: ${this.arcNativeIndexer ? 'enabled' : 'disabled'}`);
    console.log(`  - USYC: ${this.usycIndexer ? 'enabled' : 'disabled'}`);
    console.log(`  - StableFX: ${this.stableFXIndexer ? 'enabled' : 'disabled'}`);
    console.log('');

    this.isRunning = true;

    while (this.isRunning) {
      try {
        await this.runIndexingCycle();
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
   * Run a complete indexing cycle
   */
  private async runIndexingCycle(): Promise<void> {
    // Run CCTP indexing for all chains
    const cctpPromises = Array.from(this.evmIndexers.entries()).map(
      ([chainId, indexer]) => this.indexCCTP(chainId, indexer)
    );

    // Run Arc-specific indexers in parallel
    const arcPromises: Promise<void>[] = [];

    if (this.arcNativeIndexer) {
      arcPromises.push(this.indexArcNative());
    }

    if (this.usycIndexer) {
      arcPromises.push(this.indexUSYC());
    }

    if (this.stableFXIndexer) {
      arcPromises.push(this.indexStableFX());
    }

    // Wait for all indexers
    await Promise.allSettled([...cctpPromises, ...arcPromises]);
  }

  /**
   * Index CCTP events for a chain
   */
  private async indexCCTP(chainId: string, indexer: EvmChainIndexer): Promise<void> {
    const indexerType = 'cctp';

    try {
      const currentBlock = await indexer.getCurrentBlock();
      let lastIndexedBlock = await this.transferService.getLastIndexedBlock(chainId, indexerType);

      // First time indexing
      if (lastIndexedBlock === null) {
        lastIndexedBlock = indexer.calculateStartBlockForDays(currentBlock, config.syncDays);
        const blocksToSync = currentBlock - lastIndexedBlock;
        const estimatedDays = blocksToSync / indexer.getBlocksPerDay();
        console.log(`[CCTP:${chainId}] First run, syncing ~${estimatedDays.toFixed(1)} days`);
      }

      const range = indexer.calculateBlockRange(lastIndexedBlock, currentBlock);
      if (!range) return;

      console.log(`[CCTP:${chainId}] Indexing blocks ${range.fromBlock}-${range.toBlock}`);

      const events = await indexer.indexBlockRange(range.fromBlock, range.toBlock);

      if (events.burns.length > 0) {
        const processed = await this.transferService.processBurnEvents(
          events.burns,
          chainId,
          indexer
        );
        console.log(`[CCTP:${chainId}] Processed ${processed} burns`);
      }

      if (events.mints.length > 0) {
        const completed = await this.transferService.processMintEvents(
          events.mints,
          chainId,
          indexer
        );
        console.log(`[CCTP:${chainId}] Completed ${completed} mints`);
      }

      await this.transferService.updateLastIndexedBlock(chainId, range.toBlock, indexerType);
      await this.transferService.updateStats(new Date());

    } catch (error) {
      console.error(`[CCTP:${chainId}] Error:`, error);
    }
  }

  /**
   * Index native transfers on Arc
   */
  private async indexArcNative(): Promise<void> {
    if (!this.arcNativeIndexer) return;

    const chainId = 'arc_testnet';
    const indexerType = 'native';

    try {
      const currentBlock = await this.arcNativeIndexer.getCurrentBlock();
      let lastIndexedBlock = await this.transferService.getLastIndexedBlock(chainId, indexerType);

      if (lastIndexedBlock === null) {
        lastIndexedBlock = this.arcNativeIndexer.calculateStartBlockForDays(currentBlock, config.syncDays);
        console.log(`[Native:arc] First run, starting from block ${lastIndexedBlock}`);
      }

      const range = this.arcNativeIndexer.calculateBlockRange(lastIndexedBlock, currentBlock);
      if (!range) return;

      console.log(`[Native:arc] Indexing blocks ${range.fromBlock}-${range.toBlock}`);

      const results = await this.arcNativeIndexer.indexBlockRange(range.fromBlock, range.toBlock);

      // Process USDC transfers
      if (results.usdc.transfers.length > 0) {
        const count = await this.transferService.processNativeTransfers(results.usdc.transfers, 'USDC');
        console.log(`[Native:arc] Processed ${count} USDC transfers`);
      }

      // Process EURC transfers
      if (results.eurc.transfers.length > 0) {
        const count = await this.transferService.processNativeTransfers(results.eurc.transfers, 'EURC');
        console.log(`[Native:arc] Processed ${count} EURC transfers`);
      }

      // Process USYC transfers (regular transfers, not mints/redeems)
      if (results.usyc.transfers.length > 0) {
        const count = await this.transferService.processNativeTransfers(results.usyc.transfers, 'USYC');
        console.log(`[Native:arc] Processed ${count} USYC transfers`);
      }

      await this.transferService.updateLastIndexedBlock(chainId, range.toBlock, indexerType);

    } catch (error) {
      console.error('[Native:arc] Error:', error);
    }
  }

  /**
   * Index USYC activity (mints/redeems)
   */
  private async indexUSYC(): Promise<void> {
    if (!this.usycIndexer) return;

    const chainId = 'arc_testnet';
    const indexerType = 'usyc';

    try {
      const currentBlock = await this.usycIndexer.getCurrentBlock();
      let lastIndexedBlock = await this.transferService.getLastIndexedBlock(chainId, indexerType);

      if (lastIndexedBlock === null) {
        lastIndexedBlock = this.usycIndexer.calculateStartBlockForDays(currentBlock, config.syncDays);
        console.log(`[USYC:arc] First run, starting from block ${lastIndexedBlock}`);
      }

      const range = this.usycIndexer.calculateBlockRange(lastIndexedBlock, currentBlock);
      if (!range) return;

      console.log(`[USYC:arc] Indexing blocks ${range.fromBlock}-${range.toBlock}`);

      const activity = await this.usycIndexer.indexBlockRange(range.fromBlock, range.toBlock);

      if (activity.deposits.length > 0) {
        const count = await this.transferService.processUSYCDeposits(activity.deposits);
        console.log(`[USYC:arc] Processed ${count} deposits (mints)`);
      }

      if (activity.withdrawals.length > 0) {
        const count = await this.transferService.processUSYCWithdrawals(activity.withdrawals);
        console.log(`[USYC:arc] Processed ${count} withdrawals (redeems)`);
      }

      if (activity.transfers.length > 0) {
        const count = await this.transferService.processUSYCTransfers(activity.transfers);
        console.log(`[USYC:arc] Processed ${count} transfers`);
      }

      await this.transferService.updateLastIndexedBlock(chainId, range.toBlock, indexerType);

    } catch (error) {
      console.error('[USYC:arc] Error:', error);
    }
  }

  /**
   * Index StableFX swaps
   */
  private async indexStableFX(): Promise<void> {
    if (!this.stableFXIndexer) return;

    const chainId = 'arc_testnet';
    const indexerType = 'fx';

    try {
      const currentBlock = await this.stableFXIndexer.getCurrentBlock();
      let lastIndexedBlock = await this.transferService.getLastIndexedBlock(chainId, indexerType);

      if (lastIndexedBlock === null) {
        lastIndexedBlock = this.stableFXIndexer.calculateStartBlockForDays(currentBlock, config.syncDays);
        console.log(`[FX:arc] First run, starting from block ${lastIndexedBlock}`);
      }

      const range = this.stableFXIndexer.calculateBlockRange(lastIndexedBlock, currentBlock);
      if (!range) return;

      console.log(`[FX:arc] Indexing blocks ${range.fromBlock}-${range.toBlock}`);

      const results = await this.stableFXIndexer.indexBlockRange(range.fromBlock, range.toBlock);

      if (results.swaps.length > 0) {
        const count = await this.transferService.processFXSwaps(results.swaps, this.stableFXIndexer);
        console.log(`[FX:arc] Processed ${count} swaps`);
        
        // Update FX daily stats
        await this.transferService.updateFXStats(new Date());
      }

      await this.transferService.updateLastIndexedBlock(chainId, range.toBlock, indexerType);

    } catch (error) {
      console.error('[FX:arc] Error:', error);
    }
  }
}

// ============================================
// Entry Point
// ============================================

const indexer = new Indexer();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT');
  indexer.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM');
  indexer.stop();
  process.exit(0);
});

// Start the indexer
indexer.start().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
