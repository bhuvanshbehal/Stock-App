require("dotenv").config();

const { detectPriceGaps } = require("../src/scripts/maintenance/backfill/detectPriceGaps");
const { groupDatesIntoRanges } = require("../src/utils/dateRangeUtils");
const { getExchangeId } = require("../src/services/prices.service");

(async () => {
  try {
    const exchangeCode = "NSE";
    const stockSymbol = "TCS";

    const retentionStart = "2025-12-01";
    const retentionEnd = "2026-01-16";

    const exchangeId = await getExchangeId(exchangeCode);

    /**
     * Step 1: Detect gaps
     */
    const gapResult = await detectPriceGaps({
      stockSymbol,
      exchangeId,
      retentionStart,
      retentionEnd,
    });

    console.log("\n=== GAP DETECTION RESULT ===");
    console.log({
      stock: gapResult.stockSymbol,
      expected: gapResult.expectedDatesCount,
      existing: gapResult.existingDatesCount,
      missingCount: gapResult.missingDates.length,
    });

    /**
     * Step 2: Fetch missing dates
     */
    const missingDates = gapResult.missingDates;

    console.log("\nMissing dates:");
    console.log(missingDates);

    /**
     * Step 3: Group missing dates into ranges
     */
    const ranges = groupDatesIntoRanges(missingDates);

    console.log("\nGrouped ranges (ready for Yahoo fetch):");
    console.log(ranges);

    process.exit(0);
  } catch (err) {
    console.error("Backfill gap test failed:", err.message);
    process.exit(1);
  }
})();
