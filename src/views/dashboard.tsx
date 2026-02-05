// Dashboard view

import { FC } from 'hono/jsx';
import { Layout, Card, Badge } from './layout';
import type { WebhookLog } from '../services/db';

interface DashboardStats {
  webhookStats: {
    total: number;
    success: number;
    failed: number;
    pending: number;
    today: number;
  };
  zaloStats: {
    total: number;
    success: number;
    failed: number;
    today: number;
  };
  recentWebhooks: WebhookLog[];
  webhookUrl: string;
}

const StatusBadge: FC<{ status: string }> = ({ status }) => {
  const statusMap: Record<string, { color: string; text: string }> = {
    success: { color: 'green', text: 'Success' },
    failed: { color: 'red', text: 'Failed' },
    pending: { color: 'yellow', text: 'Pending' },
    processing: { color: 'blue', text: 'Processing' },
    skipped: { color: 'gray', text: 'Skipped' },
    ignored: { color: 'gray', text: 'Ignored' },
  };

  const config = statusMap[status] || { color: 'gray', text: status };
  return <Badge color={config.color} text={config.text} />;
};

export const DashboardView: FC<DashboardStats> = (props) => {
  const successRate =
    props.webhookStats.total > 0
      ? Math.round((props.webhookStats.success / props.webhookStats.total) * 100)
      : 0;

  return (
    <Layout title="Dashboard" activePage="dashboard">
      <div class="px-4 sm:px-0">
        <h1 class="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        {/* Stats Grid */}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Webhooks */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total Webhooks</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">
                  {props.webhookStats.total}
                </p>
                <p class="text-xs text-gray-500 mt-1">Today: {props.webhookStats.today}</p>
              </div>
              <div class="text-blue-500">
                <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
            </div>
          </Card>

          {/* Successful */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Successful</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">
                  {props.webhookStats.success}
                </p>
                <p class="text-xs text-gray-500 mt-1">{successRate}% success rate</p>
              </div>
              <div class="text-green-500">
                <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </Card>

          {/* Failed */}
          <Card className="bg-gradient-to-br from-red-50 to-red-100">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Failed</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">
                  {props.webhookStats.failed}
                </p>
                <p class="text-xs text-gray-500 mt-1">Needs attention</p>
              </div>
              <div class="text-red-500">
                <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </Card>

          {/* Zalo Messages */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Zalo Messages</p>
                <p class="text-3xl font-bold text-gray-900 mt-2">{props.zaloStats.total}</p>
                <p class="text-xs text-gray-500 mt-1">Today: {props.zaloStats.today}</p>
              </div>
              <div class="text-purple-500">
                <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Webhooks */}
        <Card title="Recent Webhook Activity">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Time
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Topic
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Shop
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                {props.recentWebhooks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      class="px-4 py-8 text-center text-gray-500"
                    >
                      No webhooks received yet
                    </td>
                  </tr>
                ) : (
                  props.recentWebhooks.map((webhook) => (
                    <tr class="hover:bg-gray-50">
                      <td class="px-4 py-3 text-sm text-gray-900">
                        {new Date(webhook.created_at).toLocaleString()}
                      </td>
                      <td class="px-4 py-3 text-sm text-gray-900">{webhook.topic}</td>
                      <td class="px-4 py-3 text-sm text-gray-500">{webhook.shop_domain}</td>
                      <td class="px-4 py-3 text-sm">
                        <StatusBadge status={webhook.status} />
                      </td>
                      <td class="px-4 py-3 text-sm">
                        <a
                          href={`/admin/logs?id=${webhook.id}`}
                          class="text-blue-600 hover:text-blue-800"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div class="mt-4 flex justify-end">
            <a
              href="/admin/logs"
              class="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View all logs →
            </a>
          </div>
        </Card>

        {/* Quick Actions */}
        <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="Quick Actions">
            <div class="space-y-3">
              <a
                href="/admin/settings"
                class="block px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition"
              >
                Configure Settings
              </a>
              <a
                href="/admin/logs?status=failed"
                class="block px-4 py-2 bg-red-600 text-white text-center rounded-lg hover:bg-red-700 transition"
              >
                View Failed Webhooks
              </a>
            </div>
          </Card>

          <Card title="System Status">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Webhook Endpoint</span>
                <Badge color="green" text="Active" />
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Zalo API</span>
                <Badge color="green" text="Connected" />
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Database</span>
                <Badge color="green" text="Healthy" />
              </div>
            </div>
          </Card>

          <Card title="Integration Info">
            <div class="space-y-2 text-sm text-gray-600">
              <p>
                <strong>Webhook URL:</strong>
              </p>
              <code class="block bg-gray-100 px-3 py-2 rounded text-xs break-all">
                {props.webhookUrl}
              </code>
              <p class="text-xs text-gray-500 mt-2">
                Configure this URL in your Shopify webhook settings
              </p>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};
