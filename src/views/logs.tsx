// Webhook logs view

import { FC } from 'hono/jsx';
import { Layout, Card, Badge } from './layout';
import type { WebhookLog } from '../services/db';

interface LogsViewProps {
  logs: WebhookLog[];
  selectedLog?: WebhookLog & { zaloLogs?: any[] };
  statusFilter?: string;
  page?: number;
  totalPages?: number;
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

export const LogsView: FC<LogsViewProps> = (props) => {
  return (
    <Layout title="Webhook Logs" activePage="logs">
      <div class="px-4 sm:px-0">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Webhook Logs</h1>
        <p class="text-gray-600 mb-8">View and manage incoming webhook events</p>

        <div class="space-y-6">
          {/* Filters */}
          <Card>
            <div class="flex flex-wrap gap-3 items-center">
              <span class="text-sm font-medium text-gray-700">Filter by status:</span>
              <a
                href="/admin/logs"
                class={`px-3 py-1 rounded-lg text-sm ${
                  !props.statusFilter
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </a>
              <a
                href="/admin/logs?status=success"
                class={`px-3 py-1 rounded-lg text-sm ${
                  props.statusFilter === 'success'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Success
              </a>
              <a
                href="/admin/logs?status=failed"
                class={`px-3 py-1 rounded-lg text-sm ${
                  props.statusFilter === 'failed'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Failed
              </a>
              <a
                href="/admin/logs?status=pending"
                class={`px-3 py-1 rounded-lg text-sm ${
                  props.statusFilter === 'pending'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending
              </a>
              <a
                href="/admin/logs?status=skipped"
                class={`px-3 py-1 rounded-lg text-sm ${
                  props.statusFilter === 'skipped'
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Skipped
              </a>
            </div>
          </Card>

          {/* Logs Table */}
          <Card
            title={`Webhook Events ${props.statusFilter ? `(${props.statusFilter})` : ''}`}
          >
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ID
                    </th>
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
                  {props.logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} class="px-4 py-8 text-center text-gray-500">
                        No logs found
                      </td>
                    </tr>
                  ) : (
                    props.logs.map((log) => (
                      <tr
                        class={`hover:bg-gray-50 ${
                          props.selectedLog?.id === log.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td class="px-4 py-3 text-sm text-gray-900 font-mono">#{log.id}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-900">{log.topic}</td>
                        <td class="px-4 py-3 text-sm text-gray-500">{log.shop_domain}</td>
                        <td class="px-4 py-3 text-sm">
                          <StatusBadge status={log.status} />
                        </td>
                        <td class="px-4 py-3 text-sm space-x-2">
                          <a
                            href={`/admin/logs?id=${log.id}`}
                            class="text-blue-600 hover:text-blue-800"
                          >
                            View
                          </a>
                          {log.status === 'failed' && (
                            <>
                              <button
                                hx-post={`/admin/api/retry/${log.id}`}
                                hx-target={`#retry-result-${log.id}`}
                                class="text-green-600 hover:text-green-800"
                              >
                                Retry
                              </button>
                              <span id={`retry-result-${log.id}`}></span>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {props.totalPages && props.totalPages > 1 && (
              <div class="mt-4 flex justify-center space-x-2">
                {Array.from({ length: props.totalPages }, (_, i) => i + 1).map((page) => (
                  <a
                    href={`/admin/logs?page=${page}${
                      props.statusFilter ? `&status=${props.statusFilter}` : ''
                    }`}
                    class={`px-3 py-1 rounded ${
                      page === (props.page || 1)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {page}
                  </a>
                ))}
              </div>
            )}
          </Card>

          {/* Log Details (if selected) */}
          {props.selectedLog && (
            <Card title={`Log Details - #${props.selectedLog.id}`}>
              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <p class="text-xs font-medium text-gray-500">Webhook ID</p>
                    <p class="text-sm text-gray-900 font-mono">
                      {props.selectedLog.webhook_id}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-gray-500">Status</p>
                    <p class="text-sm">
                      <StatusBadge status={props.selectedLog.status} />
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-gray-500">Created At</p>
                    <p class="text-sm text-gray-900">
                      {new Date(props.selectedLog.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-gray-500">Processed At</p>
                    <p class="text-sm text-gray-900">
                      {props.selectedLog.processed_at
                        ? new Date(props.selectedLog.processed_at).toLocaleString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {props.selectedLog.error && (
                  <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p class="text-xs font-medium text-red-900 mb-1">Error</p>
                    <p class="text-sm text-red-800">{props.selectedLog.error}</p>
                  </div>
                )}

                <div>
                  <p class="text-xs font-medium text-gray-500 mb-2">Payload</p>
                  <pre class="p-3 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(JSON.parse(props.selectedLog.payload), null, 2)}
                  </pre>
                </div>

                {props.selectedLog.zaloLogs && props.selectedLog.zaloLogs.length > 0 && (
                  <div>
                    <p class="text-sm font-medium text-gray-900 mb-2">Zalo Messages</p>
                    {props.selectedLog.zaloLogs.map((zaloLog: any) => (
                      <div class="p-3 bg-gray-50 rounded-lg mb-2">
                        <div class="flex items-center justify-between mb-2">
                          <span class="text-xs font-medium">Phone: {zaloLog.phone}</span>
                          <StatusBadge status={zaloLog.status} />
                        </div>
                        <pre class="text-xs text-gray-700">
                          {JSON.stringify(JSON.parse(zaloLog.template_data), null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}

                <div class="flex justify-end space-x-2">
                  <a
                    href="/admin/logs"
                    class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Close
                  </a>
                  {props.selectedLog.status === 'failed' && (
                    <>
                      <button
                        hx-post={`/admin/api/retry/${props.selectedLog.id}`}
                        hx-target="#retry-result"
                        class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Retry This Webhook
                      </button>
                      <div id="retry-result"></div>
                    </>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};
