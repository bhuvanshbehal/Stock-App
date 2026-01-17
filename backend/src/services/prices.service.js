const pool = require("../db");

/**
 * Default exchange code used when none is explicitly provided.
 * Centralized here to avoid hardcoding in controllers.
 */
const DEFAULT_EXCHANGE_CODE = "NSE";

/**
 * Default data source for prices.
 * This represents the current ingestion source.
 */
const DEFAULT_SOURCE = "YAHOO";

/**
 * Resolves an exchange code (e.g. NSE, BSE) to its internal exchange_id.
 *
 * @param {string} exchangeCode - Exchange code (defaults to NSE)
 * @returns {Promise<number>} exchange_id
 * @throws {Error} if exchange does not exist
 */
async function getExchangeId(exchangeCode = DEFAULT_EXCHANGE_CODE) {
  const { rows } = await pool.query(
    `SELECT id FROM exchanges WHERE code = $1 LIMIT 1`,
    [exchangeCode]
  );

  if (!rows.length) {
    throw new Error(`Exchange not found: ${exchangeCode}`);
  }

  return rows[0].id;
}

/**
 * Fetches the latest available OHLC candle for a given stock on an exchange.
 *
 * @param {string} symbol - Stock symbol (e.g. TCS)
 * @param {number} exchangeId - Resolved exchange_id
 * @returns {Promise<Object|null>} Latest OHLC row or null if not found
 */
async function getLatestPrice(symbol, exchangeId) {
  const { rows } = await pool.query(
    `
    SELECT
      stock_symbol,
      price_open,
      price_high,
      price_low,
      price_close,
      volume,
      price_date
    FROM price_history
    WHERE stock_symbol = $1
      AND exchange_id = $2
    ORDER BY price_date DESC
    LIMIT 1
    `,
    [symbol, exchangeId]
  );

  return rows[0] || null;
}

/**
 * Fetches historical OHLC data for a stock within a date range.
 *
 * @param {string} symbol - Stock symbol
 * @param {number} exchangeId - Resolved exchange_id
 * @param {string} from - Start date (YYYY-MM-DD)
 * @param {string} to - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of OHLC rows ordered by date ASC
 */
async function getPriceHistory(symbol, exchangeId, from, to) {
  const { rows } = await pool.query(
    `
    SELECT
      stock_symbol,
      price_open,
      price_high,
      price_low,
      price_close,
      volume,
      price_date
    FROM price_history
    WHERE stock_symbol = $1
      AND exchange_id = $2
      AND price_date BETWEEN $3 AND $4
    ORDER BY price_date ASC
    `,
    [symbol, exchangeId, from, to]
  );

  return rows;
}

/**
 * Fetches the latest price for each stock in a given exchange.
 * Uses PostgreSQL DISTINCT ON for efficiency.
 *
 * @param {number} exchangeId - Resolved exchange_id
 * @returns {Promise<Array>} Array of latest OHLC rows (1 per stock)
 */
async function getMarketLatestPrices(exchangeId) {
  const { rows } = await pool.query(
    `
    SELECT DISTINCT ON (stock_symbol)
      stock_symbol,
      price_open,
      price_high,
      price_low,
      price_close,
      volume,
      price_date
    FROM price_history
    WHERE exchange_id = $1
    ORDER BY stock_symbol, price_date DESC
    `,
    [exchangeId]
  );

  return rows;
}

module.exports = {
  DEFAULT_EXCHANGE_CODE,
  DEFAULT_SOURCE,
  getExchangeId,
  getLatestPrice,
  getPriceHistory,
  getMarketLatestPrices,
};
