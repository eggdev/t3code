import type { SpawnedProcess, SpawnOptions } from "@anthropic-ai/claude-agent-sdk";
import * as Result from "effect/Result";
import { assert, describe, expect, it } from "vite-plus/test";

import {
  makeSandboxClaudeSpawn,
  SANDBOX_CLAUDE_QUERY_OPTIONS,
  sandboxClaudeEnv,
  sandboxClaudeHome,
} from "./sandboxClaude.ts";

const sandbox = { target: "clydeedgar@agent-dgx", keyPath: "/home/clyde/.ssh/clyde_sandbox" };
const fakeProcess = {} as SpawnedProcess;

function recordingSpawn() {
  const calls: Array<SpawnOptions> = [];
  const spawn = (options: SpawnOptions) => {
    calls.push(options);
    return fakeProcess;
  };
  return { calls, spawn };
}

function decodePayload(args: ReadonlyArray<string>) {
  const last = args.at(-1) ?? "";
  expect(last.startsWith("run ")).toBe(true);
  return JSON.parse(Buffer.from(last.slice("run ".length), "base64").toString("utf8"));
}

const sdkLaunch: SpawnOptions = {
  command: "claude",
  args: ["--output-format", "stream-json", "--session-id=abc"],
  cwd: "/opt/clyde/worktrees/proj/branch",
  signal: new AbortController().signal,
  env: {
    PATH: "/usr/bin",
    HOME: "/Users/clyde",
    ANTHROPIC_API_KEY: "sk-secret",
    CLAUDE_CODE_OAUTH_TOKEN: "oauth-secret",
    CLAUDE_CONFIG_DIR: "/opt/clyde/worktrees/proj/.clyde/claude-home",
    CLAUDE_CODE_ENTRYPOINT: "sdk-ts",
    CLAUDE_AGENT_SDK_VERSION: "0.3.276",
    CLAUDE_CODE_TASK_LIST_ID: undefined,
  },
};

describe("sandboxClaudeHome", () => {
  it("puts the home in the project's top folder", () => {
    expect(sandboxClaudeHome("/opt/clyde/worktrees/proj/branch/sub")).toEqual(
      Result.succeed("/opt/clyde/worktrees/proj/.clyde/claude-home"),
    );
  });

  it("refuses a folder outside the worktree root", () => {
    expect(Result.isFailure(sandboxClaudeHome("/tmp/proj"))).toBe(true);
    expect(Result.isFailure(sandboxClaudeHome(null))).toBe(true);
  });
});

describe("sandboxClaudeEnv", () => {
  it("keeps only the allowlisted names with a value", () => {
    expect(sandboxClaudeEnv(sdkLaunch.env)).toEqual({
      CLAUDE_CODE_ENTRYPOINT: "sdk-ts",
      CLAUDE_AGENT_SDK_VERSION: "0.3.276",
    });
  });
});

describe("makeSandboxClaudeSpawn", () => {
  it("is off when sandbox mode is off", () => {
    expect(makeSandboxClaudeSpawn(undefined, recordingSpawn().spawn)).toBeUndefined();
  });

  it("sends the SDK's final claude launch over ssh", () => {
    const { calls, spawn } = recordingSpawn();
    const hook = makeSandboxClaudeSpawn(sandbox, spawn);
    assert(hook !== undefined);
    expect(hook(sdkLaunch)).toBe(fakeProcess);
    expect(calls).toHaveLength(1);
    const [call] = calls;
    assert(call !== undefined);
    expect(call.command).toBe("ssh");
    expect(call.cwd).toBeUndefined();
    // ssh itself keeps the server's environment; only the payload reaches the sandbox.
    expect(call.env).toBe(sdkLaunch.env);
    expect(call.args).toContain("clydeedgar@agent-dgx");
    expect(decodePayload(call.args)).toEqual({
      dir: "/opt/clyde/worktrees/proj",
      cwd: "/opt/clyde/worktrees/proj/branch",
      command: "claude",
      args: ["--output-format", "stream-json", "--session-id=abc"],
      env: { CLAUDE_CODE_ENTRYPOINT: "sdk-ts", CLAUDE_AGENT_SDK_VERSION: "0.3.276" },
    });
  });

  it("refuses a launch that is not the sandbox CLI or has no project folder", () => {
    const { calls, spawn } = recordingSpawn();
    const hook = makeSandboxClaudeSpawn(sandbox, spawn);
    assert(hook !== undefined);
    expect(() => hook({ ...sdkLaunch, command: "/usr/local/bin/node" })).toThrow(
      "Claude in a sandbox must launch as claude",
    );
    expect(() => hook({ ...sdkLaunch, cwd: "/Users/clyde/dev" })).toThrow("/opt/clyde/worktrees");
    expect(calls).toHaveLength(0);
  });

  it("makes the SDK launch the bare CLI name", () => {
    expect(SANDBOX_CLAUDE_QUERY_OPTIONS).toEqual({
      pathToClaudeCodeExecutable: "claude",
      executableArgs: [],
    });
  });
});
