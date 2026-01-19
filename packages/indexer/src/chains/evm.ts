import {
  createPublicClient,
  http,
  type PublicClient,
  type Log,
  parseAbiItem,
  decodeEventLog,
} from 'viem';
import {
  TOKEN_MESSENGER_ABI,
  type ChainConfig,
  type DepositForBurnEvent,
  type MintAndWithdrawEvent,
  bytes32ToAddress,
  TESTNET_CHAINS,
} from '@usdc-eurc-analytics/shared';

// ============================================
// Types
// ============================================

export interface EvmIndexerOptions {
  chainConfig: ChainConfig & { rpcUrl: string };
  batchSize: number;
}

export interface IndexedEvents {
  burns: DepositForBurnEvent[];
  mints: MintAndWithdrawEvent[];
  lastBlock: number;
}

// ============================================
// Event Signatures
// ============================================

const DEPOSIT_FOR_BURN_EVENT = parseAbiItem(
  'event DepositForBurn(uint64 indexed nonce, address indexed burnToken, uint256 amount, address indexed depositor, bytes32 mintRecipient, uint32 destinationDomain, bytes32 destinationTokenMessenger, bytes32 destinationCaller)'
);

const MINT_AND_WITHDRAW_EVENT = parseAbiItem(
  'event MintAndWithdraw(address indexed mintRecipient, uint256 amount, address indexed mintToken)'
);

// ============================================
// EVM Chain Indexer
// ============================================

export class EvmChainIndexer {
  private client: PublicClient;
  private chainConfig: ChainConfig & { rpcUrl: string };
  private batchSize: number;

  constructor(options: EvmIndexerOptions) {
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

  get chainName(): string {
    return this.chainConfig.name;
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
   * Index events from a block range
   */
  async indexBlockRange(fromBlock: number, toBlock: number): Promise<IndexedEvents> {
    const burns: DepositForBurnEvent[] = [];
    const mints: MintAndWithdrawEvent[] = [];

    // Fetch burn events (DepositForBurn)
    const burnLogs = await this.client.getLogs({
      address: this.chainConfig.tokenMessenger,
      event: DEPOSIT_FOR_BURN_EVENT,
      fromBlock: BigInt(fromBlock),
      toBlock: BigInt(toBlock),
    });

    for (const log of burnLogs) {
      const timestamp = await this.getBlockTimestamp(log.blockNumber);
      const event = this.parseBurnEvent(log, timestamp);
      if (event) {
        burns.push(event);
      }
    }

    // Fetch mint events (MintAndWithdraw)
    const mintLogs = await this.client.getLogs({
      address: this.chainConfig.tokenMessenger,
      event: MINT_AND_WITHDRAW_EVENT,
      fromBlock: BigInt(fromBlock),
      toBlock: BigInt(toBlock),
    });

    for (const log of mintLogs) {
      const timestamp = await this.getBlockTimestamp(log.blockNumber);
      const event = this.parseMintEvent(log, timestamp);
      if (event) {
        mints.push(event);
      }
    }

    return {
      burns,
      mints,
      lastBlock: toBlock,
    };
  }

  /**
   * Parse a DepositForBurn event log
   */
  private parseBurnEvent(log: Log, timestamp: number): DepositForBurnEvent | null {
    try {
      const decoded = decodeEventLog({
        abi: TOKEN_MESSENGER_ABI,
        data: log.data,
        topics: log.topics,
        eventName: 'DepositForBurn',
      });

      const args = decoded.args as {
        nonce: bigint;
        burnToken: `0x${string}`;
        amount: bigint;
        depositor: `0x${string}`;
        mintRecipient: `0x${string}`;
        destinationDomain: number;
        destinationTokenMessenger: `0x${string}`;
        destinationCaller: `0x${string}`;
      };

      return {
        nonce: args.nonce,
        burnToken: args.burnToken,
        amount: args.amount,
        depositor: args.depositor,
        mintRecipient: bytes32ToAddress(args.mintRecipient),
        destinationDomain: args.destinationDomain,
        destinationTokenMessenger: args.destinationTokenMessenger,
        destinationCaller: args.destinationCaller,
        transactionHash: log.transactionHash!,
        blockNumber: log.blockNumber!,
        timestamp,
      };
    } catch (error) {
      console.error(`Failed to parse burn event: ${error}`);
      return null;
    }
  }

  /**
   * Parse a MintAndWithdraw event log
   */
  private parseMintEvent(log: Log, timestamp: number): MintAndWithdrawEvent | null {
    try {
      const decoded = decodeEventLog({
        abi: TOKEN_MESSENGER_ABI,
        data: log.data,
        topics: log.topics,
        eventName: 'MintAndWithdraw',
      });

      const args = decoded.args as {
        mintRecipient: `0x${string}`;
        amount: bigint;
        mintToken: `0x${string}`;
      };

      return {
        mintRecipient: args.mintRecipient,
        amount: args.amount,
        mintToken: args.mintToken,
        transactionHash: log.transactionHash!,
        blockNumber: log.blockNumber!,
        timestamp,
      };
    } catch (error) {
      console.error(`Failed to parse mint event: ${error}`);
      return null;
    }
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
   * Calculate optimal block range to fetch
   */
  calculateBlockRange(
    lastIndexedBlock: number,
    currentBlock: number
  ): { fromBlock: number; toBlock: number } | null {
    const fromBlock = lastIndexedBlock + 1;

    if (fromBlock > currentBlock) {
      return null; // Already up to date
    }

    const toBlock = Math.min(fromBlock + this.batchSize - 1, currentBlock);

    return { fromBlock, toBlock };
  }

  /**
   * Get estimated blocks per day for this chain
   * These are approximate values based on average block times
   */
  getBlocksPerDay(): number {
    // Average block times (in seconds) for different chains
    const blockTimes: Record<number, number> = {
      11155111: 12,    // Ethereum Sepolia (~12s)
      43113: 2,        // Avalanche Fuji (~2s)
      421614: 0.25,    // Arbitrum Sepolia (~250ms)
      84532: 2,        // Base Sepolia (~2s)
      80002: 2,        // Polygon Amoy (~2s)
      11155420: 2,     // Optimism Sepolia (~2s)
    };

    const blockTime = blockTimes[this.chainConfig.chainId] || 12; // Default to 12s
    const secondsPerDay = 24 * 60 * 60;
    return Math.floor(secondsPerDay / blockTime);
  }

  /**
   * Calculate starting block for N days ago
   */
  calculateStartBlockForDays(currentBlock: number, days: number): number {
    if (days <= 0) {
      return currentBlock; // Start from latest
    }
    const blocksToGoBack = this.getBlocksPerDay() * days;
    return Math.max(0, currentBlock - blocksToGoBack);
  }
}

/**
 * Create indexers for all configured chains
 */
export function createEvmIndexers(
  chains: Record<string, ChainConfig & { rpcUrl: string }>,
  batchSize: number
): Map<string, EvmChainIndexer> {
  const indexers = new Map<string, EvmChainIndexer>();

  for (const [chainId, chainConfig] of Object.entries(chains)) {
    if (chainConfig.type === 'evm') {
      indexers.set(
        chainId,
        new EvmChainIndexer({
          chainConfig,
          batchSize,
        })
      );
    }
  }

  return indexers;
}
