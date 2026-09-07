import { createMcpHandler } from "agents/mcp/server";
import type { Env } from "./lib";
import { baseUrl, handleOAuth, verifyAccessToken } from "./oauth";
import { RefreshTokenStore } from "./refresh-token-store";
import { createServer } from "./server";

export default {
  async fetch(request, env, ctx) {
    try {
      const oauthResponse = await handleOAuth(request, env);
      if (oauthResponse) return oauthResponse;

      const url = new URL(request.url);
      if (url.pathname === "/healthz") return Response.json({ ok: true });
      if (url.pathname !== "/mcp") return new Response("Not found", { status: 404 });
      if (!(await verifyAccessToken(request, env))) {
        return Response.json({ error: "Unauthorized" }, {
          status: 401,
          headers: { "WWW-Authenticate": `Bearer resource_metadata="${baseUrl(request, env)}/.well-known/oauth-protected-resource"` },
        });
      }
      return createMcpHandler(() => createServer(env), { route: "/mcp", responseMode: "auto" })(request, env, ctx);
    } catch (error) {
      console.error(error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;

export { RefreshTokenStore };
