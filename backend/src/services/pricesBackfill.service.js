const pool = require("../db");
const logger = require("../utils/logger");

/**
 * Inserts historical OHLC candles into price_history.
 * Uses UPSERT semantics to ensure idempotency.
 *
 * @param {Object[]} candles
 * @returns {Promise<Object>} summary
 */
async function upsertHistoricalPrices(candles) {
  if (!Array.isArray(candles) || candles.length === 0) {
    logger.info("No candles to upsert");
    return {
      attempted: 0,
      inserted: 0,
    };
  }

  let inserted = 0;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const c of candles) {
      const res = await client.query(
        `
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
        VALUES (
          $1,
          (SELECT id FROM exchanges WHERE code = $2 LIMIT 1),
          $3, $4, $5, $6, $7, $8
        )
        ON CONFLICT (stock_symbol, exchange_id, price_date)
        DO NOTHING
        `,
        [
          c.stock_symbol,
          c.exchange_code,
          c.open,
          c.high,
          c.low,
          c.close,
          c.volume,
          c.price_date,
        ]
      );

      inserted += res.rowCount; // 1 if inserted, 0 if duplicate
    }

    await client.query("COMMIT");

    logger.info("Historical price upsert completed", {
      attempted: candles.length,
      inserted,
    });

    return {
      attempted: candles.length,
      inserted,
    };
  } catch (err) {
    await client.query("ROLLBACK");

    logger.error("Historical price upsert failed", {
      error: err.message,
      stack: err.stack,
    });

    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  upsertHistoricalPrices,
};
