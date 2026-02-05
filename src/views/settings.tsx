// Settings view

import { FC } from 'hono/jsx';
import { Layout, Card, Alert } from './layout';
import type { MessageConfig } from '../services/db';

interface SettingsViewProps {
  config: MessageConfig;
  message?: { type: 'success' | 'error'; text: string };
}

export const SettingsView: FC<SettingsViewProps> = (props) => {
  return (
    <Layout title="Settings" activePage="settings">
      <div class="px-4 sm:px-0">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p class="text-gray-600 mb-8">Configure your Shopify-Zalo integration settings</p>

        {props.message && <Alert type={props.message.type} message={props.message.text} />}

        <div class="space-y-6">
          {/* Message Configuration */}
          <Card title="Message Template Configuration">
            <form
              hx-post="/admin/api/settings/message-config"
              hx-target="#message-result"
              hx-swap="innerHTML"
            >
              <div class="space-y-4">
                <div>
                  <label class="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="include_order_number"
                      checked={props.config.include_order_number}
                      class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span class="text-sm font-medium text-gray-700">Include Order Number</span>
                  </label>
                  <p class="ml-7 text-xs text-gray-500">Display order number in Zalo message</p>
                </div>

                <div>
                  <label class="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="include_total_amount"
                      checked={props.config.include_total_amount}
                      class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span class="text-sm font-medium text-gray-700">Include Total Amount</span>
                  </label>
                  <p class="ml-7 text-xs text-gray-500">Display order total in message</p>
                </div>

                <div>
                  <label class="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="include_item_list"
                      checked={props.config.include_item_list}
                      class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span class="text-sm font-medium text-gray-700">Include Item List</span>
                  </label>
                  <p class="ml-7 text-xs text-gray-500">Display list of ordered items</p>
                </div>

                <div>
                  <label class="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="include_delivery_info"
                      checked={props.config.include_delivery_info}
                      class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span class="text-sm font-medium text-gray-700">Include Delivery Info</span>
                  </label>
                  <p class="ml-7 text-xs text-gray-500">Display shipping address</p>
                </div>

                <hr class="my-6" />

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
                    <option
                      value="paid_only"
                      selected={props.config.send_condition === 'paid_only' || undefined}
                    >
                      Send for paid orders only
                    </option>
                    <option
                      value="min_amount"
                      selected={props.config.send_condition === 'min_amount' || undefined}
                    >
                      Send for orders above minimum amount
                    </option>
                  </select>
                  <p class="mt-1 text-xs text-gray-500">When to send Zalo notifications</p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Amount (for min_amount condition)
                  </label>
                  <input
                    type="number"
                    name="min_amount"
                    value={String(props.config.min_amount)}
                    step="0.01"
                    min="0"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p class="mt-1 text-xs text-gray-500">
                    Only send notifications for orders above this amount
                  </p>
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
                  <p class="mt-1 text-xs text-gray-500">
                    Field to extract phone number from (default: phone)
                  </p>
                </div>

                <div id="message-result" class="mt-4"></div>

                <button
                  type="submit"
                  class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </Card>

          {/* Zalo API Test */}
          <Card title="Zalo API Connection Test">
            <div class="space-y-4">
              <p class="text-sm text-gray-600">
                Test your Zalo API connection to ensure everything is configured correctly.
              </p>

              <div id="zalo-test-result"></div>

              <button
                hx-post="/admin/api/test-zalo"
                hx-target="#zalo-test-result"
                hx-swap="innerHTML"
                class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
              >
                Test Zalo Connection
              </button>

              <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 class="text-sm font-medium text-blue-900 mb-2">Test Send Message</h4>
                <form
                  hx-post="/admin/api/test-send"
                  hx-target="#test-send-result"
                  hx-swap="innerHTML"
                >
                  <div class="space-y-3">
                    <div>
                      <label class="block text-xs font-medium text-gray-700 mb-1">
                        Phone Number (with country code)
                      </label>
                      <input
                        type="text"
                        name="phone"
                        placeholder="84912345678"
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div id="test-send-result" class="text-sm"></div>
                    <button
                      type="submit"
                      class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                    >
                      Send Test Message
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </Card>

          {/* Environment Info */}
          <Card title="Environment Configuration">
            <div class="space-y-3">
              <div class="p-3 bg-gray-50 rounded-lg">
                <p class="text-xs font-medium text-gray-700 mb-1">Webhook Endpoint</p>
                <code class="text-xs text-gray-900 break-all">
                  https://your-worker.workers.dev/webhook/shopify
                </code>
              </div>

              <div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p class="text-xs font-medium text-yellow-900 mb-1">⚠️ Important</p>
                <p class="text-xs text-yellow-800">
                  Zalo credentials and Shopify webhook secret are configured via environment
                  variables. Update them using{' '}
                  <code class="bg-yellow-100 px-1 rounded">wrangler secret put</code> command.
                </p>
              </div>

              <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p class="text-xs font-medium text-blue-900 mb-1">📖 Documentation</p>
                <ul class="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Configure Shopify webhook at: Admin → Settings → Notifications</li>
                  <li>Get Zalo credentials from: Zalo Business Dashboard</li>
                  <li>Template ID must be approved by Zalo before use</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};
