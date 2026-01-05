/**
 * Seed latest Yahoo OHLC prices into price_history
 *
 * - Idempotent
 * - Cron safe
 * - Schema aligned (NO refactors)
 */

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const pool = require("../../../db");

const INPUT_FILE = path.join(
  __dirname,
  "../../../../data/yahoo/latest_prices.json"
);

(async () => {
  let client;

  try {
    console.log("🔹 Reading Yahoo latest prices file");

    const raw = fs.readFileSync(INPUT_FILE, "utf-8");
    const payload = JSON.parse(raw);
    const prices = payload.prices || [];

    console.log(`📦 Records to process: ${prices.length}`);

    client = await pool.connect();

    // Resolve NSE exchange_id ONCE
    const { rows } = await client.query(
      `SELECT id FROM exchanges WHERE code = 'NSE' LIMIT 1`
    );

    if (!rows.length) {
      throw new Error("NSE exchange not found");
    }

    const exchangeId = rows[0].id;

    const upsertSql = `
      INSERT INTO price_history (
        stock_symbol,
        exchange_id,
        price_open,
        price_high,
        price_low,
        price_close,
        volume,
        price_date
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (stock_symbol, exchange_id, price_date)
      DO UPDATE SET
        price_open  = EXCLUDED.price_open,
        price_high  = EXCLUDED.price_high,
        price_low   = EXCLUDED.price_low,
        price_close = EXCLUDED.price_close,
        volume      = EXCLUDED.volume;
    `;

    let success = 0;
    let skipped = 0;

    for (const rec of prices) {
      const {
        symbol,
        price_date,
        open,
        high,
        low,
        close,
        volume,
      } = rec;

      // Basic OHLC validation
      if (
        open == null ||
        high == null ||
        low == null ||
        close == null ||
        high < Math.max(open, close) ||
        low > Math.min(open, close)
      ) {
        skipped++;
        continue;
      }

      try {
        await client.query(upsertSql, [
          symbol,
          exchangeId,
          open,
          high,
          low,
          close,
          volume ?? 0,
          price_date,
        ]);

        success++;
      } catch (err) {
        console.warn(`⚠️ DB insert failed for ${symbol}: ${err.message}`);
      }
    }

    console.log("✅ Price seeding completed");
    console.log(`✔ Inserted / Updated: ${success}`);
    console.log(`⚠ Skipped (invalid): ${skipped}`);
  } catch (err) {
    console.error("❌ seedLatestPrices failed:", err.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
})();
