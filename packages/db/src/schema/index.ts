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

// ============================================
// Transfers Table (CCTP Cross-chain)
// ============================================

export const transfers = pgTable(
  'transfers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    token: varchar('token', { length: 10 }).notNull(), // 'USDC', 'EURC', 'USYC'
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
    maxFee: decimal('max_fee', { precision: 38, scale: 0 }), // V2 only

    // Status & Type
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    transferType: varchar('transfer_type', { length: 20 }).notNull().default('cctp'),

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
    index('transfers_transfer_type_idx').on(table.transferType),
  ]
);

// ============================================
// Arc Native Transfers Table
// ============================================

export const arcNativeTransfers = pgTable(
  'arc_native_transfers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    token: varchar('token', { length: 10 }).notNull(), // 'USDC', 'EURC', 'USYC'
    amount: decimal('amount', { precision: 38, scale: 0 }).notNull(),
    amountFormatted: varchar('amount_formatted', { length: 50 }).notNull(),

    fromAddress: varchar('from_address', { length: 100 }).notNull(),
    toAddress: varchar('to_address', { length: 100 }).notNull(),

    txHash: varchar('tx_hash', { length: 100 }).notNull(),
    blockNumber: bigint('block_number', { mode: 'number' }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('arc_native_tx_hash_idx').on(table.txHash, table.token),
    index('arc_native_from_idx').on(table.fromAddress),
    index('arc_native_to_idx').on(table.toAddress),
    index('arc_native_token_idx').on(table.token),
    index('arc_native_timestamp_idx').on(table.timestamp),
  ]
);

// ============================================
// USYC Activity Table
// ============================================

export const usycActivity = pgTable(
  'usyc_activity',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    action: varchar('action', { length: 20 }).notNull(), // 'mint', 'redeem', 'transfer'

    amount: decimal('amount', { precision: 38, scale: 0 }).notNull(), // USYC amount
    amountFormatted: varchar('amount_formatted', { length: 50 }).notNull(),
    usdcAmount: decimal('usdc_amount', { precision: 38, scale: 0 }), // For mint/redeem
    usdcAmountFormatted: varchar('usdc_amount_formatted', { length: 50 }),

    walletAddress: varchar('wallet_address', { length: 100 }).notNull(),
    toAddress: varchar('to_address', { length: 100 }), // For transfers

    txHash: varchar('tx_hash', { length: 100 }).notNull(),
    blockNumber: bigint('block_number', { mode: 'number' }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('usyc_activity_tx_hash_idx').on(table.txHash, table.action),
    index('usyc_wallet_idx').on(table.walletAddress),
    index('usyc_action_idx').on(table.action),
    index('usyc_timestamp_idx').on(table.timestamp),
  ]
);

// ============================================
// FX Swaps Table
// ============================================

export const fxSwaps = pgTable(
  'fx_swaps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tradeId: varchar('trade_id', { length: 100 }),

    maker: varchar('maker', { length: 100 }).notNull(),
    taker: varchar('taker', { length: 100 }).notNull(),

    baseToken: varchar('base_token', { length: 10 }).notNull(), // USDC or EURC
    quoteToken: varchar('quote_token', { length: 10 }).notNull(),
    baseAmount: decimal('base_amount', { precision: 38, scale: 0 }).notNull(),
    baseAmountFormatted: varchar('base_amount_formatted', { length: 50 }).notNull(),
    quoteAmount: decimal('quote_amount', { precision: 38, scale: 0 }).notNull(),
    quoteAmountFormatted: varchar('quote_amount_formatted', { length: 50 }).notNull(),

    effectiveRate: decimal('effective_rate', { precision: 18, scale: 8 }),

    txHash: varchar('tx_hash', { length: 100 }).notNull(),
    blockNumber: bigint('block_number', { mode: 'number' }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('fx_swaps_tx_hash_idx').on(table.txHash),
    index('fx_maker_idx').on(table.maker),
    index('fx_taker_idx').on(table.taker),
    index('fx_timestamp_idx').on(table.timestamp),
    index('fx_base_token_idx').on(table.baseToken),
  ]
);

// ============================================
// Arc Network Stats Table
// ============================================

