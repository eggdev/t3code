// @effect-diagnostics nodeBuiltinImport:off -- a plain Node service in a container, outside the Effect runtime.
import * as NodeHttp from "node:http";
import * as NodeNet from "node:net";

import { publicAddress, type Resolve } from "./publicAddress.ts";

type PinAddress = (host: string) => Promise<string>;

/**
 * The sandboxes' only route to the internet: an HTTP proxy that reaches
 * public addresses only. It adds no credential and pins DNS per connection,
 * so a name cannot resolve to a private address after the check.
 */
export function egressProxy(options: { readonly resolve?: Resolve } = {}) {
  const pin: PinAddress = (host) => publicAddress(host, options.resolve);
  const server = NodeHttp.createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "");
      if (url.protocol !== "http:" || url.username || url.password) {
        throw new Error("Invalid proxy URL");
      }
      const address = await pin(url.hostname);
      const headers: NodeHttp.OutgoingHttpHeaders = { ...request.headers, host: url.host };
      delete headers["proxy-authorization"];
      delete headers["proxy-connection"];
      const upstream = NodeHttp.request(
        {
          host: address,
          port: url.port || 80,
          path: url.pathname + url.search,
          method: request.method,
          headers,
        },
        (reply) => {
          response.writeHead(reply.statusCode ?? 502, reply.headers);
          reply.pipe(response);
        },
      );
      upstream.on("error", () => {
        if (!response.headersSent) response.writeHead(502);
        response.end();
      });
      response.on("close", () => upstream.destroy());
      request.pipe(upstream);
    } catch {
      response.writeHead(403);
      response.end("Public destinations only");
    }
  });
  server.on("connect", async (request, socket: NodeNet.Socket, head: Buffer) => {
    try {
      const url = new URL(`http://${request.url ?? ""}`);
      if (url.username || url.password || url.pathname !== "/") {
        throw new Error("Invalid authority");
      }
      const address = await pin(url.hostname);
      if (socket.destroyed) return;
      const upstream = NodeNet.connect({ host: address, port: Number(url.port || 443) }, () => {
        socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        if (head.length > 0) upstream.write(head);
        socket.pipe(upstream);
        upstream.pipe(socket);
      });
      upstream.on("error", () => socket.destroy());
      socket.on("error", () => upstream.destroy());
      socket.on("close", () => upstream.destroy());
    } catch {
      socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
    }
  });
  return server;
}
