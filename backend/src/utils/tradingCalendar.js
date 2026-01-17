/**
 * Generates all trading dates (Mon–Fri) between two dates (inclusive).
 * Phase-1 calendar: weekends excluded, holidays ignored.
 *
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 * @returns {string[]} Array of YYYY-MM-DD
 */
function generateTradingDates(startDate, endDate) {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
  
    for (
      let d = new Date(start);
      d <= end;
      d.setDate(d.getDate() + 1)
    ) {
      const day = d.getDay(); // 0 = Sun, 6 = Sat
      if (day !== 0 && day !== 6) {
        dates.push(d.toISOString().slice(0, 10));
      }
    }
  
    return dates;
  }
  
  module.exports = {
    generateTradingDates,
  };
  