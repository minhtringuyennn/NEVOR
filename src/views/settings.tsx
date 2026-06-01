// Settings view with left sidebar navigation

import { FC } from 'hono/jsx';
import { Layout, Card, Alert, Badge } from './layout';
import type { MessageConfig, ZaloFieldMapping } from '../services/db';

interface Template {
  template_id: string;
  template_name: string;
  status: string;
  preview_url: string;
  template_quality: string;
  template_tag: string;
  created_time: string;
  updated_time: string;
}

interface TemplateDetail extends Template {
  approved_time?: string;
  params?: Array<{
    name: string;
    require: boolean;
    type: string;
    description?: string;
  }>;
  buttons?: Array<{
    type: string;
    title: string;
    payload?: string;
  }>;
}

interface AppConfig {
  shopify_shop_domain: string;
  zalo_app_id: string;
  zalo_app_secret?: string;
  zalo_oa_id: string;
  zalo_template_id: string;
  hasZaloTokens: boolean;
}

interface SettingsViewProps {
  config: MessageConfig;
  appConfig: AppConfig;
  message?: { type: 'success' | 'error'; text: string };
  mappings?: ZaloFieldMapping[];
  templates?: Template[];
  selectedTemplate?: TemplateDetail | null;
  templateError?: string;
  isFirstTimeSetup?: boolean;
  activeTab?: string;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getQualityColor = (quality: string) => {
  switch (quality.toLowerCase()) {
    case 'high':
      return 'text-green-600';
    case 'medium':
      return 'text-yellow-600';
    case 'low':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

// Sample Shopify webhook structure for reference
const shopifyWebhookSample = {
  "id": 123456789,
  "name": "#1001",
  "order_number": 1001,
  "total_price": "264000",
  "currency": "VND",
  "customer": {
    "first_name": "Minh",
    "last_name": "Nguyen",
    "phone": "+84364880068",
    "email": "minh@example.com"
  },
  "shipping_address": {
    "name": "Minh Nguyen",
    "address1": "150 Truong Chinh",
    "city": "Ha Noi",
    "country": "Vietnam",
    "phone": "+84364880068"
  },
  "line_items": [
    {
      "title": "Product Name",
      "quantity": 2,
      "price": "120000"
    }
  ],
  "created_at": "2026-01-01T08:00:00Z"
};

// Field mapping patterns guide
const mappingPatterns = [
  { pattern: 'customer.first_name', example: 'Minh', description: 'Customer first name' },
  { pattern: 'customer.last_name', example: 'Nguyen', description: 'Customer last name' },
  { pattern: 'customer.first_name || " " || customer.last_name', example: 'Minh Nguyen', description: 'Full name (concatenated)' },
  { pattern: 'customer.phone', example: '+84364880068', description: 'Customer phone number' },
  { pattern: 'name', example: '#1001', description: 'Order name with #' },
  { pattern: 'order_number', example: '1001', description: 'Order number only' },
  { pattern: 'total_price', example: '264000', description: 'Total order amount' },
  { pattern: 'total_price || " " || currency', example: '264000 VND', description: 'Amount with currency' },
  { pattern: 'shipping_address.name', example: 'Minh Nguyen', description: 'Shipping recipient name' },
  { pattern: 'shipping_address.address1', example: '150 Truong Chinh', description: 'Street address' },
  { pattern: 'shipping_address.city', example: 'Ha Noi', description: 'City' },
  { pattern: 'line_items[].title', example: 'Product 1, Product 2', description: 'All item titles (comma-separated)' },
  { pattern: 'line_items[].title || " x" || line_items[].quantity', example: 'Product x2', description: 'Item with quantity' },
  { pattern: 'created_at', example: '2026-01-01', description: 'Order creation date' },
];

export const SettingsView: FC<SettingsViewProps> = (props) => {
  const mappings = props.mappings || [];
  const templates = props.templates;
  const selectedTemplate = props.selectedTemplate;
  const activeTab = props.activeTab || 'general';

  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'shopify', label: 'Shopify', icon: '🛒' },
    { id: 'zalo', label: 'Zalo', icon: '💬' },
    { id: 'mappings', label: 'Field Mappings', icon: '📋' },
    { id: 'templates', label: 'Templates', icon: '📝' },
    { id: 'testing', label: 'Testing', icon: '🧪' },
  ];

  return (
    <Layout title="Settings" activePage="settings">
      <div class="px-4 sm:px-0 h-[calc(100vh-100px)]">
        <h1 class="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        {props.message && <div class="mb-4"><Alert type={props.message.type} message={props.message.text} /></div>}
        {props.templateError && <div class="mb-4"><Alert type="error" message={props.templateError} /></div>}

        {props.isFirstTimeSetup && (
          <div class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p class="text-sm text-yellow-800">
              <strong>Welcome!</strong> Please configure your settings to get started.
            </p>
          </div>
        )}

        <div class="flex h-full gap-6">
          {/* Left Sidebar */}
          <div class="w-64 flex-shrink-0">
            <nav class="space-y-1">
              {tabs.map((tab) => (
                <a
                  key={tab.id}
                  href={`/admin/settings?tab=${tab.id}`}
                  class={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span class="mr-3">{tab.icon}</span>
                  {tab.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Right Content */}
          <div class="flex-1 overflow-y-auto pr-4">
            {/* General Tab */}
            {activeTab === 'general' && (
              <div class="space-y-6">
                <Card title="Admin Password">
                  <form
                    hx-post="/admin/api/settings/password"
                    hx-target="#password-result"
                    hx-swap="innerHTML"
                    class="space-y-4"
                  >
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        {props.isFirstTimeSetup ? 'Set Admin Password' : 'Change Admin Password'}
                      </label>
                      <input
                        type="password"
                        name="password"
                        placeholder="Enter new password"
                        required
                        minLength={6}
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p class="mt-1 text-xs text-gray-500">Minimum 6 characters</p>
                    </div>
                    <div>
                      <input
                        type="password"
                        name="confirm_password"
                        placeholder="Confirm password"
                        required
                        minLength={6}
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div id="password-result"></div>
                    <button
                      type="submit"
                      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                      {props.isFirstTimeSetup ? 'Set Password' : 'Update Password'}
                    </button>
                  </form>
                </Card>

                <Card title="Message Configuration">
                  <form
                    hx-post="/admin/api/settings/message-config"
                    hx-target="#message-result"
                    hx-swap="innerHTML"
                    class="space-y-4"
                  >
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">
                        Send Condition
                      </label>
                      <select
                        name="send_condition"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all" selected={props.config.send_condition === 'all' || undefined}>
                          Send for all orders
                        </option>
                        <option value="paid_only" selected={props.config.send_condition === 'paid_only' || undefined}>
                          Send for paid orders only
                        </option>
                        <option value="min_amount" selected={props.config.send_condition === 'min_amount' || undefined}>
                          Send for orders above minimum amount
                        </option>
                      </select>
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Amount
                      </label>
                      <input
                        type="number"
                        name="min_amount"
                        value={String(props.config.min_amount)}
                        step="0.01"
                        min="0"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">
                        Phone Field Mapping
                      </label>
                      <input
                        type="text"
                        name="phone_field_mapping"
                        value={props.config.phone_field_mapping || 'phone'}
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div id="message-result"></div>
                    <button
                      type="submit"
                      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                      Save Configuration
                    </button>
                  </form>
                </Card>
              </div>
            )}

            {/* Shopify Tab */}
            {activeTab === 'shopify' && (
              <Card title="Shopify Configuration">
                <form
                  hx-post="/admin/api/settings/shopify"
                  hx-target="#shopify-result"
                  hx-swap="innerHTML"
                  class="space-y-4"
                >
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Shopify Shop Domain
                    </label>
                    <input
                      type="text"
                      name="shopify_shop_domain"
                      value={props.appConfig.shopify_shop_domain}
                      placeholder="your-store.myshopify.com"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p class="mt-1 text-xs text-gray-500">Your Shopify store domain</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Webhook Secret
                    </label>
                    <input
                      type="password"
                      name="shopify_webhook_secret"
                      placeholder="•••••••• (hidden for security)"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p class="mt-1 text-xs text-gray-500">Leave empty to keep current value</p>
                  </div>
                  <div id="shopify-result"></div>
                  <button
                    type="submit"
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Save Shopify Settings
                  </button>
                </form>
              </Card>
            )}

            {/* Zalo Tab */}
            {activeTab === 'zalo' && (
              <div class="space-y-6">
                <Card title="Zalo Configuration">
                  <form
                    hx-post="/admin/api/settings/zalo"
                    hx-target="#zalo-config-result"
                    hx-swap="innerHTML"
                    class="space-y-4"
                  >
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                          Zalo App ID
                        </label>
                        <input
                          type="text"
                          name="zalo_app_id"
                          value={props.appConfig.zalo_app_id}
                          placeholder="Your Zalo App ID"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                          Zalo App Secret
                        </label>
                        <input
                          type="password"
                          name="zalo_app_secret"
                          placeholder="•••••••• (hidden for security)"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p class="mt-1 text-xs text-gray-500">
                          Required for auto token refresh. Leave empty to keep current.
                          {props.appConfig.zalo_app_secret ? ' ✓ Configured' : ' Not set'}
                        </p>
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                          Zalo OA ID
                        </label>
                        <input
                          type="text"
                          name="zalo_oa_id"
                          value={props.appConfig.zalo_oa_id}
                          placeholder="Your Zalo OA ID"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Zalo Access Token
                      </label>
                      <input
                        type="password"
                        name="zalo_access_token"
                        placeholder="•••••••• (hidden for security)"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p class="mt-1 text-xs text-gray-500">
                        Get from Zalo OA Dashboard. Leave empty to keep current value.
                      </p>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Zalo Refresh Token
                      </label>
                      <input
                        type="password"
                        name="zalo_refresh_token"
                        placeholder="•••••••• (hidden for security)"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p class="mt-1 text-xs text-gray-500">
                        Also from Zalo OA Dashboard. Used to automatically refresh expired access tokens.
                      </p>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Zalo Template ID
                      </label>
                      <input
                        type="text"
                        name="zalo_template_id"
                        value={props.appConfig.zalo_template_id}
                        placeholder="Your Zalo Template ID"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Token Status */}
                    <div class="p-3 bg-gray-50 rounded-lg">
                      <div class="flex items-center justify-between">
                        <span class="text-sm font-medium text-gray-700">Connection Status:</span>
                        {props.appConfig.hasZaloTokens ? (
                          <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            Connected
                          </span>
                        ) : (
                          <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            Not Connected
                          </span>
                        )}
                      </div>
                      <p class="text-xs text-gray-500 mt-1">
                        {props.appConfig.hasZaloTokens
                          ? 'Your Zalo account is connected. Tokens auto-refresh when expired.'
                          : 'Enter your Access Token and Refresh Token from Zalo OA Dashboard'}
                      </p>
                    </div>

                    <div id="zalo-config-result"></div>
                    <div class="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                      >
                        Save Zalo Settings
                      </button>
                      <button
                        type="button"
                        hx-post="/admin/api/test-zalo"
                        hx-target="#zalo-config-result"
                        hx-swap="innerHTML"
                        class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                      >
                        Test Connection
                      </button>
                      {props.appConfig.hasZaloTokens && (
                        <button
                          type="button"
                          hx-post="/admin/api/zalo/refresh-token"
                          hx-target="#zalo-config-result"
                          hx-swap="innerHTML"
                          class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                        >
                          Refresh Token Now
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Instructions */}
                  <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 class="text-sm font-medium text-blue-900 mb-2">How to get your Zalo Tokens:</h4>
                    <ol class="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                      <li>Go to <a href="https://oa.zalo.me" target="_blank" class="underline">Zalo Official Account Dashboard</a></li>
                      <li>Select your Official Account</li>
                      <li>Go to Settings {'>'} Account {'>'} API Management</li>
                      <li>Copy both the Access Token and Refresh Token</li>
                      <li>Paste them in the fields above and click Save</li>
                    </ol>
                    <p class="text-xs text-blue-700 mt-2">
                      <strong>Note:</strong> The system will automatically refresh expired access tokens using the refresh token.
                    </p>
                  </div>
                </Card>
              </div>
            )}

            {/* Field Mappings Tab */}
            {activeTab === 'mappings' && (
              <div class="space-y-6">
                <Card title="Field Mappings">
                  <div class="space-y-4">
                    {mappings.length === 0 ? (
                      <p class="text-sm text-gray-500">No field mappings configured yet.</p>
                    ) : (
                      <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 text-sm">
                          <thead class="bg-gray-50">
                            <tr>
                              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Zalo Field</th>
                              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Shopify Path</th>
                              <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Default</th>
                              <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Required</th>
                              <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-gray-200">
                            {mappings.map((mapping) => (
                              <tr key={mapping.id} id={`mapping-row-${mapping.id}`}>
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
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <form
                      hx-post="/admin/api/field-mappings"
                      hx-target="#mapping-result"
                      hx-swap="innerHTML"
                      class="space-y-3 pt-4 border-t"
                    >
                      <p class="text-sm font-medium text-gray-900">Add New Mapping</p>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          name="zalo_field_name"
                          placeholder="Zalo field name (e.g. customer_name)"
                          required
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          name="shopify_json_path"
                          placeholder="Shopify path (e.g. customer.first_name)"
                          required
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          name="default_value"
                          placeholder="Default value"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                        <div class="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            name="is_required"
                            id="is_required"
                            class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label for="is_required" class="text-sm text-gray-700">Required</label>
                        </div>
                      </div>
                      <input
                        type="text"
                        name="description"
                        placeholder="Description (optional)"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                      <div id="mapping-result"></div>
                      <button
                        type="submit"
                        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                      >
                        Add Mapping
                      </button>
                    </form>
                  </div>
                </Card>

                {/* Mapping Guide */}
                <Card title="Mapping Patterns Guide">
                  <div class="space-y-4">
                    <p class="text-sm text-gray-600">
                      Use these patterns to extract data from Shopify webhook. You can concatenate fields using <code>||</code> operator.
                    </p>
                    <div class="overflow-x-auto">
                      <table class="min-w-full divide-y divide-gray-200 text-sm">
                        <thead class="bg-gray-50">
                          <tr>
                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pattern</th>
                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Example Output</th>
                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                          {mappingPatterns.map((pattern, idx) => (
                            <tr key={idx}>
                              <td class="px-3 py-2 font-mono text-xs text-blue-600">{pattern.pattern}</td>
                              <td class="px-3 py-2 text-gray-900">{pattern.example}</td>
                              <td class="px-3 py-2 text-gray-600">{pattern.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Card>

                {/* Shopify Webhook Sample */}
                <Card title="Sample Shopify Webhook Structure">
                  <div class="space-y-2">
                    <p class="text-sm text-gray-600">
                      Reference this structure when creating your field mappings:
                    </p>
                    <pre class="p-3 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto max-h-[300px]">
                      {JSON.stringify(shopifyWebhookSample, null, 2)}
                    </pre>
                  </div>
                </Card>
              </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
              <div class="space-y-6">
                <Card title="Zalo Templates">
                  <div class="space-y-4">
                    <div class="flex flex-wrap gap-2">
                      <button
                        type="button"
                        hx-get="/admin/api/templates-refresh"
                        hx-target="#templates-list"
                        hx-swap="innerHTML"
                        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                      >
                        Refresh Templates
                      </button>
                      <button
                        type="button"
                        hx-get="/admin/api/template-info"
                        hx-target="#template-info-result"
                        hx-swap="innerHTML"
                        class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
                      >
                        Check Current Template
                      </button>
                    </div>

                    <div id="template-info-result"></div>

                    <div id="templates-list">
                      {templates === undefined ? (
                        <p class="text-sm text-gray-500">Click "Refresh Templates" to load your Zalo templates.</p>
                      ) : templates.length === 0 ? (
                        <p class="text-sm text-gray-500">No templates found.</p>
                      ) : (
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div class="space-y-2 max-h-[400px] overflow-y-auto">
                            {templates.map((template) => (
                              <div
                                key={template.template_id}
                                class={`p-3 border rounded-lg cursor-pointer transition text-sm ${
                                  selectedTemplate?.template_id === template.template_id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                                hx-get={`/admin/api/templates/${template.template_id}`}
                                hx-target="#template-detail-inline"
                                hx-swap="innerHTML"
                              >
                                <div class="flex justify-between items-start mb-1">
                                  <span class="font-medium">{template.template_name}</span>
                                  <span class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(template.status)}`}>
                                    {template.status}
                                  </span>
                                </div>
                                <p class="text-xs text-gray-500">ID: {template.template_id}</p>
                              </div>
                            ))}
                          </div>
                          <div id="template-detail-inline">
                            {selectedTemplate ? (
                              <TemplateDetailInline template={selectedTemplate} />
                            ) : (
                              <div class="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 text-center">
                                Select a template to view details
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Testing Tab */}
            {activeTab === 'testing' && (
              <div class="space-y-6">
                <Card title="Test Zalo Connection">
                  <div class="space-y-4">
                    <p class="text-sm text-gray-600">
                      Test your Zalo API connection to ensure everything is configured correctly.
                    </p>
                    <div id="test-connection-result"></div>
                    <button
                      hx-post="/admin/api/test-zalo"
                      hx-target="#test-connection-result"
                      hx-swap="innerHTML"
                      class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                    >
                      Test Connection
                    </button>
                  </div>
                </Card>

                <Card title="Send Test Message">
                  <form
                    hx-post="/admin/api/test-send"
                    hx-target="#test-send-result"
                    hx-swap="innerHTML"
                    class="space-y-4"
                  >
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
                        <input
                          type="text"
                          name="phone"
                          placeholder="e.g. 84912345678"
                          required
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">Order Number</label>
                        <input
                          type="text"
                          name="order_number"
                          value="12345"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">Total Amount</label>
                        <input
                          type="text"
                          name="total_amount"
                          value="1,000,000 VND"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">Customer Name</label>
                        <input
                          type="text"
                          name="message"
                          value="Test Customer"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div id="test-send-result"></div>
                    <button
                      type="submit"
                      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                      Send Test Message
                    </button>
                  </form>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

const TemplateDetailInline: FC<{ template: TemplateDetail }> = ({ template }) => {
  return (
    <div class="p-4 bg-gray-50 rounded-lg text-sm space-y-3">
      <div class="flex justify-between items-start">
        <span class="font-medium">{template.template_name}</span>
        <span class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(template.status)}`}>
          {template.status}
        </span>
      </div>
      <p class="text-xs text-gray-500">ID: {template.template_id}</p>
      <div class="flex gap-2 text-xs">
        <span class={`font-medium ${getQualityColor(template.template_quality)}`}>{template.template_quality} quality</span>
        <span class="text-gray-400">|</span>
        <span class="text-gray-600">{template.template_tag}</span>
      </div>
      {template.preview_url && (
        <a
          href={template.preview_url}
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-600 hover:text-blue-800 text-xs block"
        >
          View Preview
        </a>
      )}
      {template.params && template.params.length > 0 && (
        <div>
          <p class="text-xs font-medium text-gray-700 mb-1">Parameters ({template.params.length})</p>
          <div class="space-y-1">
            {template.params.map((param, idx) => (
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
      {template.buttons && template.buttons.length > 0 && (
        <div>
          <p class="text-xs font-medium text-gray-700 mb-1">Buttons ({template.buttons.length})</p>
          <div class="space-y-1">
            {template.buttons.map((btn, idx) => (
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
        onclick={`navigator.clipboard.writeText('${template.template_id}')`}
        class="w-full px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition text-xs font-medium"
      >
        Copy Template ID
      </button>
    </div>
  );
};

export default SettingsView;
