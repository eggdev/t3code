// @effect-diagnostics nodeBuiltinImport:off -- a plain Node service in a container, outside the Effect runtime.
import * as NodeHttp from "node:http";
import * as NodeStream from "node:stream";
import * as NodeStreamPromises from "node:stream/promises";

/** The credentials the gateway adds. A sandbox never sees them. */
export interface GatewayCredentials {
  readonly codexHeaders: (force: boolean) => Promise<Record<string, string>>;
  /** The Claude subscription token from `claude setup-token`, or undefined. */
  readonly claudeToken: () => Promise<string | undefined>;
}

const CLAUDE_OAUTH_BETA = "oauth-2025-04-20";

type Route =
  | { readonly provider: "codex"; readonly upstream: string }
  | { readonly provider: "claude"; readonly upstream: string };

/** Only these paths go anywhere. Every other request gets 403. */
export function routeFor(pathname: string): Route | undefined {
  switch (pathname) {
    case "/openai/v1/responses":
    case "/openai/v1/responses/compact":
      return {
        provider: "codex",
        upstream: `https://chatgpt.com/backend-api/codex${pathname.slice("/openai/v1".length)}`,
      };
    case "/anthropic/v1/messages":
    case "/anthropic/v1/messages/count_tokens":
      return {
        provider: "claude",
        upstream: `https://api.anthropic.com${pathname.slice("/anthropic".length)}`,
      };
    default:
      return undefined;
  }
}

/** The Claude beta header with the OAuth flag, keeping the client's own flags. */
export function claudeBeta(requested: string | undefined): string {
  const flags = new Set(
    (requested ?? "")
      .split(",")
      .map((flag) => flag.trim())
      .filter((flag) => flag.length > 0),
  );
  flags.add(CLAUDE_OAUTH_BETA);
  return [...flags].join(",");
}

async function readBody(request: NodeHttp.IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

/**
 * The model gateway on a sandbox host. Sandboxes call it on the internal
 * network; it adds the owner's subscription credentials and forwards a fixed
 * set of routes. It never returns an upstream error body, because those can
 * carry credential fragments.
 */
export function modelGateway(
  credentials: GatewayCredentials,
  fetcher: typeof fetch = fetch,
): NodeHttp.Server {
  return NodeHttp.createServer(async (request, response) => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    response.once("close", abort);
    try {
      const url = new URL(request.url ?? "/", "http://gateway");
      const route = routeFor(url.pathname);
      if (request.method !== "POST" || route === undefined) {
        response.writeHead(403);
        response.end();
        return;
      }
      let body = await readBody(request);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (route.provider === "codex") {
        Object.assign(headers, await credentials.codexHeaders(false), {
          originator: "codex_cli_rs",
        });
        const payload = JSON.parse(body.toString()) as Record<string, unknown>;
        body = Buffer.from(JSON.stringify({ ...payload, store: false }));
      } else {
        const token = await credentials.claudeToken();
        if (token === undefined) {
          response.writeHead(503);
          response.end('{"error":"No Claude subscription login on this host"}');
          return;
        }
        headers.Authorization = `Bearer ${token}`;
        headers["anthropic-version"] =
          (request.headers["anthropic-version"] as string | undefined) ?? "2023-06-01";
        headers["anthropic-beta"] = claudeBeta(
          request.headers["anthropic-beta"] as string | undefined,
        );
      }
      const destination = route.upstream + url.search;
      // A generation can run for hours. Its life follows the caller, not a timer.
      const send = () =>
        fetcher(destination, {
          method: "POST",
          headers,
          body: new Uint8Array(body),
          redirect: "error",
          signal: controller.signal,
        });
      let upstream = await send();
      if (upstream.status === 401 && route.provider === "codex") {
        await upstream.body?.cancel();
        Object.assign(headers, await credentials.codexHeaders(true));
        upstream = await send();
      }
      if (!upstream.ok || upstream.body === null) {
        response.writeHead(upstream.status);
        response.end('{"error":"The model upstream rejected the request"}');
        return;
      }
      response.writeHead(upstream.status, {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      });
      await NodeStreamPromises.pipeline(
        NodeStream.Readable.fromWeb(upstream.body as never),
        response,
      );
    } catch {
      if (!response.headersSent) response.writeHead(502);
      response.end();
    } finally {
      response.removeListener("close", abort);
      controller.abort();
    }
  });
}
