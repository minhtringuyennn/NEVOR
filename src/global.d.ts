// Type definitions for HTMX attributes with Hono JSX
// https://github.com/typed-htmx/typed-htmx

import 'typed-htmx';

// Extend Hono's JSX types with HTMX attributes
declare module 'hono/jsx' {
  namespace JSX {
    interface HTMLAttributes extends HtmxAttributes {}
  }
}

// Additional type declarations for Cloudflare Workers
declare global {
  // D1 Database binding
  const DB: D1Database;
}

export {};
