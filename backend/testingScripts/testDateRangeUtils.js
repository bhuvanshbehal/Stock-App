require("dotenv").config();

const { generateTradingDates } = require("../src/utils/tradingCalendar");
const { groupDatesIntoRanges } = require("../src/utils/dateRangeUtils");
const { detectPriceGaps } = require("../src/scripts/maintenance/backfill/detectPriceGaps");

(async () => {
  /**
   * Test window
   */
  const START_DATE = "2025-12-01";
  const END_DATE = "2026-01-16";

  /**
   * Step 1: Generate expected trading dates
   */
  const tradingDates = generateTradingDates(START_DATE, END_DATE);

  /**
   * Step 2: Detect missing data (ASYNC!)
   */
  const gapResult = await detectPriceGaps({
    stockSymbol: "TCS",
    exchangeId: 1,
    retentionStart: START_DATE,
    retentionEnd: END_DATE,
  });

  const missingDates = gapResult.missingDates;

  /**
   * Step 3: Group missing dates into ranges
   */
  const ranges = groupDatesIntoRanges(missingDates);

  /**
   * Step 4: Output results
   */
  console.log("=======================================");
  console.log("Trading window:");
  console.log(`${START_DATE} → ${END_DATE}`);
  console.log("Total trading days:", tradingDates.length);

  console.log("\nMissing trading dates:");
  console.log(missingDates);

  console.log("\nGenerated ranges:");
  console.log(ranges);

  console.log("=======================================");
})();
