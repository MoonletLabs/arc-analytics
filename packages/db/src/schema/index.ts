import {
  pgTable,
  uuid,
  varchar,
  decimal,
  timestamp,
  integer,
  bigint,
  text,
  boolean,
  date,
  serial,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// Transfers Table
// ============================================

export const transfers = pgTable(
  'transfers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    token: varchar('token', { length: 10 }).notNull(), // 'USDC' or 'EURC'
    amount: decimal('amount', { precision: 38, scale: 0 }).notNull(), // Raw amount (no decimals)
    amountFormatted: varchar('amount_formatted', { length: 50 }).notNull(), // Human readable

    // Source chain info
    sourceChain: varchar('source_chain', { length: 50 }).notNull(),
    sourceTxHash: varchar('source_tx_hash', { length: 100 }).notNull(),
    sourceAddress: varchar('source_address', { length: 100 }).notNull(),
    burnTimestamp: timestamp('burn_timestamp', { withTimezone: true }).notNull(),
    burnBlockNumber: bigint('burn_block_number', { mode: 'number' }).notNull(),

    // Destination chain info
    destChain: varchar('dest_chain', { length: 50 }).notNull(),
    destTxHash: varchar('dest_tx_hash', { length: 100 }),
    destAddress: varchar('dest_address', { length: 100 }).notNull(),
    mintTimestamp: timestamp('mint_timestamp', { withTimezone: true }),
    mintBlockNumber: bigint('mint_block_number', { mode: 'number' }),

    // CCTP specific
    nonce: varchar('nonce', { length: 30 }).notNull(), // uint64 as string
    sourceDomain: integer('source_domain').notNull(),
    destDomain: integer('dest_domain').notNull(),
    messageHash: varchar('message_hash', { length: 100 }),
    attestation: text('attestation'),

    // Status
    status: varchar('status', { length: 20 }).notNull().default('pending'),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('transfers_source_chain_nonce_idx').on(table.sourceChain, table.nonce),
    index('transfers_source_address_idx').on(table.sourceAddress),
    index('transfers_dest_address_idx').on(table.destAddress),
    index('transfers_burn_timestamp_idx').on(table.burnTimestamp),
    index('transfers_status_idx').on(table.status),
    index('transfers_token_idx').on(table.token),
    index('transfers_source_chain_idx').on(table.sourceChain),
    index('transfers_dest_chain_idx').on(table.destChain),
  ]
);

// ============================================
// Daily Stats Table
// ============================================

export const dailyStats = pgTable(
  'daily_stats',
  {
    id: serial('id').primaryKey(),
    date: date('date').notNull(),
    token: varchar('token', { length: 10 }).notNull(),
    chain: varchar('chain', { length: 50 }).notNull(),
    direction: varchar('direction', { length: 10 }).notNull(), // 'inbound' or 'outbound'

    transferCount: integer('transfer_count').notNull().default(0),
    totalVolume: decimal('total_volume', { precision: 38, scale: 0 }).notNull().default('0'),
    uniqueWallets: integer('unique_wallets').notNull().default(0),
    avgAmount: decimal('avg_amount', { precision: 38, scale: 0 }).notNull().default('0'),
  },
  (table) => [
    uniqueIndex('daily_stats_unique_idx').on(table.date, table.token, table.chain, table.direction),
    index('daily_stats_date_idx').on(table.date),
    index('daily_stats_chain_idx').on(table.chain),
  ]
);

// ============================================
// Route Stats Table
// ============================================

export const routeStats = pgTable(
  'route_stats',
  {
    id: serial('id').primaryKey(),
    date: date('date').notNull(),
    token: varchar('token', { length: 10 }).notNull(),
    sourceChain: varchar('source_chain', { length: 50 }).notNull(),
    destChain: varchar('dest_chain', { length: 50 }).notNull(),

    transferCount: integer('transfer_count').notNull().default(0),
    totalVolume: decimal('total_volume', { precision: 38, scale: 0 }).notNull().default('0'),
  },
  (table) => [
    uniqueIndex('route_stats_unique_idx').on(table.date, table.token, table.sourceChain, table.destChain),
    index('route_stats_date_idx').on(table.date),
  ]
);

// ============================================
// Wallet Stats Table
// ============================================

export const walletStats = pgTable(
  'wallet_stats',
  {
    id: serial('id').primaryKey(),
    address: varchar('address', { length: 100 }).notNull(),
    token: varchar('token', { length: 10 }).notNull(),

    totalTransfers: integer('total_transfers').notNull().default(0),
    totalVolume: decimal('total_volume', { precision: 38, scale: 0 }).notNull().default('0'),
    firstSeen: timestamp('first_seen', { withTimezone: true }).notNull(),
    lastSeen: timestamp('last_seen', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('wallet_stats_unique_idx').on(table.address, table.token),
    index('wallet_stats_address_idx').on(table.address),
    index('wallet_stats_volume_idx').on(table.totalVolume),
  ]
);

// ============================================
// Chains Table
// ============================================

export const chains = pgTable('chains', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  chainId: integer('chain_id'),
  domain: integer('domain').notNull(),
  type: varchar('type', { length: 10 }).notNull(), // 'evm' or 'solana'
  isTestnet: boolean('is_testnet').notNull().default(true),
  explorerUrl: varchar('explorer_url', { length: 200 }),

  // Contract addresses
  tokenMessenger: varchar('token_messenger', { length: 100 }),
  messageTransmitter: varchar('message_transmitter', { length: 100 }),
  usdcAddress: varchar('usdc_address', { length: 100 }),
  eurcAddress: varchar('eurc_address', { length: 100 }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================
// Indexer State Table
// ============================================

export const indexerState = pgTable('indexer_state', {
  chainId: varchar('chain_id', { length: 50 }).primaryKey(),
  lastBlock: bigint('last_block', { mode: 'number' }).notNull(),
  lastUpdated: timestamp('last_updated', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================
// Type Exports
// ============================================

export type Transfer = typeof transfers.$inferSelect;
export type NewTransfer = typeof transfers.$inferInsert;

export type DailyStat = typeof dailyStats.$inferSelect;
export type NewDailyStat = typeof dailyStats.$inferInsert;

export type RouteStat = typeof routeStats.$inferSelect;
export type NewRouteStat = typeof routeStats.$inferInsert;

export type WalletStat = typeof walletStats.$inferSelect;
export type NewWalletStat = typeof walletStats.$inferInsert;

export type Chain = typeof chains.$inferSelect;
export type NewChain = typeof chains.$inferInsert;

export type IndexerStateRow = typeof indexerState.$inferSelect;
export type NewIndexerState = typeof indexerState.$inferInsert;
