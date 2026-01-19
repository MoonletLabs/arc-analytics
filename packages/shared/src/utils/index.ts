import { TOKEN_DECIMALS } from '../constants/index.js';
import type { TokenType } from '../types/index.js';

// ============================================
// Amount Formatting
// ============================================

/**
 * Format a raw token amount (bigint) to a human-readable string
 */
export function formatAmount(amount: bigint | string, token: TokenType): string {
  const decimals = TOKEN_DECIMALS[token];
  const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;
  const divisor = BigInt(10 ** decimals);
  const wholePart = amountBigInt / divisor;
  const fractionalPart = amountBigInt % divisor;

  if (fractionalPart === 0n) {
    return wholePart.toString();
  }

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  // Remove trailing zeros
  const trimmed = fractionalStr.replace(/0+$/, '');
  return `${wholePart}.${trimmed}`;
}

/**
 * Parse a human-readable amount to raw token amount (bigint string)
 */
export function parseAmount(amount: string, token: TokenType): string {
  const decimals = TOKEN_DECIMALS[token];
  const [whole, fractional = ''] = amount.split('.');
  const paddedFractional = fractional.padEnd(decimals, '0').slice(0, decimals);
  const rawAmount = BigInt(whole + paddedFractional);
  return rawAmount.toString();
}

/**
 * Format amount with commas for display
 */
export function formatAmountWithCommas(amount: string): string {
  const [whole, fractional] = amount.split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fractional ? `${withCommas}.${fractional}` : withCommas;
}

// ============================================
// Address Utilities
// ============================================

/**
 * Convert bytes32 to address (extract last 20 bytes)
 */
export function bytes32ToAddress(bytes32: `0x${string}`): `0x${string}` {
  // bytes32 is 66 chars (0x + 64 hex chars)
  // address is 42 chars (0x + 40 hex chars)
  // Take last 40 chars
  return `0x${bytes32.slice(-40)}` as `0x${string}`;
}

/**
 * Convert address to bytes32 (pad with zeros)
 */
export function addressToBytes32(address: `0x${string}`): `0x${string}` {
  return `0x${address.slice(2).padStart(64, '0')}` as `0x${string}`;
}

/**
 * Truncate address for display
 */
export function truncateAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Validate Ethereum address format
 */
export function isValidEvmAddress(address: string): address is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// ============================================
// Time Utilities
// ============================================

/**
 * Calculate time difference in seconds between two dates
 */
export function timeDifferenceSeconds(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 1000);
}

/**
 * Format seconds to human-readable duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Get start of day (UTC)
 */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day (UTC)
 */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

// ============================================
// Misc Utilities
// ============================================

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000, maxDelayMs = 30000 } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) {
        break;
      }

      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Chunk an array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
