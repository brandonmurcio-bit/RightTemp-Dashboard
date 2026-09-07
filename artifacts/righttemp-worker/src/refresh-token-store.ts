type RefreshFamilyState = {
  currentJti: string;
  clientId: string;
  redirectUri: string;
  resource: string;
  scope: "righttemp";
  expiresAt: number;
  revoked: boolean;
};

type InitializeRequest = {
  action: "initialize";
  state: RefreshFamilyState;
};

type RotateRequest = {
  action: "rotate";
  presentedJti: string;
  nextJti: string;
  now: number;
};

type StoreRequest = InitializeRequest | RotateRequest;

export class RefreshTokenStore {
  constructor(private readonly state: DurableObjectState) {}

  async fetch(request: Request) {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

    let body: StoreRequest;
    try {
      body = await request.json<StoreRequest>();
    } catch {
      return new Response("Invalid request", { status: 400 });
    }

    if (body.action === "initialize") {
      const existing = await this.state.storage.get<RefreshFamilyState>("family");
      if (existing) return Response.json({ ok: false }, { status: 409 });

      await this.state.storage.put("family", body.state);
      return Response.json({ ok: true });
    }

    if (body.action === "rotate") {
      const family = await this.state.storage.get<RefreshFamilyState>("family");
      if (
        !family ||
        family.revoked ||
        family.expiresAt <= body.now ||
        family.currentJti !== body.presentedJti
      ) {
        if (family && !family.revoked) {
          await this.state.storage.put("family", { ...family, revoked: true });
        }
        return Response.json({ ok: false }, { status: 409 });
      }

      await this.state.storage.put("family", { ...family, currentJti: body.nextJti });
      return Response.json({ ok: true });
    }

    return new Response("Invalid request", { status: 400 });
  }
}