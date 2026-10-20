/**
 * Clyde: the Claude adapter in sandbox mode (decisions 0009 and 0010). Each
 * project gets its own Claude home on the shared worktree mount, so the CLI in
 * the sandbox and the server read the same session files. This adapter opens
 * each session on an inner Claude adapter whose home is the session's project
 * home, through the upstream `homePath` setting. With sandbox mode off it is
 * the plain Claude adapter.
 */
import type { ClaudeSettings } from "@t3tools/contracts";
import type { ProviderAdapterDriverCreateInput } from "@t3tools/provider-core/server/adapterDriver";
import * as ProviderAdapter from "@t3tools/provider-core/server/ProviderAdapter";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import * as Semaphore from "effect/Semaphore";

import * as ServerConfig from "../../config.ts";
import { sandboxClaudeHome } from "../../process/sandboxClaude.ts";
import { type SandboxRefusedError, sandboxSshOf } from "../../process/sandboxCommand.ts";

type ClaudeAdapter = ProviderAdapter.ProviderAdapterV2["Service"];

export const withSandboxClaudeHomes = Effect.fn("withSandboxClaudeHomes")(function* <E, R>(
  input: ProviderAdapterDriverCreateInput<ClaudeSettings>,
  create: (
    input: ProviderAdapterDriverCreateInput<ClaudeSettings>,
  ) => Effect.Effect<ClaudeAdapter, E, R>,
) {
  const base = yield* create(input);
  if (sandboxSshOf(yield* ServerConfig.ServerConfig) === undefined) return base;

  const context = yield* Effect.context<R>();
  const byHome = new Map<string, ClaudeAdapter>();
  const lock = yield* Semaphore.make(1);
  // One inner adapter per home, so per-adapter state stays with its sessions.
  const adapterFor = (homePath: string) =>
    lock.withPermits(1)(
      Effect.suspend(() => {
        const existing = byHome.get(homePath);
        if (existing !== undefined) return Effect.succeed(existing);
        return create({ ...input, config: { ...input.config, homePath } }).pipe(
          Effect.tap((adapter) => Effect.sync(() => byHome.set(homePath, adapter))),
          Effect.provideContext(context),
        );
      }),
    );

  return ProviderAdapter.ProviderAdapterV2.of({
    ...base,
    openSession: (session) => {
      const home = sandboxClaudeHome(session.runtimePolicy.cwd);
      const adapter: Effect.Effect<ClaudeAdapter, E | SandboxRefusedError> = Result.isFailure(home)
        ? Effect.fail(home.failure)
        : adapterFor(home.success);
      return adapter.pipe(
        Effect.mapError(
          (cause) =>
            new ProviderAdapter.ProviderAdapterOpenSessionError({
              driver: base.driver,
              providerSessionId: session.providerSessionId,
              cause,
            }),
        ),
        Effect.flatMap((inner) => inner.openSession(session)),
      );
    },
  });
});
