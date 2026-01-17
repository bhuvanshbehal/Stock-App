require("dotenv").config();

const { fetchYahooHistoricalPrices } = require(
  "../src/scripts/fetch/yahoo/fetchYahooHistoricalPrices"
);

(async () => {
  const candles = await fetchYahooHistoricalPrices({
    stockSymbol: "TCS",
    exchangeCode: "NSE",
    ranges: [
      { start: "2025-12-10", end: "2025-12-12" },
      { start: "2026-01-07", end: "2026-01-07" },
    ],
  });

  console.log("Fetched candles:", candles.length);
  console.log(candles.slice(0, 3));
})();
