-- Add optimized indexes for price_history read queries

CREATE INDEX IF NOT EXISTS idx_price_history_stock_symbol_date_desc
ON price_history (stock_symbol, price_date DESC);

CREATE INDEX IF NOT EXISTS idx_price_history_exchange_date_desc
ON price_history (exchange_id, price_date DESC);
