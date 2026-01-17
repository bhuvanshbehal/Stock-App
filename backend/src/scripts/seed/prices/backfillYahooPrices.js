/**
 * Backfill Yahoo historical prices into price_history
 *
 * Responsibilities:
 * - Orchestrates gap detection, fetch, and DB upsert
 * - Modifies database (seed script)
 * - Idempotent and safe to re-run
 *
 * Usage:
 *   node backfillYahooPrices.js
 */

require("dotenv").config();

const pool = require("../../../db");
const logger = require("../../../utils/logger");

const { detectPriceGaps } = require("../../maintenance/backfill/detectPriceGaps");
const { groupDatesIntoRanges } = require("../../../utils/dateRangeUtils");
const {
  fetchYahooHistoricalPrices,
} = require("../../fetch/yahoo/fetchYahooHistoricalPrices");
const {
  upsertHistoricalPrices,
} = require("../../../services/pricesBackfill.service");
const { getExchangeId } = require("../../../services/prices.service");

/**
 * Configuration (Phase-1 defaults)
 */
const EXCHANGE_CODE = "NSE";
const RETENTION_YEARS = Number(process.env.BACKFILL_RETENTION_YEARS || 5);

/**
 * Computes retention window start date.
 */
function computeRetentionStart(listedDate) {
  const today = new Date();
  const retentionStart = new Date();
  retentionStart.setFullYear(today.getFullYear() - RETENTION_YEARS);

  if (listedDate) {
    const listed = new Date(listedDate);
    return listed > retentionStart ? listed : retentionStart;
  }

  return retentionStart;
}

(async () => {
  const startedAt = Date.now();
  let client;

  let stats = {
    stocksProcessed: 0,
    stocksWithGaps: 0,
    totalMissingDates: 0,
    totalRanges: 0,
    candlesFetched: 0,
    candlesInserted: 0,
    failedStocks: 0,
  };

  try {
    logger.info("Starting Yahoo backfill process", {
      exchange: EXCHANGE_CODE,
      retentionYears: RETENTION_YEARS,
    });

    client = await pool.connect();

    const exchangeId = await getExchangeId(EXCHANGE_CODE);

    /**
     * Fetch active stocks
     */
    const { rows: stocks } = await client.query(`
      SELECT symbol, listed_date
      FROM stocks
      WHERE active = true
      ORDER BY symbol
    `);

    logger.info("Active stocks fetched", { count: stocks.length });

    for (const stock of stocks) {
      const { symbol, listed_date } = stock;
      stats.stocksProcessed++;

      try {
        const retentionStartDate = computeRetentionStart(listed_date)
          .toISOString()
          .slice(0, 10);

        const retentionEndDate = new Date()
          .toISOString()
          .slice(0, 10);

        /**
         * Step 1: Detect gaps
         */
        const gapResult = await detectPriceGaps({
          stockSymbol: symbol,
          exchangeId,
          retentionStart: retentionStartDate,
          retentionEnd: retentionEndDate,
        });

        if (gapResult.missingDates.length === 0) {
          logger.debug("No gaps detected", { symbol });
          continue;
        }

        stats.stocksWithGaps++;
        stats.totalMissingDates += gapResult.missingDates.length;

        /**
         * Step 2: Group missing dates into ranges
         */
        const ranges = groupDatesIntoRanges(gapResult.missingDates);
        stats.totalRanges += ranges.length;

        logger.info("Backfill gaps detected", {
          symbol,
          missingDates: gapResult.missingDates.length,
          ranges: ranges.length,
        });

        /**
         * Step 3: Fetch Yahoo historical data
         */
        const candles = await fetchYahooHistoricalPrices({
          stockSymbol: symbol,
          exchangeCode: EXCHANGE_CODE,
          ranges,
        });

        stats.candlesFetched += candles.length;

        if (candles.length === 0) {
          logger.warn("No candles fetched for gaps", { symbol });
          continue;
        }

        /**
         * Step 4: Upsert into DB
         */
        const upsertResult = await upsertHistoricalPrices(candles);
        stats.candlesInserted += upsertResult.inserted;

        logger.info("Backfill completed for stock", {
          symbol,
          fetched: candles.length,
          inserted: upsertResult.inserted,
        });
      } catch (err) {
        stats.failedStocks++;
        logger.error("Backfill failed for stock", {
          symbol,
          error: err.message,
          stack: err.stack,
        });
      }
    }

    const durationSeconds = Math.round((Date.now() - startedAt) / 1000);

    logger.info("Yahoo backfill process completed", {
      ...stats,
      durationSeconds,
    });
  } catch (err) {
    logger.error("Fatal backfill failure", {
      error: err.message,
      stack: err.stack,
    });
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
})();
