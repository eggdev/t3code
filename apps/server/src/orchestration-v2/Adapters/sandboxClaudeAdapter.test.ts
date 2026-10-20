import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import type { ClaudeSettings } from "@t3tools/contracts";
import { ProviderDriverKind, ProviderInstanceId, ProviderSessionId } from "@t3tools/contracts";
import type { ProviderAdapterDriverCreateInput } from "@t3tools/provider-core/server/adapterDriver";
import * as ProviderAdapter from "@t3tools/provider-core/server/ProviderAdapter";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import type * as Scope from "effect/Scope";

import * as ServerConfig from "../../config.ts";
import { withSandboxClaudeHomes } from "./sandboxClaudeAdapter.ts";

type OpenInput = ProviderAdapter.ProviderAdapterV2OpenSessionInput;

const input = {
  instanceId: ProviderInstanceId.make("claudeAgent"),
  displayName: undefined,
  environment: [],
  enabled: true,
  config: { homePath: "" } as ClaudeSettings,
} satisfies ProviderAdapterDriverCreateInput<ClaudeSettings>;

const openInput = (cwd: string | null) =>
  ({
    providerSessionId: ProviderSessionId.make("session-1"),
    runtimePolicy: { cwd },
  }) as unknown as OpenInput;

/** A fake Claude adapter that answers each session with the home it was made for. */
const withHomes = (
  fields: Partial<ServerConfig.ServerConfig["Service"]>,
  body: (
    adapter: ProviderAdapter.ProviderAdapterV2["Service"],
    homes: Array<string>,
  ) => Effect.Effect<void, ProviderAdapter.ProviderAdapterV2Error, Scope.Scope>,
) =>
  Effect.gen(function* () {
    const homes: Array<string> = [];
    const create = (created: ProviderAdapterDriverCreateInput<ClaudeSettings>) =>
      Effect.sync(() => {
        homes.push(created.config.homePath);
        return ProviderAdapter.ProviderAdapterV2.of({
          instanceId: created.instanceId,
          driver: ProviderDriverKind.make("claudeAgent"),
          getCapabilities: () => Effect.die("unused"),
          planSelectionTransition: () => Effect.die("unused"),
          openSession: () => Effect.succeed({ home: created.config.homePath } as never),
        });
      });
    const base = yield* ServerConfig.ServerConfig;
    const adapter = yield* withSandboxClaudeHomes(input, create).pipe(
      Effect.provideService(ServerConfig.ServerConfig, { ...base, ...fields }),
    );
    return yield* body(adapter, homes);
  }).pipe(
    Effect.scoped,
    Effect.provide(
      ServerConfig.layerTest(process.cwd(), { prefix: "clyde-sandbox-claude-" }).pipe(
        Layer.provideMerge(NodeServices.layer),
      ),
    ),
  );

describe("withSandboxClaudeHomes", () => {
  it.effect("is the plain adapter when sandbox mode is off", () =>
    withHomes({}, (adapter, homes) =>
      Effect.gen(function* () {
        const session = yield* adapter.openSession(openInput("/Users/clyde/dev/app"));
        expect(session).toEqual({ home: "" });
        expect(homes).toEqual([""]);
      }),
    ),
  );

  it.effect("opens each session on the adapter for its project's home", () =>
    withHomes({ sandboxSshTarget: "clydeedgar@agent-dgx" }, (adapter, homes) =>
      Effect.gen(function* () {
        const first = yield* adapter.openSession(openInput("/opt/clyde/worktrees/proj/a"));
        const second = yield* adapter.openSession(openInput("/opt/clyde/worktrees/proj/b"));
        const other = yield* adapter.openSession(openInput("/opt/clyde/worktrees/other"));
        expect(first).toEqual({ home: "/opt/clyde/worktrees/proj/.clyde/claude-home" });
        expect(second).toEqual(first);
        expect(other).toEqual({ home: "/opt/clyde/worktrees/other/.clyde/claude-home" });
        // The base adapter, then one adapter for each project.
        expect(homes).toEqual([
          "",
          "/opt/clyde/worktrees/proj/.clyde/claude-home",
          "/opt/clyde/worktrees/other/.clyde/claude-home",
        ]);
      }),
    ),
  );

  it.effect("fails a session outside the worktree root", () =>
    withHomes({ sandboxSshTarget: "clydeedgar@agent-dgx" }, (adapter) =>
      Effect.gen(function* () {
        const exit = yield* Effect.exit(adapter.openSession(openInput("/tmp/proj")));
        expect(Exit.isFailure(exit)).toBe(true);
        expect(String(Exit.isFailure(exit) ? exit.cause : "")).toContain(
          "ProviderAdapterOpenSessionError",
        );
      }),
    ),
  );
});
