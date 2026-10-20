// @effect-diagnostics nodeBuiltinImport:off globalFetch:off -- tests a plain Node service over a real local socket.
import * as NodeHttp from "node:http";
import type * as NodeNet from "node:net";

import { afterEach, describe, expect, it } from "vite-plus/test";

import { claudeBeta, modelGateway, routeFor, type GatewayCredentials } from "./modelGateway.ts";

interface Sent {
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body: string;
}

const servers: NodeHttp.Server[] = [];
afterEach(() => {
  for (const server of servers.splice(0)) server.close();
});

async function start(
  credentials: Partial<GatewayCredentials>,
  reply: (sent: Sent, attempt: number) => Response,
) {
  const sent: Sent[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    const entry = {
      url,
      headers: { ...(init.headers as Record<string, string>) },
      body: Buffer.from(init.body as Uint8Array).toString(),
    };
    sent.push(entry);
    return reply(entry, sent.length);
  }) as typeof fetch;
  const server = modelGateway(
    {
      codexHeaders: async (force) => ({
        Authorization: force ? "Bearer fresh" : "Bearer codex",
        "ChatGPT-Account-ID": "account",
      }),
      claudeToken: async () => "claude-oauth-token",
      ...credentials,
    },
    fetcher,
  );
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as NodeNet.AddressInfo;
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    fetch(`http://127.0.0.1:${port}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  return { sent, post, port };
}

describe("routeFor", () => {
  it("maps the Codex and Claude routes, and nothing else", () => {
    expect(routeFor("/openai/v1/responses")?.upstream).toBe(
      "https://chatgpt.com/backend-api/codex/responses",
    );
    expect(routeFor("/anthropic/v1/messages")?.upstream).toBe(
      "https://api.anthropic.com/v1/messages",
    );
    expect(routeFor("/openai/v1/files")).toBeUndefined();
    expect(routeFor("/anthropic/v1/../../admin")).toBeUndefined();
  });
});

describe("claudeBeta", () => {
  it("adds the OAuth flag and keeps the client's flags once each", () => {
    expect(claudeBeta(undefined)).toBe("oauth-2025-04-20");
    expect(claudeBeta("a, b,oauth-2025-04-20")).toBe("a,b,oauth-2025-04-20");
  });
});

describe("modelGateway", () => {
  it("refuses an unknown route and a non-POST request", async () => {
    const { post, port, sent } = await start({}, () => new Response("{}"));
    expect((await post("/openai/v1/files", {})).status).toBe(403);
    expect((await fetch(`http://127.0.0.1:${port}/openai/v1/responses`)).status).toBe(403);
    expect(sent).toEqual([]);
  });

  it("adds the Codex login and turns off storage", async () => {
    const { post, sent } = await start({}, () => new Response('{"ok":true}'));
    const response = await post(
      "/openai/v1/responses",
      { model: "m", store: true },
      { authorization: "Bearer from-sandbox" },
    );
    expect(response.status).toBe(200);
    expect(sent[0]?.headers.Authorization).toBe("Bearer codex");
    expect(sent[0]?.headers["ChatGPT-Account-ID"]).toBe("account");
    expect(JSON.parse(sent[0]?.body ?? "{}")).toEqual({ model: "m", store: false });
  });

  it("refreshes the Codex login once on a 401", async () => {
    const { post, sent } = await start({}, (_sent, attempt) =>
      attempt === 1 ? new Response("", { status: 401 }) : new Response("{}"),
    );
    expect((await post("/openai/v1/responses", {})).status).toBe(200);
    expect(sent.map((entry) => entry.headers.Authorization)).toEqual([
      "Bearer codex",
      "Bearer fresh",
    ]);
  });

  it("replaces the sandbox's Claude auth with the subscription token", async () => {
    const { post, sent } = await start({}, () => new Response("{}"));
    await post(
      "/anthropic/v1/messages",
      { model: "m" },
      { authorization: "Bearer placeholder", "x-api-key": "k", "anthropic-beta": "tools" },
    );
    expect(sent[0]?.headers.Authorization).toBe("Bearer claude-oauth-token");
    expect(sent[0]?.headers["x-api-key"]).toBeUndefined();
    expect(sent[0]?.headers["anthropic-beta"]).toBe("tools,oauth-2025-04-20");
  });

  it("answers 503 when the host has no Claude login", async () => {
    const { post, sent } = await start(
      { claudeToken: async () => undefined },
      () => new Response("{}"),
    );
    expect((await post("/anthropic/v1/messages", {})).status).toBe(503);
    expect(sent).toEqual([]);
  });

  it("never returns an upstream error body", async () => {
    const { post } = await start({}, () => new Response("secret fragment", { status: 400 }));
    const response = await post("/anthropic/v1/messages", {});
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain("secret");
  });
});
