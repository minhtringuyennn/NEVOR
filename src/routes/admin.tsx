// Admin UI routes with HTMX-based authentication

import { Hono } from 'hono';
import { getSignedCookie, setSignedCookie, deleteCookie } from 'hono/cookie';
import { DatabaseService } from '../services/db';
import { ZaloService } from '../services/zalo';
import { DashboardView } from '../views/dashboard';
import { SettingsView } from '../views/settings';
import { LogsView } from '../views/logs';
import { ServerLogsView, ServerLogsList } from '../views/server-logs';
import { FieldMappingsView } from '../views/field-mappings';
import { Alert, Layout } from '../views/layout';

type Bindings = {
  DB: D1Database;
  ADMIN_PASSWORD: string;
  ZALO_APP_ID: string;
  ZALO_ACCESS_TOKEN: string;
  ZALO_OA_ID: string;
  ZALO_TEMPLATE_ID: string;
};

type Variables = {
  isAuthenticated: boolean;
};

const admin = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const COOKIE_NAME = 'admin_session';
const COOKIE_SECRET = 'shopify-zalo-worker-secret-key-change-in-production';

// Login View Component
const LoginView = ({ error }: { error?: string }) => (
  <Layout title="Admin Login - Shopify Zalo Worker">
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
      <div class="max-w-md w-full">
        <div class="bg-white rounded-lg shadow-md p-8">
          <div class="text-center mb-8">
            <h1 class="text-2xl font-bold text-gray-900">Admin Login</h1>
            <p class="text-sm text-gray-500 mt-2">Shopify → Zalo Integration</p>
          </div>

          {error && (
            <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p class="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form
            hx-post="/admin/login"
            hx-target="#login-result"
            hx-swap="innerHTML"
            class="space-y-6"
          >
            <div>
              <label
                for="username"
                class="block text-sm font-medium text-gray-700"
              >
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value="admin"
                readonly
                class="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label
                for="password"
                class="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                autofocus
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter admin password"
              />
            </div>

            <div id="login-result"></div>

            <button
              type="submit"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  </Layout>
);

// Auth middleware - check if user is logged in
admin.use('*', async (c, next) => {
  const password = c.env.ADMIN_PASSWORD;
  if (!password) {
    return c.json({ error: 'ADMIN_PASSWORD not configured' }, 500);
  }

  // Check for session cookie
  const session = await getSignedCookie(c, COOKIE_SECRET, COOKIE_NAME);
  c.set('isAuthenticated', session === 'authenticated');

  await next();
});

// Redirect to login if not authenticated (for HTML routes)
admin.use('*', async (c, next) => {
  const isAuth = c.get('isAuthenticated');
  const path = c.req.path;

  // Allow access to login page and login endpoint
  if (path === '/admin/login' || path.startsWith('/admin/login')) {
    return next();
  }

  // Redirect to login if not authenticated
  if (!isAuth) {
    // For HTMX requests, return login form
    if (c.req.header('hx-request')) {
      return c.html(<LoginView />);
    }
    // For regular requests, redirect to login
    return c.html(<LoginView />);
  }

  await next();
});

/**
 * Login Page - GET /admin/login
 */
admin.get('/login', (c) => {
  if (c.get('isAuthenticated')) {
    return c.redirect('/admin');
  }
  return c.html(<LoginView />);
});

/**
 * Login Handler - POST /admin/login
 */
admin.post('/login', async (c) => {
  const formData = await c.req.parseBody();
  const username = formData.username as string;
  const password = formData.password as string;

  if (username === 'admin' && password === c.env.ADMIN_PASSWORD) {
    // Set session cookie
    await setSignedCookie(c, COOKIE_NAME, 'authenticated', COOKIE_SECRET, {
      path: '/admin',
      httpOnly: true,
      maxAge: 86400, // 24 hours
      sameSite: 'Lax',
    });

    // Check if HTMX request
    if (c.req.header('hx-request')) {
      // Use HX-Redirect header for HTMX requests
      c.header('HX-Redirect', '/admin');
      return c.html(<div class="p-3 bg-green-50 border border-green-200 rounded-md"><p class="text-sm text-green-600">Login successful! Redirecting...</p></div>);
    }

    // Regular form submission - redirect normally
    return c.redirect('/admin');
  }

  return c.html(
    <div class="p-3 bg-red-50 border border-red-200 rounded-md">
      <p class="text-sm text-red-600">Invalid username or password</p>
    </div>
  );
});

/**
 * Logout - GET /admin/logout
 */
admin.get('/logout', (c) => {
  deleteCookie(c, COOKIE_NAME, { path: '/admin' });
  return c.redirect('/admin/login');
});

/**
 * Dashboard - GET /admin
 */
admin.get('/', async (c) => {
  const db = new DatabaseService(c.env.DB);

  const webhookStats = await db.getWebhookStats();
  const zaloStats = await db.getZaloStats();
  const recentWebhooks = await db.getWebhookLogs(10);

  // Build webhook URL from current request
  const url = new URL(c.req.url);
  const webhookUrl = `${url.protocol}//${url.host}/webhook/shopify`;

  return c.html(
    <DashboardView
      webhookStats={webhookStats}
      zaloStats={zaloStats}
      recentWebhooks={recentWebhooks}
      webhookUrl={webhookUrl}
    />
  );
});

/**
 * Webhook Logs - GET /admin/logs
 */
admin.get('/logs', async (c) => {
  const db = new DatabaseService(c.env.DB);

  const status = c.req.query('status');
  const page = parseInt(c.req.query('page') || '1');
  const limit = 50;
  const offset = (page - 1) * limit;
  const logId = c.req.query('id');

  const logs = await db.getWebhookLogs(limit, offset, status);

  let selectedLog = null;
  if (logId) {
    selectedLog = await db.getWebhookLog(parseInt(logId));
    if (selectedLog) {
      const zaloLogs = await db.getZaloLogsByWebhook(parseInt(logId));
      (selectedLog as any).zaloLogs = zaloLogs;
    }
  }

  return c.html(
    <LogsView
      logs={logs}
      selectedLog={selectedLog as any}
      statusFilter={status}
      page={page}
      totalPages={Math.ceil(logs.length / limit)}
    />
  );
});

/**
 * Settings - GET /admin/settings
 */
admin.get('/settings', async (c) => {
  const db = new DatabaseService(c.env.DB);
  const config = await db.getMessageConfig();

  return c.html(
    <SettingsView
      config={
        config || {
          id: 1,
          include_order_number: true,
          include_total_amount: true,
          include_item_list: true,
          include_delivery_info: true,
          send_condition: 'all',
          min_amount: 0,
          phone_field_mapping: 'phone',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      }
    />
  );
});

/**
 * Save Message Config - POST /admin/api/settings/message-config
 */
admin.post('/api/settings/message-config', async (c) => {
  try {
    const formData = await c.req.parseBody();
    const db = new DatabaseService(c.env.DB);

    await db.updateMessageConfig({
      include_order_number: formData.include_order_number === 'on',
      include_total_amount: formData.include_total_amount === 'on',
      include_item_list: formData.include_item_list === 'on',
      include_delivery_info: formData.include_delivery_info === 'on',
      send_condition: formData.send_condition as string,
      min_amount: parseFloat(formData.min_amount as string) || 0,
      phone_field_mapping: (formData.phone_field_mapping as string) || 'phone',
    });

    return c.html(<Alert type="success" message="Configuration saved successfully!" />);
  } catch (error) {
    console.error('Save config error:', error);
    return c.html(
      <Alert
        type="error"
        message={`Failed to save configuration: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`}
      />
    );
  }
});

/**
 * Test Zalo Connection - POST /admin/api/test-zalo
 */
admin.post('/api/test-zalo', async (c) => {
  try {
    const zaloService = new ZaloService(
      c.env.ZALO_APP_ID,
      c.env.ZALO_ACCESS_TOKEN,
      c.env.ZALO_OA_ID
    );

    const result = await zaloService.testConnection();

    if (result.success) {
      return c.html(
        <Alert
          type="success"
          message={`✓ Connected successfully! OA Name: ${result.details?.name || 'N/A'}`}
        />
      );
    } else {
      return c.html(<Alert type="error" message={`✗ Connection failed: ${result.message}`} />);
    }
  } catch (error) {
    console.error('Test Zalo error:', error);
    return c.html(
      <Alert
        type="error"
        message={`Error: ${error instanceof Error ? error.message : 'Unknown error'}`}
      />
    );
  }
});

/**
 * Test Send Message - POST /admin/api/test-send
 */
admin.post('/api/test-send', async (c) => {
  try {
    const formData = await c.req.parseBody();
    const phone = formData.phone as string;
    const orderNumber = (formData.order_number as string) || '12345';
    const totalAmount = (formData.total_amount as string) || '1,000,000 VND';
    const message = (formData.message as string) || 'This is a test message from Shopify-Zalo Worker';

    if (!phone) {
      return c.html(<Alert type="error" message="Phone number is required" />);
    }

    const zaloService = new ZaloService(
      c.env.ZALO_APP_ID,
      c.env.ZALO_ACCESS_TOKEN,
      c.env.ZALO_OA_ID
    );

    const result = await zaloService.sendTemplateMessage(phone, c.env.ZALO_TEMPLATE_ID, {
      order_number: orderNumber,
      total_amount: totalAmount,
      message: message,
    });

    if (result.error === 0) {
      return c.html(
        <Alert type="success" message={`✓ Test message sent successfully to ${phone}!`} />
      );
    } else {
      return c.html(<Alert type="error" message={`✗ Failed to send: ${result.message}`} />);
    }
  } catch (error) {
    console.error('Test send error:', error);
    return c.html(
      <Alert
        type="error"
        message={`Error: ${error instanceof Error ? error.message : 'Unknown error'}`}
      />
    );
  }
});

/**
 * Retry Webhook - POST /admin/api/retry/:id
 */
admin.post('/api/retry/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const db = new DatabaseService(c.env.DB);

    await db.retryWebhook(id);

    return c.html(
      <Alert
        type="success"
        message="Webhook queued for retry. Refresh the page to see updated status."
      />
    );
  } catch (error) {
    console.error('Retry webhook error:', error);
    return c.html(
      <Alert
        type="error"
        message={`Failed to retry: ${error instanceof Error ? error.message : 'Unknown error'}`}
      />
    );
  }
});

// Simple in-memory log storage (resets on worker restart)
const serverLogs: Array<{
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  source?: string;
}> = [];

// Helper to add log
export function addServerLog(
  level: 'info' | 'warn' | 'error',
  message: string,
  source?: string
) {
  serverLogs.unshift({
    timestamp: new Date().toISOString(),
    level,
    message,
    source,
  });
  // Keep only last 100 logs
  if (serverLogs.length > 100) {
    serverLogs.pop();
  }
}

/**
 * Server Logs - GET /admin/server-logs
 */
admin.get('/server-logs', (c) => {
  const filter = c.req.query('filter') as 'info' | 'warn' | 'error' | undefined;

  // Add initial system logs if empty
  if (serverLogs.length === 0) {
    serverLogs.push(
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Server started. Logs are stored in memory and will be cleared on worker restart.',
        source: 'system',
      },
      {
        timestamp: new Date(Date.now() - 1000).toISOString(),
        level: 'info',
        message: 'Server logs system initialized',
        source: 'system',
      }
    );
  }

  let logs = serverLogs;
  if (filter) {
    logs = serverLogs.filter((log) => log.level === filter);
  }

  // For HTMX requests, return only the partial view (no Layout wrapper)
  if (c.req.header('hx-request')) {
    return c.html(<ServerLogsList logs={logs} />);
  }

  // For regular requests, return the full page with Layout
  return c.html(<ServerLogsView logs={logs} filter={filter} />);
});

