-- Migration: Add app_settings table for storing all configuration
-- This replaces the need for environment variables

-- App settings table for all configuration values
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  is_secret BOOLEAN DEFAULT 0,  -- 1 for secrets (password, tokens), 0 for public config
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings (empty values - user must configure via UI)
INSERT INTO app_settings (key, value, is_secret) VALUES
  -- Admin password (will be hashed)
  ('admin_password_hash', '', 1),
  -- Shopify settings
  ('shopify_webhook_secret', '', 1),
  ('shopify_shop_domain', '', 0),
  -- Zalo settings (user only provides app_id and app_secret, we handle tokens)
  ('zalo_app_id', '', 0),
  ('zalo_app_secret', '', 1),
  ('zalo_access_token', '', 1),  -- Managed internally
  ('zalo_refresh_token', '', 1), -- Managed internally
  ('zalo_oa_id', '', 0),
  ('zalo_template_id', '', 0)
ON CONFLICT(key) DO NOTHING;
