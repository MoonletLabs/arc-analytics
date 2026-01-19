CREATE TABLE IF NOT EXISTS "arc_native_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(10) NOT NULL,
	"amount" numeric(38, 0) NOT NULL,
	"amount_formatted" varchar(50) NOT NULL,
	"from_address" varchar(100) NOT NULL,
	"to_address" varchar(100) NOT NULL,
	"tx_hash" varchar(100) NOT NULL,
	"block_number" bigint NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "arc_network_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"block_number" bigint NOT NULL,
	"tx_count" integer DEFAULT 0 NOT NULL,
	"total_gas_used" numeric(38, 0),
	"avg_gas_price" numeric(38, 0),
	"active_wallets" integer,
	"new_wallets" integer,
	"usdc_tvl" numeric(38, 0),
	"eurc_tvl" numeric(38, 0),
	"usyc_tvl" numeric(38, 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chains" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"chain_id" integer,
	"domain" integer NOT NULL,
	"type" varchar(10) NOT NULL,
	"is_testnet" boolean DEFAULT true NOT NULL,
	"explorer_url" varchar(200),
	"cctp_version" integer DEFAULT 1,
	"token_messenger" varchar(100),
	"message_transmitter" varchar(100),
	"token_messenger_v2" varchar(100),
	"message_transmitter_v2" varchar(100),
	"usdc_address" varchar(100),
	"eurc_address" varchar(100),
	"usyc_address" varchar(100),
	"fx_escrow_address" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"token" varchar(10) NOT NULL,
	"chain" varchar(50) NOT NULL,
	"direction" varchar(10) NOT NULL,
	"transfer_count" integer DEFAULT 0 NOT NULL,
	"total_volume" numeric(38, 0) DEFAULT '0' NOT NULL,
	"unique_wallets" integer DEFAULT 0 NOT NULL,
	"avg_amount" numeric(38, 0) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fx_daily_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"swap_count" integer DEFAULT 0 NOT NULL,
	"usdc_to_eurc_volume" numeric(38, 0) DEFAULT '0' NOT NULL,
	"eurc_to_usdc_volume" numeric(38, 0) DEFAULT '0' NOT NULL,
	"total_volume" numeric(38, 0) DEFAULT '0' NOT NULL,
	"unique_traders" integer DEFAULT 0 NOT NULL,
	"avg_rate" numeric(18, 8)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fx_swaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trade_id" varchar(100),
	"maker" varchar(100) NOT NULL,
	"taker" varchar(100) NOT NULL,
	"base_token" varchar(10) NOT NULL,
	"quote_token" varchar(10) NOT NULL,
	"base_amount" numeric(38, 0) NOT NULL,
	"base_amount_formatted" varchar(50) NOT NULL,
	"quote_amount" numeric(38, 0) NOT NULL,
	"quote_amount_formatted" varchar(50) NOT NULL,
	"effective_rate" numeric(18, 8),
	"tx_hash" varchar(100) NOT NULL,
	"block_number" bigint NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hourly_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"hour" timestamp with time zone NOT NULL,
	"token" varchar(10) NOT NULL,
	"transfer_count" integer DEFAULT 0 NOT NULL,
	"total_volume" numeric(38, 0) DEFAULT '0' NOT NULL,
	"unique_senders" integer DEFAULT 0 NOT NULL,
	"unique_receivers" integer DEFAULT 0 NOT NULL,
	"median_amount" numeric(38, 0),
	"p90_amount" numeric(38, 0),
	"min_amount" numeric(38, 0),
	"max_amount" numeric(38, 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "indexer_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"chain_id" varchar(50) NOT NULL,
	"indexer_type" varchar(30) DEFAULT 'cctp' NOT NULL,
	"last_block" bigint NOT NULL,
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "route_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"token" varchar(10) NOT NULL,
	"source_chain" varchar(50) NOT NULL,
	"dest_chain" varchar(50) NOT NULL,
	"transfer_count" integer DEFAULT 0 NOT NULL,
	"total_volume" numeric(38, 0) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(10) NOT NULL,
	"amount" numeric(38, 0) NOT NULL,
	"amount_formatted" varchar(50) NOT NULL,
	"source_chain" varchar(50) NOT NULL,
	"source_tx_hash" varchar(100) NOT NULL,
	"source_address" varchar(100) NOT NULL,
	"burn_timestamp" timestamp with time zone NOT NULL,
	"burn_block_number" bigint NOT NULL,
	"dest_chain" varchar(50) NOT NULL,
	"dest_tx_hash" varchar(100),
	"dest_address" varchar(100) NOT NULL,
	"mint_timestamp" timestamp with time zone,
	"mint_block_number" bigint,
	"nonce" varchar(30) NOT NULL,
	"source_domain" integer NOT NULL,
	"dest_domain" integer NOT NULL,
	"message_hash" varchar(100),
	"attestation" text,
	"max_fee" numeric(38, 0),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"transfer_type" varchar(20) DEFAULT 'cctp' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usyc_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" varchar(20) NOT NULL,
	"amount" numeric(38, 0) NOT NULL,
	"amount_formatted" varchar(50) NOT NULL,
	"usdc_amount" numeric(38, 0),
	"usdc_amount_formatted" varchar(50),
	"wallet_address" varchar(100) NOT NULL,
	"to_address" varchar(100),
	"tx_hash" varchar(100) NOT NULL,
	"block_number" bigint NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallet_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"address" varchar(100) NOT NULL,
	"token" varchar(10) NOT NULL,
	"total_transfers" integer DEFAULT 0 NOT NULL,
	"total_volume" numeric(38, 0) DEFAULT '0' NOT NULL,
	"first_seen" timestamp with time zone NOT NULL,
	"last_seen" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "arc_native_tx_hash_idx" ON "arc_native_transfers" USING btree ("tx_hash","token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "arc_native_from_idx" ON "arc_native_transfers" USING btree ("from_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "arc_native_to_idx" ON "arc_native_transfers" USING btree ("to_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "arc_native_token_idx" ON "arc_native_transfers" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "arc_native_timestamp_idx" ON "arc_native_transfers" USING btree ("timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "arc_stats_timestamp_idx" ON "arc_network_stats" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "arc_stats_block_idx" ON "arc_network_stats" USING btree ("block_number");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "daily_stats_unique_idx" ON "daily_stats" USING btree ("date","token","chain","direction");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_stats_date_idx" ON "daily_stats" USING btree ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_stats_chain_idx" ON "daily_stats" USING btree ("chain");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "fx_daily_stats_date_idx" ON "fx_daily_stats" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "fx_swaps_tx_hash_idx" ON "fx_swaps" USING btree ("tx_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fx_maker_idx" ON "fx_swaps" USING btree ("maker");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fx_taker_idx" ON "fx_swaps" USING btree ("taker");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fx_timestamp_idx" ON "fx_swaps" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fx_base_token_idx" ON "fx_swaps" USING btree ("base_token");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hourly_stats_hour_token_idx" ON "hourly_stats" USING btree ("hour","token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hourly_stats_hour_idx" ON "hourly_stats" USING btree ("hour");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "indexer_state_chain_type_idx" ON "indexer_state" USING btree ("chain_id","indexer_type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "route_stats_unique_idx" ON "route_stats" USING btree ("date","token","source_chain","dest_chain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "route_stats_date_idx" ON "route_stats" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "transfers_source_chain_nonce_idx" ON "transfers" USING btree ("source_chain","nonce");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfers_source_address_idx" ON "transfers" USING btree ("source_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfers_dest_address_idx" ON "transfers" USING btree ("dest_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfers_burn_timestamp_idx" ON "transfers" USING btree ("burn_timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfers_status_idx" ON "transfers" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfers_token_idx" ON "transfers" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfers_source_chain_idx" ON "transfers" USING btree ("source_chain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfers_dest_chain_idx" ON "transfers" USING btree ("dest_chain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfers_transfer_type_idx" ON "transfers" USING btree ("transfer_type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "usyc_activity_tx_hash_idx" ON "usyc_activity" USING btree ("tx_hash","action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usyc_wallet_idx" ON "usyc_activity" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usyc_action_idx" ON "usyc_activity" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usyc_timestamp_idx" ON "usyc_activity" USING btree ("timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wallet_stats_unique_idx" ON "wallet_stats" USING btree ("address","token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wallet_stats_address_idx" ON "wallet_stats" USING btree ("address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wallet_stats_volume_idx" ON "wallet_stats" USING btree ("total_volume");