/**
 * Field Mappings Page - GET /admin/field-mappings
 */
admin.get('/field-mappings', async (c) => {
  const db = new DatabaseService(c.env.DB);
  const mappings = await db.getZaloFieldMappings();

  return c.html(<FieldMappingsView mappings={mappings} />);
});

/**
 * Create Field Mapping - POST /admin/api/field-mappings
 */
admin.post('/api/field-mappings', async (c) => {
  try {
    const formData = await c.req.parseBody();
    const db = new DatabaseService(c.env.DB);

    await db.createZaloFieldMapping({
      zalo_field_name: formData.zalo_field_name as string,
      shopify_json_path: formData.shopify_json_path as string,
      default_value: (formData.default_value as string) || null,
      is_required: formData.is_required === 'on',
      description: (formData.description as string) || null,
    });

    return c.html(<Alert type="success" message="Field mapping created successfully!" />);
  } catch (error) {
    console.error('Create field mapping error:', error);
    return c.html(
      <Alert
        type="error"
        message={`Failed to create mapping: ${error instanceof Error ? error.message : 'Unknown error'}`}
      />
    );
  }
});

/**
 * Delete Field Mapping - DELETE /admin/api/field-mappings/:id
 */
admin.delete('/api/field-mappings/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const db = new DatabaseService(c.env.DB);

    await db.deleteZaloFieldMapping(id);

    return c.html(''); // Empty response removes the row
  } catch (error) {
    console.error('Delete field mapping error:', error);
    return c.html(
      <Alert
        type="error"
        message={`Failed to delete mapping: ${error instanceof Error ? error.message : 'Unknown error'}`}
      />
    );
  }
});

