# 0009: Every agent runs in a sandbox; no agent process on the Mac mini

- **Status:** accepted
- **Date:** 2026-10-20

## Context

T3 Code runs each agent as a child process of its server, as the same OS user.
Clyde's server on the Mac mini holds every secret through the 1Password
service account, and it trusts Tailscale Serve's identity header on a
loopback port. A chat agent on the Mac mini could read those secrets and send
a forged `Tailscale-User-Login` header to the loopback port, and so act as the
owner. The first plan ran chat sessions on the Mac mini and only ticket runs in
sandboxes.

## Decision

Every agent runs in a sandbox: chat sessions and ticket runs alike, through
the worker on the project's sandbox host. The Clyde server on the Mac mini
runs no agent process.

## Consequences

- Invariants 2 and 3 hold for every agent, and chats and ticket runs share one
  execution path.
- A chat starts a sandbox first: a few seconds on Docker, longer for a Tart VM.
  Adding a project builds its sandbox image at once, so no chat waits for a
  first setup.
- A chat's agent edits files in its sandbox, not in a folder on the Mac mini.
- T3 Code's local provider host is unused on the server. Clyde reaches agents
  through the worker, which changes how Clyde starts a turn for every thread.

**Revisit if:** a chat needs a tool that only exists on the Mac mini's own
account.
