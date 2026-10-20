# Request context

Every request carries one request context, whatever reached it: a client
session, a Linear webhook, a worker connection or an MCP call. Clyde has no
tenant model ([0003](../decisions/0003-no-tenant-model.md)), so the shape has
no tenant and no membership:

| Field         | Question                                                   |
| ------------- | ---------------------------------------------------------- |
| `actor`       | Who acts? The owner, or `null` for a machine.              |
| `attribution` | Which source is the work audited to?                       |
| `credential`  | What authenticated it, and which RPC scopes does it allow? |
| `project`     | Which Clyde project does it touch, if any?                 |

The actor is always the owner or nobody. Clyde extends T3 Code's session and
RPC scopes (`apps/server/src/auth/`) with these fields.

## Rules

This page applies [one door for each decision](../../principles/one-door-for-each-decision.md).

- **Nothing builds a context by hand.** Each entry point names its source, and
  one function derives the context from that source. The source is a required
  parameter, so a new entry point does not compile until it names itself.
- **Project IDs are a branded type.** A run's reads take its project ID, and
  a read of another project fails.
- **Automation has no actor.** A scheduled job, a webhook or an inbound
  message runs with `actor: null`, and attribution names the source.
- **Work started by other work inherits its lineage.** The starting actor,
  attribution and credential travel with it. A reader validates lineage again
  when it reads it from storage. Work without lineage runs as automation, which
  can only narrow what the starter could do.
- **The context is derived, never stored.** Stored jobs keep the source. The
  context is derived again when the job runs.
- **Linear references carry their workspace ID.** See
  [data storage](./data-storage.md).

## Sources

| Source                         | How it arrives                                                          | Actor                                 | Check                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Desktop app, iOS app           | Tailscale HTTPS (Tailscale Serve), WebSocket RPC                        | The owner                             | Tailscale Serve's identity header is the owner's login                                             |
| Linear webhook                 | The public internet, through Tailscale Funnel on `/linear/webhook` only | The owner, as the session's requester | HMAC over the raw body, 60-second freshness, workspace and app IDs, and the requester is the owner |
| Clyde worker (Spark, Mac mini) | The tailnet, on a worker-only port                                      | None                                  | A Tailscale ACL that admits only the worker hosts, and a per-worker token from 1Password           |
| Chat agents, through MCP       | Loopback on the Mac mini                                                | Inherited from the thread             | T3 Code's MCP OAuth. Sandboxes cannot reach it                                                     |

Funnel exposes one path. The apps' address stays on the tailnet. Tailscale
Serve sends identity headers only for devices that a user owns, so a worker,
a tagged machine, gets an ACL and a token.

## What to read when changing it

- T3 Code: `apps/server/src/auth/EnvironmentAuth.ts`,
  `apps/server/src/auth/RpcAuthorization.ts` and `docs/internals/environment-auth.md`

- [Authorization](./authorization.md): the access check that reads this shape
