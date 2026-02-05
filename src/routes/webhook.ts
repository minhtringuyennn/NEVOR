// Shopify webhook handler routes

import { Hono } from 'hono';
import type { ShopifyOrder } from '../types/shopify';
import { ShopifyService } from '../services/shopify';
import { ZaloService } from '../services/zalo';
import { FieldMapperService } from '../services/fieldMapper';
import { addServerLog } from './admin';

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
      addServerLog('error', 'Missing required webhook headers', 'webhook');
      return c.json({ error: 'Missing required headers' }, 400);
    }

    addServerLog('info', `Received webhook ${webhookId} from ${shopDomain} (${topic})`, 'webhook');

    // Verify webhook authenticity
    const shopifyService = new ShopifyService(c.env.SHOPIFY_WEBHOOK_SECRET);
    const isValid = await shopifyService.verifyWebhook(rawBody, hmacHeader);

    if (!isValid) {
      addServerLog('error', `Invalid webhook signature for ${webhookId}`, 'webhook');
      return c.json({ error: 'Invalid signature' }, 401);
    }

    addServerLog('info', `Webhook ${webhookId} signature verified`, 'webhook');

    // Parse payload
    const payload = JSON.parse(rawBody);
    const order: ShopifyOrder = payload;

    // Check if webhook already exists (Shopify retry)
    const existingWebhook = await c.env.DB.prepare(
      'SELECT id, status FROM webhook_logs WHERE webhook_id = ?'
    )
      .bind(webhookId)
      .first<{ id: number; status: string }>();

    if (existingWebhook) {
      addServerLog('info', `Webhook ${webhookId} already processed (status: ${existingWebhook.status}), skipping`, 'webhook');
      return c.json({
        status: 'duplicate',
        webhook_id: webhookId,
        message: 'Webhook already processed',
        existing_status: existingWebhook.status,
      });
    }

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

      addServerLog('info', `Webhook ${webhookId} ignored - not an orders/create webhook`, 'webhook');
      return c.json({ status: 'ignored', reason: 'Not an orders/create webhook' });
    }

    addServerLog('info', `Processing order ${order.name} (#${order.order_number}) from ${shopDomain}`, 'webhook');

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

      addServerLog('info', `Order ${order.name} skipped - does not meet notification conditions`, 'webhook');
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

      addServerLog('warn', `Order ${order.name} failed - no phone number found`, 'webhook');
      return c.json({
        status: 'failed',
        error: 'No phone number found in order',
      });
    }

    addServerLog('info', `Sending Zalo message to ${phone} for order ${order.name}`, 'webhook');

    // Format message for logging (kept for database record)
    shopifyService.formatOrderSummary(order, config);

    // Send Zalo message
    const zaloService = new ZaloService(
      c.env.ZALO_APP_ID,
      c.env.ZALO_ACCESS_TOKEN,
      c.env.ZALO_OA_ID
    );

    // Get field mappings from database
    const mappingsResult = await c.env.DB.prepare(
      'SELECT * FROM zalo_field_mappings ORDER BY is_required DESC, zalo_field_name'
    ).all<{
      id: number;
      zalo_field_name: string;
      shopify_json_path: string;
      default_value: string | null;
      is_required: number;
      description: string | null;
    }>();

    const mappings = (mappingsResult.results || []).map(m => ({
      id: m.id,
      zalo_field_name: m.zalo_field_name,
      shopify_json_path: m.shopify_json_path,
      is_required: m.is_required === 1,
      default_value: m.default_value,
      description: m.description,
      created_at: '',
      updated_at: '',
    }));

    // Build template data using field mappings
    let templateData: Record<string, string>;

    addServerLog('info', `Using Zalo template_id: ${c.env.ZALO_TEMPLATE_ID}`, 'webhook');

    if (mappings.length === 0) {
      // Fallback to default behavior if no mappings configured
      const customerName = order.customer
        ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
        : order.shipping_address?.name || 'Khách hàng';

      templateData = {
        customer_name: customerName || 'Khách hàng',
        order_code: order.name || `#${order.order_number}`,
        total_amount: `${order.total_price}`,
      };
    } else {
      templateData = FieldMapperService.buildTemplateData(order, mappings);
    }

    // Validate required fields
    const validation = FieldMapperService.validateRequiredFields(templateData, mappings);
    if (!validation.valid) {
      await c.env.DB.prepare(
        `UPDATE webhook_logs
         SET status = ?, error = ?, processed_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
        .bind('failed', `Missing required fields: ${validation.missing.join(', ')}`, webhookLogId)
        .run();

      addServerLog('error', `Order ${order.name} failed - missing required fields: ${validation.missing.join(', ')}`, 'webhook');
      return c.json({
        status: 'failed',
        error: `Missing required fields: ${validation.missing.join(', ')}`,
      });
    }

    const zaloResult = await zaloService.sendTemplateMessage(
      phone,
      c.env.ZALO_TEMPLATE_ID,
      templateData
    );

    // Log detailed Zalo response for debugging
    addServerLog('info', `Zalo API response for ${order.name}: error=${zaloResult.error}, msg=${zaloResult.message || 'none'}`, 'webhook');
    if (zaloResult.error !== 0) {
      addServerLog('error', `Zalo API full response: ${JSON.stringify(zaloResult)}`, 'webhook');
    }

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

    if (zaloResult.error === 0) {
      addServerLog('info', `Zalo message sent successfully to ${phone} for order ${order.name}`, 'webhook');
    } else {
      addServerLog('error', `Zalo message failed to ${phone}: [${zaloResult.error}] ${zaloResult.message}`, 'webhook');
    }

    return c.json({
      status: zaloResult.error === 0 ? 'success' : 'failed',
      webhook_id: webhookId,
      phone: phone,
      zalo_response: zaloResult,
    });
  } catch (error) {
    addServerLog('error', `Webhook processing error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'webhook');
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
