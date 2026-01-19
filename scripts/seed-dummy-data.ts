/**
 * Seed script to populate the database with realistic dummy data
 * Generates ~2 weeks of data for all tables
 * 
 * Run: pnpm db:seed
 */

import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Configuration
const DAYS = 14;
const NATIVE_TRANSFERS_PER_DAY = 800;
const CCTP_TRANSFERS_PER_DAY = 50;
const FX_SWAPS_PER_DAY = 30;

// Chain configs
const CHAINS = [
  { id: 'arc_testnet', name: 'Arc Testnet', chainId: 1513311, domain: 10, type: 'evm', isTestnet: true, explorerUrl: 'https://testnet.arcscan.io' },
  { id: 'ethereum_sepolia', name: 'Ethereum Sepolia', chainId: 11155111, domain: 0, type: 'evm', isTestnet: true, explorerUrl: 'https://sepolia.etherscan.io' },
  { id: 'arbitrum_sepolia', name: 'Arbitrum Sepolia', chainId: 421614, domain: 3, type: 'evm', isTestnet: true, explorerUrl: 'https://sepolia.arbiscan.io' },
  { id: 'base_sepolia', name: 'Base Sepolia', chainId: 84532, domain: 6, type: 'evm', isTestnet: true, explorerUrl: 'https://sepolia.basescan.org' },
];

// Helper functions
function randomHex(length: number): string {
  let result = '0x';
  const chars = '0123456789abcdef';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function randomAddress(): string {
  return randomHex(40);
}

function randomTxHash(): string {
  return randomHex(64);
}

function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate amount with realistic distribution
function randomAmount(token: 'USDC' | 'EURC'): { raw: string; formatted: string } {
  const rand = Math.random();
  let amount: number;
  
  if (rand < 0.5) {
    // Small: $0.01 - $10
    amount = Math.floor((Math.random() * 999 + 1) * 10000);
  } else if (rand < 0.85) {
    // Medium: $10 - $1,000
    amount = Math.floor((Math.random() * 990 + 10) * 1000000);
  } else if (rand < 0.97) {
    // Large: $1,000 - $10,000
    amount = Math.floor((Math.random() * 9000 + 1000) * 1000000);
  } else {
    // Very large: $10,000 - $100,000
    amount = Math.floor((Math.random() * 90000 + 10000) * 1000000);
  }
  
  const formatted = (amount / 1000000).toFixed(6).replace(/\.?0+$/, '');
  return { raw: amount.toString(), formatted };
}

// Generate whale amount ($100k - $5M)
function randomWhaleAmount(token: 'USDC' | 'EURC'): { raw: string; formatted: string } {
  const rand = Math.random();
  let amount: number;
  
  if (rand < 0.5) {
    // $100k - $250k
    amount = Math.floor((Math.random() * 150000 + 100000) * 1000000);
  } else if (rand < 0.8) {
    // $250k - $500k
    amount = Math.floor((Math.random() * 250000 + 250000) * 1000000);
  } else if (rand < 0.95) {
    // $500k - $1M
    amount = Math.floor((Math.random() * 500000 + 500000) * 1000000);
  } else {
    // $1M - $5M
    amount = Math.floor((Math.random() * 4000000 + 1000000) * 1000000);
  }
  
  const formatted = (amount / 1000000).toFixed(6).replace(/\.?0+$/, '');
  return { raw: amount.toString(), formatted };
}

function generateWalletPool(count: number): string[] {
  const pool: string[] = [];
  for (let i = 0; i < count; i++) {
    pool.push(randomAddress());
  }
  return pool;
}

function pickWallet(pool: string[]): string {
  const index = Math.floor(Math.pow(Math.random(), 2) * pool.length);
  return pool[index];
}

function randomTimeInDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(Math.floor(Math.random() * 24));
  result.setMinutes(Math.floor(Math.random() * 60));
  result.setSeconds(Math.floor(Math.random() * 60));
  result.setMilliseconds(Math.floor(Math.random() * 1000));
  return result;
}

