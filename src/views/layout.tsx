// HTML layout component with HTMX and TailwindCSS

import { FC } from 'hono/jsx';

export const Layout: FC<{ title: string; activePage?: string; children?: any }> = (props) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{props.title} - Shopify Zalo Worker</title>
        <script src="https://unpkg.com/htmx.org@1.9.10"></script>
        <script src="https://cdn.tailwindcss.com"></script>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              [x-cloak] { display: none; }
              .htmx-request { opacity: 0.5; pointer-events: none; }
            `,
          }}
        />
      </head>
      <body class="bg-gray-50 min-h-screen">
        <nav class="bg-white shadow-sm border-b border-gray-200">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
              <div class="flex space-x-8">
                <a
                  href="/admin/logs"
                  class={`flex items-center px-3 py-2 text-sm font-medium ${
                    props.activePage === 'logs'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Webhook Logs
                </a>
                <a
                  href="/admin/settings"
                  class={`flex items-center px-3 py-2 text-sm font-medium ${
                    props.activePage === 'settings'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Settings
                </a>
              </div>
              <div class="flex items-center space-x-4">
                <span class="text-sm text-gray-500">Shopify → Zalo Integration</span>
                <a
                  href="/admin/logout"
                  class="text-sm text-gray-500 hover:text-red-600 transition-colors"
                  title="Logout"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </nav>

        <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{props.children}</main>

        <footer class="mt-12 py-6 border-t border-gray-200">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
            Shopify-Zalo Worker v1.0.0 | Powered by Cloudflare Workers
          </div>
        </footer>
      </body>
    </html>
  );
};

export const Card: FC<{ title?: string; className?: string; children?: any }> = (props) => {
  return (
    <div class={`bg-white rounded-lg shadow-sm border border-gray-200 ${props.className || ''}`}>
      {props.title && (
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">{props.title}</h2>
        </div>
      )}
      <div class="px-6 py-4">{props.children}</div>
    </div>
  );
};

export const Badge: FC<{ color: string; text: string }> = (props) => {
  const colors: Record<string, string> = {
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-800',
  };

  return (
    <span
      class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        colors[props.color] || colors.gray
      }`}
    >
      {props.text}
    </span>
  );
};

export const Alert: FC<{
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}> = (props) => {
  const styles: Record<string, { bg: string; border: string; text: string }> = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
    },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
    },
  };

  const style = styles[props.type];

  return (
    <div class={`${style.bg} ${style.border} ${style.text} border rounded-lg p-4 mb-4`}>
      {props.message}
    </div>
  );
};
