/**
 * Clyde: config for every git process the server starts (security rule 25,
 * decision 0010). Agents write the files under the worktree root from a
 * sandbox, as uid 1000, and the server reads them over NFS as its own user.
 *
 * - `safe.directory` lets the server open those repositories despite the
 *   different owner. Git honours it only from protected config, which
 *   includes these command-line entries.
 * - `core.hooksPath` and `core.fsmonitor` stop git from running a hook or a
 *   monitor command that an agent planted, on the server's machine.
 */
export const CLYDE_WORKTREE_ROOT = "/opt/clyde/worktrees";

export const CLYDE_GIT_CONFIG: ReadonlyArray<readonly [string, string]> = [
  ["safe.directory", `${CLYDE_WORKTREE_ROOT}/*`],
  ["core.hooksPath", "/dev/null"],
  ["core.fsmonitor", "false"],
];

/** Sandbox mode is on when the server runs agents on a sandbox host. */
export const isSandboxMode = (env: NodeJS.ProcessEnv) =>
  (env.T3CODE_SANDBOX_SSH_TARGET ?? "").trim().length > 0;
