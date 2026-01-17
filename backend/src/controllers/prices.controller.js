const {
  DEFAULT_EXCHANGE_CODE,
  DEFAULT_SOURCE,
  getExchangeId,
  getLatestPrice,
  getPriceHistory,
  getMarketLatestPrices,
} = require("../services/prices.service");

/**
 * Controller: Get latest price for a stock.
 *
 * Route:
 * GET /api/stocks/:symbol/latest
 */
exports.getLatest = async (req, res) => {
  try {
    const { symbol } = req.params;

    const exchangeId = await getExchangeId(DEFAULT_EXCHANGE_CODE);
    const price = await getLatestPrice(symbol, exchangeId);

    if (!price) {
      return res.status(404).json({ message: "Price not found" });
    }

    res.json({
      symbol,
      exchange: DEFAULT_EXCHANGE_CODE,
      price_date: price.price_date,
      open: price.price_open,
      high: price.price_high,
      low: price.price_low,
      close: price.price_close,
      volume: price.volume,
      source: DEFAULT_SOURCE,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controller: Get historical prices for a stock.
 *
 * Route:
 * GET /api/stocks/:symbol/prices?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
exports.getHistory = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: "from and to dates are required" });
    }

    const exchangeId = await getExchangeId(DEFAULT_EXCHANGE_CODE);
    const rows = await getPriceHistory(symbol, exchangeId, from, to);

    const data = rows.map((r) => ({
      symbol,
      exchange: DEFAULT_EXCHANGE_CODE,
      price_date: r.price_date,
      open: r.price_open,
      high: r.price_high,
      low: r.price_low,
      close: r.price_close,
      volume: r.volume,
      source: DEFAULT_SOURCE,
    }));

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controller: Get latest prices for all stocks in an exchange.
 *
 * Route:
 * GET /api/markets/:exchange/latest
 */
exports.getMarketLatest = async (req, res) => {
  try {
    const exchangeCode =
      (req.params.exchange || DEFAULT_EXCHANGE_CODE).toUpperCase();

    const exchangeId = await getExchangeId(exchangeCode);
    const rows = await getMarketLatestPrices(exchangeId);

    const data = rows.map((r) => ({
      symbol: r.stock_symbol,
      exchange: exchangeCode,
      price_date: r.price_date,
      open: r.price_open,
      high: r.price_high,
      low: r.price_low,
      close: r.price_close,
      volume: r.volume,
      source: DEFAULT_SOURCE,
    }));

    res.json({
      exchange: exchangeCode,
      count: data.length,
      prices: data,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
