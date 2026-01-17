const { generateTradingDates } = require("./tradingCalendar");

/**
 * Groups trading dates into contiguous trading ranges.
 * Optimized version:
 * - Trading calendar generated once
 * - Index-based adjacency check (O(n))
 *
 * @param {string[]} dates - Array of YYYY-MM-DD (trading dates)
 * @returns {{ start: string, end: string }[]}
 */
function groupDatesIntoRanges(dates) {
  if (!Array.isArray(dates) || dates.length === 0) {
    return [];
  }

  // Sort input dates
  const sortedDates = [...dates].sort();

  // Generate trading calendar ONCE
  const calendarStart = sortedDates[0];
  const calendarEnd = sortedDates[sortedDates.length - 1];
  const tradingCalendar = generateTradingDates(
    calendarStart,
    calendarEnd
  );

  // Map date → index for O(1) lookup
  const tradingIndexMap = new Map();
  tradingCalendar.forEach((date, index) => {
    tradingIndexMap.set(date, index);
  });

  const ranges = [];
  let rangeStart = sortedDates[0];
  let prevDate = sortedDates[0];

  for (let i = 1; i < sortedDates.length; i++) {
    const currentDate = sortedDates[i];

    const prevIndex = tradingIndexMap.get(prevDate);
    const currentIndex = tradingIndexMap.get(currentDate);

    // Safety check (should not happen, but defensive)
    if (prevIndex === undefined || currentIndex === undefined) {
      ranges.push({ start: rangeStart, end: prevDate });
      rangeStart = currentDate;
      prevDate = currentDate;
      continue;
    }

    if (currentIndex === prevIndex + 1) {
      // Contiguous trading day
      prevDate = currentDate;
    } else {
      // Gap → close range
      ranges.push({ start: rangeStart, end: prevDate });
      rangeStart = currentDate;
      prevDate = currentDate;
    }
  }

  // Final range
  ranges.push({ start: rangeStart, end: prevDate });

  return ranges;
}

module.exports = {
  groupDatesIntoRanges,
};
