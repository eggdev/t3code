/**
 * Clyde: every agent runs in a sandbox (decision 0009). The server drives the
 * agent and only the agent CLI runs in a container on the sandbox host
 * (decision 0010). The host's SSH key forces `clyde-sandbox-exec`, which reads
 * `run <base64 JSON>` and mounts only the project's folder under the worktree
 * root. See `clyde/sandbox/clyde-sandbox-exec`.
 */
import type { AgentScopeCommand } from "@t3tools/shared/AgentScope";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";

import type { ServerConfig } from "../config.ts";

/** The same NFS folder on the server and on the sandbox host. */
const SANDBOX_WORKTREE_ROOT = "/opt/clyde/worktrees";

/** The only agent CLI that runs in a sandbox today. */
export const SANDBOXED_DRIVER = "codex";

const SEGMENT = /^[A-Za-z0-9._-]+$/;

export class SandboxRefusedError extends Schema.TaggedError<SandboxRefusedError>()(
  "SandboxRefusedError",
  { reason: Schema.String },
) {
  override get message(): string {
    return this.reason;
  }
}

interface SandboxSsh {
  readonly target: string;
  readonly keyPath?: string | undefined;
}

/** Sandbox mode is on when the server has an SSH target for the sandbox host. */
export function sandboxSshOf(
  config: Pick<ServerConfig["Service"], "sandboxSshTarget" | "sandboxSshKeyPath"> | undefined,
): SandboxSsh | undefined {
  const target = config?.sandboxSshTarget?.trim();
  if (target === undefined || target.length === 0) return undefined;
  return { target, keyPath: config?.sandboxSshKeyPath };
}

/**
 * The project's top folder: the first segment under the worktree root.
 * `/opt/clyde/worktrees/proj/sub` gives `/opt/clyde/worktrees/proj`.
 */
export function sandboxProjectDir(
  cwd: string | null | undefined,
): Result.Result<string, SandboxRefusedError> {
  const refuse = (why: string) =>
    Result.fail(
      new SandboxRefusedError({
        reason: `An agent in a sandbox needs a folder under ${SANDBOX_WORKTREE_ROOT}: ${why}`,
      }),
    );
  if (cwd === null || cwd === undefined || cwd.length === 0) {
    return refuse("this thread has no folder");
  }
  if (!cwd.startsWith(`${SANDBOX_WORKTREE_ROOT}/`)) return refuse(cwd);
  const segments = cwd
    .slice(SANDBOX_WORKTREE_ROOT.length + 1)
    .split("/")
    .filter((segment) => segment.length > 0);
  const project = segments[0];
  if (
    project === undefined ||
    segments.some((segment) => segment === "." || segment === ".." || !SEGMENT.test(segment))
  ) {
    return refuse(cwd);
  }
  return Result.succeed(`${SANDBOX_WORKTREE_ROOT}/${project}`);
}

/** The ssh command that runs `command args` in a container on the sandbox host. */
export function sandboxCommand(input: {
  readonly sandbox: SandboxSsh;
  readonly cwd: string | null | undefined;
  readonly command: string;
  readonly args: ReadonlyArray<string>;
}): Result.Result<AgentScopeCommand, SandboxRefusedError> {
  return Result.map(sandboxProjectDir(input.cwd), (dir) => {
    const payload = JSON.stringify({
      dir,
      command: input.command.split(/[\\/]/).pop() ?? input.command,
      args: input.args,
    });
    return {
      command: "ssh",
      args: [
        // Ignore ~/.ssh/config. known_hosts still applies, so the target's
        // host name must already be in it.
        "-F",
        "/dev/null",
        "-o",
        "BatchMode=yes",
        "-o",
        "IdentitiesOnly=yes",
        ...(input.sandbox.keyPath === undefined ? [] : ["-i", input.sandbox.keyPath]),
        // No tty: the agent speaks JSON over standard input and output.
        "-T",
        input.sandbox.target,
        `run ${Buffer.from(payload, "utf8").toString("base64")}`,
      ],
    };
  });
}

function driverLabel(driver: string): string {
  return driver === "claudeAgent" || driver === "claude"
    ? "Claude"
    : driver.charAt(0).toUpperCase() + driver.slice(1);
}

/**
 * Why a provider session must not open in sandbox mode, or `undefined` when
 * it may. Only Codex runs in a sandbox today; every other provider would run
 * on the server, so it fails instead.
 */
export function sandboxSessionRefusal(
  sandbox: SandboxSsh | undefined,
  input: { readonly driver: string; readonly cwd: string | null },
): SandboxRefusedError | undefined {
  if (sandbox === undefined) return undefined;
  if (input.driver !== SANDBOXED_DRIVER) {
    return new SandboxRefusedError({
      reason: `${driverLabel(input.driver)} in a sandbox is not supported yet`,
    });
  }
  const dir = sandboxProjectDir(input.cwd);
  return Result.isFailure(dir) ? dir.failure : undefined;
}
