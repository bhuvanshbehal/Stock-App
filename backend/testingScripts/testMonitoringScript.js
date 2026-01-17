require("dotenv").config();

const {
    getLatestTradingDate,
    getCoverageCount,
    getActiveStockCount,
    getStaleStocks,
  } = require("../src/services/monitoring.service");
  
  const { getExchangeId } = require("../src/services/prices.service");
  
  (async () => {
    const exchangeId = await getExchangeId("NSE");
  
    const latestDate = await getLatestTradingDate(exchangeId);
    const covered = await getCoverageCount(exchangeId, latestDate);
    const active = await getActiveStockCount();
    const stale = await getStaleStocks(exchangeId, 2);
  
    console.log({
      latestDate,
      covered,
      active,
      coveragePercent: ((covered / active) * 100).toFixed(2),
      staleCount: stale.length,
      staleStocks: stale.map(s => s.stock_symbol),
    });
  })();
  