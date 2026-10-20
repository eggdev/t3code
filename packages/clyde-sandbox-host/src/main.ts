// @effect-diagnostics nodeBuiltinImport:off -- a plain Node service in a container, outside the Effect runtime.
import * as NodeFSP from "node:fs/promises";

import { CodexSubscription } from "./codexSubscription.ts";
import { egressProxy } from "./egressProxy.ts";
import { modelGateway } from "./modelGateway.ts";

// oxlint-disable-next-line t3code/no-global-process-runtime -- the container entry point reads its own argv and env once.
const { argv, env } = process;
const role = argv[2];

if (role === "egress") {
  egressProxy().listen(8083, "0.0.0.0");
} else if (role === "gateway") {
  const codexHome = env.CODEX_HOME ?? "/auth/codex";
  const claudeTokenFile = env.CLAUDE_TOKEN_FILE ?? "/auth/claude/oauth-token";
  const codex = new CodexSubscription(codexHome, env.PATH ?? "/usr/local/bin:/usr/bin:/bin");
  const server = modelGateway({
    codexHeaders: (force) => codex.headers(force),
    claudeToken: async () => {
      try {
        const token = (await NodeFSP.readFile(claudeTokenFile, "utf8")).trim();
        return token.length > 0 ? token : undefined;
      } catch {
        return undefined;
      }
    },
  });
  server.on("close", () => codex.close());
  server.listen(8080, "0.0.0.0");
} else {
  throw new Error("Usage: main.ts egress | gateway");
}
