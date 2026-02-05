.PHONY: install dev deploy migrate migrate-remote test logs setup clean types vars

# Install dependencies
install:
	npm install
	mkdir -p tmp

# Run development server (reads from .dev.vars for local env)
dev:
	npx wrangler dev

# Generate .dev.vars from encrypted .env (for local development)
# .dev.vars is gitignored and should not be committed
vars:
	npx dotenvx get | jq -r 'to_entries | .[] | "\(.key)=\(.value)"' > .dev.vars

# Deploy to Cloudflare
deploy:
	npx wrangler deploy

# Run migrations locally
migrate:
	npx wrangler d1 execute DB --local --file=./migrations/0001_initial.sql

# Run migrations on remote (production)
migrate-remote:
	npx wrangler d1 execute DB --remote --file=./migrations/0001_initial.sql

# View worker logs
logs:
	npx wrangler tail

# Initial setup
setup:
	@echo "✅ dotenvx is configured and .env is encrypted"
	@echo "🔑 Private key stored in .env.keys (gitignored)"
	@echo "🗄️  Run 'make migrate' to set up the database"
	@echo "🔧 Run 'make vars' to generate .dev.vars for local development"
	@echo "🚀 Run 'make dev' to start development server"
	@echo "💡 For production, use 'wrangler secret put' or dotenvx vault"

# Clean build artifacts
clean:
	rm -rf node_modules dist .wrangler

# Generate TypeScript types for bindings
types:
	npx wrangler types
