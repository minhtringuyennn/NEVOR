-- Initial database schema for Shopify-Zalo Worker

-- Webhook logs table
-- Stores all incoming webhooks from Shopify
CREATE TABLE IF NOT EXISTS webhook_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  webhook_id TEXT UNIQUE NOT NULL,
  topic TEXT NOT NULL,
  shop_domain TEXT NOT NULL,
  payload TEXT NOT NULL,
  processed_at TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_shop_domain ON webhook_logs(shop_domain);

-- Zalo message logs table
-- Stores all messages sent via Zalo ZBS
CREATE TABLE IF NOT EXISTS zalo_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  webhook_log_id INTEGER,
  phone TEXT NOT NULL,
  template_id TEXT NOT NULL,
  template_data TEXT,
  zalo_response TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (webhook_log_id) REFERENCES webhook_logs(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_zalo_logs_status ON zalo_logs(status);
CREATE INDEX IF NOT EXISTS idx_zalo_logs_phone ON zalo_logs(phone);
CREATE INDEX IF NOT EXISTS idx_zalo_logs_webhook_log_id ON zalo_logs(webhook_log_id);
CREATE INDEX IF NOT EXISTS idx_zalo_logs_created_at ON zalo_logs(created_at DESC);

-- Settings table
-- Stores application configuration
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message template configuration table
-- Controls which fields are included in Zalo messages
CREATE TABLE IF NOT EXISTS message_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  include_order_number BOOLEAN DEFAULT 1,
  include_total_amount BOOLEAN DEFAULT 1,
  include_item_list BOOLEAN DEFAULT 1,
  include_delivery_info BOOLEAN DEFAULT 1,
  send_condition TEXT DEFAULT 'all',
  min_amount REAL DEFAULT 0,
  phone_field_mapping TEXT DEFAULT 'phone',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default message config
INSERT INTO message_config (id) VALUES (1)
ON CONFLICT(id) DO NOTHING;

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('zalo_enabled', 'true'),
  ('webhook_enabled', 'true')
ON CONFLICT(key) DO NOTHING;
