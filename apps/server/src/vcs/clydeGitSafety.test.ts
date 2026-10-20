// @effect-diagnostics nodeBuiltinImport:off -- the test runs real git against temp repositories.
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { describe, expect, it } from "vite-plus/test";

import { withClydeGitSafety } from "./VcsProcess.ts";

const git = (cwd: string, args: ReadonlyArray<string>, env: NodeJS.ProcessEnv) =>
  NodeChildProcess.spawnSync("git", args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });

describe("withClydeGitSafety", () => {
  it("adds the safety entries after the inherited command-line config", () => {
    const env = withClydeGitSafety(
      { GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "a.b", GIT_CONFIG_VALUE_0: "c" },
      "darwin",
    );
    expect(env).toMatchObject({
      GIT_CONFIG_COUNT: "4",
      GIT_CONFIG_KEY_0: "a.b",
      GIT_CONFIG_KEY_1: "safe.directory",
      GIT_CONFIG_VALUE_1: "/opt/clyde/worktrees/*",
      GIT_CONFIG_KEY_2: "core.hooksPath",
      GIT_CONFIG_VALUE_2: "/dev/null",
      GIT_CONFIG_KEY_3: "core.fsmonitor",
      GIT_CONFIG_VALUE_3: "false",
    });
  });

  it("does not run a hook or a monitor command planted in the repository", () => {
    const root = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "clyde-git-safety-"));
    const marker = NodePath.join(root, "ran");
    const plain = { GIT_CONFIG_NOSYSTEM: "1", HOME: root };
    git(root, ["init", "-q"], plain);
    const hook = NodePath.join(root, ".git", "hooks", "pre-commit");
    NodeFS.writeFileSync(hook, `#!/bin/sh\ntouch ${marker}\n`, { mode: 0o755 });
    git(root, ["config", "core.fsmonitor", `touch ${marker}`], plain);
    NodeFS.writeFileSync(NodePath.join(root, "file.txt"), "x");

    const safe = withClydeGitSafety(plain, "linux");
    expect(git(root, ["add", "file.txt"], safe).status).toBe(0);
    expect(git(root, ["status", "--porcelain"], safe).status).toBe(0);
    const commit = git(
      root,
      ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "x"],
      safe,
    );
    expect(commit.status).toBe(0);
    expect(NodeFS.existsSync(marker)).toBe(false);
    NodeFS.rmSync(root, { recursive: true, force: true });
  });
});
