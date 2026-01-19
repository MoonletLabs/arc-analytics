import {
  createPublicClient,
  http,
  type PublicClient,
  type Log,
  parseAbiItem,
  decodeEventLog,
} from 'viem';
import {
  USYC_TELLER_ABI,
  ERC20_ABI,
  type ChainConfig,
  type USYCDepositEvent,
  type USYCWithdrawEvent,
  type ERC20TransferEvent,
} from '@usdc-eurc-analytics/shared';

// ============================================
// Types
// ============================================

export interface USYCIndexerOptions {
  chainConfig: ChainConfig & { rpcUrl: string };
  batchSize: number;
}

export interface IndexedUSYCActivity {
  deposits: USYCDepositEvent[];
  withdrawals: USYCWithdrawEvent[];
  transfers: ERC20TransferEvent[];
  lastBlock: number;
}

// ============================================
// Event Signatures
// ============================================

const DEPOSIT_EVENT = parseAbiItem(
  'event Deposit(address indexed depositor, address indexed receiver, address depositAsset, uint256 depositAmount, uint256 shareAmount)'
);

const WITHDRAW_EVENT = parseAbiItem(
  'event Withdraw(address indexed withdrawer, address indexed receiver, address withdrawAsset, uint256 withdrawAmount, uint256 shareAmount)'
);

const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)'
);

// ============================================
// USYC Activity Indexer
// ============================================

export class USYCIndexer {
  private client: PublicClient;
  private chainConfig: ChainConfig & { rpcUrl: string };
  private batchSize: number;

  constructor(options: USYCIndexerOptions) {
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

  get usycAddress(): `0x${string}` | undefined {
    return this.chainConfig.usyc;
  }

  get tellerAddress(): `0x${string}` | undefined {
    return this.chainConfig.usycTeller;
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
   * Index USYC activity from a block range
   */
  async indexBlockRange(fromBlock: number, toBlock: number): Promise<IndexedUSYCActivity> {
    const deposits: USYCDepositEvent[] = [];
    const withdrawals: USYCWithdrawEvent[] = [];
    const transfers: ERC20TransferEvent[] = [];

    if (!this.tellerAddress || !this.usycAddress) {
      console.warn('USYC or Teller address not configured');
      return { deposits, withdrawals, transfers, lastBlock: toBlock };
    }

    // Fetch deposit events from Teller
    const depositLogs = await this.client.getLogs({
      address: this.tellerAddress,
      event: DEPOSIT_EVENT,
      fromBlock: BigInt(fromBlock),
      toBlock: BigInt(toBlock),
    });

    for (const log of depositLogs) {
      const timestamp = await this.getBlockTimestamp(log.blockNumber);
      const event = this.parseDepositEvent(log, timestamp);
      if (event) {
        deposits.push(event);
      }
    }

    // Fetch withdrawal events from Teller
    const withdrawLogs = await this.client.getLogs({
      address: this.tellerAddress,
      event: WITHDRAW_EVENT,
      fromBlock: BigInt(fromBlock),
      toBlock: BigInt(toBlock),
    });

    for (const log of withdrawLogs) {
      const timestamp = await this.getBlockTimestamp(log.blockNumber);
      const event = this.parseWithdrawEvent(log, timestamp);
      if (event) {
        withdrawals.push(event);
      }
    }

    // Fetch USYC transfer events (excluding mints/burns which are handled above)
    const transferLogs = await this.client.getLogs({
      address: this.usycAddress,
      event: TRANSFER_EVENT,
      fromBlock: BigInt(fromBlock),
      toBlock: BigInt(toBlock),
    });

    for (const log of transferLogs) {
      const timestamp = await this.getBlockTimestamp(log.blockNumber);
      const event = this.parseTransferEvent(log, timestamp);
      // Only include transfers that are not mints/burns (not to/from zero address or teller)
      if (event && this.isRegularTransfer(event)) {
        transfers.push(event);
      }
    }

    return {
      deposits,
      withdrawals,
      transfers,
      lastBlock: toBlock,
    };
  }

  /**
   * Parse a Deposit event
   */
  private parseDepositEvent(log: Log, timestamp: number): USYCDepositEvent | null {
    try {
      const decoded = decodeEventLog({
        abi: USYC_TELLER_ABI,
        data: log.data,
        topics: log.topics,
        eventName: 'Deposit',
      });

      const args = decoded.args as {
        depositor: `0x${string}`;
        receiver: `0x${string}`;
        depositAsset: `0x${string}`;
        depositAmount: bigint;
        shareAmount: bigint;
      };

      return {
        depositor: args.depositor,
        usdcAmount: args.depositAmount,
        usycAmount: args.shareAmount,
        transactionHash: log.transactionHash!,
        blockNumber: log.blockNumber!,
        timestamp,
      };
    } catch (error) {
      console.error(`Failed to parse deposit event: ${error}`);
      return null;
    }
  }

  /**
   * Parse a Withdraw event
   */
  private parseWithdrawEvent(log: Log, timestamp: number): USYCWithdrawEvent | null {
    try {
      const decoded = decodeEventLog({
        abi: USYC_TELLER_ABI,
        data: log.data,
        topics: log.topics,
        eventName: 'Withdraw',
      });

      const args = decoded.args as {
        withdrawer: `0x${string}`;
        receiver: `0x${string}`;
        withdrawAsset: `0x${string}`;
        withdrawAmount: bigint;
        shareAmount: bigint;
      };

      return {
        withdrawer: args.withdrawer,
        usycAmount: args.shareAmount,
        usdcAmount: args.withdrawAmount,
        transactionHash: log.transactionHash!,
        blockNumber: log.blockNumber!,
        timestamp,
      };
    } catch (error) {
      console.error(`Failed to parse withdraw event: ${error}`);
      return null;
    }
  }

  /**
   * Parse a Transfer event
   */
  private parseTransferEvent(log: Log, timestamp: number): ERC20TransferEvent | null {
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
        timestamp,
      };
    } catch (error) {
      console.error(`Failed to parse transfer event: ${error}`);
      return null;
    }
  }

  /**
   * Check if this is a regular transfer (not mint/burn)
   */
  private isRegularTransfer(event: ERC20TransferEvent): boolean {
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const fromLower = event.from.toLowerCase();
    const toLower = event.to.toLowerCase();

    // Exclude mints (from zero address) and burns (to zero address)
    if (fromLower === zeroAddress || toLower === zeroAddress) {
      return false;
    }

    // Exclude transfers to/from teller
    if (this.tellerAddress) {
      const tellerLower = this.tellerAddress.toLowerCase();
      if (fromLower === tellerLower || toLower === tellerLower) {
        return false;
      }
    }

    return true;
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
 * Create USYC indexer
 */
export function createUSYCIndexer(
  chainConfig: ChainConfig & { rpcUrl: string },
  batchSize: number
): USYCIndexer {
  return new USYCIndexer({
    chainConfig,
    batchSize,
  });
}
