# RightTemp ChatGPT connector

This is a private, tool-only MCP connector at `POST /mcp`. It lets ChatGPT search RightTemp, read today's schedule, create leads, update lead workflow, create draft estimates, and schedule follow-ups or sales appointments.

All writes use a two-step flow. A call with `confirmed: false` returns a preview. The tool only writes when ChatGPT calls it again with `confirmed: true` after the user explicitly confirms.

## Server secrets

Copy `.env.example` into your host's secret manager. Never put the service-role key or MCP token in frontend code or Git.

## Local check

```sh
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/api-server build
```

Deploy the existing API server over HTTPS, then add `https://YOUR_HOST/mcp` in ChatGPT Developer Mode. Configure the connector to send `Authorization: Bearer YOUR_RIGHTTEMP_MCP_TOKEN`. The initial version is private and intended only for the RightTemp owner.
