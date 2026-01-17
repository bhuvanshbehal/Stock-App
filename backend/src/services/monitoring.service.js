const pool = require("../db");
const logger = require("../utils/logger");

/**
 * Fetches the most recent trading date available for an exchange.
 */
async function getLatestTradingDate(exchangeId) {
  logger.debug("Fetching latest trading date", { exchangeId });

  const { rows } = await pool.query(
    `
    SELECT MAX(price_date) AS latest_date
    FROM price_history
    WHERE exchange_id = $1
    `,
    [exchangeId]
  );

  const latestDate = rows[0]?.latest_date || null;

  logger.info("Latest trading date resolved", {
    exchangeId,
    latestDate,
  });

  return latestDate;
}

/**
 * Counts how many distinct stocks have prices for a given date.
 */
async function getCoverageCount(exchangeId, priceDate) {
  logger.debug("Calculating coverage count", {
    exchangeId,
    priceDate,
  });

  const { rows } = await pool.query(
    `
    SELECT COUNT(DISTINCT stock_symbol) AS count
    FROM price_history
    WHERE exchange_id = $1
      AND price_date = $2
    `,
    [exchangeId, priceDate]
  );

  const count = Number(rows[0]?.count || 0);

  logger.info("Coverage count calculated", {
    exchangeId,
    priceDate,
    count,
  });

  return count;
}

/**
 * Counts total active stocks.
 */
async function getActiveStockCount() {
  logger.debug("Fetching active stock count");

  const { rows } = await pool.query(
    `
    SELECT COUNT(*) AS count
    FROM stocks
    WHERE active = true
    `
  );

  const count = Number(rows[0]?.count || 0);

  logger.info("Active stock count fetched", { count });

  return count;
}

/**
 * Finds stocks whose prices are older than staleDays.
 */
async function getStaleStocks(exchangeId, staleDays = 2) {
  logger.debug("Fetching stale stocks", {
    exchangeId,
    staleDays,
  });

  const { rows } = await pool.query(
    `
    SELECT
      stock_symbol,
      MAX(price_date) AS last_price_date
    FROM price_history
    WHERE exchange_id = $1
    GROUP BY stock_symbol
    HAVING MAX(price_date) < CURRENT_DATE - INTERVAL '${staleDays} days'
    ORDER BY last_price_date ASC
    `,
    [exchangeId]
  );

  logger.warn("Stale stock scan completed", {
    exchangeId,
    staleDays,
    staleCount: rows.length,
  });

  return rows;
}

module.exports = {
  getLatestTradingDate,
  getCoverageCount,
  getActiveStockCount,
  getStaleStocks,
};
