/**
 * Clyde: Claude agents run in a sandbox (decisions 0009 and 0010). The Agent
 * SDK builds the CLI's arguments itself and adds them after any wrapper, so
 * the ssh command is built in the SDK's spawn hook, from the final arguments.
 *
 * The Claude home (CLAUDE_CONFIG_DIR) of a sandboxed thread sits in its
 * project's top folder on the shared worktree mount. The CLI in the container
 * writes its session files there, and the server reads them at the same path
 * for resume, fork and rollback. `clyde-sandbox-exec` sets the same path.
 */
import type { SpawnedProcess, SpawnOptions } from "@anthropic-ai/claude-agent-sdk";
import * as Result from "effect/Result";

import {
  SandboxRefusedError,
  type SandboxSsh,
  sandboxCommand,
  sandboxProjectDir,
} from "./sandboxCommand.ts";

/** The CLI on the sandbox image. The SDK spawns this name and the hook sends it over ssh. */
export const SANDBOX_CLAUDE_EXECUTABLE = "claude";

/** Query options that make the SDK spawn `claude <its own args>` with no prefix. */
export const SANDBOX_CLAUDE_QUERY_OPTIONS = {
  pathToClaudeCodeExecutable: SANDBOX_CLAUDE_EXECUTABLE,
  executableArgs: [] as Array<string>,
};

/** The Claude home inside the project's top folder. Keep in step with `clyde-sandbox-exec`. */
const CLAUDE_HOME_IN_PROJECT = ".clyde/claude-home";

/**
 * The only variables the CLI gets from the server. The SDK sets these to
 * describe itself and its features. The adapter reads the task list by
 * CLAUDE_CODE_TASK_LIST_ID. No credential is in this list: the gateway holds
 * those.
 */
export const SANDBOX_CLAUDE_ENV: ReadonlyArray<string> = [
  "CLAUDE_AGENT_SDK_VERSION",
  "CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING",
  "CLAUDE_CODE_ENTRYPOINT",
  "CLAUDE_CODE_QUESTION_PREVIEW_FORMAT",
  "CLAUDE_CODE_TASK_LIST_ID",
];

/** The Claude home of a sandboxed thread: the same path on the server and in the sandbox. */
export function sandboxClaudeHome(
  cwd: string | null | undefined,
): Result.Result<string, SandboxRefusedError> {
  return Result.map(sandboxProjectDir(cwd), (dir) => `${dir}/${CLAUDE_HOME_IN_PROJECT}`);
}

/** The allowlisted variables from the SDK's environment for the CLI. */
export function sandboxClaudeEnv(
  env: Readonly<Record<string, string | undefined>>,
): Record<string, string> {
  const picked: Record<string, string> = {};
  for (const name of SANDBOX_CLAUDE_ENV) {
    const value = env[name];
    if (value !== undefined) picked[name] = value;
  }
  return picked;
}

/**
 * The SDK spawn hook for sandbox mode, or `undefined` when sandbox mode is
 * off. It turns the SDK's `claude <args>` launch into ssh to the sandbox host
 * and starts it with `spawn`. It throws when the launch cannot run in the
 * sandbox, so the SDK fails the query and nothing runs on the server.
 */
export function makeSandboxClaudeSpawn(
  sandbox: SandboxSsh | undefined,
  spawn: (options: SpawnOptions) => SpawnedProcess,
): ((options: SpawnOptions) => SpawnedProcess) | undefined {
  if (sandbox === undefined) return undefined;
  return (options) => {
    if (options.command !== SANDBOX_CLAUDE_EXECUTABLE) {
      throw new SandboxRefusedError({
        reason: `Claude in a sandbox must launch as ${SANDBOX_CLAUDE_EXECUTABLE}, not ${options.command}`,
      });
    }
    const command = sandboxCommand({
      sandbox,
      cwd: options.cwd,
      command: SANDBOX_CLAUDE_EXECUTABLE,
      args: options.args,
      env: sandboxClaudeEnv(options.env),
    });
    if (Result.isFailure(command)) throw command.failure;
    // ssh needs no folder of its own. The worktree mount can be slow or down.
    const { cwd: _cwd, ...rest } = options;
    return spawn({ ...rest, command: command.success.command, args: [...command.success.args] });
  };
}