function escapeString(str: string | null): string {
  if (str === null) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

async function main() {
  console.log('Connecting to database...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/usdc_eurc_analytics',
  });
  
  const client = await pool.connect();
  
  try {
    console.log('Clearing existing data...');
    await client.query(`
      TRUNCATE TABLE transfers, arc_native_transfers, fx_swaps, daily_stats, 
      route_stats, wallet_stats, hourly_stats, fx_daily_stats, chains, indexer_state CASCADE
    `);
    
    console.log('Seeding chains...');
    for (const chain of CHAINS) {
      await client.query(`
        INSERT INTO chains (id, name, chain_id, domain, type, is_testnet, explorer_url, cctp_version, 
          token_messenger, message_transmitter, usdc_address, eurc_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        chain.id, chain.name, chain.chainId, chain.domain, chain.type, chain.isTestnet, 
        chain.explorerUrl, 1, randomAddress(), randomAddress(), randomAddress(), randomAddress()
      ]);
    }
    
    // Generate wallet pools
    const senderPool = generateWalletPool(500);
    const receiverPool = generateWalletPool(1000);
    const fxTraderPool = generateWalletPool(100);
    
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - DAYS);
    
    let nonceCounter = 100000;
    let blockNumber = 20000000;
    let totalNative = 0;
    let totalCctp = 0;
    let totalFx = 0;
    
    console.log(`Generating ${DAYS} days of data...`);
    
    for (let day = 0; day < DAYS; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + day);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      const dayOfWeek = currentDate.getDay();
      const activityMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.6 : 1.0;
      
      const nativeCount = Math.floor(NATIVE_TRANSFERS_PER_DAY * activityMultiplier * (0.8 + Math.random() * 0.4));
      const cctpCount = Math.floor(CCTP_TRANSFERS_PER_DAY * activityMultiplier * (0.8 + Math.random() * 0.4));
      const fxCount = Math.floor(FX_SWAPS_PER_DAY * activityMultiplier * (0.8 + Math.random() * 0.4));
      const whaleCount = Math.floor(Math.random() * 5) + 2; // 2-6 whale transfers per day
      
      // Native transfers - batch insert
      const nativeValues: string[] = [];
      for (let i = 0; i < nativeCount; i++) {
        const token = Math.random() < 0.7 ? 'EURC' : 'USDC';
        const { raw, formatted } = randomAmount(token as 'USDC' | 'EURC');
        const timestamp = randomTimeInDay(currentDate);
        blockNumber += Math.floor(Math.random() * 10) + 1;
        
        nativeValues.push(`(
          '${randomUUID()}', '${token}', '${raw}', '${formatted}',
          '${pickWallet(senderPool)}', '${pickWallet(receiverPool)}',
          '${randomTxHash()}', ${blockNumber}, '${timestamp.toISOString()}'
        )`);
        totalNative++;
      }
      
      // Whale transfers (large amounts $100k+)
      for (let i = 0; i < whaleCount; i++) {
        const token = Math.random() < 0.5 ? 'EURC' : 'USDC';
        const { raw, formatted } = randomWhaleAmount(token as 'USDC' | 'EURC');
        const timestamp = randomTimeInDay(currentDate);
        blockNumber += Math.floor(Math.random() * 10) + 1;
        
        nativeValues.push(`(
          '${randomUUID()}', '${token}', '${raw}', '${formatted}',
          '${pickWallet(senderPool)}', '${pickWallet(receiverPool)}',
          '${randomTxHash()}', ${blockNumber}, '${timestamp.toISOString()}'
        )`);
        totalNative++;
      }
      
      if (nativeValues.length > 0) {
        // Insert in chunks of 100
        for (let i = 0; i < nativeValues.length; i += 100) {
          const chunk = nativeValues.slice(i, i + 100);
          await client.query(`
            INSERT INTO arc_native_transfers 
            (id, token, amount, amount_formatted, from_address, to_address, tx_hash, block_number, timestamp)
            VALUES ${chunk.join(',')}
          `);
        }
      }
      
      // CCTP transfers
      const cctpValues: string[] = [];
      for (let i = 0; i < cctpCount; i++) {
        const token = Math.random() < 0.6 ? 'USDC' : 'EURC';
        const { raw, formatted } = randomAmount(token as 'USDC' | 'EURC');
        const timestamp = randomTimeInDay(currentDate);
        
        let sourceChain: string, destChain: string;
        if (Math.random() < 0.8) {
          if (Math.random() < 0.5) {
            sourceChain = 'arc_testnet';
            destChain = CHAINS[Math.floor(Math.random() * (CHAINS.length - 1)) + 1].id;
          } else {
            sourceChain = CHAINS[Math.floor(Math.random() * (CHAINS.length - 1)) + 1].id;
            destChain = 'arc_testnet';
          }
        } else {
          const otherChains = CHAINS.filter(c => c.id !== 'arc_testnet');
          sourceChain = otherChains[Math.floor(Math.random() * otherChains.length)].id;
          destChain = otherChains[Math.floor(Math.random() * otherChains.length)].id;
          if (sourceChain === destChain) {
            destChain = otherChains[(otherChains.findIndex(c => c.id === sourceChain) + 1) % otherChains.length].id;
          }
        }
        
        const sourceChainConfig = CHAINS.find(c => c.id === sourceChain)!;
        const destChainConfig = CHAINS.find(c => c.id === destChain)!;
        
        const rand = Math.random();
        const status = rand < 0.9 ? 'completed' : (rand < 0.98 ? 'pending' : 'attested');
        const mintTimestamp = status === 'completed' ? new Date(timestamp.getTime() + Math.random() * 300000 + 60000) : null;
        
        cctpValues.push(`(
          '${randomUUID()}', '${token}', '${raw}', '${formatted}',
          '${sourceChain}', '${randomTxHash()}', '${pickWallet(senderPool)}',
          '${timestamp.toISOString()}', ${blockNumber + Math.floor(Math.random() * 1000)},
          '${destChain}', ${status === 'completed' ? `'${randomTxHash()}'` : 'NULL'},
          '${pickWallet(receiverPool)}',
          ${mintTimestamp ? `'${mintTimestamp.toISOString()}'` : 'NULL'},
          ${mintTimestamp ? blockNumber + Math.floor(Math.random() * 1000) + 100 : 'NULL'},
          '${nonceCounter++}', ${sourceChainConfig.domain}, ${destChainConfig.domain},
          ${status !== 'pending' ? `'${randomHex(64)}'` : 'NULL'},
          ${status === 'completed' ? `'${randomHex(130)}'` : 'NULL'},
          '${status}', 'cctp'
        )`);
        totalCctp++;
      }
      
      if (cctpValues.length > 0) {
        for (let i = 0; i < cctpValues.length; i += 50) {
          const chunk = cctpValues.slice(i, i + 50);
          await client.query(`
            INSERT INTO transfers 
            (id, token, amount, amount_formatted, source_chain, source_tx_hash, source_address,
             burn_timestamp, burn_block_number, dest_chain, dest_tx_hash, dest_address,
             mint_timestamp, mint_block_number, nonce, source_domain, dest_domain,
             message_hash, attestation, status, transfer_type)
            VALUES ${chunk.join(',')}
          `);
        }
      }
      
      // FX Swaps
      const fxValues: string[] = [];
      for (let i = 0; i < fxCount; i++) {
        const timestamp = randomTimeInDay(currentDate);
        const isUsdcToEurc = Math.random() < 0.5;
        const baseToken = isUsdcToEurc ? 'USDC' : 'EURC';
        const quoteToken = isUsdcToEurc ? 'EURC' : 'USDC';
        
        const { raw: baseRaw, formatted: baseFormatted } = randomAmount(baseToken as 'USDC' | 'EURC');
        const rate = 1.08 + (Math.random() - 0.5) * 0.02;
        const quoteRaw = isUsdcToEurc 
          ? Math.floor(parseFloat(baseRaw) / rate).toString()
          : Math.floor(parseFloat(baseRaw) * rate).toString();
        const quoteFormatted = (parseFloat(quoteRaw) / 1000000).toFixed(6).replace(/\.?0+$/, '');
        
        fxValues.push(`(
          '${randomUUID()}', 'trade_${Date.now()}_${i}',
          '${pickWallet(fxTraderPool)}', '${pickWallet(fxTraderPool)}',
          '${baseToken}', '${quoteToken}', '${baseRaw}', '${baseFormatted}',
          '${quoteRaw}', '${quoteFormatted}', ${rate.toFixed(8)},
          '${randomTxHash()}', ${blockNumber + Math.floor(Math.random() * 1000)},
          '${timestamp.toISOString()}'
        )`);
        totalFx++;
      }
      
      if (fxValues.length > 0) {
        await client.query(`
          INSERT INTO fx_swaps 
          (id, trade_id, maker, taker, base_token, quote_token, base_amount, base_amount_formatted,
           quote_amount, quote_amount_formatted, effective_rate, tx_hash, block_number, timestamp)
          VALUES ${fxValues.join(',')}
        `);
      }
      
      // Daily stats
      for (const chain of CHAINS) {
        for (const token of ['USDC', 'EURC']) {
          for (const direction of ['inbound', 'outbound']) {
            const count = Math.floor(Math.random() * 20) + 5;
            const volume = (Math.floor(Math.random() * 100000) + 10000) * 1000000;
            await client.query(`
              INSERT INTO daily_stats (date, token, chain, direction, transfer_count, total_volume, unique_wallets, avg_amount)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [dateStr, token, chain.id, direction, count, volume.toString(), Math.floor(count * 0.7), Math.floor(volume / count).toString()]);
          }
        }
      }
      
      // Route stats
      for (const source of CHAINS) {
        for (const dest of CHAINS) {
          if (source.id === dest.id) continue;
          for (const token of ['USDC', 'EURC']) {
            const count = Math.floor(Math.random() * 10) + 1;
            const volume = (Math.floor(Math.random() * 50000) + 5000) * 1000000;
            await client.query(`
              INSERT INTO route_stats (date, token, source_chain, dest_chain, transfer_count, total_volume)
              VALUES ($1, $2, $3, $4, $5, $6)
            `, [dateStr, token, source.id, dest.id, count, volume.toString()]);
          }
        }
      }
      
      // Hourly stats
      for (let hour = 0; hour < 24; hour++) {
        const hourDate = new Date(currentDate);
        hourDate.setHours(hour, 0, 0, 0);
        
        for (const token of ['USDC', 'EURC']) {
          const count = Math.floor(Math.random() * 50) + 10;
          const volume = (Math.floor(Math.random() * 10000) + 1000) * 1000000;
          const median = Math.floor(Math.random() * 100000) + 50000;
          const p90 = median * 10;
          
          await client.query(`
            INSERT INTO hourly_stats (hour, token, transfer_count, total_volume, unique_senders, unique_receivers, median_amount, p90_amount, min_amount, max_amount)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [hourDate.toISOString(), token, count, volume.toString(), Math.floor(count * 0.6), Math.floor(count * 0.8), median.toString(), p90.toString(), '1000', (p90 * 10).toString()]);
        }
      }
      
      // FX daily stats
      const swapCount = Math.floor(Math.random() * 30) + 10;
      const usdcToEurc = (Math.floor(Math.random() * 50000) + 10000) * 1000000;
      const eurcToUsdc = (Math.floor(Math.random() * 50000) + 10000) * 1000000;
      await client.query(`
        INSERT INTO fx_daily_stats (date, swap_count, usdc_to_eurc_volume, eurc_to_usdc_volume, total_volume, unique_traders, avg_rate)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [dateStr, swapCount, usdcToEurc.toString(), eurcToUsdc.toString(), (usdcToEurc + eurcToUsdc).toString(), Math.floor(swapCount * 0.5), (1.08 + (Math.random() - 0.5) * 0.01).toFixed(8)]);
      
      console.log(`  Day ${day + 1}/${DAYS}: ${nativeCount} native + ${whaleCount} whales, ${cctpCount} cctp, ${fxCount} fx`);
    }
    
    // Indexer state
    console.log('Setting indexer state...');
    await client.query(`
      INSERT INTO indexer_state (chain_id, indexer_type, last_block, last_updated)
      VALUES 
        ('arc_testnet', 'native', $1, NOW()),
        ('arc_testnet', 'fx', $1, NOW()),
        ('ethereum_sepolia', 'cctp', $2, NOW()),
        ('arbitrum_sepolia', 'cctp', $2, NOW()),
        ('base_sepolia', 'cctp', $2, NOW())
      ON CONFLICT (chain_id, indexer_type) DO UPDATE SET
        last_block = EXCLUDED.last_block,
        last_updated = NOW()
    `, [blockNumber, blockNumber + 10000]);
    
    console.log('\n=== Seed Complete ===');
    console.log(`Native transfers: ${totalNative}`);
    console.log(`CCTP transfers: ${totalCctp}`);
    console.log(`FX swaps: ${totalFx}`);
    console.log(`Days of data: ${DAYS}`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
