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
  TOKEN_MESSENGER_V2_ABI,
  type ChainConfig,
  type DepositForBurnEvent,
  type DepositForBurnV2Event,
  type MintAndWithdrawEvent,
  bytes32ToAddress,
} from '@usdc-eurc-analytics/shared';

// ============================================
// Types
// ============================================

export interface EvmIndexerOptions {
  chainConfig: ChainConfig & { rpcUrl: string };
  batchSize: number;
}

export interface IndexedEvents {
  burns: (DepositForBurnEvent | DepositForBurnV2Event)[];
  mints: MintAndWithdrawEvent[];
  lastBlock: number;
}

// ============================================
// Event Signatures
// ============================================

// CCTP V1 Events
const DEPOSIT_FOR_BURN_EVENT_V1 = parseAbiItem(
  'event DepositForBurn(uint64 indexed nonce, address indexed burnToken, uint256 amount, address indexed depositor, bytes32 mintRecipient, uint32 destinationDomain, bytes32 destinationTokenMessenger, bytes32 destinationCaller)'
);

// CCTP V2 Events (Arc) - burnToken is NOT indexed, maxFee IS indexed
const DEPOSIT_FOR_BURN_EVENT_V2 = parseAbiItem(
  'event DepositForBurn(uint64 indexed nonce, address burnToken, uint256 amount, address indexed depositor, bytes32 mintRecipient, uint32 destinationDomain, bytes32 destinationTokenMessenger, bytes32 destinationCaller, uint256 indexed maxFee)'
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
  
  // Track which contract versions are available
  private hasV1: boolean;
  private hasV2: boolean;

  constructor(options: EvmIndexerOptions) {
    this.chainConfig = options.chainConfig;
    this.batchSize = options.batchSize;
    
    // Determine which contract versions are available
    this.hasV1 = !!options.chainConfig.tokenMessenger;
    this.hasV2 = !!options.chainConfig.tokenMessengerV2;

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

  get supportsV1(): boolean {
    return this.hasV1;
  }

  get supportsV2(): boolean {
    return this.hasV2;
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
   * Get V1 token messenger address
   */
  getTokenMessengerV1(): `0x${string}` | undefined {
    return this.chainConfig.tokenMessenger;
  }

  /**
   * Get V2 token messenger address
   */
  getTokenMessengerV2(): `0x${string}` | undefined {
    return this.chainConfig.tokenMessengerV2;
  }

  /**
   * Index events from a block range - queries BOTH V1 and V2 contracts if available
   */
  async indexBlockRange(fromBlock: number, toBlock: number): Promise<IndexedEvents> {
    const burns: (DepositForBurnEvent | DepositForBurnV2Event)[] = [];
    const mints: MintAndWithdrawEvent[] = [];
    const isDebug = process.env.DEBUG === 'true';

    // Check if any contracts are configured
    if (!this.hasV1 && !this.hasV2) {
      console.warn(`[${this.chainId}] No token messenger configured!`);
      return { burns, mints, lastBlock: toBlock };
    }

    if (isDebug) {
      const versions = [];
      if (this.hasV1) versions.push(`V1: ${this.chainConfig.tokenMessenger}`);
      if (this.hasV2) versions.push(`V2: ${this.chainConfig.tokenMessengerV2}`);
      console.log(`[${this.chainId}] Indexing contracts: ${versions.join(', ')}`);
    }

    // Index V1 contracts if available
    if (this.hasV1 && this.chainConfig.tokenMessenger) {
      await this.indexContractEvents(
        this.chainConfig.tokenMessenger,
        1, // V1
        fromBlock,
        toBlock,
        burns,
        mints,
        isDebug
      );
    }

    // Index V2 contracts if available
    if (this.hasV2 && this.chainConfig.tokenMessengerV2) {
      await this.indexContractEvents(
        this.chainConfig.tokenMessengerV2,
        2, // V2
        fromBlock,
        toBlock,
        burns,
        mints,
        isDebug
      );
    }

    return {
      burns,
      mints,
      lastBlock: toBlock,
    };
  }

  /**
   * Index events from a specific contract (V1 or V2)
   */
  private async indexContractEvents(
    contractAddress: `0x${string}`,
    version: 1 | 2,
    fromBlock: number,
    toBlock: number,
    burns: (DepositForBurnEvent | DepositForBurnV2Event)[],
    mints: MintAndWithdrawEvent[],
    isDebug: boolean
  ): Promise<void> {
    const versionLabel = `V${version}`;

    // Fetch burn events (DepositForBurn)
    const burnEvent = version === 2 ? DEPOSIT_FOR_BURN_EVENT_V2 : DEPOSIT_FOR_BURN_EVENT_V1;
    
    try {
      const burnLogs = await this.client.getLogs({
        address: contractAddress,
        event: burnEvent,
        fromBlock: BigInt(fromBlock),
        toBlock: BigInt(toBlock),
      });

      if (isDebug && burnLogs.length > 0) {
        console.log(`[${this.chainId}] Found ${burnLogs.length} ${versionLabel} burn logs`);
      }

      for (const log of burnLogs) {
        const timestamp = await this.getBlockTimestamp(log.blockNumber);
        const event = this.parseBurnEvent(log, timestamp, version);
        if (event) {
          burns.push(event);
          if (isDebug) {
            console.log(`[${this.chainId}] Parsed ${versionLabel} burn: nonce=${event.nonce}, amount=${event.amount}, dest=${event.destinationDomain}`);
          }
        }
      }
    } catch (error) {
      console.error(`[${this.chainId}] Error fetching ${versionLabel} burn logs:`, error);
    }

    // Fetch mint events (MintAndWithdraw)
    try {
      const mintLogs = await this.client.getLogs({
        address: contractAddress,
        event: MINT_AND_WITHDRAW_EVENT,
        fromBlock: BigInt(fromBlock),
        toBlock: BigInt(toBlock),
      });

      if (isDebug && mintLogs.length > 0) {
        console.log(`[${this.chainId}] Found ${mintLogs.length} ${versionLabel} mint logs`);
      }

      for (const log of mintLogs) {
        const timestamp = await this.getBlockTimestamp(log.blockNumber);
        const event = this.parseMintEvent(log, timestamp, version);
        if (event) {
          mints.push(event);
          if (isDebug) {
            console.log(`[${this.chainId}] Parsed ${versionLabel} mint: recipient=${event.mintRecipient}, amount=${event.amount}`);
          }
        }
      }
    } catch (error) {
      console.error(`[${this.chainId}] Error fetching ${versionLabel} mint logs:`, error);
    }
  }

  /**
   * Parse a DepositForBurn event log (handles both V1 and V2)
   */
  private parseBurnEvent(log: Log, timestamp: number, version: 1 | 2): DepositForBurnEvent | DepositForBurnV2Event | null {
    try {
      const isV2 = version === 2;
      const abi = isV2 ? TOKEN_MESSENGER_V2_ABI : TOKEN_MESSENGER_ABI;
      
      const decoded = decodeEventLog({
        abi,
        data: log.data,
        topics: log.topics,
        eventName: 'DepositForBurn',
      });

      if (isV2) {
        // V2 event parsing
        const args = decoded.args as {
          nonce: bigint;
          burnToken: `0x${string}`;
          amount: bigint;
          depositor: `0x${string}`;
          mintRecipient: `0x${string}`;
          destinationDomain: number;
          destinationTokenMessenger: `0x${string}`;
          destinationCaller: `0x${string}`;
          maxFee: bigint;
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
          maxFee: args.maxFee,
          transactionHash: log.transactionHash!,
          blockNumber: log.blockNumber!,
          timestamp,
        } as DepositForBurnV2Event;
      } else {
        // V1 event parsing
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
      }
    } catch (error) {
      console.error(`Failed to parse burn event: ${error}`);
      return null;
    }
  }

  /**
   * Parse a MintAndWithdraw event log
   */
  private parseMintEvent(log: Log, timestamp: number, version: 1 | 2): MintAndWithdrawEvent | null {
    try {
      const abi = version === 2 ? TOKEN_MESSENGER_V2_ABI : TOKEN_MESSENGER_ABI;
      
      const decoded = decodeEventLog({
        abi,
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
  getTokenType(tokenAddress: `0x${string}`): 'USDC' | 'EURC' | 'USYC' | null {
    const lowerAddress = tokenAddress.toLowerCase();
    if (lowerAddress === this.chainConfig.usdc.toLowerCase()) {
      return 'USDC';
    }
    if (this.chainConfig.eurc && lowerAddress === this.chainConfig.eurc.toLowerCase()) {
      return 'EURC';
    }
    if (this.chainConfig.usyc && lowerAddress === this.chainConfig.usyc.toLowerCase()) {
      return 'USYC';
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
   */
  getBlocksPerDay(): number {
    // Use configured block time, or default lookup
    if (this.chainConfig.blockTime) {
      const secondsPerDay = 24 * 60 * 60;
      return Math.floor(secondsPerDay / this.chainConfig.blockTime);
    }

    // Fallback block times (in seconds) for different chains
    const blockTimes: Record<number, number> = {
      5042002: 0.5,    // Arc Testnet (~500ms)
      11155111: 12,    // Ethereum Sepolia (~12s)
      421614: 0.25,    // Arbitrum Sepolia (~250ms)
      84532: 2,        // Base Sepolia (~2s)
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
