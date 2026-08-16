# RightTemp Cloudflare MCP Worker

This Worker hosts the private RightTemp ChatGPT connector without moving the RightTemp web app out of Replit.

## Required Worker secrets

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RIGHTTEMP_ORGANIZATION_ID`
- `RIGHTTEMP_MCP_TOKEN`
- `RIGHTTEMP_MCP_PASSWORD`
- `RIGHTTEMP_MCP_BASE_URL` — the final Worker origin, without `/mcp`

Never put these values in `wrangler.jsonc` or commit `.dev.vars`.

## Deploy

Run `pnpm --filter @workspace/righttemp-worker deploy` or connect this repository in the Cloudflare Workers dashboard. The connector endpoint is `/mcp`, health check is `/healthz`, and OAuth discovery is `/.well-known/oauth-authorization-server`.

Keep the existing Replit connector installed until this Worker passes OAuth sign-in and a read-only tool test in ChatGPT.
