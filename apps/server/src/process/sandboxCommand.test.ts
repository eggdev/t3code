import * as Result from "effect/Result";
import { assert, describe, expect, it } from "vite-plus/test";

import {
  sandboxCommand,
  sandboxProjectDir,
  sandboxSessionRefusal,
  sandboxSshOf,
} from "./sandboxCommand.ts";

const sandbox = { target: "clydeedgar@agent-dgx", keyPath: "/home/clyde/.ssh/clyde_sandbox" };

function decodePayload(args: ReadonlyArray<string>) {
  const last = args.at(-1) ?? "";
  expect(last.startsWith("run ")).toBe(true);
  return JSON.parse(Buffer.from(last.slice("run ".length), "base64").toString("utf8"));
}

describe("sandboxSshOf", () => {
  it("is off without a target", () => {
    expect(sandboxSshOf(undefined)).toBeUndefined();
    expect(sandboxSshOf({})).toBeUndefined();
    expect(sandboxSshOf({ sandboxSshTarget: "  " })).toBeUndefined();
  });

  it("is on with a target", () => {
    expect(sandboxSshOf({ sandboxSshTarget: "u@h", sandboxSshKeyPath: "/k" })).toEqual({
      target: "u@h",
      keyPath: "/k",
    });
  });
});

describe("sandboxProjectDir", () => {
  it("gives the first folder under the worktree root", () => {
    expect(sandboxProjectDir("/opt/clyde/worktrees/proj")).toEqual(
      Result.succeed("/opt/clyde/worktrees/proj"),
    );
    expect(sandboxProjectDir("/opt/clyde/worktrees/proj/sub/deeper/")).toEqual(
      Result.succeed("/opt/clyde/worktrees/proj"),
    );
  });

  it.each([
    null,
    undefined,
    "",
    "/opt/clyde/worktrees",
    "/opt/clyde/worktrees/",
    "/opt/clyde/worktreesx/proj",
    "/Users/clyde/dev/clyde",
    "opt/clyde/worktrees/proj",
    "/opt/clyde/worktrees/../etc",
    "/opt/clyde/worktrees/proj/../other",
    "/opt/clyde/worktrees/pr oj",
  ])("refuses %s", (cwd) => {
    const result = sandboxProjectDir(cwd);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure._tag).toBe("SandboxRefusedError");
      expect(result.failure.message).toContain("/opt/clyde/worktrees");
    }
  });
});

describe("sandboxCommand", () => {
  it("builds the ssh command with the payload the host expects", () => {
    const result = sandboxCommand({
      sandbox,
      cwd: "/opt/clyde/worktrees/proj/sub",
      command: "/opt/homebrew/bin/codex",
      args: ["app-server", "--flag", "a b"],
    });
    expect(Result.isSuccess(result)).toBe(true);
    if (!Result.isSuccess(result)) return;
    expect(result.success.command).toBe("ssh");
    expect(result.success.args.slice(0, -1)).toEqual([
      "-F",
      "/dev/null",
      "-o",
      "BatchMode=yes",
      "-o",
      "IdentitiesOnly=yes",
      "-i",
      "/home/clyde/.ssh/clyde_sandbox",
      "-T",
      "clydeedgar@agent-dgx",
    ]);
    expect(decodePayload(result.success.args)).toEqual({
      dir: "/opt/clyde/worktrees/proj",
      cwd: "/opt/clyde/worktrees/proj/sub",
      command: "codex",
      args: ["app-server", "--flag", "a b"],
    });
  });

  it("puts env in the payload only when it has names", () => {
    const withEnv = sandboxCommand({
      sandbox,
      cwd: "/opt/clyde/worktrees/proj",
      command: "claude",
      args: ["--print"],
      env: { CLAUDE_CODE_ENTRYPOINT: "sdk-ts" },
    });
    assert(Result.isSuccess(withEnv));
    expect(decodePayload(withEnv.success.args)).toEqual({
      dir: "/opt/clyde/worktrees/proj",
      cwd: "/opt/clyde/worktrees/proj",
      command: "claude",
      args: ["--print"],
      env: { CLAUDE_CODE_ENTRYPOINT: "sdk-ts" },
    });
    const empty = sandboxCommand({
      sandbox,
      cwd: "/opt/clyde/worktrees/proj",
      command: "claude",
      args: [],
      env: {},
    });
    assert(Result.isSuccess(empty));
    expect(decodePayload(empty.success.args)).not.toHaveProperty("env");
  });

  it("leaves out -i without a key path", () => {
    const result = sandboxCommand({
      sandbox: { target: "u@h" },
      cwd: "/opt/clyde/worktrees/proj",
      command: "codex",
      args: [],
    });
    expect(Result.isSuccess(result) && result.success.args.includes("-i")).toBe(false);
  });

  it("refuses a folder outside the worktree root", () => {
    const result = sandboxCommand({ sandbox, cwd: "/tmp/proj", command: "codex", args: [] });
    expect(Result.isFailure(result)).toBe(true);
  });
});

describe("sandboxSessionRefusal", () => {
  const cwd = "/opt/clyde/worktrees/proj";

  it("allows everything when sandbox mode is off", () => {
    expect(sandboxSessionRefusal(undefined, { driver: "claudeAgent", cwd: null })).toBeUndefined();
  });

  it("allows Codex in a project folder", () => {
    expect(sandboxSessionRefusal(sandbox, { driver: "codex", cwd })).toBeUndefined();
  });

  it("refuses Codex outside the worktree root", () => {
    expect(sandboxSessionRefusal(sandbox, { driver: "codex", cwd: "/tmp" })?._tag).toBe(
      "SandboxRefusedError",
    );
  });

  it("allows Claude in a project folder and refuses it outside", () => {
    expect(sandboxSessionRefusal(sandbox, { driver: "claudeAgent", cwd })).toBeUndefined();
    expect(sandboxSessionRefusal(sandbox, { driver: "claudeAgent", cwd: "/tmp" })?._tag).toBe(
      "SandboxRefusedError",
    );
  });

  it.each([
    ["claude", "Claude in a sandbox is not supported yet"],
    ["cursor", "Cursor in a sandbox is not supported yet"],
    ["opencode", "Opencode in a sandbox is not supported yet"],
  ])("refuses %s", (driver, message) => {
    expect(sandboxSessionRefusal(sandbox, { driver, cwd })?.message).toBe(message);
  });
});
