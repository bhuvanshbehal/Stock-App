/**
 * Seed / Sync stocks from dhan_stock_master_NSE.json
 *
 * - Uses shared pool from db/index.js
 * - Safe to re-run (UPSERT based)
 * - Marks missing stocks as inactive
 * - Transactional & production-ready
 */

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const pool = require("../../../db");

// ----------------------
// CONFIG
// ----------------------
const DATA_FILE = path.join(
  __dirname,
  "../../../../dhan_stock_master_NSE.json"
);

// ----------------------
// MAIN
// ----------------------
(async () => {
  const client = await pool.connect();

  try {
    console.log("🔹 Reading Dhan stock master file");

    if (!fs.existsSync(DATA_FILE)) {
      throw new Error(`Data file not found at: ${DATA_FILE}`);
    }

    const stocks = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

    if (!Array.isArray(stocks) || stocks.length === 0) {
      throw new Error("Stock master file is empty or invalid");
    }

    console.log(`📦 Stocks in file: ${stocks.length}`);

    await client.query("BEGIN");

    // --------------------------------------------------
    // Resolve currency_id (INR)
    // --------------------------------------------------
    const currencyRes = await client.query(
      `SELECT id FROM currencies WHERE code = 'INR'`
    );

    if (currencyRes.rows.length === 0) {
      throw new Error("Currency INR not found in currencies table");
    }

    const currencyId = currencyRes.rows[0].id;

    // --------------------------------------------------
    // Resolve exchange_id (NSE)
    // --------------------------------------------------
    const exchangeRes = await client.query(
      `SELECT id FROM exchanges WHERE code = 'NSE'`
    );

    if (exchangeRes.rows.length === 0) {
      throw new Error("Exchange NSE not found in exchanges table");
    }

    const exchangeId = exchangeRes.rows[0].id;

    console.log("🔹 Seeding stocks");

    const activeSymbols = new Set();

    for (const stock of stocks) {
      const symbol = stock.symbol;
      const name = stock.company_name;
      const isin = stock.isin || null;

      if (!symbol || !name) {
        console.warn("⚠️ Skipping invalid stock entry:", stock);
        continue;
      }

      activeSymbols.add(symbol);

      // ----------------------
      // UPSERT stocks
      // ----------------------
      await client.query(
        `
        INSERT INTO stocks (
          symbol,
          name,
          isin,
          currency_id,
          active
        )
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (symbol)
        DO UPDATE SET
          name = EXCLUDED.name,
          isin = EXCLUDED.isin,
          currency_id = EXCLUDED.currency_id,
          active = true,
          last_updated = now()
        `,
        [symbol, name, isin, currencyId]
      );

      // ----------------------
      // UPSERT stock_exchanges
      // ----------------------
      await client.query(
        `
        INSERT INTO stock_exchanges (stock_symbol, exchange_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        `,
        [symbol, exchangeId]
      );
    }

    // --------------------------------------------------
    // Mark stocks missing from Dhan list as inactive
    // --------------------------------------------------
    console.log("🔹 Marking missing stocks as inactive");

    await client.query(
      `
      UPDATE stocks
      SET active = false
      WHERE symbol NOT IN (
        SELECT unnest($1::varchar[])
      )
      `,
      [Array.from(activeSymbols)]
    );

    await client.query("COMMIT");

    console.log("✅ Stock seeding completed successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Stock seeding failed:", err.message);
  } finally {
    client.release();
    await pool.end(); // REQUIRED for scripts
  }
})();
