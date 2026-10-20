# Local-first sync

How the client store, the mutation queue and the server stay in step. The rule
behind this page is [local first](../../principles/local-first.md).

Clyde keeps T3 Code's sync model
([0006](../decisions/0006-keep-t3-code-sync.md)).

| Question                                      | Answer                                                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| Where does a screen read?                     | The client's cached projections, kept through a disconnect                   |
| Where does a write go?                        | A command to the server. Its control shows a pending state until the receipt |
| Who decides if a write stands?                | The server, which commits the events and the receipt in one transaction      |
| What happens when the server says no          | The control shows the error, and the draft stays                             |
| How do updates reach the client?              | The server pushes events over the WebSocket after each commit                |
| What happens while the server is unreachable? | The client keeps its drafts and sends them after it reconnects               |

## Sync engine

T3 Code's own: the server event log and its receipts, and one connection owner
for each environment in `packages/client-runtime`. Clyde adds no sync engine.

## Rules

- A retried command applies once, because the server keeps its receipt.
- A screen that renders from the cached projections sends no request before
  it paints.
- Clyde's events use T3 Code's event shape, so the clients render a ticket run
  with the same code as a chat.

## Server-confirmed writes

Every Clyde command waits for the server. These are the ones that touch a
hard invariant:

- **Approve a workflow step.** It lets a run go on toward a pull request.
- **Open a pull request.** It starts the gates.
- **Send a message to a run.** It must be stored before it is acknowledged
  ([invariant 4](../project-intent.md#hard-invariants)).
- **Connect Linear** and **add a project.** They change what Clyde can reach.

## Conflicts

Messages append, so two devices never conflict on a message. On a setting,
the last write wins.

## What to read when changing it

- T3 Code: `packages/client-runtime/src/connection/`,
  `apps/server/src/orchestration-v2/Orchestrator.ts` and
  `apps/server/src/orchestration-v2/EventSink.ts`

- [Normalized source of truth](../../principles/normalized-source-of-truth.md#client-copies)
- [Authorization](./authorization.md)
- [Client performance](./client-performance.md)
