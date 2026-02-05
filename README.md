# Shopify-to-Zalo ZBS Integration Worker

A Cloudflare Worker application that receives Shopify order webhooks and sends notifications to customers via Zalo ZBS (Zalo Business Service). Includes a clean HTMX-based management UI for configuration and monitoring.

## Features

- **Shopify Webhook Handler**: Receives and processes `orders/create` webhooks from Shopify
- **Zalo ZBS Integration**: Sends template messages to customers via Zalo
- **Management UI**: Clean, responsive admin interface built with HTMX and TailwindCSS
- **Configuration**: Flexible message templates and notification conditions
- **Monitoring**: Webhook logs, delivery status tracking, and statistics dashboard
- **Security**: HMAC webhook verification and password-protected admin UI

## Technology Stack

- **Runtime**: Cloudflare Workers (TypeScript)
- **Framework**: Hono (fast, lightweight HTTP framework)
- **UI**: HTMX + TailwindCSS with typed-htmx for TypeScript support
- **Storage**: Cloudflare D1 (SQLite)
- **Secrets**: dotenvx (encrypted environment variables)
- **Build Tools**: Makefile + Wrangler CLI

### HTMX TypeScript Support

This project uses [typed-htmx](https://github.com/typed-htmx/typed-htmx) to provide full TypeScript type definitions for all HTMX attributes. This gives you:

- **Autocomplete** for all `hx-*` attributes (hx-post, hx-target, hx-swap, etc.)
- **Type checking** for HTMX attribute values
- **Inline documentation** for HTMX features

Example with full type support:
```tsx
<button
  hx-post="/api/action"
  hx-target="#result"
  hx-swap="innerHTML"
  hx-trigger="click"
  class="bg-blue-600 text-white px-4 py-2 rounded"
>
  Submit
</button>
```

## Project Structure

```
shopify-zalo-worker/
├── src/
│   ├── index.ts                  # Main worker entry point
│   ├── global.d.ts               # TypeScript type declarations (HTMX types)
│   ├── routes/
│   │   ├── webhook.ts            # Shopify webhook handler
│   │   └── admin.tsx             # Admin UI routes (JSX)
│   ├── services/
│   │   ├── shopify.ts            # Shopify webhook verification
│   │   ├── zalo.ts               # Zalo ZBS API client
│   │   └── db.ts                 # D1 database helpers
│   ├── views/
│   │   ├── layout.tsx            # HTML layout (JSX)
│   │   ├── dashboard.tsx         # Dashboard view (JSX)
│   │   ├── settings.tsx          # Settings view (JSX)
│   │   └── logs.tsx              # Webhook logs view (JSX)
│   └── types/
│       ├── shopify.ts            # Shopify types
│       └── zalo.ts               # Zalo types
├── migrations/
│   └── 0001_initial.sql          # Database schema
├── tmp/
│   └── test-webhook.json         # Test webhook payload (gitignored)
├── .env                          # Encrypted environment variables (dotenvx)
├── .env.keys                     # Private keys (gitignored, DO NOT COMMIT)
├── wrangler.toml                 # Cloudflare config
├── package.json
├── Makefile
└── README.md
```

## Prerequisites

- Node.js 20+ (or use the provided devcontainer)
- Cloudflare account
- Shopify store
- Zalo ZBS account with approved message template

## Quick Start

### 1. Clone and Install

```bash
# Install dependencies
make install

# Copy environment template
make setup
```

### 2. Environment Configuration (dotenvx)

This project uses **dotenvx** for encrypted environment variables. The `.env` file is encrypted and committed to the repository, while the private key (`.env.keys`) is gitignored.

**For local development:**

- The encrypted `.env` file is already configured with credentials
- The `.env.keys` file contains your private decryption key (gitignored)
- Run `make dev` to automatically decrypt and use the variables

**To view or edit encrypted variables:**

```bash
# View decrypted values
npx dotenvx get

# Edit a value (re-encrypts automatically)
npx dotenvx set ADMIN_PASSWORD your_new_password

# Add new variable
npx dotenvx set NEW_VAR your_value
```

**Important:** Keep your `.env.keys` file secure and never commit it!

### 3. Set Up Database

```bash
# Create D1 database
make create-db

# Update wrangler.toml with database_id from output

# Run migrations locally
make migrate
```

### 4. Set Up Local Environment Variables

For local development, you need to create a `.dev.vars` file with decrypted environment variables:

```bash
# Generate .dev.vars from encrypted .env
make vars
```

**Important:** `.dev.vars` is gitignored and should **never be committed**. It contains plaintext secrets for local development only.

### 5. Start Development Server

```bash
make dev
```

Access the admin UI at `http://localhost:8787/admin`

**Default login:**
- Username: `admin`
- Password: (value from `ADMIN_PASSWORD` in `.dev.vars`)

## dotenvx Key Management (Local Development Only)

**Important:** dotenvx decryption at runtime is **not supported** in Cloudflare Workers because the Workers runtime lacks Node.js file system APIs (`fs`, `path`) that dotenvx requires.

### Local Development Flow

For local development, dotenvx works differently:

1. **`.env`** - Encrypted file (committed to repo)
2. **`.env.keys`** - Private key (gitignored, needed for decryption)
3. **`.dev.vars`** - Decrypted file for Wrangler (gitignored, generated via `make vars`)

### Backup Your Private Key

Your `.env.keys` file contains the private key needed to decrypt environment variables for local development. **Back it up securely!**

```bash
# Backup to secure cloud storage (recommended)
npx dotenvx ops backup

# Or manually copy .env.keys to a secure location
cp .env.keys ~/secure-backup/shopify-zalo-worker.env.keys
```

### Team Collaboration

To share encrypted variables with team members:

1. **Commit `.env` to repository** (encrypted, safe to share)
2. **Share `.env.keys` securely** (via 1Password, password manager, etc.)
3. Team members place `.env.keys` in project root
4. Run `make vars` to generate `.dev.vars`
5. Run `make dev` to start development

### Key Recovery

If you lose `.env.keys`:

- **No recovery possible** - encryption is one-way
- You'll need to re-encrypt with new credentials
- This is why backing up `.env.keys` is critical!

## Deployment

**Note on dotenvx in Cloudflare Workers:**
Cloudflare Workers run in a sandboxed V8 isolate without Node.js file system APIs. The `@dotenvx/dotenvx` package cannot read `.env` files at runtime. Instead, use one of these approaches:

### Option A: Manual Deployment (Quick)

Set secrets manually using Wrangler:

```bash
# Required secrets
npx wrangler secret put SHOPIFY_WEBHOOK_SECRET
npx wrangler secret put SHOPIFY_SHOP_DOMAIN
npx wrangler secret put ZALO_APP_ID
npx wrangler secret put ZALO_ACCESS_TOKEN
npx wrangler secret put ZALO_OA_ID
npx wrangler secret put ZALO_TEMPLATE_ID
npx wrangler secret put ADMIN_PASSWORD

# Optional (if using token refresh)
npx wrangler secret put ZALO_APP_SECRET
npx wrangler secret put ZALO_REFRESH_TOKEN
```

Then deploy:
```bash
make deploy
```

### Option B: GitHub Actions CI/CD (Recommended)

Use the included GitHub Actions workflow to automatically decrypt dotenv variables and deploy:

1. **Add GitHub Secrets:**
   - `DOTENV_PRIVATE_KEY` - Your dotenvx private key
   - `CLOUDFLARE_API_TOKEN` - Cloudflare API token
   - `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID

2. **Push to main branch** - Workflow automatically:
   - Decrypts `.env` using `DOTENV_PRIVATE_KEY`
   - Runs database migrations
   - Deploys to Cloudflare with all secrets injected

The workflow is at `.github/workflows/deploy.yml`.

### Database Setup

```bash
# Create production database
npx wrangler d1 create shopify-zalo-db

# Update wrangler.toml with database_id from output
# Run migrations
make migrate-remote
```

Your worker will be available at: `https://your-worker.workers.dev`

## Configuration

### Shopify Webhook Setup

1. Go to Shopify Admin → Settings → Notifications → Webhooks
2. Click "Create webhook"
3. Event: `Order creation`
4. Format: `JSON`
5. URL: `https://your-worker.workers.dev/webhook/shopify`
6. API Version: Latest

### Zalo ZBS Setup

1. Create Zalo Official Account at https://oa.zalo.me
2. Register for Zalo Business Service (ZBS)
3. Create and submit message template for approval
4. Get credentials from Zalo dashboard:
   - App ID
   - Access Token
   - OA ID
   - Template ID (after approval)

## Admin UI

Access the admin interface at `/admin` with:

- Username: `admin`
- Password: (value from `ADMIN_PASSWORD` env var)

### Dashboard

- View webhook statistics
- Monitor message delivery
- Quick health checks

### Webhook Logs

- View all webhook events
- Filter by status
- View detailed payloads
- Retry failed webhooks

### Settings

- Configure message template
- Set notification conditions
- Test Zalo connection
- Send test messages

## API Endpoints

### Webhook Endpoint

```
POST /webhook/shopify
```

Receives Shopify webhook events. Protected by HMAC verification.

### Admin Endpoints

```
GET  /admin                           # Dashboard
GET  /admin/logs                      # Webhook logs
GET  /admin/settings                  # Settings page
POST /admin/api/settings/message-config   # Save config
POST /admin/api/test-zalo             # Test Zalo connection
POST /admin/api/test-send             # Send test message
POST /admin/api/retry/:id             # Retry webhook
```

## Makefile Commands

```bash
make install        # Install dependencies
make dev           # Start development server
make deploy        # Deploy to Cloudflare
make migrate       # Run migrations locally
make migrate-remote # Run migrations on production
make test          # Test webhook with sample payload
make logs          # View worker logs
make create-db     # Create D1 database
make query-local   # Execute SQL query locally
make query-remote  # Execute SQL query on production
```

## Database Schema

### webhook_logs

Stores all incoming webhooks from Shopify.

### zalo_logs

Stores all messages sent via Zalo ZBS.

### settings

Application configuration key-value store.

### message_config

Message template configuration (single row).

## Notification Conditions

Configure when to send Zalo notifications:

- **All orders**: Send for every order
- **Paid only**: Send only for paid orders
- **Minimum amount**: Send only for orders above specified amount

## Phone Number Handling

The worker extracts phone numbers in this priority order:

1. `customer.phone`
2. `shipping_address.phone`
3. `billing_address.phone`
4. `order.phone`

Phone numbers are normalized to E.164 format (e.g., `84912345678`).

## Security

- **Webhook Verification**: All webhooks verified with HMAC-SHA256
- **Admin Authentication**: Basic auth with password
- **Secrets Management**:
  - **Development**: dotenvx encryption (`.env` encrypted, `.env.keys` gitignored)
  - **Production**: Cloudflare secrets via `wrangler secret put`
- **Input Validation**: All inputs validated and sanitized
- **dotenvx**: Environment variables are encrypted at rest using public-key cryptography

## Troubleshooting

### Webhook not received

1. Check Shopify webhook configuration
2. Verify webhook URL is correct
3. Check Cloudflare Workers logs: `make logs`
4. Verify HMAC secret matches Shopify

### Zalo message not sent

1. Test Zalo connection in Settings page
2. Verify phone number format (must include country code)
3. Check Zalo template is approved
4. Verify access token is valid
5. Check Zalo logs in Admin UI

### Database errors

1. Verify D1 database is created
2. Run migrations: `make migrate-remote`
3. Check wrangler.toml has correct database_id

### Admin UI not accessible

1. Verify ADMIN_PASSWORD is set
2. Check basic auth credentials
3. Clear browser cache/cookies

## Development

### Using Devcontainer

Open project in VS Code and reopen in devcontainer when prompted. Everything will be set up automatically.

### Local Testing

```bash
# Start dev server
make dev

# Send test webhook
make test

# View logs
make logs
```

## Monitoring

### View Logs

```bash
# Real-time logs
make logs

# Or via Cloudflare dashboard
https://dash.cloudflare.com
```

### Check Database

```bash
# Local
make query-local

# Production
make query-remote
```

## Performance

- **Response Time**: < 100ms for webhook processing
- **Throughput**: Handles thousands of webhooks per minute
- **Database**: D1 provides fast, globally distributed SQLite
- **Cost**: Runs on Cloudflare's free tier for most use cases

## License

MIT

## Support

For issues and questions:

- Open an issue on GitHub
- Check Cloudflare Workers documentation
- Review Zalo ZBS API documentation

## Credits

Built with:

- [Hono](https://hono.dev) - Web framework
- [HTMX](https://htmx.org) - Dynamic HTML
- [TailwindCSS](https://tailwindcss.com) - Styling
- [Cloudflare Workers](https://workers.cloudflare.com) - Serverless platform
