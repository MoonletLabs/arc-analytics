import {
  createPublicClient,
  http,
  type PublicClient,
  type Log,
  parseAbiItem,
  decodeEventLog,
} from 'viem';
import {
  FX_ESCROW_ABI,
  type ChainConfig,
  type FXSwapSettledEvent,
} from '@usdc-eurc-analytics/shared';

// ============================================
// Types
// ============================================

export interface StableFXIndexerOptions {
  chainConfig: ChainConfig & { rpcUrl: string };
  batchSize: number;
}

export interface IndexedFXSwaps {
  swaps: FXSwapSettledEvent[];
  lastBlock: number;
}

// ============================================
// Event Signatures
// ============================================

const TRADE_SETTLED_EVENT = parseAbiItem(
  'event TradeSettled(bytes32 indexed tradeId, address indexed maker, address indexed taker, address makerToken, address takerToken, uint256 makerAmount, uint256 takerAmount)'
);

// ============================================
// StableFX Indexer
// ============================================

export class StableFXIndexer {
  private client: PublicClient;
  private chainConfig: ChainConfig & { rpcUrl: string };
  private batchSize: number;

  constructor(options: StableFXIndexerOptions) {
    this.chainConfig = options.chainConfig;
    this.batchSize = options.batchSize;

    this.client = createPublicClient({
      transport: http(options.chainConfig.rpcUrl, {
        retryCount: 3,
        retryDelay: 1000,
      }),
    });
  }

  get chainId(): string {
    return this.chainConfig.id;
  }

  get fxEscrowAddress(): `0x${string}` | undefined {
    return this.chainConfig.fxEscrow;
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
   * Index FX swaps from a block range
   */
  async indexBlockRange(fromBlock: number, toBlock: number): Promise<IndexedFXSwaps> {
    const swaps: FXSwapSettledEvent[] = [];

    if (!this.fxEscrowAddress) {
      console.warn('FxEscrow address not configured');
      return { swaps, lastBlock: toBlock };
    }

    // Fetch TradeSettled events
    const logs = await this.client.getLogs({
      address: this.fxEscrowAddress,
      event: TRADE_SETTLED_EVENT,
      fromBlock: BigInt(fromBlock),
      toBlock: BigInt(toBlock),
    });

    for (const log of logs) {
      const timestamp = await this.getBlockTimestamp(log.blockNumber);
      const event = this.parseTradeSettledEvent(log, timestamp);
      if (event && this.isValidFXSwap(event)) {
        swaps.push(event);
      }
    }

    return {
      swaps,
      lastBlock: toBlock,
    };
  }

  /**
   * Parse a TradeSettled event
   */
  private parseTradeSettledEvent(log: Log, timestamp: number): FXSwapSettledEvent | null {
    try {
      const decoded = decodeEventLog({
        abi: FX_ESCROW_ABI,
        data: log.data,
        topics: log.topics,
        eventName: 'TradeSettled',
      });

      const args = decoded.args as {
        tradeId: `0x${string}`;
        maker: `0x${string}`;
        taker: `0x${string}`;
        makerToken: `0x${string}`;
        takerToken: `0x${string}`;
        makerAmount: bigint;
        takerAmount: bigint;
      };

      return {
        tradeId: args.tradeId,
        maker: args.maker,
        taker: args.taker,
        baseToken: args.makerToken,
        quoteToken: args.takerToken,
        baseAmount: args.makerAmount,
        quoteAmount: args.takerAmount,
        transactionHash: log.transactionHash!,
        blockNumber: log.blockNumber!,
        timestamp,
      };
    } catch (error) {
      console.error(`Failed to parse TradeSettled event: ${error}`);
      return null;
    }
  }

  /**
   * Check if this is a valid USDC/EURC swap
   */
  private isValidFXSwap(event: FXSwapSettledEvent): boolean {
    const baseTokenLower = event.baseToken.toLowerCase();
    const quoteTokenLower = event.quoteToken.toLowerCase();

    const usdcLower = this.chainConfig.usdc.toLowerCase();
    const eurcLower = this.chainConfig.eurc?.toLowerCase();

    if (!eurcLower) {
      return false;
    }

    // Valid swaps are USDC <-> EURC
    const isUsdcBase = baseTokenLower === usdcLower;
    const isEurcBase = baseTokenLower === eurcLower;
    const isUsdcQuote = quoteTokenLower === usdcLower;
    const isEurcQuote = quoteTokenLower === eurcLower;

    return (isUsdcBase && isEurcQuote) || (isEurcBase && isUsdcQuote);
  }

  /**
   * Determine token type from address
   */
  getTokenType(tokenAddress: `0x${string}`): 'USDC' | 'EURC' | null {
    const lowerAddress = tokenAddress.toLowerCase();
    if (lowerAddress === this.chainConfig.usdc.toLowerCase()) {
      return 'USDC';
    }
    if (this.chainConfig.eurc && lowerAddress === this.chainConfig.eurc.toLowerCase()) {
      return 'EURC';
    }
    return null;
  }

  /**
   * Get estimated blocks per day
   */
  getBlocksPerDay(): number {
    const blockTime = this.chainConfig.blockTime || 0.5;
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
 * Create StableFX indexer
 */
export function createStableFXIndexer(
  chainConfig: ChainConfig & { rpcUrl: string },
  batchSize: number
): StableFXIndexer {
  return new StableFXIndexer({
    chainConfig,
    batchSize,
  });
}
