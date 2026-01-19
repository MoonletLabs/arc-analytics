import {
  createPublicClient,
  http,
  type PublicClient,
  type Log,
  parseAbiItem,
  decodeEventLog,
  formatUnits,
} from 'viem';
import {
  ERC20_ABI,
  type ChainConfig,
  type ERC20TransferEvent,
  ARC_TESTNET_CONFIG,
  getTokenMessenger,
  TOKEN_DECIMALS,
} from '@usdc-eurc-analytics/shared';

// Logging utilities
const LOG_COLORS = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
};

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(prefix: string, color: string, message: string, ...args: any[]): void {
  console.log(`${LOG_COLORS.gray}[${timestamp()}]${LOG_COLORS.reset} ${color}[${prefix}]${LOG_COLORS.reset} ${message}`, ...args);
}

// ============================================
// Types
// ============================================

export interface ArcNativeIndexerOptions {
  chainConfig: ChainConfig & { rpcUrl: string };
  batchSize: number;
}

export interface IndexedNativeTransfers {
  transfers: ERC20TransferEvent[];
  token: 'USDC' | 'EURC' | 'USYC';
  lastBlock: number;
}

// ============================================
// Event Signature
// ============================================

const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)'
);

// ============================================
// Arc Native Transfer Indexer
// ============================================

export class ArcNativeIndexer {
  private client: PublicClient;
  private chainConfig: ChainConfig & { rpcUrl: string };
  private batchSize: number;
  
  // Addresses to exclude (CCTP contracts - transfers to/from these are CCTP, not native)
  private excludedAddresses: Set<string>;

  constructor(options: ArcNativeIndexerOptions) {
    this.chainConfig = options.chainConfig;
    this.batchSize = options.batchSize;

    this.client = createPublicClient({
      transport: http(options.chainConfig.rpcUrl, {
        retryCount: 3,
        retryDelay: 1000,
      }),
    });

    // Build list of addresses to exclude (CCTP-related transfers)
    this.excludedAddresses = new Set<string>();
    
    const tokenMessenger = getTokenMessenger(this.chainConfig);
    if (tokenMessenger) {
      this.excludedAddresses.add(tokenMessenger.toLowerCase());
    }
    if (this.chainConfig.tokenMinterV2) {
      this.excludedAddresses.add(this.chainConfig.tokenMinterV2.toLowerCase());
    }
    if (this.chainConfig.gatewayWallet) {
      this.excludedAddresses.add(this.chainConfig.gatewayWallet.toLowerCase());
    }
    if (this.chainConfig.gatewayMinter) {
      this.excludedAddresses.add(this.chainConfig.gatewayMinter.toLowerCase());
    }
    
    // Zero address (mints/burns)
    this.excludedAddresses.add('0x0000000000000000000000000000000000000000');
  }

  get chainId(): string {
    return this.chainConfig.id;
  }

  /**
   * Get the current block number
   */
  async getCurrentBlock(): Promise<number> {
    const blockNumber = await this.client.getBlockNumber();
    return Number(blockNumber);
  }

  /**
   * Get block timestamp
   */
  async getBlockTimestamp(blockNumber: bigint): Promise<number> {
    const block = await this.client.getBlock({ blockNumber });
    return Number(block.timestamp);
  }

  /**
   * Index native transfers for a specific token
   */
  async indexTokenTransfers(
    tokenAddress: `0x${string}`,
    tokenType: 'USDC' | 'EURC' | 'USYC',
    fromBlock: number,
    toBlock: number
  ): Promise<IndexedNativeTransfers> {
    const transfers: ERC20TransferEvent[] = [];
    const prefix = `Native:${tokenType}`;

    const logs = await this.client.getLogs({
      address: tokenAddress,
      event: TRANSFER_EVENT,
      fromBlock: BigInt(fromBlock),
      toBlock: BigInt(toBlock),
    });

    if (logs.length > 0) {
      log(prefix, LOG_COLORS.cyan, `Found ${logs.length} raw Transfer events for ${tokenType} at ${tokenAddress}`);
    }

    let skippedCount = 0;
    for (const logEntry of logs) {
      const event = this.parseTransferEvent(logEntry);
      if (event) {
        if (this.isNativeTransfer(event)) {
          const ts = await this.getBlockTimestamp(logEntry.blockNumber);
          transfers.push({
            ...event,
            timestamp: ts,
          });
          
          // Log each transfer found
          const decimals = TOKEN_DECIMALS[tokenType] || 6;
          const formattedAmount = formatUnits(event.value, decimals);
          log(prefix, LOG_COLORS.green, 
            `Transfer: ${formattedAmount} ${tokenType} | ${event.from.slice(0, 10)}... -> ${event.to.slice(0, 10)}... | Block ${logEntry.blockNumber} | Tx ${event.transactionHash.slice(0, 14)}...`
          );
        } else {
          skippedCount++;
        }
      }
    }

    if (skippedCount > 0) {
      log(prefix, LOG_COLORS.yellow, `Skipped ${skippedCount} CCTP/gateway transfers`);
    }

    return {
      transfers,
      token: tokenType,
      lastBlock: toBlock,
    };
  }

