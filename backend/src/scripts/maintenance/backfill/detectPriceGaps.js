require("dotenv").config();

const pool = require("../../../db");
const logger = require("../../../utils/logger");
const { generateTradingDates } = require("../../../utils/tradingCalendar");

/**
 * Detects missing trading dates for a stock within a retention window.
 *
 * @param {Object} params
 * @param {string} params.stockSymbol
 * @param {number} params.exchangeId
 * @param {string} params.retentionStart - YYYY-MM-DD
 * @param {string} params.retentionEnd - YYYY-MM-DD
 *
 * @returns {Promise<Object>} Gap detection result
 */
async function detectPriceGaps({
  stockSymbol,
  exchangeId,
  retentionStart,
  retentionEnd,
}) {
  logger.debug("Detecting price gaps", {
    stockSymbol,
    exchangeId,
    retentionStart,
    retentionEnd,
  });

  // Step 1: Generate expected trading dates
  const expectedDates = generateTradingDates(
    retentionStart,
    retentionEnd
  );

  // Step 2: Fetch existing dates from DB
  const { rows } = await pool.query(
    `
    SELECT price_date::date AS price_date
    FROM price_history
    WHERE stock_symbol = $1
      AND exchange_id = $2
      AND price_date BETWEEN $3 AND $4
    `,
    [stockSymbol, exchangeId, retentionStart, retentionEnd]
  );

  const existingDatesSet = new Set(
    rows.map((r) =>
      new Date(r.price_date).toISOString().slice(0, 10)
    )
  );

  // Step 3: Compute missing dates
  const missingDates = expectedDates.filter(
    (d) => !existingDatesSet.has(d)
  );

  logger.info("Gap detection completed", {
    stockSymbol,
    exchangeId,
    expectedDates: expectedDates.length,
    existingDates: existingDatesSet.size,
    missingDates: missingDates.length,
  });

  return {
    stockSymbol,
    exchangeId,
    expectedDatesCount: expectedDates.length,
    existingDatesCount: existingDatesSet.size,
    missingDates,
  };
}

module.exports = {
  detectPriceGaps,
};
