// Zalo Field Mappings view

import { FC } from 'hono/jsx';
import { Layout, Card, Alert } from './layout';
import type { ZaloFieldMapping } from '../services/db';

interface FieldMappingsViewProps {
  mappings: ZaloFieldMapping[];
  message?: { type: 'success' | 'error'; text: string };
}

export const FieldMappingsView: FC<FieldMappingsViewProps> = (props) => {
  const { mappings } = props;

  return (
    <Layout title="Zalo Field Mappings" activePage="field-mappings">
      <div class="px-4 sm:px-0">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Zalo Field Mappings</h1>
        <p class="text-gray-600 mb-8">
          Configure how Shopify webhook data maps to your Zalo template fields. Each Zalo template has fixed field names that must match exactly.
        </p>

        {props.message && <Alert type={props.message.type} message={props.message.text} />}

        <div class="space-y-6">
          {/* Info Card */}
          <Card title="How Field Mapping Works">
            <div class="space-y-3 text-sm text-gray-600">
              <p>
                <strong>Zalo Template Fields:</strong> These are the exact field names defined in your Zalo ZBS template (e.g., customer_name, order_code, total_amount).
              </p>
              <p>
                <strong>Shopify JSON Path:</strong> The path to extract data from the Shopify webhook payload. Use dot notation (e.g., <code>customer.first_name</code>).
              </p>
              <p>
                <strong>Supported Patterns:</strong>
              </p>
              <ul class="list-disc list-inside ml-4 space-y-1">
                <li><code>customer.first_name</code> - Simple nested field</li>
                <li><code>customer.first_name || " " || customer.last_name</code> - Concatenate fields</li>
                <li><code>total_price || " " || currency</code> - Combine with separator</li>
                <li><code>line_items[].title</code> - Extract from array (comma-separated)</li>
                <li><code>shipping_address.address1 || ", " || shipping_address.city</code> - Address formatting</li>
              </ul>
            </div>
          </Card>

          {/* Existing Mappings */}
          <Card title="Configured Mappings">
            {mappings.length === 0 ? (
              <div class="text-center py-8 text-gray-500">
                <p>No field mappings configured yet.</p>
                <p class="text-sm mt-2">Add your first mapping below to start sending Zalo messages.</p>
              </div>
            ) : (
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Zalo Field
                      </th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Shopify Path
                      </th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Default Value
                      </th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Required
                      </th>
                      <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    {mappings.map((mapping) => (
                      <tr key={mapping.id}>
                        <td class="px-4 py-3 text-sm font-medium text-gray-900">
                          {mapping.zalo_field_name}
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-600 font-mono">
                          {mapping.shopify_json_path}
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-600">
                          {mapping.default_value || '-'}
                        </td>
                        <td class="px-4 py-3 text-sm">
                          {mapping.is_required ? (
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Required
                            </span>
                          ) : (
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              Optional
                            </span>
                          )}
                        </td>
                        <td class="px-4 py-3 text-right text-sm">
                          <button
                            hx-delete={`/admin/api/field-mappings/${mapping.id}`}
                            hx-confirm={`Delete mapping for "${mapping.zalo_field_name}"?`}
                            hx-target="closest tr"
                            hx-swap="outerHTML"
                            class="text-red-600 hover:text-red-900 font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Add New Mapping */}
          <Card title="Add New Field Mapping">
            <form
              hx-post="/admin/api/field-mappings"
              hx-target="#mapping-result"
              hx-swap="innerHTML"
              class="space-y-4"
            >
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Zalo Field Name *
                  </label>
                  <input
                    type="text"
                    name="zalo_field_name"
                    placeholder="e.g., customer_name"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p class="mt-1 text-xs text-gray-500">
                    Exact field name from your Zalo template
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Shopify JSON Path *
                  </label>
                  <input
                    type="text"
                    name="shopify_json_path"
                    placeholder="e.g., customer.first_name"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p class="mt-1 text-xs text-gray-500">
                    Path to extract data from Shopify webhook
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Default Value
                  </label>
                  <input
                    type="text"
                    name="default_value"
                    placeholder="e.g., Khách hàng"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p class="mt-1 text-xs text-gray-500">
                    Used if Shopify field is empty
                  </p>
                </div>

                <div class="flex items-center space-x-3 pt-6">
                  <input
                    type="checkbox"
                    name="is_required"
                    id="is_required"
                    class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label for="is_required" class="text-sm font-medium text-gray-700">
                    Required Field
                  </label>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  name="description"
                  placeholder="e.g., Customer full name for Zalo greeting"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div id="mapping-result"></div>

              <button
                type="submit"
                class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Add Field Mapping
              </button>
            </form>
          </Card>

          {/* Quick Setup Presets */}
          <Card title="Quick Setup Presets">
            <div class="space-y-3">
              <p class="text-sm text-gray-600">
                Quickly add common field mappings for typical Zalo templates:
              </p>
              <div class="flex flex-wrap gap-2">
                <button
                  hx-post="/admin/api/field-mappings/preset/basic"
                  hx-target="#preset-result"
                  hx-swap="innerHTML"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                >
                  Add Basic Fields (customer_name, order_code, total_amount)
                </button>
                <button
                  hx-post="/admin/api/field-mappings/preset/full"
                  hx-target="#preset-result"
                  hx-swap="innerHTML"
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                >
                  Add Full Fields (+ items, address)
                </button>
              </div>
              <div id="preset-result"></div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};
