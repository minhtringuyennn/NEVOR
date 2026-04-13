// Webhook logs view with side-by-side layout for desktop

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
      <div class="px-4 sm:px-0 h-[calc(100vh-140px)] flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Webhook Logs</h1>
            <p class="text-sm text-gray-600">View and manage incoming webhook events</p>
          </div>
          <a
            href="/admin/logs"
            class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
          >
            Refresh
          </a>
        </div>

        {/* Filters */}
        <div class="mb-4">
          <div class="flex flex-wrap gap-2 items-center">
            <span class="text-sm font-medium text-gray-700">Filter:</span>
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
        </div>

        {/* Main Content - Side by Side Layout */}
        <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
          {/* Left Column - Logs Table */}
          <Card
            title={`Events ${props.statusFilter ? `(${props.statusFilter})` : ''} (${props.logs.length})`}
            className="flex flex-col min-h-0"
          >
            <div class="flex-1 overflow-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50 sticky top-0">
                  <tr>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      ID
                    </th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Time
                    </th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  {props.logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} class="px-3 py-8 text-center text-gray-500">
                        No logs found
                      </td>
                    </tr>
                  ) : (
                    props.logs.map((log) => (
                      <tr
                        key={log.id}
                        class={`hover:bg-gray-50 cursor-pointer ${
                          props.selectedLog?.id === log.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td class="px-3 py-2 text-sm text-gray-900 font-mono">#{log.id}</td>
                        <td class="px-3 py-2 text-sm text-gray-900">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td class="px-3 py-2 text-sm">
                          <StatusBadge status={log.status} />
                        </td>
                        <td class="px-3 py-2 text-sm space-x-2">
                          <a
                            href={`/admin/logs?id=${log.id}`}
                            class="text-blue-600 hover:text-blue-800 font-medium"
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
              <div class="mt-2 pt-2 border-t flex justify-center space-x-1">
                {Array.from({ length: props.totalPages }, (_, i) => i + 1).map((page) => (
                  <a
                    key={page}
                    href={`/admin/logs?page=${page}${
                      props.statusFilter ? `&status=${props.statusFilter}` : ''
                    }`}
                    class={`px-2 py-1 rounded text-sm ${
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

          {/* Right Column - Log Details */}
          <div class="min-h-0 overflow-auto">
            {props.selectedLog ? (
              <Card title={`Details - #${props.selectedLog.id}`} className="h-full">
                <div class="space-y-4">
                  {/* Basic Info */}
                  <div class="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p class="text-xs font-medium text-gray-500">Webhook ID</p>
                      <p class="text-gray-900 font-mono truncate" title={props.selectedLog.webhook_id}>
                        {props.selectedLog.webhook_id}
                      </p>
                    </div>
                    <div>
                      <p class="text-xs font-medium text-gray-500">Status</p>
                      <StatusBadge status={props.selectedLog.status} />
                    </div>
                    <div>
                      <p class="text-xs font-medium text-gray-500">Topic</p>
                      <p class="text-gray-900">{props.selectedLog.topic}</p>
                    </div>
                    <div>
                      <p class="text-xs font-medium text-gray-500">Shop</p>
                      <p class="text-gray-900 truncate">{props.selectedLog.shop_domain}</p>
                    </div>
                    <div>
                      <p class="text-xs font-medium text-gray-500">Created</p>
                      <p class="text-gray-900">{new Date(props.selectedLog.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <p class="text-xs font-medium text-gray-500">Processed</p>
                      <p class="text-gray-900">
                        {props.selectedLog.processed_at
                          ? new Date(props.selectedLog.processed_at).toLocaleString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Error Display */}
                  {props.selectedLog.error && (
                    <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p class="text-xs font-medium text-red-900 mb-1">Error</p>
                      <p class="text-sm text-red-800">{props.selectedLog.error}</p>
                    </div>
                  )}

                  {/* Zalo Messages */}
                  {props.selectedLog.zaloLogs && props.selectedLog.zaloLogs.length > 0 && (
                    <div>
                      <p class="text-sm font-medium text-gray-900 mb-2">Zalo Messages</p>
                      {props.selectedLog.zaloLogs.map((zaloLog: any) => (
                        <div key={zaloLog.id} class="p-3 bg-gray-50 rounded-lg mb-2 space-y-2">
                          <div class="flex items-center justify-between">
                            <span class="text-xs font-medium">Phone: {zaloLog.phone}</span>
                            <StatusBadge status={zaloLog.status} />
                          </div>
                          <div>
                            <p class="text-xs font-medium text-gray-500 mb-1">Template Data:</p>
                            <pre class="text-xs text-gray-700 bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                              {JSON.stringify(JSON.parse(zaloLog.template_data), null, 2)}
                            </pre>
                          </div>
                          {zaloLog.zalo_response && (
                            <div>
                              <p class="text-xs font-medium text-gray-500 mb-1">Zalo API Response:</p>
                              <pre class={`text-xs p-2 rounded overflow-x-auto ${zaloLog.status === 'failed' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
                                {(() => {
                                  try {
                                    return JSON.stringify(JSON.parse(zaloLog.zalo_response), null, 2);
                                  } catch {
                                    return zaloLog.zalo_response;
                                  }
                                })()}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Payload */}
                  <div>
                    <p class="text-xs font-medium text-gray-500 mb-1">Payload</p>
                    <pre class="p-3 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto max-h-[300px]">
                      {JSON.stringify(JSON.parse(props.selectedLog.payload), null, 2)}
                    </pre>
                  </div>

                  {/* Actions */}
                  <div class="flex justify-end space-x-2 pt-2 border-t">
                    <a
                      href="/admin/logs"
                      class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                    >
                      Close
                    </a>
                    {props.selectedLog.status === 'failed' && (
                      <>
                        <button
                          hx-post={`/admin/api/retry/${props.selectedLog.id}`}
                          hx-target="#retry-result"
                          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                        >
                          Retry
                        </button>
                        <div id="retry-result"></div>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <Card title="Details" className="h-full flex items-center justify-center">
                <div class="text-center text-gray-500">
                  <svg class="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>Select a log to view details</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
