// Shopify webhook handler routes

import { Hono } from 'hono';
import type { ShopifyOrder } from '../types/shopify';
import { ShopifyService } from '../services/shopify';
import { ZaloService } from '../services/zalo';

type Bindings = {
  DB: D1Database;
  SHOPIFY_WEBHOOK_SECRET: string;
  SHOPIFY_SHOP_DOMAIN: string;
  ZALO_APP_ID: string;
  ZALO_ACCESS_TOKEN: string;
  ZALO_OA_ID: string;
  ZALO_TEMPLATE_ID: string;
};

const webhook = new Hono<{ Bindings: Bindings }>();

/**
 * Handle Shopify orders/create webhook
 * POST /webhook/shopify
 */
webhook.post('/shopify', async (c) => {
  try {
    // Get raw body for HMAC verification
    const rawBody = await c.req.text();

    // Get headers
    const hmacHeader = c.req.header('x-shopify-hmac-sha256');
    const topic = c.req.header('x-shopify-topic');
    const shopDomain = c.req.header('x-shopify-shop-domain');
    const webhookId = c.req.header('x-shopify-webhook-id');

    if (!hmacHeader || !topic || !shopDomain || !webhookId) {
      console.error('Missing required webhook headers');
      return c.json({ error: 'Missing required headers' }, 400);
    }

    // Verify webhook authenticity
    const shopifyService = new ShopifyService(c.env.SHOPIFY_WEBHOOK_SECRET);
    const isValid = await shopifyService.verifyWebhook(rawBody, hmacHeader);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return c.json({ error: 'Invalid signature' }, 401);
    }

    // Parse payload
    const payload = JSON.parse(rawBody);
    const order: ShopifyOrder = payload;

    // Log webhook to database
    const webhookLogResult = await c.env.DB.prepare(
      `INSERT INTO webhook_logs (webhook_id, topic, shop_domain, payload, status)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(webhookId, topic, shopDomain, rawBody, 'processing')
      .run();

    const webhookLogId = webhookLogResult.meta.last_row_id;

    // Process only orders/create webhooks
    if (topic !== 'orders/create') {
      await c.env.DB.prepare(
        `UPDATE webhook_logs SET status = ?, processed_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
        .bind('ignored', webhookLogId)
        .run();

      return c.json({ status: 'ignored', reason: 'Not an orders/create webhook' });
    }

    // Get message configuration
    const configResult = await c.env.DB.prepare(
      'SELECT * FROM message_config WHERE id = 1'
    ).first();

    const config = configResult || {
      include_order_number: true,
      include_total_amount: true,
      include_item_list: true,
      include_delivery_info: true,
      send_condition: 'all',
      min_amount: 0,
    };

    // Check if we should send notification
    const shouldSend = shopifyService.shouldSendNotification(
      order,
      config.send_condition as string,
      config.min_amount as number
    );

    if (!shouldSend) {
      await c.env.DB.prepare(
        `UPDATE webhook_logs SET status = ?, processed_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
        .bind('skipped', webhookLogId)
        .run();

      return c.json({
        status: 'skipped',
        reason: 'Order does not meet notification conditions',
      });
    }

    // Extract phone number
    const phone = shopifyService.extractPhoneNumber(order);

    if (!phone) {
      await c.env.DB.prepare(
        `UPDATE webhook_logs
         SET status = ?, error = ?, processed_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
        .bind('failed', 'No phone number found in order', webhookLogId)
        .run();

      return c.json({
        status: 'failed',
        error: 'No phone number found in order',
      });
    }

    // Format message for logging
    const message = shopifyService.formatOrderSummary(order, config);

    // Send Zalo message
    const zaloService = new ZaloService(
      c.env.ZALO_APP_ID,
      c.env.ZALO_ACCESS_TOKEN,
      c.env.ZALO_OA_ID
    );

    // Extract customer name from order
    const customerName = order.customer
      ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
      : order.shipping_address?.name || 'Khách hàng';

    // Build template data matching Zalo ZBS template variables
    const templateData: Record<string, string> = {};

    // Always include these core fields for Zalo template
    templateData.customer_name = customerName || 'Khách hàng';
    templateData.order_code = order.name || `#${order.order_number}`;
    templateData.total_amount = `${order.total_price} ${order.currency}`;

    // Optional fields based on config
    if (config.include_order_number) {
      templateData.order_number = order.order_number.toString();
    }

    if (config.include_total_amount) {
      templateData.subtotal = order.subtotal_price || order.total_price;
      templateData.total = order.total_price;
    }

    if (config.include_item_list && order.line_items) {
      templateData.items = order.line_items
        .map((item) => `${item.title} x${item.quantity}`)
        .join(', ');
    }

    if (config.include_delivery_info && order.shipping_address) {
      const addr = order.shipping_address;
      templateData.shipping_address = [addr.address1, addr.city, addr.country]
        .filter(Boolean)
        .join(', ');
    }

    const zaloResult = await zaloService.sendTemplateMessage(
      phone,
      c.env.ZALO_TEMPLATE_ID,
      templateData
    );

    // Log Zalo message
    await c.env.DB.prepare(
      `INSERT INTO zalo_logs (webhook_log_id, phone, template_id, template_data, zalo_response, status, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    )
      .bind(
        webhookLogId,
        phone,
        c.env.ZALO_TEMPLATE_ID,
        JSON.stringify(templateData),
        JSON.stringify(zaloResult),
        zaloResult.error === 0 ? 'success' : 'failed'
      )
      .run();

    // Update webhook log
    await c.env.DB.prepare(
      `UPDATE webhook_logs
       SET status = ?, processed_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(zaloResult.error === 0 ? 'success' : 'failed', webhookLogId)
      .run();

    return c.json({
      status: zaloResult.error === 0 ? 'success' : 'failed',
      webhook_id: webhookId,
      phone: phone,
      zalo_response: zaloResult,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return c.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default webhook;
