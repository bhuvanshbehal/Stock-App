const logger = require("../utils/logger");

const {
  getLatestTradingDate,
  getCoverageCount,
  getActiveStockCount,
  getStaleStocks,
} = require("../services/monitoring.service");

const { getExchangeId } = require("../services/prices.service");

/**
 * Controller: Market data health check
 */
exports.getMarketHealth = async (req, res) => {
  const exchangeCode = (req.query.exchange || "NSE").toUpperCase();
  const staleDays = Number(req.query.staleDays || 2);

  logger.info("Market health check requested", {
    exchangeCode,
    staleDays,
    source: "admin-api",
  });

  try {
    const exchangeId = await getExchangeId(exchangeCode);

    const latestDate = await getLatestTradingDate(exchangeId);

    if (!latestDate) {
      logger.warn("No price data found for exchange", {
        exchangeCode,
      });

      return res.json({
        exchange: exchangeCode,
        status: "NO_DATA",
        message: "No price data available",
      });
    }

    const covered = await getCoverageCount(exchangeId, latestDate);
    const active = await getActiveStockCount();
    const stale = await getStaleStocks(exchangeId, staleDays);

    const coveragePercent =
      active === 0 ? 0 : Number(((covered / active) * 100).toFixed(2));

    const status =
      coveragePercent === 100 && stale.length === 0
        ? "HEALTHY"
        : "DEGRADED";

    logger.info("Market health computed", {
      exchangeCode,
      latestDate,
      activeStocks: active,
      stocksWithPrices: covered,
      coveragePercent,
      staleCount: stale.length,
      status,
    });

    res.json({
      exchange: exchangeCode,
      latestTradingDate: latestDate,
      activeStocks: active,
      stocksWithPrices: covered,
      coveragePercent,
      staleThresholdDays: staleDays,
      staleCount: stale.length,
      staleStocks: stale.map((s) => ({
        symbol: s.stock_symbol,
        lastPriceDate: s.last_price_date,
      })),
      status,
    });
  } catch (err) {
    logger.error("Market health check failed", {
      exchangeCode,
      error: err.message,
      stack: err.stack,
    });

    res.status(500).json({ error: err.message });
  }
};
