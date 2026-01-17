require("dotenv").config();

const { fetchYahooHistoricalPrices } = require(
  "../src/scripts/fetch/yahoo/fetchYahooHistoricalPrices"
);
const { getPriceHistory } = require("../src/services/prices.service");
const { upsertHistoricalPrices } = require(
  "../src/services/pricesBackfill.service"
);

(async () => {
    const priceHistory = await getPriceHistory("YESBANK", 1, "2025-12-10", "2025-12-12");
    console.log("the existing priceHistory is: ", priceHistory)
  const candles = await fetchYahooHistoricalPrices({
    stockSymbol: "YESBANK",
    exchangeCode: "NSE",
    ranges: [{ start: "2025-12-10", end: "2025-12-12" }],
  });

  const result = await upsertHistoricalPrices(candles);

  console.log("Upsert result:", result);
})();
