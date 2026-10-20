import * as ClaudeSdk from "@anthropic-ai/claude-agent-sdk";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, describe, it } from "@effect/vitest";
import { ProviderSessionId, ThreadId } from "@t3tools/contracts";
import { ProviderEventLoggers } from "@t3tools/provider-core/server/ProviderEventLoggers";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { vi } from "vite-plus/test";

import * as ServerConfig from "../../config.ts";
import { ClaudeAgentSdkQueryRunner, layerQueryRunner } from "./ClaudeAdapterV2.ts";

vi.mock("@anthropic-ai/claude-agent-sdk", { spy: true });

/** Opens a query with the SDK's query() stubbed, and returns the options it got. */
const openWith = (fields: Partial<ServerConfig.ServerConfig["Service"]>) =>
  Effect.gen(function* () {
    const query = vi.spyOn(ClaudeSdk, "query").mockReturnValue({} as unknown as ClaudeSdk.Query);
    yield* Effect.addFinalizer(() => Effect.sync(() => query.mockRestore()));
    const config = yield* ServerConfig.ServerConfig;
    yield* Effect.gen(function* () {
      const runner = yield* ClaudeAgentSdkQueryRunner;
      yield* runner.open({
        threadId: ThreadId.make("thread-sandbox"),
        providerSessionId: ProviderSessionId.make("session-sandbox"),
        options: {
          sessionId: "native-session-sandbox",
          model: "claude-sonnet-4-6",
          tools: [],
          permissionMode: "default",
          cwd: "/opt/clyde/worktrees/proj/branch",
        },
      });
    }).pipe(
      Effect.provide(
        layerQueryRunner.pipe(
          Layer.provide(
            Layer.succeed(ProviderEventLoggers, { native: undefined, canonical: undefined }),
          ),
          Layer.provide(Layer.succeed(ServerConfig.ServerConfig, { ...config, ...fields })),
        ),
      ),
    );
    const options = query.mock.calls[0]?.[0].options;
    assert(options !== undefined);
    return options;
  }).pipe(
    Effect.provide(
      ServerConfig.layerTest(process.cwd(), { prefix: "clyde-sandbox-runner-" }).pipe(
        Layer.provideMerge(NodeServices.layer),
      ),
    ),
  );

describe("Claude query runner in sandbox mode", () => {
  it.effect("spawns the CLI on the server when sandbox mode is off", () =>
    Effect.gen(function* () {
      const options = yield* openWith({});
      assert.isUndefined(options.pathToClaudeCodeExecutable);
      assert.isUndefined(options.executableArgs);
    }),
  );

  it.effect("spawns the bare CLI through the sandbox hook when sandbox mode is on", () =>
    Effect.gen(function* () {
      const options = yield* openWith({ sandboxSshTarget: "clydeedgar@agent-dgx" });
      assert.equal(options.pathToClaudeCodeExecutable, "claude");
      assert.deepEqual(options.executableArgs, []);
      const spawn = options.spawnClaudeCodeProcess;
      assert(spawn !== undefined);
      // The hook refuses a folder outside the worktree root before it starts ssh.
      assert.throws(
        () =>
          spawn({
            command: "claude",
            args: [],
            cwd: "/Users/clyde/dev",
            env: {},
            signal: new AbortController().signal,
          }),
        /\/opt\/clyde\/worktrees/,
      );
    }),
  );
});
