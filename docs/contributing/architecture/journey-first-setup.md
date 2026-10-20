# Journey: first setup

The owner installs Clyde once, on one machine, and then reaches it from every
other device on the tailnet.

| Question                          | Answer                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| Where does Clyde run?             | The Mac mini, as a launchd service that starts at boot with no login.                      |
| Where do agents work?             | Chat sessions on the Mac mini. Ticket runs in sandboxes on the DGX Spark or a remote host. |
| Which devices are clients?        | Every laptop and the iPhone. Each one runs the desktop app or the iOS app.                 |
| How does a client sign in?        | With the owner's Tailscale identity. No pairing link, no QR code and no password.          |
| How many Clyde servers are there? | One. A client never starts its own server.                                                 |

## Rules

- The Mac mini runs the only Clyde environment. The desktop app ships with its
  local environment off, so a laptop never runs agents, terminals or a second
  copy of the data.
- The Mac mini serves Clyde with Tailscale HTTPS at
  `https://<mac-mini>.<tailnet>.ts.net/`. Clyde has no other route for its
  clients. Clyde does not use T3 Connect.
- Tailscale Serve adds the caller's Tailscale identity to each request. Clyde
  accepts the owner's login and refuses any other identity. Clyde turns off
  T3 Code's pairing links.
- The Spark runs the sandbox worker only. It is not a Clyde environment.

## The walk

1. **Install.** The owner installs the Clyde server on the Mac mini as a
   launchd service, and the sandbox worker on the Spark as a systemd service.
2. **Add the environment.** On a laptop or the iPhone, the owner opens
   **Add environment** and enters the Mac mini's tailnet address, or picks the
   Mac mini from the list of tailnet machines. Clyde reads the Tailscale
   identity and opens the app. Each later device does the same step and sees
   the same sessions and runs.
3. **Connect Linear.** An empty Clyde shows one action: **Connect Linear**.
   OAuth opens in the browser with `actor=app`. Clyde saves the token on the
   Mac mini and lists the teams in the workspace.
4. **Add a project.** The owner picks a GitHub repository, a Linear team (and
   a Linear project, if any) and a sandbox host. Clyde gives the project the
   default workflow: plan, build, the `validate` gate, review and pull request.

## Empty, error and offline states

| State                                    | What the owner sees                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| A device with another Tailscale identity | "This Clyde belongs to another tailnet user." Nothing else loads.                   |
| The Mac mini is offline                  | The client shows the environment as unreachable, with the last time it connected.   |
| No Linear connection                     | One action: **Connect Linear**.                                                     |
| The Linear token is revoked              | **Reconnect Linear** on every screen. Ticket runs wait; chat sessions keep working. |
| The sandbox host is offline              | "Sandbox host offline", with the last time Clyde saw it. Its ticket runs wait.      |

## What to read when changing it

- [Project intent](../project-intent.md#hard-invariants), invariant 2
- T3 Code's `docs/user/remote-access.md` and `apps/server/src/auth/`