  /**
   * Index all native transfers (USDC, EURC, USYC)
   */
  async indexBlockRange(fromBlock: number, toBlock: number): Promise<{
    usdc: IndexedNativeTransfers;
    eurc: IndexedNativeTransfers;
    usyc: IndexedNativeTransfers;
    lastBlock: number;
  }> {
    const [usdc, eurc, usyc] = await Promise.all([
      this.indexTokenTransfers(this.chainConfig.usdc, 'USDC', fromBlock, toBlock),
      this.chainConfig.eurc 
        ? this.indexTokenTransfers(this.chainConfig.eurc, 'EURC', fromBlock, toBlock)
        : Promise.resolve({ transfers: [], token: 'EURC' as const, lastBlock: toBlock }),
      this.chainConfig.usyc
        ? this.indexTokenTransfers(this.chainConfig.usyc, 'USYC', fromBlock, toBlock)
        : Promise.resolve({ transfers: [], token: 'USYC' as const, lastBlock: toBlock }),
    ]);

    return {
      usdc,
      eurc,
      usyc,
      lastBlock: toBlock,
    };
  }

  /**
   * Parse a Transfer event log
   */
  private parseTransferEvent(log: Log): Omit<ERC20TransferEvent, 'timestamp'> | null {
    try {
      const decoded = decodeEventLog({
        abi: ERC20_ABI,
        data: log.data,
        topics: log.topics,
        eventName: 'Transfer',
      });

      const args = decoded.args as {
        from: `0x${string}`;
        to: `0x${string}`;
        value: bigint;
      };

      return {
        from: args.from,
        to: args.to,
        value: args.value,
        transactionHash: log.transactionHash!,
        blockNumber: log.blockNumber!,
      };
    } catch (error) {
      console.error(`Failed to parse transfer event: ${error}`);
      return null;
    }
  }

  /**
   * Check if this is a native transfer (not CCTP-related)
   */
  private isNativeTransfer(event: Omit<ERC20TransferEvent, 'timestamp'>): boolean {
    const fromLower = event.from.toLowerCase();
    const toLower = event.to.toLowerCase();

    // Exclude transfers to/from CCTP contracts
    if (this.excludedAddresses.has(fromLower) || this.excludedAddresses.has(toLower)) {
      return false;
    }

    return true;
  }

  /**
   * Get estimated blocks per day for Arc
   */
  getBlocksPerDay(): number {
    const blockTime = this.chainConfig.blockTime || 0.5; // Arc ~500ms blocks
    const secondsPerDay = 24 * 60 * 60;
    return Math.floor(secondsPerDay / blockTime);
  }

  /**
   * Calculate starting block for N days ago
   */
  calculateStartBlockForDays(currentBlock: number, days: number): number {
    if (days <= 0) {
      return currentBlock;
    }
    const blocksToGoBack = this.getBlocksPerDay() * days;
    return Math.max(0, currentBlock - blocksToGoBack);
  }

  /**
   * Calculate optimal block range to fetch
   */
  calculateBlockRange(
    lastIndexedBlock: number,
    currentBlock: number
  ): { fromBlock: number; toBlock: number } | null {
    const fromBlock = lastIndexedBlock + 1;

    if (fromBlock > currentBlock) {
      return null;
    }

    const toBlock = Math.min(fromBlock + this.batchSize - 1, currentBlock);
    return { fromBlock, toBlock };
  }
}

/**
 * Create Arc native indexer
 */
export function createArcNativeIndexer(
  chainConfig: ChainConfig & { rpcUrl: string },
  batchSize: number
): ArcNativeIndexer {
  return new ArcNativeIndexer({
    chainConfig,
    batchSize,
  });
}
