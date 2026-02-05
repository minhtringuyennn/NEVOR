-- Fix total_amount field mapping to remove currency
UPDATE zalo_field_mappings 
SET shopify_json_path = 'total_price',
    description = 'Total order amount (number only)',
    updated_at = CURRENT_TIMESTAMP
WHERE zalo_field_name = 'total_amount' 
  AND shopify_json_path LIKE '%currency%';
