// Main Cloudflare Worker entry point

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import webhook from './routes/webhook';
import admin from './routes/admin';
import { SettingsService } from './services/settings';

type Bindings = {
  DB: D1Database;
  SHOPIFY_WEBHOOK_SECRET: string;
  SHOPIFY_SHOP_DOMAIN: string;
  ZALO_APP_ID: string;
  ZALO_ACCESS_TOKEN: string;
  ZALO_OA_ID: string;
  ZALO_TEMPLATE_ID: string;
  ADMIN_PASSWORD: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('*', logger());
app.use('/webhook/*', cors());

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'Shopify-Zalo Worker',
    version: '1.0.0',
    endpoints: {
      webhook: '/webhook/shopify',
      admin: '/admin',
    },
  });
});

// Mount routes
app.route('/webhook', webhook);
app.route('/admin', admin);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: 'The requested endpoint does not exist',
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error('Worker error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred',
    },
    500
  );
});

// Export the Hono app for normal requests
export default {
  // HTTP request handler
  fetch: app.fetch,

  // Cron trigger handler for scheduled tasks
  async scheduled(
    controller: ScheduledController,
    env: Bindings,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log(`Cron job triggered at ${new Date().toISOString()}`);
    console.log(`Cron pattern: ${controller.cron}`);

    // Handle periodic token refresh
    if (controller.cron === '0 3 * * *') {
      console.log('Running daily Zalo token refresh...');

      try {
        const settingsService = new SettingsService(env.DB);

        // Check if we have refresh token configured
        const refreshToken = await settingsService.get('zalo_refresh_token');
        if (!refreshToken) {
          console.log('No refresh token configured, skipping auto-refresh');
          return;
        }

        // Attempt to refresh the token
        const success = await settingsService.refreshZaloToken();

        if (success) {
          console.log('✓ Zalo token refreshed successfully via cron job');
        } else {
          console.error('✗ Failed to refresh Zalo token via cron job');
        }
      } catch (error) {
        console.error('Error in scheduled token refresh:', error);
      }
    }

    console.log('Cron job completed');
  },
};
