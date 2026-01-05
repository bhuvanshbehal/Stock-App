/**
 * Fetch latest daily OHLC prices from Yahoo Finance
 *
 * GUARANTEES output file creation
 * even if partial failures occur
 */

require("dotenv").config();

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const pool = require("../../../db");

const YAHOO_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const OUTPUT_FILE = path.join(
    __dirname,
    "../../../../data/yahoo/latest_prices.json"
);

/**
 * Yahoo symbol variants to try (in order)
 */
function buildYahooSymbols(baseSymbol) {
  return [
    `${baseSymbol}.NS`,
    `${baseSymbol}-SM.NS`,
    `${baseSymbol}-E1.NS`,
    `${baseSymbol}-E2.NS`,
  ];
}

/**
 * Fetch OHLC from Yahoo
 */
async function fetchYahooCandle(yahooSymbol) {
  const url = `${YAHOO_BASE_URL}/${yahooSymbol}?interval=1d&range=5d`;

  const res = await axios.get(url, {
    timeout: 10000,
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  const chart = res.data?.chart?.result?.[0];
  if (!chart) throw new Error("Invalid Yahoo response");

  const timestamps = chart.timestamp;
  const quotes = chart.indicators?.quote?.[0];
  if (!timestamps || !quotes) throw new Error("Missing candle data");

  const lastIndex = timestamps.length - 1;

  const record = {
    price_date: new Date(timestamps[lastIndex] * 1000)
      .toISOString()
      .slice(0, 10),
    open: quotes.open[lastIndex],
    high: quotes.high[lastIndex],
    low: quotes.low[lastIndex],
    close: quotes.close[lastIndex],
    volume: quotes.volume[lastIndex],
  };

  if (
    record.open == null ||
    record.high == null ||
    record.low == null ||
    record.close == null
  ) {
    throw new Error("Incomplete candle");
  }

  return record;
}

(async () => {
  let client;
  const results = [];
  const failed = [];

  try {
    console.log("🔹 Connecting to PostgreSQL");
    client = await pool.connect();

    console.log("🔹 Fetching active stocks from DB");
    const { rows: stocks } = await client.query(
      `SELECT symbol FROM stocks WHERE active = true`
    );

    console.log(`📦 Active stocks found: ${stocks.length}`);

    for (const { symbol } of stocks) {
      let resolved = false;

      for (const yahooSymbol of buildYahooSymbols(symbol)) {
        try {
          const candle = await fetchYahooCandle(yahooSymbol);

          results.push({
            symbol,
            yahoo_symbol: yahooSymbol,
            exchange: "NSE",
            ...candle,
          });

          console.log(`✅ ${symbol} → ${yahooSymbol}`);
          resolved = true;
          break;
        } catch (err) {
          // silent retry with next suffix
        }
      }

      if (!resolved) {
        failed.push({
          symbol,
          reason: "No valid Yahoo symbol found",
        });
        console.warn(`⚠️ ${symbol}: unresolved after retries`);
      }
    }
  } catch (err) {
    console.error("❌ Fatal error during Yahoo fetch:", err.message);
  } finally {
    /**
     * ALWAYS write output file
     */
    console.log("💾 Writing output file");

    const payload = {
      generated_at: new Date().toISOString(),
      source: "Yahoo Finance",
      success_count: results.length,
      failed_count: failed.length,
      prices: results,
      failed_symbols: failed,
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2));

    console.log(`✅ Output written to ${OUTPUT_FILE}`);
    console.log(`✔ Success: ${results.length}`);
    console.log(`✖ Failed: ${failed.length}`);

    if (client) client.release();
    await pool.end();
  }
})();
