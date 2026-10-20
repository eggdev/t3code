# Linear

Linear is where the owner plans work and talks with ticket runs. Clyde is a
Linear agent in the owner's workspace.

| Question                            | Answer                                                                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| How is Clyde installed?             | One Linear OAuth app, "Clyde", with `actor=app`, PKCE and the scopes `read,write,app:assignable,app:mentionable`.    |
| Where does the token live?          | The 1Password vault "Clyde". The server refreshes it and writes the rotated refresh token back.                      |
| Which events does Clyde handle?     | `AgentSessionEvent` `created` and `prompted`, and the `stop` signal.                                                 |
| What does Clyde post?               | Thought, elicitation, response and error activities. Each has a stable ID. Long text goes in 12k-character chunks.   |
| How does an issue find its project? | A map from Linear team to Clyde project. A Linear project breaks the tie when one team holds several Clyde projects. |
| How does the status follow the run? | The workflow sets it. A status change by the owner is a command ([journey: ticket run](./journey-ticket-run.md)).    |

## Rules

- **Every Linear reference carries its workspace ID**, so a second workspace
  needs no change to stored shapes ([data storage](./data-storage.md)).
- **Only the owner starts or steers a run.** Clyde checks the session's
  requester ([invariant 2](../project-intent.md#hard-invariants)).
- **Clyde finds missed events itself.** At start, it lists the agent sessions
  and delegated issues it has not seen ([journey: recovery](./journey-recovery.md)).
- **An activity posts once.** Its ID comes from the run ID and the sequence
  number, so a retry does not post it twice.
- **Clyde reconciles each status write.** Linear's API has no conditional
  write. After Clyde sets a status, it reads the issue again. When the owner
  changed the status in between, Clyde treats the owner's status as the
  command.
- **A sandbox never holds the Linear token.** Agents reach Linear through the
  worker relay's tools ([MCP server](./mcp.md)).

## What to read when changing it

- `linear-agent/docs/platform.md` for the agent session API and its sources
- `linear-agent/scripts/install-linear.mjs` for the OAuth install
- [Request context](./request-context.md) for the webhook checks
