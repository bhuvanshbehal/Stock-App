require("dotenv").config();

const { detectPriceGaps } = require("../src/scripts/maintenance/backfill/detectPriceGaps");
const { getExchangeId } = require("../src/services/prices.service");

(async () => {
  const exchangeId = await getExchangeId("NSE");

  const result = await detectPriceGaps({
    stockSymbol: "TCS",
    exchangeId,
    retentionStart: "2025-12-01",
    retentionEnd: "2026-01-27",
  });

  console.log(result);
  process.exit(0);
})();
