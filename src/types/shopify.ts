// Shopify webhook types for orders/create event

export interface ShopifyAddress {
  first_name: string;
  last_name: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  country: string;
  zip: string;
  phone?: string;
  name: string;
  province_code?: string;
  country_code: string;
}

export interface ShopifyCustomer {
  id: number;
  email?: string;
  first_name: string;
  last_name: string;
  phone?: string;
  default_address?: ShopifyAddress;
}

export interface ShopifyLineItem {
  id: number;
  title: string;
  quantity: number;
  price: string;
  product_id: number;
  variant_id?: number;
  variant_title?: string;
  sku?: string;
}

export interface ShopifyOrder {
  id: number;
  admin_graphql_api_id: string;
  app_id?: number;
  browser_ip?: string;
  buyer_accepts_marketing: boolean;
  cancel_reason?: string;
  cancelled_at?: string;
  cart_token?: string;
  checkout_id?: number;
  checkout_token?: string;
  client_details?: any;
  closed_at?: string;
  confirmed: boolean;
  contact_email?: string;
  created_at: string;
  currency: string;
  current_subtotal_price: string;
  current_total_discounts: string;
  current_total_price: string;
  current_total_tax: string;
  customer?: ShopifyCustomer;
  customer_locale?: string;
  discount_codes?: any[];
  email?: string;
  estimated_taxes: boolean;
  financial_status: string;
  fulfillment_status?: string;
  gateway?: string;
  landing_site?: string;
  landing_site_ref?: string;
  location_id?: number;
  name: string;
  note?: string;
  note_attributes?: any[];
  number: number;
  order_number: number;
  order_status_url: string;
  original_total_duties_set?: any;
  payment_gateway_names: string[];
  phone?: string;
  presentment_currency: string;
  processed_at: string;
  processing_method: string;
  reference?: string;
  referring_site?: string;
  source_identifier?: string;
  source_name: string;
  source_url?: string;
  subtotal_price: string;
  tags: string;
  tax_lines: any[];
  taxes_included: boolean;
  test: boolean;
  token: string;
  total_discounts: string;
  total_line_items_price: string;
  total_outstanding: string;
  total_price: string;
  total_shipping_price_set: any;
  total_tax: string;
  total_tip_received: string;
  total_weight: number;
  updated_at: string;
  user_id?: number;
  billing_address?: ShopifyAddress;
  shipping_address?: ShopifyAddress;
  line_items: ShopifyLineItem[];
}

export interface ShopifyWebhookPayload {
  order?: ShopifyOrder;
}

export interface ShopifyWebhookHeaders {
  'x-shopify-topic': string;
  'x-shopify-hmac-sha256': string;
  'x-shopify-shop-domain': string;
  'x-shopify-webhook-id': string;
  'x-shopify-api-version'?: string;
  'x-shopify-triggered-at'?: string;
}
