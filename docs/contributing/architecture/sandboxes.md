# Sandboxes

Every chat session, every ticket-run step and every gate runs in its own
sandbox ([0009](../decisions/0009-every-agent-in-a-sandbox.md)). Each project
names one sandbox host.

| Host                        | Runs                                                    | Isolation        | Projects              |
| --------------------------- | ------------------------------------------------------- | ---------------- | --------------------- |
| DGX Spark                   | Docker sandboxes, the model gateway and an egress proxy | Container a step | Web, backend, Android |
| Mac mini, in Tart macOS VMs | Xcode builds, the iOS Simulator and Maestro             | VM a step        | iOS                   |

## Rules

- A sandbox holds no credential: no `gh` token, no Linear token and no model
  credential ([invariant 3](../project-intent.md#hard-invariants)).
- A sandbox reaches the public internet with no block. The egress proxy blocks
  private, tailnet and cloud metadata addresses, so a sandbox cannot reach the
  owner's machines.
- A gate runs in a fresh sandbox from the exact commit, never in the sandbox
  of the step that wrote the code.
- Each host has a limit on concurrent sandboxes. The Mac mini holds two iOS
  VMs at once, because Apple's macOS license allows two extra macOS VMs on
  each Mac. Runs past a host's limit wait in the queue.
- An iOS sandbox is a Tart VM, never a macOS user account. A user account
  cannot keep an agent away from the Mac mini's Keychain, the push process and
  the Clyde server.
- A folder project keeps its files in a named volume on its host, and each of
  its chats mounts that volume. A repository project's sandbox starts from a
  fresh checkout.
- Adding a project builds its sandbox image on its host at once. A chat or a
  ticket run never waits for a first setup.
- A thread's worktree is the same files at the same path on the server and in
  its sandbox, through a mount
  ([0010](../decisions/0010-agents-driven-from-the-server.md)).
- A Clyde worker runs on each host. The Spark worker serves Linux projects.
  A second worker on the Mac mini drives the Tart VMs for iOS projects.

## What to read when changing it

- [Model gateway](./model-gateway.md)
- [Journey: ticket run](./journey-ticket-run.md)
- `clyde/sandbox/` for the sandbox image, `clyde-sandbox-exec` and the host's
  compose file
- `packages/clyde-sandbox-host/src/egressProxy.ts`
