import {
  createPublicClient,
  http,
  type PublicClient,
  type Log,
  parseAbiItem,
  decodeEventLog,
} from 'viem';
import {
  ERC20_ABI,
  type ChainConfig,
  type ERC20TransferEvent,
  ARC_TESTNET_CONFIG,
  getTokenMessenger,
} from '@usdc-eurc-analytics/shared';

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

    const logs = await this.client.getLogs({
      address: tokenAddress,
      event: TRANSFER_EVENT,
      fromBlock: BigInt(fromBlock),
      toBlock: BigInt(toBlock),
    });

    for (const log of logs) {
      const event = this.parseTransferEvent(log);
      if (event && this.isNativeTransfer(event)) {
        const timestamp = await this.getBlockTimestamp(log.blockNumber);
        transfers.push({
          ...event,
          timestamp,
        });
      }
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
