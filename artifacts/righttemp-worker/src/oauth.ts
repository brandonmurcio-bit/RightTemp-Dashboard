import type { Env } from "./lib";
import { required } from "./lib";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

type CodeClaims = {
  type: "code";
  clientId: string;
  redirectUri: string;
  challenge: string;
  resource: string;
  exp: number;
};

type AccessClaims = { type: "access"; aud: string; scope: "righttemp"; exp: number };

function base64url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decode64(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function sign(claims: CodeClaims | AccessClaims, env: Env) {
  const payload = base64url(encoder.encode(JSON.stringify(claims)));
  return `${payload}.${base64url(await hmac(payload, required(env, "RIGHTTEMP_MCP_TOKEN")))}`;
}

async function verify<T>(token: string | undefined, env: Env): Promise<T | null> {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = await hmac(payload, required(env, "RIGHTTEMP_MCP_TOKEN"));
  let supplied: Uint8Array;
  try { supplied = decode64(signature); } catch { return null; }
  if (supplied.length !== expected.length) return null;
  let different = 0;
  for (let index = 0; index < supplied.length; index++) different |= supplied[index]! ^ expected[index]!;
  if (different !== 0) return null;
  try { return JSON.parse(decoder.decode(decode64(payload))) as T; } catch { return null; }
}

async function digest(value: string) {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

async function passwordMatches(candidate: string, env: Env) {
  const expected = required(env, "RIGHTTEMP_MCP_PASSWORD");
  if (expected.length < 16) return false;
  const [a, b] = await Promise.all([digest(candidate), digest(expected)]);
  return a === b;
}

function allowedChatGptUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["chatgpt.com", "openai.com"].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch { return false; }
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export function baseUrl(request: Request, env: Env) {
  return env.RIGHTTEMP_MCP_BASE_URL?.replace(/\/$/, "") || new URL(request.url).origin;
}

export async function verifyAccessToken(request: Request, env: Env) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const claims = await verify<AccessClaims>(token, env);
  return claims?.type === "access" && claims.aud === `${baseUrl(request, env)}/mcp` && claims.scope === "righttemp" && claims.exp > Date.now() / 1000;
}

function json(value: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json", ...headers } });
}

export async function handleOAuth(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  const base = baseUrl(request, env);

  if (request.method === "GET" && url.pathname === "/.well-known/oauth-protected-resource") {
    return json({ resource: `${base}/mcp`, authorization_servers: [base], scopes_supported: ["righttemp"] });
  }
  if (request.method === "GET" && url.pathname === "/.well-known/oauth-authorization-server") {
    return json({
      issuer: base,
      authorization_endpoint: `${base}/oauth/authorize`,
      token_endpoint: `${base}/oauth/token`,
      client_id_metadata_document_supported: true,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: ["righttemp"],
    });
  }
  if (request.method === "GET" && url.pathname === "/oauth/authorize") {
    const names = ["client_id", "redirect_uri", "state", "code_challenge", "code_challenge_method", "resource", "scope"];
    const values = names.map((name) => `<input type="hidden" name="${name}" value="${escapeHtml(url.searchParams.get(name) ?? "")}">`).join("");
    return new Response(`<!doctype html><html><meta name="viewport" content="width=device-width"><title>RightTemp Sign In</title><style>body{font-family:system-ui;background:#0b1118;color:#fff;display:grid;place-items:center;min-height:90vh}form{width:min(88vw,380px);padding:28px;background:#151d27;border-radius:18px}input,button{box-sizing:border-box;width:100%;padding:14px;margin-top:14px;border-radius:10px;border:1px solid #344150;font-size:16px}button{background:#1683ff;color:#fff;font-weight:700}</style><form method="post"><h1>RightTemp OS</h1><p>Authorize ChatGPT to access your private business workspace.</p>${values}<input name="password" type="password" autocomplete="current-password" placeholder="Owner password" required><button>Connect ChatGPT</button></form></html>`, { headers: { "content-type": "text/html;charset=UTF-8" } });
  }
  if (request.method === "POST" && url.pathname === "/oauth/authorize") {
    const form = await request.formData();
    const get = (name: string) => String(form.get(name) ?? "");
    const clientId = get("client_id"); const redirectUri = get("redirect_uri");
    const challenge = get("code_challenge"); const method = get("code_challenge_method");
    if (!(await passwordMatches(get("password"), env)) || !allowedChatGptUrl(clientId) || !allowedChatGptUrl(redirectUri) || method !== "S256" || !challenge) {
      return new Response("Authorization failed.", { status: 400 });
    }
    const code = await sign({ type: "code", clientId, redirectUri, challenge, resource: get("resource") || `${base}/mcp`, exp: Math.floor(Date.now() / 1000) + 300 }, env);
    const callback = new URL(redirectUri); callback.searchParams.set("code", code);
    if (get("state")) callback.searchParams.set("state", get("state"));
    return Response.redirect(callback.toString(), 302);
  }
  if (request.method === "POST" && url.pathname === "/oauth/token") {
    const form = await request.formData(); const get = (name: string) => String(form.get(name) ?? "");
    const claims = await verify<CodeClaims>(get("code"), env);
    const challenge = get("code_verifier") ? await digest(get("code_verifier")) : "";
    if (get("grant_type") !== "authorization_code" || claims?.type !== "code" || claims.exp < Date.now() / 1000 || claims.clientId !== get("client_id") || claims.redirectUri !== get("redirect_uri") || claims.challenge !== challenge) {
      return json({ error: "invalid_grant" }, 400);
    }
    const accessToken = await sign({ type: "access", aud: claims.resource, scope: "righttemp", exp: Math.floor(Date.now() / 1000) + 3600 }, env);
    return json({ access_token: accessToken, token_type: "Bearer", expires_in: 3600, scope: "righttemp" });
  }
  return null;
}
