const axios = require("axios");
const logger = require("../../../utils/logger");

const YAHOO_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

/**
 * Builds possible Yahoo symbols for NSE stocks.
 * Order matters: most common first.
 */
function buildYahooSymbols(symbol) {
  return [
    `${symbol}.NS`,
    `${symbol}-SM.NS`,
    `${symbol}-E1.NS`,
  ];
}

/**
 * Converts YYYY-MM-DD to Unix timestamp (seconds)
 */
function toUnix(dateStr, isEnd = false) {
  const d = new Date(dateStr);
  if (isEnd) {
    d.setHours(23, 59, 59, 999);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return Math.floor(d.getTime() / 1000);
}

/**
 * Fetches historical daily candles from Yahoo for given ranges.
 *
 * @param {Object} params
 * @param {string} params.stockSymbol
 * @param {string} params.exchangeCode
 * @param {{start: string, end: string}[]} params.ranges
 *
 * @returns {Promise<Object[]>} Array of OHLC records
 */
async function fetchYahooHistoricalPrices({
  stockSymbol,
  exchangeCode,
  ranges,
}) {
  const results = [];

  for (const range of ranges) {
    const period1 = toUnix(range.start);
    const period2 = toUnix(range.end, true);

    let fetched = false;

    for (const yahooSymbol of buildYahooSymbols(stockSymbol)) {
      const url =
        `${YAHOO_BASE_URL}/${yahooSymbol}` +
        `?interval=1d&period1=${period1}&period2=${period2}`;

      try {
        logger.debug("Fetching Yahoo historical prices", {
          stockSymbol,
          yahooSymbol,
          range,
        });

        const res = await axios.get(url, {
          timeout: 15000,
          headers: { "User-Agent": "Mozilla/5.0" },
        });

        const chart = res.data?.chart?.result?.[0];
        if (!chart || !chart.timestamp) {
          throw new Error("Invalid Yahoo response");
        }

        const timestamps = chart.timestamp;
        const quote = chart.indicators.quote[0];

        for (let i = 0; i < timestamps.length; i++) {
          if (
            quote.open[i] == null ||
            quote.high[i] == null ||
            quote.low[i] == null ||
            quote.close[i] == null
          ) {
            continue; // skip invalid candles
          }

          results.push({
            stock_symbol: stockSymbol,
            exchange_code: exchangeCode,
            price_date: new Date(timestamps[i] * 1000)
              .toISOString()
              .slice(0, 10),
            open: quote.open[i],
            high: quote.high[i],
            low: quote.low[i],
            close: quote.close[i],
            volume: quote.volume[i],
            source: "YAHOO",
          });
        }

        logger.info("Yahoo range fetch successful", {
          stockSymbol,
          yahooSymbol,
          start: range.start,
          end: range.end,
          candles: timestamps.length,
        });

        fetched = true;
        break; // stop trying suffixes
      } catch (err) {
        logger.warn("Yahoo fetch failed for symbol", {
          stockSymbol,
          yahooSymbol,
          error: err.message,
        });
      }
    }

    if (!fetched) {
      logger.error("All Yahoo symbol variants failed", {
        stockSymbol,
        range,
      });
    }
  }

  return results;
}

module.exports = {
  fetchYahooHistoricalPrices,
};
