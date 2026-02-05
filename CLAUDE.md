# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a Cloudflare Worker application that integrates Shopify webhooks with Zalo ZBS (Zalo Business Service) for order notifications.

### Core Flow

1. **Shopify** sends `orders/create` webhook to `/webhook/shopify`
2. **Webhook handler** (`src/routes/webhook.ts`) verifies HMAC signature, parses order data
3. **DatabaseService** logs the webhook event to D1 (SQLite)
4. **ZaloService** sends template message to customer's phone via Zalo API
5. **Admin UI** (`src/routes/admin.tsx`) provides dashboard, logs viewer, and settings

### Key Components

- **Hono framework** with JSX rendering (`hono/jsx`)
- **HTMX** for dynamic UI interactions (with typed-htmx for TypeScript support)
- **TailwindCSS** via CDN for styling
- **D1 Database** for persistence (webhook_logs, zalo_logs, settings, message_config tables)
- **dotenvx** for encrypted environment variables (`.env` is encrypted, `.env.keys` is gitignored)

## Common Commands

```bash
# Development
make dev              # Start dev server with dotenvx (auto-decrypts .env)
make install          # Install deps and create tmp/ directory

# Database
make migrate          # Run migrations locally
make migrate-remote   # Run migrations on production
make create-db        # Create D1 database (one-time setup)
make query-local      # Execute SQL query locally
make query-remote     # Execute SQL query on production

# Testing
make test             # Send test webhook payload from tmp/test-webhook.json

# Deployment
make deploy           # Deploy to Cloudflare Workers
make logs             # View production logs

# dotenvx operations
npx dotenvx get                    # View decrypted env vars
npx dotenvx set KEY value          # Set/update encrypted variable
npx dotenvx encrypt                # Encrypt .env file
npx dotenvx ops backup             # Backup private key to cloud
```

## Project Structure

```
src/
├── index.ts           # Main entry - Hono app setup, middleware, route mounting
├── global.d.ts        # TypeScript declarations (HTMX types via typed-htmx)
├── routes/
│   ├── webhook.ts     # Shopify webhook handler with HMAC verification
│   └── admin.tsx      # Admin UI routes (JSX) - dashboard, logs, settings
├── services/
│   ├── shopify.ts     # Webhook verification, phone extraction, order formatting
│   ├── zalo.ts        # Zalo ZBS API client (template messages, retry logic)
│   └── db.ts          # D1 database operations (DatabaseService class)
├── views/
│   ├── layout.tsx     # Base HTML layout with HTMX + TailwindCDN
│   ├── dashboard.tsx  # Dashboard view component
│   ├── settings.tsx   # Settings form component
│   └── logs.tsx       # Webhook logs table component
└── types/
    ├── shopify.ts     # Shopify webhook TypeScript types
    └── zalo.ts        # Zalo API TypeScript types
```

## Important Implementation Details

### dotenvx Setup

- `.env` is encrypted and committed (safe to share)
- `.env.keys` contains private decryption key (gitignored, CRITICAL TO BACKUP)
- `make dev` runs `npx dotenvx run -- npx wrangler dev` to auto-decrypt
- If `.env.keys` is lost, no recovery possible - must re-encrypt with new credentials

### Database Schema

Key tables in `migrations/0001_initial.sql`:
- `webhook_logs`: Stores all incoming webhooks with payload, status, error
- `zalo_logs`: Stores message delivery attempts with Zalo API responses
- `message_config`: Single-row table for notification settings (send conditions, template options)

### HTMX TypeScript Support

The project uses `typed-htmx` for full TypeScript support on HTMX attributes. All `hx-*` attributes (hx-post, hx-target, hx-swap, etc.) have autocomplete and type checking via `src/global.d.ts`.

### Route Structure

- `/webhook/shopify` - POST endpoint for Shopify webhooks (HMAC verified)
- `/admin` - Dashboard with stats
- `/admin/logs` - Webhook logs with filtering and retry
- `/admin/settings` - Configuration UI with Zalo connection test
- `/admin/api/*` - HTMX API endpoints for forms and actions

### Phone Number Extraction

Priority order in `src/services/shopify.ts`:
1. `customer.phone`
2. `shipping_address.phone`
3. `billing_address.phone`
4. `order.phone`

Normalized to E.164 format (e.g., `84912345678`).

### Environment Variables Required

```
SHOPIFY_WEBHOOK_SECRET    # For HMAC verification
SHOPIFY_SHOP_DOMAIN       # Shopify store domain
ZALO_APP_ID              # Zalo app ID
ZALO_ACCESS_TOKEN        # Zalo API access token
ZALO_OA_ID               # Zalo Official Account ID
ZALO_TEMPLATE_ID         # Approved message template ID
ADMIN_PASSWORD           # For basic auth on /admin routes
```

## Testing Webhooks Locally

1. Start dev server: `make dev`
2. In another terminal, run: `make test`
3. This sends the payload in `tmp/test-webhook.json` to localhost

## Deployment Checklist

1. Set secrets: `npx wrangler secret put <VAR_NAME>` for each env var
2. Create D1 DB: `make create-db` and update `wrangler.toml` with `database_id`
3. Run migrations: `make migrate-remote`
4. Deploy: `make deploy`
5. Configure Shopify webhook URL to point to production `/webhook/shopify`
