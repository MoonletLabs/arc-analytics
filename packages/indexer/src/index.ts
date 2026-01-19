import 'dotenv/config';

// Check if indexer is disabled (use dummy data mode)
if (process.env.INDEXER_DISABLED === 'true') {
  console.log('\n========================================');
  console.log('   Indexer DISABLED (using dummy data)  ');
  console.log('========================================\n');
  console.log('To enable the indexer, remove INDEXER_DISABLED from .env');
  console.log('To populate with dummy data, run: pnpm db:seed\n');
  process.exit(0);
}

import { getDb } from '@usdc-eurc-analytics/db';
import { sleep } from '@usdc-eurc-analytics/shared';
import { config } from './config.js';
import { createEvmIndexers, type EvmChainIndexer } from './chains/evm.js';
import { ArcNativeIndexer, createArcNativeIndexer } from './chains/arc-native.js';
import { USYCIndexer, createUSYCIndexer } from './chains/arc-usyc.js';
import { StableFXIndexer, createStableFXIndexer } from './chains/arc-stablefx.js';
import { TransferService } from './services/transfer-service.js';

// ============================================
// Logging Utilities
// ============================================

const LOG_COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(prefix: string, color: string, message: string, ...args: any[]): void {
  console.log(`${LOG_COLORS.gray}[${timestamp()}]${LOG_COLORS.reset} ${color}[${prefix}]${LOG_COLORS.reset} ${message}`, ...args);
}

function logInfo(prefix: string, message: string, ...args: any[]): void {
  log(prefix, LOG_COLORS.cyan, message, ...args);
}

function logSuccess(prefix: string, message: string, ...args: any[]): void {
  log(prefix, LOG_COLORS.green, message, ...args);
}

function logWarn(prefix: string, message: string, ...args: any[]): void {
  log(prefix, LOG_COLORS.yellow, message, ...args);
}

function logError(prefix: string, message: string, ...args: any[]): void {
  log(prefix, LOG_COLORS.red, message, ...args);
}

function logDebug(prefix: string, message: string, ...args: any[]): void {
  if (process.env.DEBUG === 'true') {
    log(prefix, LOG_COLORS.gray, message, ...args);
  }
}

