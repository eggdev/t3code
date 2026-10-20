import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, describe, expect, it } from "@effect/vitest";
import { AgentScope, type AgentScopeShape } from "@t3tools/shared/AgentScope";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import { ChildProcess } from "effect/process";

import * as ServerConfig from "../config.ts";
import { makeCodexAppServerSpawnCommand } from "../orchestration-v2/Adapters/CodexAdapterV2.ts";
import { make } from "./sandboxAgentScope.ts";

type WrapInput = Parameters<AgentScopeShape["wrap"]>[0];

/** Stands in for the live scope: it marks each command it wraps. */
const withSandboxScope = <A, E>(
  fields: Partial<ServerConfig.ServerConfig["Service"]>,
  body: (scope: AgentScopeShape, wrapped: Array<WrapInput>) => Effect.Effect<A, E>,
) =>
  Effect.gen(function* () {
    const wrapped: Array<WrapInput> = [];
    const live: AgentScopeShape = {
      ...AgentScope.defaultValue(),
      wrap: (input) =>
        Effect.sync(() => {
          wrapped.push(input);
          return { command: "/bin/sh", args: ["live", input.command, ...input.args] };
        }),
    };
    const base = yield* ServerConfig.ServerConfig;
    const scope = yield* make.pipe(
      Effect.provideService(AgentScope, live),
      Effect.provideService(ServerConfig.ServerConfig, { ...base, ...fields }),
    );
    return yield* body(scope, wrapped);
  }).pipe(
    Effect.provide(
      ServerConfig.layerTest(process.cwd(), { prefix: "clyde-sandbox-scope-" }).pipe(
        Layer.provideMerge(NodeServices.layer),
      ),
    ),
  );

const sandboxFields = {
  sandboxSshTarget: "clydeedgar@agent-dgx",
  sandboxSshKeyPath: "/k",
};

const codex = {
  command: "codex",
  args: ["app-server"],
  name: "codex",
  threadId: "t",
  cwd: "/opt/clyde/worktrees/proj/wt",
} as const;

describe("SandboxAgentScope", () => {
  it.effect("leaves every launch to the live scope when sandbox mode is off", () =>
    withSandboxScope({}, (scope, wrapped) =>
      Effect.gen(function* () {
        const launch = yield* scope.wrap(codex);
        expect(launch).toEqual({ command: "/bin/sh", args: ["live", "codex", "app-server"] });
        const claude = yield* scope.wrap({ command: "claude", args: [], name: "claude" });
        expect(claude.args).toEqual(["live", "claude"]);
        expect(wrapped).toHaveLength(2);
      }),
    ),
  );

  it.effect("sends a Codex launch over ssh, then through the live scope", () =>
    withSandboxScope(sandboxFields, (scope, wrapped) =>
      Effect.gen(function* () {
        const launch = yield* scope.wrap(codex);
        expect(launch.args.slice(0, 2)).toEqual(["live", "ssh"]);
        expect(wrapped).toHaveLength(1);
        const [input] = wrapped;
        assert(input !== undefined);
        expect(input.threadId).toBe("t");
        expect(input.name).toBe("codex");
        expect(input.args).toContain("clydeedgar@agent-dgx");
        const payload = JSON.parse(
          Buffer.from((input.args.at(-1) ?? "").slice("run ".length), "base64").toString(),
        );
        expect(payload).toEqual({
          dir: "/opt/clyde/worktrees/proj",
          command: "codex",
          args: ["app-server"],
        });
      }),
    ),
  );

  it.effect("passes a terminal through unchanged", () =>
    withSandboxScope(sandboxFields, (scope, wrapped) =>
      Effect.gen(function* () {
        const terminal = {
          command: "/bin/zsh",
          args: ["-l"],
          name: "terminal",
          survivesRestart: true,
        };
        const launch = yield* scope.wrap(terminal);
        expect(launch).toEqual({ command: "/bin/sh", args: ["live", "/bin/zsh", "-l"] });
        expect(wrapped).toEqual([terminal]);
      }),
    ),
  );

  it.effect("fails loudly for Codex outside the worktree root and for other agents", () =>
    withSandboxScope(sandboxFields, (scope, wrapped) =>
      Effect.gen(function* () {
        const outside = yield* Effect.exit(scope.wrap({ ...codex, cwd: "/tmp/proj" }));
        expect(Exit.isFailure(outside) && Exit.hasDies(outside)).toBe(true);
        const claude = yield* Effect.exit(
          scope.wrap({ command: "claude", args: [], name: "claude" }),
        );
        expect(Exit.isFailure(claude) && Exit.hasDies(claude)).toBe(true);
        expect(String(Exit.isFailure(claude) ? claude.cause : "")).toContain(
          "claude in a sandbox is not supported yet",
        );
        expect(wrapped).toHaveLength(0);
      }),
    ),
  );

  it.effect("runs the Codex app-server through ssh for the session's folder", () =>
    withSandboxScope(sandboxFields, (scope) =>
      Effect.gen(function* () {
        const command = yield* makeCodexAppServerSpawnCommand({
          command: "codex",
          args: ["app-server"],
          threadId: "t",
          agentCwd: "/opt/clyde/worktrees/proj/wt",
        }).pipe(
          Effect.provideService(AgentScope, scope),
          Effect.provideService(HostProcess.Platform, "linux"),
        );
        assert(ChildProcess.isStandardCommand(command));
        expect(command.args.slice(0, 2)).toEqual(["live", "ssh"]);
      }),
    ),
  );
});
