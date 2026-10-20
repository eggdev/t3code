# 0010: The server drives agents; only the agent process runs in the sandbox

- **Status:** amended by [0011](./0011-interrupted-turns-retry.md)
- **Date:** 2026-10-20

## Context

Every agent runs in a sandbox ([0009](./0009-every-agent-in-a-sandbox.md)).
T3 Code's provider adapters drive each agent CLI from the server. They hold
the turn state, and the server's checkpoints, diffs, git panel, file browser
and terminals read the thread's files from local disk. Running the adapters on
the sandbox host would mean carrying most of the server into the worker:
about 3,000 to 5,000 lines with heavy merge friction. Every adapter spawn goes
through T3 Code's `AgentScope` command wrapper, which can run the CLI
somewhere else. An earlier answer had ticket runs work on through a Mac mini
outage, which needs the adapters on the sandbox host.

## Decision

The provider adapters and the workflow engine stay on the Clyde server. Only
the agent CLI process runs in the sandbox: the server's `AgentScope` wrapper
starts it there through the worker, which relays its standard input and
output. The thread's worktree is the same files at the same path on the server
and in the sandbox, through a mount.

## Consequences

- A small change: one wrapper, a worker relay and a fix to the Claude spawn
  hook. Upstream files barely change.
- Chats and ticket runs share one execution path, and the server's
  checkpoints, diffs, git panel and file browser keep working.
- While the Mac mini is down, the agent's current turn keeps running in its
  sandbox and the worker buffers its output. No new turn or workflow step
  starts until the Mac mini returns. No prompt is lost.
- The server runs git on files that agents write. Every server git call pins
  safe options (no hooks, no `core.fsmonitor`, no config from the worktree),
  so an agent cannot plant a command that the Mac mini runs.
- Terminals in the app run on the server until they move into the sandbox.

**Revisit if:** a Mac mini outage stops a ticket run for more than one working
day, twice.
