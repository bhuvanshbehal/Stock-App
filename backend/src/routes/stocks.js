const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * GET /api/stocks
 * Returns all stocks with currency & exchanges
 */
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT
        s.symbol,
        s.name,
        s.active,
        c.code AS currency,
        COALESCE(
          json_agg(e.code) FILTER (WHERE e.code IS NOT NULL),
          '[]'
        ) AS exchanges
      FROM stocks s
      LEFT JOIN currencies c
        ON c.id = s.currency_id
      LEFT JOIN stock_exchanges se
        ON se.stock_symbol = s.symbol
      LEFT JOIN exchanges e
        ON e.id = se.exchange_id
      GROUP BY s.symbol, s.name, s.active, c.code
      ORDER BY s.symbol;
    `;

    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching stocks:', err);
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
});

/**
 * GET /api/stocks/:symbol
 * Returns details for a single stock
 */
router.get('/:symbol', async (req, res) => {
  const { symbol } = req.params;

  try {
    const query = `
      SELECT
        s.symbol,
        s.name,
        s.isin,
        s.active,
        s.listed_date,
        c.code AS currency,
        COALESCE(
          json_agg(e.code) FILTER (WHERE e.code IS NOT NULL),
          '[]'
        ) AS exchanges
      FROM stocks s
      LEFT JOIN currencies c
        ON c.id = s.currency_id
      LEFT JOIN stock_exchanges se
        ON se.stock_symbol = s.symbol
      LEFT JOIN exchanges e
        ON e.id = se.exchange_id
      WHERE s.symbol = $1
      GROUP BY
        s.symbol, s.name, s.isin, s.active, s.listed_date, c.code;
    `;

    const { rows } = await pool.query(query, [symbol]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching stock:', err);
    res.status(500).json({ error: 'Failed to fetch stock details' });
  }
});

/**
 * GET /api/stocks/:symbol/prices
 * Returns price history for a stock
 */
router.get('/:symbol/prices', async (req, res) => {
  const { symbol } = req.params;

  try {
    const query = `
      SELECT
        ph.price_date,
        ph.price_open,
        ph.price_high,
        ph.price_low,
        ph.price_close,
        ph.volume,
        e.code AS exchange
      FROM price_history ph
      JOIN exchanges e
        ON e.id = ph.exchange_id
      WHERE ph.stock_symbol = $1
      ORDER BY ph.price_date ASC;
    `;

    const { rows } = await pool.query(query, [symbol]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching prices:', err);
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
});


/**
 * GET /api/stocks/:symbol/fundamentals
 * Returns annual & quarterly fundamentals with metrics
 */
router.get('/:symbol/fundamentals', async (req, res) => {
  const { symbol } = req.params;

  try {
    const query = `
      SELECT
        fc.id AS context_id,
        fc.period_type,
        fc.fiscal_year,
        fc.fiscal_quarter,
        fc.reported_at,
        fc.report_url,
        md.metric_key,
        md.display_name,
        fm.metric_value,
        fm.metric_unit
      FROM fundamentals_context fc
      JOIN fundamental_metrics fm
        ON fm.context_id = fc.id
      JOIN metric_definitions md
        ON md.id = fm.metric_definition_id
      WHERE fc.stock_symbol = $1
      ORDER BY
        fc.fiscal_year DESC,
        fc.fiscal_quarter NULLS FIRST,
        md.display_name;
    `;

    const { rows } = await pool.query(query, [symbol]);

    // Group by fundamentals context
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.context_id]) {
        grouped[row.context_id] = {
          period_type: row.period_type,
          fiscal_year: row.fiscal_year,
          fiscal_quarter: row.fiscal_quarter,
          reported_at: row.reported_at,
          report_url: row.report_url,
          metrics: [],
        };
      }

      grouped[row.context_id].metrics.push({
        key: row.metric_key,
        name: row.display_name,
        value: row.metric_value,
        unit: row.metric_unit,
      });
    }

    res.json(Object.values(grouped));
  } catch (err) {
    console.error('Error fetching fundamentals:', err);
    res.status(500).json({ error: 'Failed to fetch fundamentals' });
  }
});

module.exports = router;