export const arcNetworkStats = pgTable(
  'arc_network_stats',
  {
    id: serial('id').primaryKey(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    blockNumber: bigint('block_number', { mode: 'number' }).notNull(),

    txCount: integer('tx_count').notNull().default(0),
    totalGasUsed: decimal('total_gas_used', { precision: 38, scale: 0 }),
    avgGasPrice: decimal('avg_gas_price', { precision: 38, scale: 0 }),

    activeWallets: integer('active_wallets'),
    newWallets: integer('new_wallets'),

    usdcTvl: decimal('usdc_tvl', { precision: 38, scale: 0 }),
    eurcTvl: decimal('eurc_tvl', { precision: 38, scale: 0 }),
    usycTvl: decimal('usyc_tvl', { precision: 38, scale: 0 }),
  },
  (table) => [
    uniqueIndex('arc_stats_timestamp_idx').on(table.timestamp),
    index('arc_stats_block_idx').on(table.blockNumber),
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
// Hourly Stats Table (for volume & activity metrics)
// ============================================

export const hourlyStats = pgTable(
  'hourly_stats',
  {
    id: serial('id').primaryKey(),
    hour: timestamp('hour', { withTimezone: true }).notNull(),
    token: varchar('token', { length: 10 }).notNull(), // 'USDC', 'EURC', 'USYC'

    transferCount: integer('transfer_count').notNull().default(0),
    totalVolume: decimal('total_volume', { precision: 38, scale: 0 }).notNull().default('0'),
    uniqueSenders: integer('unique_senders').notNull().default(0),
    uniqueReceivers: integer('unique_receivers').notNull().default(0),
    medianAmount: decimal('median_amount', { precision: 38, scale: 0 }),
    p90Amount: decimal('p90_amount', { precision: 38, scale: 0 }),
    minAmount: decimal('min_amount', { precision: 38, scale: 0 }),
    maxAmount: decimal('max_amount', { precision: 38, scale: 0 }),
  },
  (table) => [
    uniqueIndex('hourly_stats_hour_token_idx').on(table.hour, table.token),
    index('hourly_stats_hour_idx').on(table.hour),
  ]
);

// ============================================
// FX Daily Stats Table
// ============================================

export const fxDailyStats = pgTable(
  'fx_daily_stats',
  {
    id: serial('id').primaryKey(),
    date: date('date').notNull(),

    swapCount: integer('swap_count').notNull().default(0),
    usdcToEurcVolume: decimal('usdc_to_eurc_volume', { precision: 38, scale: 0 }).notNull().default('0'),
    eurcToUsdcVolume: decimal('eurc_to_usdc_volume', { precision: 38, scale: 0 }).notNull().default('0'),
    totalVolume: decimal('total_volume', { precision: 38, scale: 0 }).notNull().default('0'),
    uniqueTraders: integer('unique_traders').notNull().default(0),
    avgRate: decimal('avg_rate', { precision: 18, scale: 8 }),
  },
  (table) => [
    uniqueIndex('fx_daily_stats_date_idx').on(table.date),
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
  cctpVersion: integer('cctp_version').default(1),

  // Contract addresses
  tokenMessenger: varchar('token_messenger', { length: 100 }),
  messageTransmitter: varchar('message_transmitter', { length: 100 }),
  tokenMessengerV2: varchar('token_messenger_v2', { length: 100 }),
  messageTransmitterV2: varchar('message_transmitter_v2', { length: 100 }),
  usdcAddress: varchar('usdc_address', { length: 100 }),
  eurcAddress: varchar('eurc_address', { length: 100 }),
  usycAddress: varchar('usyc_address', { length: 100 }),
  fxEscrowAddress: varchar('fx_escrow_address', { length: 100 }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================
// Indexer State Table
// ============================================

export const indexerState = pgTable(
  'indexer_state',
  {
    id: serial('id').primaryKey(),
    chainId: varchar('chain_id', { length: 50 }).notNull(),
    indexerType: varchar('indexer_type', { length: 30 }).notNull().default('cctp'), // cctp, native, usyc, fx
    lastBlock: bigint('last_block', { mode: 'number' }).notNull(),
    lastUpdated: timestamp('last_updated', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('indexer_state_chain_type_idx').on(table.chainId, table.indexerType),
  ]
);

// ============================================
// Type Exports
// ============================================

export type Transfer = typeof transfers.$inferSelect;
export type NewTransfer = typeof transfers.$inferInsert;

export type ArcNativeTransfer = typeof arcNativeTransfers.$inferSelect;
export type NewArcNativeTransfer = typeof arcNativeTransfers.$inferInsert;

export type USYCActivity = typeof usycActivity.$inferSelect;
export type NewUSYCActivity = typeof usycActivity.$inferInsert;

export type FXSwap = typeof fxSwaps.$inferSelect;
export type NewFXSwap = typeof fxSwaps.$inferInsert;

export type ArcNetworkStat = typeof arcNetworkStats.$inferSelect;
export type NewArcNetworkStat = typeof arcNetworkStats.$inferInsert;

export type DailyStat = typeof dailyStats.$inferSelect;
export type NewDailyStat = typeof dailyStats.$inferInsert;

export type RouteStat = typeof routeStats.$inferSelect;
export type NewRouteStat = typeof routeStats.$inferInsert;

export type WalletStat = typeof walletStats.$inferSelect;
export type NewWalletStat = typeof walletStats.$inferInsert;

export type FXDailyStat = typeof fxDailyStats.$inferSelect;
export type NewFXDailyStat = typeof fxDailyStats.$inferInsert;

export type HourlyStat = typeof hourlyStats.$inferSelect;
export type NewHourlyStat = typeof hourlyStats.$inferInsert;

export type Chain = typeof chains.$inferSelect;
export type NewChain = typeof chains.$inferInsert;

export type IndexerStateRow = typeof indexerState.$inferSelect;
export type NewIndexerState = typeof indexerState.$inferInsert;
