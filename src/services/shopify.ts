// Shopify webhook verification service

import type { ShopifyOrder, ShopifyWebhookHeaders } from '../types/shopify';

export class ShopifyService {
  private webhookSecret: string;

  constructor(webhookSecret: string) {
    this.webhookSecret = webhookSecret;
  }

  /**
   * Verify Shopify webhook HMAC signature
   * @param body Raw webhook body as string
   * @param hmacHeader HMAC signature from X-Shopify-Hmac-SHA256 header
   * @returns true if signature is valid
   */
  async verifyWebhook(body: string, hmacHeader: string): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(body);
      const key = encoder.encode(this.webhookSecret);

      // Import the key for HMAC
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      // Calculate HMAC
      const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);

      // Convert to base64
      const signatureArray = Array.from(new Uint8Array(signature));
      const calculatedHmac = btoa(String.fromCharCode(...signatureArray));

      // Compare with provided HMAC
      return calculatedHmac === hmacHeader;
    } catch (error) {
      console.error('HMAC verification error:', error);
      return false;
    }
  }

  /**
   * Extract customer phone number from order
   * Priority: customer.phone > shipping_address.phone > billing_address.phone > phone
   */
  extractPhoneNumber(order: ShopifyOrder): string | null {
    const phone =
      order.customer?.phone ||
      order.shipping_address?.phone ||
      order.billing_address?.phone ||
      order.phone ||
      null;

    return phone ? this.normalizePhoneNumber(phone) : null;
  }

  /**
   * Normalize phone number to E.164 format
   * Removes spaces, dashes, parentheses, and ensures it starts with country code
   */
  normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let normalized = phone.replace(/\D/g, '');

    // If starts with 0, assume it's Vietnamese and add +84
    if (normalized.startsWith('0')) {
      normalized = '84' + normalized.substring(1);
    }

    // Ensure it starts with country code
    if (!normalized.startsWith('84')) {
      normalized = '84' + normalized;
    }

    return normalized;
  }

  /**
   * Check if order meets notification conditions
   */
  shouldSendNotification(
    order: ShopifyOrder,
    condition: string,
    minAmount: number
  ): boolean {
    // Don't send for test orders
    if (order.test) {
      return false;
    }

    switch (condition) {
      case 'all':
        return true;

      case 'paid_only':
        return order.financial_status === 'paid';

      case 'min_amount':
        const totalPrice = parseFloat(order.total_price);
        return totalPrice >= minAmount;

      default:
        return true;
    }
  }

  /**
   * Format order summary for message
   */
  formatOrderSummary(order: ShopifyOrder, config: any): string {
    const parts: string[] = [];

    if (config.include_order_number) {
      parts.push(`Đơn hàng: #${order.order_number}`);
    }

    if (config.include_total_amount) {
      parts.push(`Tổng tiền: ${order.total_price} ${order.currency}`);
    }

    if (config.include_item_list && order.line_items.length > 0) {
      const items = order.line_items
        .map((item) => `- ${item.title} x${item.quantity}`)
        .join('\n');
      parts.push(`Sản phẩm:\n${items}`);
    }

    if (config.include_delivery_info && order.shipping_address) {
      const addr = order.shipping_address;
      const address = [
        addr.address1,
        addr.address2,
        addr.city,
        addr.province,
        addr.country,
      ]
        .filter(Boolean)
        .join(', ');
      parts.push(`Địa chỉ giao hàng: ${address}`);
    }

    return parts.join('\n\n');
  }
}