function formatBlockRange(from: number, to: number): string {
  const count = to - from + 1;
  return `${from.toLocaleString()}-${to.toLocaleString()} (${count.toLocaleString()} blocks)`;
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

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
        logInfo('Init', 'Arc Native Transfer indexer enabled');
      }

      if (config.enableUSYC && config.arcConfig.usyc) {
        this.usycIndexer = createUSYCIndexer(config.arcConfig, config.batchSize);
        logInfo('Init', 'USYC Activity indexer enabled');
      }

      if (config.enableStableFX && config.arcConfig.fxEscrow) {
        this.stableFXIndexer = createStableFXIndexer(config.arcConfig, config.batchSize);
        logInfo('Init', 'StableFX indexer enabled');
      }
    }
  }

  /**
   * Start the indexer
   */
  async start(): Promise<void> {
    console.log('');
    console.log(`${LOG_COLORS.bright}${LOG_COLORS.magenta}========================================${LOG_COLORS.reset}`);
    console.log(`${LOG_COLORS.bright}${LOG_COLORS.magenta}   Arc Analytics Indexer Starting...   ${LOG_COLORS.reset}`);
    console.log(`${LOG_COLORS.bright}${LOG_COLORS.magenta}========================================${LOG_COLORS.reset}`);
    console.log('');
    console.log(`${LOG_COLORS.cyan}Configuration:${LOG_COLORS.reset}`);
    console.log(`  CCTP Chains:    ${Array.from(this.evmIndexers.keys()).join(', ')}`);
    console.log(`  Poll interval:  ${config.pollIntervalMs}ms`);
    console.log(`  Batch size:     ${formatNumber(config.batchSize)} blocks`);
    console.log(`  Sync days:      ${config.syncDays} days (first run)`);
    console.log('');
    console.log(`${LOG_COLORS.cyan}Enabled Indexers:${LOG_COLORS.reset}`);
    console.log(`  CCTP (V1/V2):   ${this.evmIndexers.size} chains`);
    console.log(`  Arc Native:     ${this.arcNativeIndexer ? `${LOG_COLORS.green}enabled${LOG_COLORS.reset}` : `${LOG_COLORS.gray}disabled${LOG_COLORS.reset}`}`);
    console.log(`  USYC:           ${this.usycIndexer ? `${LOG_COLORS.green}enabled${LOG_COLORS.reset}` : `${LOG_COLORS.gray}disabled${LOG_COLORS.reset}`}`);
    console.log(`  StableFX:       ${this.stableFXIndexer ? `${LOG_COLORS.green}enabled${LOG_COLORS.reset}` : `${LOG_COLORS.gray}disabled${LOG_COLORS.reset}`}`);
    console.log('');
    
    if (config.arcConfig) {
      console.log(`${LOG_COLORS.cyan}Arc Token Addresses:${LOG_COLORS.reset}`);
      console.log(`  USDC:           ${config.arcConfig.usdc}`);
      console.log(`  EURC:           ${config.arcConfig.eurc || 'not configured'}`);
      console.log(`  USYC:           ${config.arcConfig.usyc || 'not configured'}`);
      console.log(`  FX Escrow:      ${config.arcConfig.fxEscrow || 'not configured'}`);
      console.log('');
      console.log(`${LOG_COLORS.cyan}Excluded Addresses (CCTP/Gateway):${LOG_COLORS.reset}`);
      console.log(`  TokenMessenger: ${config.arcConfig.tokenMessengerV2 || config.arcConfig.tokenMessenger || 'none'}`);
      console.log(`  TokenMinter:    ${config.arcConfig.tokenMinterV2 || 'none'}`);
      console.log(`  Gateway Wallet: ${config.arcConfig.gatewayWallet || 'none'}`);
      console.log(`  Gateway Minter: ${config.arcConfig.gatewayMinter || 'none'}`);
      console.log('');
    }
    console.log(`${LOG_COLORS.gray}Starting indexing loop...${LOG_COLORS.reset}`);
    console.log('');

    this.isRunning = true;
    let cycleCount = 0;

    while (this.isRunning) {
      cycleCount++;
      const cycleStart = Date.now();
      
      try {
        logDebug('Cycle', `Starting cycle #${cycleCount}`);
        await this.runIndexingCycle();
        const cycleDuration = Date.now() - cycleStart;
        logDebug('Cycle', `Cycle #${cycleCount} completed in ${cycleDuration}ms`);
      } catch (error) {
        logError('Cycle', `Error during cycle #${cycleCount}:`, error);
      }

      await sleep(config.pollIntervalMs);
    }
  }

  /**
   * Stop the indexer
   */
  stop(): void {
    logWarn('System', 'Stopping indexer...');
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
    const prefix = `CCTP:${chainId}`;
    const indexerType = 'cctp';

    try {
      const currentBlock = await indexer.getCurrentBlock();
      let lastIndexedBlock = await this.transferService.getLastIndexedBlock(chainId, indexerType);

      // First time indexing
      if (lastIndexedBlock === null) {
        lastIndexedBlock = indexer.calculateStartBlockForDays(currentBlock, config.syncDays);
        const blocksToSync = currentBlock - lastIndexedBlock;
        const estimatedDays = blocksToSync / indexer.getBlocksPerDay();
        logWarn(prefix, `First run - syncing ~${estimatedDays.toFixed(1)} days (${formatNumber(blocksToSync)} blocks)`);
        logInfo(prefix, `Starting from block ${formatNumber(lastIndexedBlock)}, current: ${formatNumber(currentBlock)}`);
      }

      const range = indexer.calculateBlockRange(lastIndexedBlock, currentBlock);
      if (!range) {
        logDebug(prefix, `Up to date at block ${formatNumber(currentBlock)}`);
        return;
      }

      const behindBlocks = currentBlock - range.toBlock;
      const behindInfo = behindBlocks > 0 ? ` (${formatNumber(behindBlocks)} behind)` : '';
      logInfo(prefix, `Indexing ${formatBlockRange(range.fromBlock, range.toBlock)}${behindInfo}`);

      const events = await indexer.indexBlockRange(range.fromBlock, range.toBlock);

      if (events.burns.length > 0) {
        const processed = await this.transferService.processBurnEvents(
          events.burns,
          chainId,
          indexer
        );
        logSuccess(prefix, `Processed ${processed} burn events (outgoing transfers)`);
      }

      if (events.mints.length > 0) {
        const completed = await this.transferService.processMintEvents(
          events.mints,
          chainId,
          indexer
        );
        logSuccess(prefix, `Completed ${completed} mint events (incoming transfers)`);
      }

      if (events.burns.length === 0 && events.mints.length === 0) {
        logDebug(prefix, `No events found in block range`);
      }

      await this.transferService.updateLastIndexedBlock(chainId, range.toBlock, indexerType);
      await this.transferService.updateStats(new Date());

    } catch (error) {
      logError(prefix, `Error:`, error);
    }
  }

  /**
   * Index native transfers on Arc
   */
  private async indexArcNative(): Promise<void> {
    if (!this.arcNativeIndexer) return;

    const prefix = 'Native:arc';
    const chainId = 'arc_testnet';
    const indexerType = 'native';

    try {
      const currentBlock = await this.arcNativeIndexer.getCurrentBlock();
      let lastIndexedBlock = await this.transferService.getLastIndexedBlock(chainId, indexerType);

      if (lastIndexedBlock === null) {
        lastIndexedBlock = this.arcNativeIndexer.calculateStartBlockForDays(currentBlock, config.syncDays);
        const blocksToSync = currentBlock - lastIndexedBlock;
        logWarn(prefix, `First run - syncing ${formatNumber(blocksToSync)} blocks`);
        logInfo(prefix, `Starting from block ${formatNumber(lastIndexedBlock)}, current: ${formatNumber(currentBlock)}`);
      }

      const range = this.arcNativeIndexer.calculateBlockRange(lastIndexedBlock, currentBlock);
      if (!range) {
        logDebug(prefix, `Up to date at block ${formatNumber(currentBlock)}`);
        return;
      }

      const behindBlocks = currentBlock - range.toBlock;
      const behindInfo = behindBlocks > 0 ? ` (${formatNumber(behindBlocks)} behind)` : '';
      logInfo(prefix, `Indexing ${formatBlockRange(range.fromBlock, range.toBlock)}${behindInfo}`);

      const results = await this.arcNativeIndexer.indexBlockRange(range.fromBlock, range.toBlock);

      let totalProcessed = 0;

      // Log summary of what was found
      logInfo(prefix, `Found: USDC=${results.usdc.transfers.length}, EURC=${results.eurc.transfers.length}, USYC=${results.usyc.transfers.length} transfers`);

      // Process USDC transfers
      if (results.usdc.transfers.length > 0) {
        const count = await this.transferService.processNativeTransfers(results.usdc.transfers, 'USDC');
        logSuccess(prefix, `Saved ${count} USDC transfers to database`);
        totalProcessed += count;
      }

      // Process EURC transfers
      if (results.eurc.transfers.length > 0) {
        const count = await this.transferService.processNativeTransfers(results.eurc.transfers, 'EURC');
        logSuccess(prefix, `Saved ${count} EURC transfers to database`);
        totalProcessed += count;
      }

      // Process USYC transfers (regular transfers, not mints/redeems)
      if (results.usyc.transfers.length > 0) {
        const count = await this.transferService.processNativeTransfers(results.usyc.transfers, 'USYC');
        logSuccess(prefix, `Saved ${count} USYC transfers to database`);
        totalProcessed += count;
      }

      if (totalProcessed === 0) {
        logInfo(prefix, `No native transfers to save in this block range`);
      } else {
        // Update hourly stats when we have new transfers
        await this.transferService.updateHourlyStats(new Date());
        logSuccess(prefix, `Updated hourly stats - total ${totalProcessed} transfers processed`);
      }

      await this.transferService.updateLastIndexedBlock(chainId, range.toBlock, indexerType);

    } catch (error) {
      logError(prefix, `Error:`, error);
    }
  }

  /**
   * Index USYC activity (mints/redeems)
   */
  private async indexUSYC(): Promise<void> {
    if (!this.usycIndexer) return;

    const prefix = 'USYC:arc';
    const chainId = 'arc_testnet';
    const indexerType = 'usyc';

    try {
      const currentBlock = await this.usycIndexer.getCurrentBlock();
      let lastIndexedBlock = await this.transferService.getLastIndexedBlock(chainId, indexerType);

      if (lastIndexedBlock === null) {
        lastIndexedBlock = this.usycIndexer.calculateStartBlockForDays(currentBlock, config.syncDays);
        const blocksToSync = currentBlock - lastIndexedBlock;
        logWarn(prefix, `First run - syncing ${formatNumber(blocksToSync)} blocks`);
        logInfo(prefix, `Starting from block ${formatNumber(lastIndexedBlock)}, current: ${formatNumber(currentBlock)}`);
      }

      const range = this.usycIndexer.calculateBlockRange(lastIndexedBlock, currentBlock);
      if (!range) {
        logDebug(prefix, `Up to date at block ${formatNumber(currentBlock)}`);
        return;
      }

      const behindBlocks = currentBlock - range.toBlock;
      const behindInfo = behindBlocks > 0 ? ` (${formatNumber(behindBlocks)} behind)` : '';
      logInfo(prefix, `Indexing ${formatBlockRange(range.fromBlock, range.toBlock)}${behindInfo}`);

      const activity = await this.usycIndexer.indexBlockRange(range.fromBlock, range.toBlock);

      let totalProcessed = 0;

      if (activity.deposits.length > 0) {
        const count = await this.transferService.processUSYCDeposits(activity.deposits);
        logSuccess(prefix, `Processed ${count} deposits (mints)`);
        totalProcessed += count;
      }

      if (activity.withdrawals.length > 0) {
        const count = await this.transferService.processUSYCWithdrawals(activity.withdrawals);
        logSuccess(prefix, `Processed ${count} withdrawals (redeems)`);
        totalProcessed += count;
      }

      if (activity.transfers.length > 0) {
        const count = await this.transferService.processUSYCTransfers(activity.transfers);
        logSuccess(prefix, `Processed ${count} transfers`);
        totalProcessed += count;
      }

      if (totalProcessed === 0) {
        logDebug(prefix, `No USYC activity found in block range`);
      }

      await this.transferService.updateLastIndexedBlock(chainId, range.toBlock, indexerType);

    } catch (error) {
      logError(prefix, `Error:`, error);
    }
  }

  /**
   * Index StableFX swaps
   */
  private async indexStableFX(): Promise<void> {
    if (!this.stableFXIndexer) return;

    const prefix = 'FX:arc';
    const chainId = 'arc_testnet';
    const indexerType = 'fx';

    try {
      const currentBlock = await this.stableFXIndexer.getCurrentBlock();
      let lastIndexedBlock = await this.transferService.getLastIndexedBlock(chainId, indexerType);

      if (lastIndexedBlock === null) {
        lastIndexedBlock = this.stableFXIndexer.calculateStartBlockForDays(currentBlock, config.syncDays);
        const blocksToSync = currentBlock - lastIndexedBlock;
        logWarn(prefix, `First run - syncing ${formatNumber(blocksToSync)} blocks`);
        logInfo(prefix, `Starting from block ${formatNumber(lastIndexedBlock)}, current: ${formatNumber(currentBlock)}`);
      }

      const range = this.stableFXIndexer.calculateBlockRange(lastIndexedBlock, currentBlock);
      if (!range) {
        logDebug(prefix, `Up to date at block ${formatNumber(currentBlock)}`);
        return;
      }

      const behindBlocks = currentBlock - range.toBlock;
      const behindInfo = behindBlocks > 0 ? ` (${formatNumber(behindBlocks)} behind)` : '';
      logInfo(prefix, `Indexing ${formatBlockRange(range.fromBlock, range.toBlock)}${behindInfo}`);

      const results = await this.stableFXIndexer.indexBlockRange(range.fromBlock, range.toBlock);

      if (results.swaps.length > 0) {
        const count = await this.transferService.processFXSwaps(results.swaps, this.stableFXIndexer);
        logSuccess(prefix, `Processed ${count} FX swaps (USDC <-> EURC)`);
        
        // Update FX daily stats
        await this.transferService.updateFXStats(new Date());
      } else {
        logDebug(prefix, `No FX swaps found in block range`);
      }

      await this.transferService.updateLastIndexedBlock(chainId, range.toBlock, indexerType);

    } catch (error) {
      logError(prefix, `Error:`, error);
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
