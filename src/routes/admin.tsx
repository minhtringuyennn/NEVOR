// Admin UI routes with HTMX-based authentication

import { Hono } from 'hono';
import { getSignedCookie, setSignedCookie, deleteCookie } from 'hono/cookie';
import { DatabaseService } from '../services/db';
import { ZaloService } from '../services/zalo';
import { SettingsService, hashPassword, verifyPassword } from '../services/settings';
import { SettingsView } from '../views/settings';
import { LogsView } from '../views/logs';
import { Alert, Layout } from '../views/layout';

type Bindings = {
  DB: D1Database;
  // Keep these for initial setup, but they can be empty
  ADMIN_PASSWORD?: string;
  ZALO_APP_ID?: string;
  ZALO_ACCESS_TOKEN?: string;
  ZALO_OA_ID?: string;
  ZALO_TEMPLATE_ID?: string;
  SHOPIFY_WEBHOOK_SECRET?: string;
  SHOPIFY_SHOP_DOMAIN?: string;
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
  const settingsService = new SettingsService(c.env.DB);

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
admin.get('/login', async (c) => {
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

  const settingsService = new SettingsService(c.env.DB);
  const hasPassword = await settingsService.hasAdminPassword();

  // If no password is set, allow login with env variable as fallback (for migration)
  let isValid = false;
  if (!hasPassword && c.env.ADMIN_PASSWORD) {
    isValid = username === 'admin' && password === c.env.ADMIN_PASSWORD;
  } else {
    isValid = username === 'admin' && await settingsService.verifyAdminPassword(password);
  }

  if (isValid) {
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
 * Zalo OA OAuth callback - GET /admin/zalo-callback
 * Exchanges authorization code for OA access + refresh tokens
 */
admin.get('/zalo-callback', async (c) => {
  const code = c.req.query('code');
  const error = c.req.query('error');

  if (error) {
    return c.html(
      <Layout title="Zalo OAuth Error">
        <div class="min-h-screen flex items-center justify-center bg-gray-50">
          <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
            <h2 class="text-xl font-bold text-red-600 mb-4">Authorization Failed</h2>
            <p class="text-gray-600">Error: {error}</p>
            <a href="/admin/settings?tab=zalo" class="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg">Back to Settings</a>
          </div>
        </div>
      </Layout>
    );
  }

  if (!code) {
    return c.html(
      <Layout title="Zalo OAuth Error">
        <div class="min-h-screen flex items-center justify-center bg-gray-50">
          <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
            <h2 class="text-xl font-bold text-red-600 mb-4">Missing Authorization Code</h2>
            <p class="text-gray-600">No authorization code received from Zalo.</p>
            <a href="/admin/settings?tab=zalo" class="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg">Back to Settings</a>
          </div>
        </div>
      </Layout>
    );
  }

  const settingsService = new SettingsService(c.env.DB);
  const appId = await settingsService.get('zalo_app_id') || c.env.ZALO_APP_ID;
  const appSecret = await settingsService.get('zalo_app_secret');

  if (!appId || !appSecret) {
    return c.html(
      <Layout title="Zalo OAuth Error">
        <div class="min-h-screen flex items-center justify-center bg-gray-50">
          <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
            <h2 class="text-xl font-bold text-red-600 mb-4">Missing App Credentials</h2>
            <p class="text-gray-600">App ID and App Secret must be saved in settings before completing OAuth.</p>
            <a href="/admin/settings?tab=zalo" class="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg">Back to Settings</a>
          </div>
        </div>
      </Layout>
    );
  }

  try {
    const callbackUrl = new URL(c.req.url);
    const redirectUri = `${callbackUrl.origin}/admin/zalo-callback`;

    const response = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'secret_key': appSecret,
      },
      body: new URLSearchParams({
        code,
        app_id: appId,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const data: { access_token?: string; refresh_token?: string; error?: number; message?: string } = await response.json();

    if (data.access_token) {
      await settingsService.setMany({
        zalo_access_token: data.access_token,
        ...(data.refresh_token ? { zalo_refresh_token: data.refresh_token } : {}),
      });

      return c.html(
        <Layout title="Zalo Connected">
          <div class="min-h-screen flex items-center justify-center bg-gray-50">
            <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
              <div class="text-green-500 text-5xl mb-4">✓</div>
              <h2 class="text-xl font-bold text-gray-900 mb-2">Zalo OA Connected!</h2>
              <p class="text-gray-600 mb-6">Your OA access token has been saved successfully.</p>
              <a href="/admin/settings?tab=zalo" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go to Settings</a>
            </div>
          </div>
        </Layout>
      );
    } else {
      return c.html(
        <Layout title="Zalo OAuth Error">
          <div class="min-h-screen flex items-center justify-center bg-gray-50">
            <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
              <h2 class="text-xl font-bold text-red-600 mb-4">Token Exchange Failed</h2>
              <p class="text-gray-600 mb-2">Zalo returned an error:</p>
              <pre class="text-xs bg-gray-100 p-3 rounded">{JSON.stringify(data, null, 2)}</pre>
              <a href="/admin/settings?tab=zalo" class="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg">Back to Settings</a>
            </div>
          </div>
        </Layout>
      );
    }
  } catch (err) {
    console.error('Zalo OAuth callback error:', err);
    return c.html(
      <Layout title="Zalo OAuth Error">
        <div class="min-h-screen flex items-center justify-center bg-gray-50">
          <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
            <h2 class="text-xl font-bold text-red-600 mb-4">Unexpected Error</h2>
            <p class="text-gray-600">{err instanceof Error ? err.message : 'Unknown error'}</p>
            <a href="/admin/settings?tab=zalo" class="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg">Back to Settings</a>
          </div>
        </div>
      </Layout>
    );
  }
});

/**
 * Settings - GET /admin (root now redirects to settings)
 */
admin.get('/', async (c) => {
  return c.redirect('/admin/settings');
});

/**
 * Settings - GET /admin/settings
 */
admin.get('/settings', async (c) => {
  const db = new DatabaseService(c.env.DB);
  const settingsService = new SettingsService(c.env.DB);

  const config = await db.getMessageConfig();
  const mappings = await db.getZaloFieldMappings();
  const appSettings = await settingsService.getAllSettings();

  // Check if first-time setup
  const hasPassword = await settingsService.hasAdminPassword();

  // Get active tab from query param
  const activeTab = c.req.query('tab') || 'general';

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
      appConfig={{
        shopify_shop_domain: appSettings.shopify_shop_domain,
        zalo_app_id: appSettings.zalo_app_id,
        zalo_app_secret: appSettings.zalo_app_secret ? '***' : '',
        zalo_oa_id: appSettings.zalo_oa_id,
        zalo_template_id: appSettings.zalo_template_id,
        hasZaloTokens: !!(appSettings.zalo_access_token && appSettings.zalo_access_token.length > 0 && appSettings.zalo_access_token !== ''),
      }}
      mappings={mappings}
      isFirstTimeSetup={!hasPassword}
      activeTab={activeTab}
    />
  );
});

/**
 * Update Admin Password - POST /admin/api/settings/password
 */
admin.post('/api/settings/password', async (c) => {
  try {
    const formData = await c.req.parseBody();
    const password = formData.password as string;
    const confirmPassword = formData.confirm_password as string;

    if (!password || password.length < 6) {
      return c.html(<Alert type="error" message="Password must be at least 6 characters" />);
    }

    if (password !== confirmPassword) {
      return c.html(<Alert type="error" message="Passwords do not match" />);
    }

    const settingsService = new SettingsService(c.env.DB);
    await settingsService.setAdminPassword(password);

    return c.html(<Alert type="success" message="Password updated successfully!" />);
  } catch (error) {
    console.error('Update password error:', error);
    return c.html(<Alert type="error" message={`Failed to update password: ${error instanceof Error ? error.message : 'Unknown error'}`} />);
  }
});

/**
 * Update Shopify Settings - POST /admin/api/settings/shopify
 */
admin.post('/api/settings/shopify', async (c) => {
  try {
    const formData = await c.req.parseBody();
    const settingsService = new SettingsService(c.env.DB);

    const updates: Record<string, string> = {};

    if (formData.shopify_shop_domain) {
      updates.shopify_shop_domain = formData.shopify_shop_domain as string;
    }
    if (formData.shopify_webhook_secret) {
      updates.shopify_webhook_secret = formData.shopify_webhook_secret as string;
    }

    if (Object.keys(updates).length > 0) {
      await settingsService.setMany(updates);
    }

    return c.html(<Alert type="success" message="Shopify settings saved successfully!" />);
  } catch (error) {
    console.error('Save Shopify settings error:', error);
    return c.html(<Alert type="error" message={`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`} />);
  }
});

/**
 * Update Zalo Settings - POST /admin/api/settings/zalo
 */
admin.post('/api/settings/zalo', async (c) => {
  try {
    const formData = await c.req.parseBody();
    const settingsService = new SettingsService(c.env.DB);

    const updates: Record<string, string> = {};

    if (formData.zalo_app_id) {
      updates.zalo_app_id = formData.zalo_app_id as string;
    }
    if (formData.zalo_oa_id) {
      updates.zalo_oa_id = formData.zalo_oa_id as string;
    }
    if (formData.zalo_template_id) {
      updates.zalo_template_id = formData.zalo_template_id as string;
    }
    if (formData.zalo_access_token) {
      updates.zalo_access_token = formData.zalo_access_token as string;
    }
    if (formData.zalo_refresh_token) {
      updates.zalo_refresh_token = formData.zalo_refresh_token as string;
    }
    if (formData.zalo_app_secret) {
      updates.zalo_app_secret = formData.zalo_app_secret as string;
    }

    if (Object.keys(updates).length > 0) {
      await settingsService.setMany(updates);
    }

    return c.html(<Alert type="success" message="Zalo settings saved successfully!" />);
  } catch (error) {
    console.error('Save Zalo settings error:', error);
    return c.html(<Alert type="error" message={`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`} />);
  }
});

/**
 * Get Zalo OA OAuth URL - GET /admin/api/zalo/oauth-url
 */
admin.get('/api/zalo/oauth-url', async (c) => {
  const settingsService = new SettingsService(c.env.DB);
  const appId = await settingsService.get('zalo_app_id') || c.env.ZALO_APP_ID;

  if (!appId) {
    return c.html(<Alert type="error" message="App ID not configured. Save your App ID first." />);
  }

  const origin = new URL(c.req.url).origin;
  const redirectUri = encodeURIComponent(`${origin}/admin/zalo-callback`);

  // Minimal permissions needed: send ZNS by phone + manage templates + get OA info
  const permissions = [
    'send_zns_message',
    'manage_oa_template',
    'manage_oa',
  ].join(',');

  const authUrl = `https://oauth.zaloapp.com/v4/oa/permission?app_id=${appId}&redirect_uri=${redirectUri}`;

  return c.html(
    <div class="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
      <p class="text-sm font-medium text-green-900">Click the link below to authorize your OA:</p>
      <a
        href={authUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="block w-full text-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm"
      >
        Open Zalo OA Authorization →
      </a>
      <p class="text-xs text-green-700">
        Log in as the OA admin and approve the permissions. You'll be redirected back automatically.
      </p>
      <p class="text-xs text-gray-500 break-all">Callback URL: {origin}/admin/zalo-callback</p>
    </div>
  );
});

/**
 * Refresh Zalo Token - POST /admin/api/zalo/refresh-token
 */
admin.post('/api/zalo/refresh-token', async (c) => {
  try {
    const settingsService = new SettingsService(c.env.DB);
    const success = await settingsService.refreshZaloToken();

    if (success) {
      return c.html(<Alert type="success" message="✓ Zalo access token refreshed successfully!" />);
    } else {
      return c.html(<Alert type="error" message="✗ Failed to refresh token. Please check your App ID, App Secret, and Refresh Token are configured correctly." />);
    }
  } catch (error) {
    console.error('Refresh Zalo token error:', error);
    return c.html(<Alert type="error" message={`Error: ${error instanceof Error ? error.message : 'Unknown error'}`} />);
  }
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
    return c.html(<Alert type="error" message={`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`} />);
  }
});

/**
 * Test Zalo Connection - POST /admin/api/test-zalo
 */
admin.post('/api/test-zalo', async (c) => {
  try {
    const settingsService = new SettingsService(c.env.DB);
    const settings = await settingsService.getAllSettings();

    const zaloService = new ZaloService(
      settings.zalo_access_token,
      settings.zalo_refresh_token,
      settingsService
    );

    const result = await zaloService.testConnection();

    if (result.success) {
      return c.html(<Alert type="success" message={`✓ Connected successfully! OA Name: ${result.details?.name || 'N/A'}`} />);
    } else {
      return c.html(<Alert type="error" message={`✗ Connection failed: ${result.message}`} />);
    }
  } catch (error) {
    console.error('Test Zalo error:', error);
    return c.html(<Alert type="error" message={`Error: ${error instanceof Error ? error.message : 'Unknown error'}`} />);
  }
});

/**
 * Get Template Info - GET /admin/api/template-info
 */
admin.get('/api/template-info', async (c) => {
  try {
    const settingsService = new SettingsService(c.env.DB);
    const settings = await settingsService.getAllSettings();

    const zaloService = new ZaloService(
      settings.zalo_access_token,
      settings.zalo_refresh_token,
      settingsService
    );

    const templateInfo = await zaloService.getTemplateInfo(settings.zalo_template_id);

    if (templateInfo.error === 0) {
      return c.html(
        <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <p class="font-medium text-blue-900">Template: {templateInfo.data?.template_name}</p>
          <p class="text-blue-700">Status: {templateInfo.data?.status}</p>
          <p class="text-blue-700">Quality: {templateInfo.data?.template_quality}</p>
          <p class="text-blue-700">Tag: {templateInfo.data?.template_tag}</p>
        </div>
      );
    } else {
      return c.html(<Alert type="error" message={`Failed to get template info: [${templateInfo.error}] ${templateInfo.message}`} />);
    }
  } catch (error) {
    console.error('Template info error:', error);
    return c.html(<Alert type="error" message={`Error: ${error instanceof Error ? error.message : 'Unknown error'}`} />);
  }
});

/**
 * List All Templates - GET /admin/api/templates-refresh
 */
admin.get('/api/templates-refresh', async (c) => {
  try {
    const settingsService = new SettingsService(c.env.DB);
    const settings = await settingsService.getAllSettings();

    const zaloService = new ZaloService(
      settings.zalo_access_token,
      settings.zalo_refresh_token,
      settingsService
    );

    const result = await zaloService.listAllTemplates(0, 100);

    if (result.error === 0) {
      const templates = result.data?.templates || [];
      return c.html(
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="space-y-2 max-h-[400px] overflow-y-auto">
            {templates.map((template: any) => (
              <div
                key={template.template_id}
                class="p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition text-sm"
                hx-get={`/admin/api/templates/${template.template_id}`}
                hx-target="#template-detail-inline"
                hx-swap="innerHTML"
              >
                <div class="flex justify-between items-start mb-1">
                  <span class="font-medium">{template.template_name}</span>
                  <span class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    template.status === 'approved' ? 'bg-green-100 text-green-800' :
                    template.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {template.status}
                  </span>
                </div>
                <p class="text-xs text-gray-500">ID: {template.template_id}</p>
              </div>
            ))}
          </div>
          <div id="template-detail-inline">
            <div class="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 text-center">
              Select a template to view details
            </div>
          </div>
        </div>
      );
    } else {
      return c.html(<Alert type="error" message={`Failed to load templates: ${result.message}`} />);
    }
  } catch (error) {
    console.error('List templates error:', error);
    return c.html(<Alert type="error" message={`Error: ${error instanceof Error ? error.message : 'Unknown error'}`} />);
  }
});

/**
 * Get Template Details - GET /admin/api/templates/:id
 */
admin.get('/api/templates/:id', async (c) => {
  try {
    const templateId = c.req.param('id');
    const settingsService = new SettingsService(c.env.DB);
    const settings = await settingsService.getAllSettings();

    const zaloService = new ZaloService(
      settings.zalo_access_token,
      settings.zalo_refresh_token,
      settingsService
    );

    const result = await zaloService.getTemplateInfo(templateId);

    if (result.error === 0) {
      const template = result.data;
      const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
          case 'approved': return 'bg-green-100 text-green-800';
          case 'pending': return 'bg-yellow-100 text-yellow-800';
          case 'rejected': return 'bg-red-100 text-red-800';
          default: return 'bg-gray-100 text-gray-800';
        }
      };
      const getQualityColor = (quality: string) => {
        switch (quality?.toLowerCase()) {
          case 'high': return 'text-green-600';
          case 'medium': return 'text-yellow-600';
          case 'low': return 'text-red-600';
          default: return 'text-gray-600';
        }
      };

      return c.html(
        <div class="p-4 bg-gray-50 rounded-lg text-sm space-y-3">
          <div class="flex justify-between items-start">
            <span class="font-medium">{template?.template_name}</span>
            <span class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(template?.status || '')}`}>
              {template?.status}
            </span>
          </div>
          <p class="text-xs text-gray-500">ID: {template?.template_id}</p>
          <div class="flex gap-2 text-xs">
            <span class={`font-medium ${getQualityColor(template?.template_quality || '')}`}>{template?.template_quality} quality</span>
            <span class="text-gray-400">|</span>
            <span class="text-gray-600">{template?.template_tag}</span>
          </div>
          {template?.preview_url && (
            <a href={template.preview_url} target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 text-xs block">
              View Preview
            </a>
          )}
          {template?.params && template.params.length > 0 && (
            <div>
              <p class="text-xs font-medium text-gray-700 mb-1">Parameters ({template.params.length})</p>
              <div class="space-y-1">
                {template.params.map((param: any, idx: number) => (
                  <div key={idx} class="p-2 bg-white rounded border border-gray-200 text-xs">
                    <div class="flex justify-between">
                      <span class="font-medium">{param.name}</span>
                      {param.require && <span class="text-red-600">Required</span>}
                    </div>
                    <p class="text-gray-500">Type: {param.type}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {template?.buttons && template.buttons.length > 0 && (
            <div>
              <p class="text-xs font-medium text-gray-700 mb-1">Buttons ({template.buttons.length})</p>
              <div class="space-y-1">
                {template.buttons.map((btn: any, idx: number) => (
                  <div key={idx} class="p-2 bg-white rounded border border-gray-200 text-xs">
                    <p class="font-medium">{btn.title}</p>
                    <p class="text-gray-500">Type: {btn.type}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            onclick={`navigator.clipboard.writeText('${template?.template_id}')`}
            class="w-full px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition text-xs font-medium"
          >
            Copy Template ID
          </button>
        </div>
      );
    } else {
      return c.html(<Alert type="error" message={`Failed: ${result.message}`} />);
    }
  } catch (error) {
    console.error('Get template details error:', error);
    return c.html(<Alert type="error" message={`Error: ${error instanceof Error ? error.message : 'Unknown error'}`} />);
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

    const db = new DatabaseService(c.env.DB);
    const settingsService = new SettingsService(c.env.DB);
    const settings = await settingsService.getAllSettings();

    const zaloService = new ZaloService(
      settings.zalo_access_token,
      settings.zalo_refresh_token,
      settingsService
    );

    // Get field mappings from database
    const mappings = await db.getZaloFieldMappings();

    // Build template data using field mappings
    const templateData: Record<string, string> = {};

    for (const mapping of mappings) {
      switch (mapping.zalo_field_name.toLowerCase()) {
        case 'order_number':
        case 'order_code':
          templateData[mapping.zalo_field_name] = orderNumber;
          break;
        case 'total_amount':
        case 'total':
        case 'amount':
          templateData[mapping.zalo_field_name] = totalAmount;
          break;
        case 'message':
        case 'content':
          templateData[mapping.zalo_field_name] = message;
          break;
        case 'customer_name':
          templateData[mapping.zalo_field_name] = 'Test Customer';
          break;
        default:
          templateData[mapping.zalo_field_name] = mapping.default_value || '';
      }
    }

    // If no mappings configured, fallback to form field names
    if (mappings.length === 0) {
      templateData.order_number = orderNumber;
      templateData.total_amount = totalAmount;
      templateData.message = message;
    }

    const result = await zaloService.sendTemplateMessage(phone, settings.zalo_template_id, templateData);

    if (result.error === 0) {
      return c.html(<Alert type="success" message={`✓ Test message sent successfully to ${phone}!`} />);
    } else {
      return c.html(<Alert type="error" message={`✗ Failed to send: ${result.message}`} />);
    }
  } catch (error) {
    console.error('Test send error:', error);
    return c.html(<Alert type="error" message={`Error: ${error instanceof Error ? error.message : 'Unknown error'}`} />);
  }
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
 * Retry Webhook - POST /admin/api/retry/:id
 */
admin.post('/api/retry/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const db = new DatabaseService(c.env.DB);

    await db.retryWebhook(id);

    return c.html(<Alert type="success" message="Webhook queued for retry. Refresh the page to see updated status." />);
  } catch (error) {
    console.error('Retry webhook error:', error);
    return c.html(<Alert type="error" message={`Failed to retry: ${error instanceof Error ? error.message : 'Unknown error'}`} />);
  }
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
    return c.html(<Alert type="error" message={`Failed to create mapping: ${error instanceof Error ? error.message : 'Unknown error'}`} />);
  }
});

/**
 * Update Field Mapping - PUT /admin/api/field-mappings/:id
 */
admin.put('/api/field-mappings/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const formData = await c.req.parseBody();
    const db = new DatabaseService(c.env.DB);

    await db.updateZaloFieldMapping(id, {
      zalo_field_name: formData.zalo_field_name as string,
      shopify_json_path: formData.shopify_json_path as string,
      default_value: (formData.default_value as string) || null,
      is_required: formData.is_required === 'on',
    });

    // Return updated row HTML
    const mapping = await db.getZaloFieldMapping(id);
    if (!mapping) {
      return c.html(<Alert type="error" message="Mapping not found" />);
    }

    return c.html(
      <tr id={`mapping-row-${mapping.id}`}>
        <td class="px-3 py-2 font-medium text-gray-900">
          <span class="view-mode">{mapping.zalo_field_name}</span>
          <input
            type="text"
            name="zalo_field_name"
            value={mapping.zalo_field_name}
            form={`edit-form-${mapping.id}`}
            class="edit-mode hidden w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </td>
        <td class="px-3 py-2 text-gray-600 font-mono">
          <span class="view-mode">{mapping.shopify_json_path}</span>
          <input
            type="text"
            name="shopify_json_path"
            value={mapping.shopify_json_path}
            form={`edit-form-${mapping.id}`}
            class="edit-mode hidden w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </td>
        <td class="px-3 py-2 text-gray-600">
          <span class="view-mode">{mapping.default_value || '-'}</span>
          <input
            type="text"
            name="default_value"
            value={mapping.default_value || ''}
            form={`edit-form-${mapping.id}`}
            class="edit-mode hidden w-full px-2 py-1 border border-gray-300 rounded text-sm"
            placeholder="-"
          />
        </td>
        <td class="px-3 py-2 text-center">
          <span class="view-mode">
            {mapping.is_required ? (
              <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-800">Yes</span>
            ) : (
              <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-800">No</span>
            )}
          </span>
          <span class="edit-mode hidden">
            <input
              type="checkbox"
              name="is_required"
              value="on"
              form={`edit-form-${mapping.id}`}
              checked={mapping.is_required}
              class="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
          </span>
        </td>
        <td class="px-3 py-2 text-right">
          <span class="view-mode space-x-2">
            <button
              type="button"
              onclick={`document.querySelectorAll('#mapping-row-${mapping.id} .view-mode').forEach(el => el.classList.add('hidden')); document.querySelectorAll('#mapping-row-${mapping.id} .edit-mode').forEach(el => el.classList.remove('hidden'));`}
              class="text-blue-600 hover:text-blue-900 text-xs font-medium"
            >
              Edit
            </button>
            <button
              type="button"
              hx-delete={`/admin/api/field-mappings/${mapping.id}`}
              hx-confirm={`Delete mapping for "${mapping.zalo_field_name}"?`}
              hx-target={`#mapping-row-${mapping.id}`}
              hx-swap="outerHTML"
              class="text-red-600 hover:text-red-900 text-xs font-medium"
            >
              Delete
            </button>
          </span>
          <span class="edit-mode hidden space-x-2">
            <form
              id={`edit-form-${mapping.id}`}
              hx-put={`/admin/api/field-mappings/${mapping.id}`}
              hx-target={`#mapping-row-${mapping.id}`}
              hx-swap="outerHTML"
              class="inline"
            >
              <button
                type="submit"
                class="text-green-600 hover:text-green-900 text-xs font-medium"
              >
                Save
              </button>
            </form>
            <button
              type="button"
              onclick={`document.querySelectorAll('#mapping-row-${mapping.id} .edit-mode').forEach(el => el.classList.add('hidden')); document.querySelectorAll('#mapping-row-${mapping.id} .view-mode').forEach(el => el.classList.remove('hidden'));`}
              class="text-gray-600 hover:text-gray-900 text-xs font-medium"
            >
              Cancel
            </button>
          </span>
        </td>
      </tr>
    );
  } catch (error) {
    console.error('Update field mapping error:', error);
    return c.html(<Alert type="error" message={`Failed to update mapping: ${error instanceof Error ? error.message : 'Unknown error'}`} />);
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
    return c.html(<Alert type="error" message={`Failed to delete mapping: ${error instanceof Error ? error.message : 'Unknown error'}`} />);
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
        shopify_json_path: 'total_price',
        default_value: '',
        is_required: true,
        description: 'Total order amount (number only)',
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

    return c.html(<Alert type="success" message={`Added ${presets.length} field mappings. Refresh the page to see them.`} />);
  } catch (error) {
    console.error('Preset field mappings error:', error);
    return c.html(<Alert type="error" message={`Failed to add presets: ${error instanceof Error ? error.message : 'Unknown error'}`} />);
  }
});

export default admin;
