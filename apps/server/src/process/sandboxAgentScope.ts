/**
 * Clyde: the agent scope that runs agent CLIs in a sandbox (decisions 0009 and
 * 0010). It wraps the live agent scope. With no sandbox target it is the live
 * scope. In sandbox mode a Codex launch becomes an ssh command to the sandbox
 * host, which the live scope then wraps like any other command. Terminals pass
 * through unchanged. Every other agent fails, so no agent runs on the server.
 */
import { AgentScope, type AgentScopeShape } from "@t3tools/shared/AgentScope";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import * as ServerConfig from "../config.ts";
import * as AgentScopeLive from "./agentScope.ts";
import {
  SANDBOXED_DRIVER,
  SandboxRefusedError,
  sandboxCommand,
  sandboxSshOf,
} from "./sandboxCommand.ts";

/** Terminals run on the server until they move into the sandbox (decision 0010). */
const PASS_THROUGH_NAMES: ReadonlySet<string> = new Set(["terminal"]);

export const make = Effect.gen(function* () {
  const live = yield* AgentScope;
  const sandbox = sandboxSshOf(yield* ServerConfig.ServerConfig);
  if (sandbox === undefined) return live;

  const wrap: AgentScopeShape["wrap"] = Effect.fn("SandboxAgentScope.wrap")(function* (input) {
    if (PASS_THROUGH_NAMES.has(input.name)) return yield* live.wrap(input);
    // The session manager refuses these sessions first. This catches any
    // other launch, so nothing runs an agent on the server by mistake.
    if (input.name !== SANDBOXED_DRIVER) {
      return yield* Effect.die(
        new SandboxRefusedError({ reason: `${input.name} in a sandbox is not supported yet` }),
      );
    }
    const command = sandboxCommand({
      sandbox,
      cwd: input.cwd,
      command: input.command,
      args: input.args,
    });
    if (Result.isFailure(command)) return yield* Effect.die(command.failure);
    return yield* live.wrap({ ...input, ...command.success });
  });

  return { ...live, wrap } satisfies AgentScopeShape;
});

export const layer = Layer.effect(AgentScope, make).pipe(Layer.provide(AgentScopeLive.layer));
