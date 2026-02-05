// Server Logs view

import { FC } from 'hono/jsx';
import { Layout, Card } from './layout';

export interface ServerLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  source?: string;
}

interface ServerLogsViewProps {
  logs: ServerLog[];
  filter?: string;
}

const getLevelColor = (level: string) => {
  switch (level) {
    case 'error':
      return 'text-red-600 bg-red-50';
    case 'warn':
      return 'text-yellow-600 bg-yellow-50';
    case 'info':
    default:
      return 'text-blue-600 bg-blue-50';
  }
};

// Partial view for HTMX requests (no Layout wrapper)
export const ServerLogsList: FC<{ logs: ServerLog[] }> = (props) => {
  const { logs } = props;

  return (
    <Card title="Log Entries">
      {logs.length === 0 ? (
        <div class="text-center py-8 text-gray-500">
          <p>No logs found</p>
          <p class="text-sm mt-2">
            Logs are stored in memory and will be cleared on worker restart
          </p>
        </div>
      ) : (
        <div class="space-y-2 max-h-[600px] overflow-y-auto">
          {logs.map((log, index) => (
            <div
              key={index}
              class={`p-3 rounded-lg border ${getLevelColor(log.level)}`}
            >
              <div class="flex items-center justify-between mb-1">
                <span class="font-semibold text-sm uppercase">
                  {log.level}
                </span>
                <span class="text-xs opacity-75">{log.timestamp}</span>
              </div>
              <p class="text-sm break-words">{log.message}</p>
              {log.source && (
                <p class="text-xs mt-1 opacity-75">
                  Source: {log.source}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export const ServerLogsView: FC<ServerLogsViewProps> = (props) => {
  const { logs, filter } = props;

  return (
    <Layout title="Server Logs" activePage="server-logs">
      <div class="px-4 sm:px-0">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Server Logs</h1>
        <p class="text-gray-600 mb-8">
          View application logs and system events
        </p>

        <div class="space-y-6">
          {/* Filter */}
          <Card title="Filter Logs">
            <form
              hx-get="/admin/server-logs"
              hx-target="#logs-container"
              hx-swap="innerHTML"
              class="flex flex-wrap gap-4"
            >
              <div class="flex-1 min-w-[200px]">
                <select
                  name="filter"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Levels</option>
                  <option value="info" selected={filter === 'info'}>
                    Info
                  </option>
                  <option value="warn" selected={filter === 'warn'}>
                    Warning
                  </option>
                  <option value="error" selected={filter === 'error'}>
                    Error
                  </option>
                </select>
              </div>
              <button
                type="submit"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Filter
              </button>
              <button
                type="button"
                hx-get="/admin/server-logs"
                hx-target="#logs-container"
                hx-swap="innerHTML"
                class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Refresh
              </button>
            </form>
          </Card>

          {/* Logs Container */}
          <div id="logs-container">
            <ServerLogsList logs={logs} />
          </div>

          {/* Stats */}
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card title="Total Logs">
              <p class="text-3xl font-bold text-gray-900">{logs.length}</p>
            </Card>
            <Card title="Errors">
              <p class="text-3xl font-bold text-red-600">
                {logs.filter((l) => l.level === 'error').length}
              </p>
            </Card>
            <Card title="Warnings">
              <p class="text-3xl font-bold text-yellow-600">
                {logs.filter((l) => l.level === 'warn').length}
              </p>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};
