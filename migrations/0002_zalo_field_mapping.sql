-- Zalo template field mapping configuration
-- Allows mapping Shopify webhook fields to Zalo template fields

CREATE TABLE IF NOT EXISTS zalo_field_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zalo_field_name TEXT NOT NULL,
  shopify_json_path TEXT NOT NULL,
  default_value TEXT,
  is_required BOOLEAN DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index on zalo field name
CREATE UNIQUE INDEX IF NOT EXISTS idx_zalo_field_mappings_name ON zalo_field_mappings(zalo_field_name);

-- Insert default mappings for common Zalo template fields
INSERT INTO zalo_field_mappings (zalo_field_name, shopify_json_path, default_value, is_required, description) VALUES
  ('customer_name', 'customer.first_name || " " || customer.last_name', 'Khách hàng', 1, 'Customer full name'),
  ('order_code', 'name', '', 1, 'Order code/name (e.g., #1001)'),
  ('total_amount', 'total_price || " " || currency', '', 1, 'Total order amount with currency'),
  ('order_number', 'order_number', '', 0, 'Order number without #'),
  ('subtotal', 'subtotal_price', '', 0, 'Subtotal before shipping/tax'),
  ('items', 'line_items[].title || " x" || line_items[].quantity', '', 0, 'Comma-separated list of items'),
  ('shipping_address', 'shipping_address.address1 || ", " || shipping_address.city', '', 0, 'Formatted shipping address')
ON CONFLICT(id) DO UPDATE SET
  shopify_json_path = excluded.shopify_json_path,
  default_value = excluded.default_value,
  is_required = excluded.is_required,
  description = excluded.description,
  updated_at = CURRENT_TIMESTAMP;