/**
 * Add Preset Field Mappings - POST /admin/api/field-mappings/preset/:type
 */
admin.post('/api/field-mappings/preset/:type', async (c) => {
  try {
    const presetType = c.req.param('type');
    const db = new DatabaseService(c.env.DB);

    const basicPresets = [
      {
        zalo_field_name: 'customer_name',
        shopify_json_path: 'customer.first_name || " " || customer.last_name',
        default_value: 'Khách hàng',
        is_required: true,
        description: 'Customer full name',
      },
      {
        zalo_field_name: 'order_code',
        shopify_json_path: 'name',
        default_value: '',
        is_required: true,
        description: 'Order code/name (e.g., #1001)',
      },
      {
        zalo_field_name: 'total_amount',
        shopify_json_path: 'total_price || " " || currency',
        default_value: '',
        is_required: true,
        description: 'Total order amount with currency',
      },
    ];

    const extendedPresets = [
      {
        zalo_field_name: 'order_number',
        shopify_json_path: 'order_number',
        default_value: '',
        is_required: false,
        description: 'Order number without #',
      },
      {
        zalo_field_name: 'items',
        shopify_json_path: 'line_items[].title || " x" || line_items[].quantity',
        default_value: '',
        is_required: false,
        description: 'Comma-separated list of items',
      },
      {
        zalo_field_name: 'shipping_address',
        shopify_json_path: 'shipping_address.address1 || ", " || shipping_address.city',
        default_value: '',
        is_required: false,
        description: 'Formatted shipping address',
      },
    ];

    const presets = presetType === 'full' ? [...basicPresets, ...extendedPresets] : basicPresets;

    for (const preset of presets) {
      try {
        await db.createZaloFieldMapping(preset);
      } catch (e) {
        // Ignore duplicate errors
        if (!(e instanceof Error && e.message.includes('UNIQUE'))) {
          throw e;
        }
      }
    }

    return c.html(
      <Alert
        type="success"
        message={`Added ${presets.length} field mappings. Refresh the page to see them.`}
      />
    );
  } catch (error) {
    console.error('Preset field mappings error:', error);
    return c.html(
      <Alert
        type="error"
        message={`Failed to add presets: ${error instanceof Error ? error.message : 'Unknown error'}`}
      />
    );
  }
});

export default admin;
