# Authorization

One function decides whether a request may do something. It reads the
[request context](./request-context.md) and a permission, and optionally the
resource it touches.

| Question                         | Answer                                                                    |
| -------------------------------- | ------------------------------------------------------------------------- |
| Who may act?                     | The owner. Clyde has no other person and no tenant                        |
| Who may act on the whole system? | The owner, who is also the operator                                       |
| Where is the decision made?      | T3 Code's RPC scope check, `apps/server/src/auth/RpcAuthorization.ts`     |
| What does a denial look like?    | A typed error that names the denial code, the permission and the resource |

## The access check

The check runs these steps in order, and stops at the first denial:

1. **Signed in.** A request without a person is denied, unless the surface
   declares that it needs no permission.
2. **Project binding.** The resource belongs to the request's project.
3. **Effective permissions.** The actor's roles and grants allow the
   permission.
4. **Credential narrowing.** The credential's scopes allow the permission.

Nothing caches a grant across requests. Each request reads the current access
state. See [fix the root bottleneck](../../principles/fix-the-root-bottleneck.md)
for what to do when the check gets slow.

## Every surface declares its permission

This page applies [one door for each decision](../../principles/one-door-for-each-decision.md).
Each route, API operation and tool declares the permission it needs. The
declaration is a required field, so a surface without one does not compile.
`'none'` is an explicit value: the surface touches no project data. A test walks
the route table and fails on a route that declares nothing.

Handlers that touch a concrete resource also call the check with that
resource, so a later grant model narrows them with no new code.

## Actions that need a live person

Some actions never run unattended: connecting Linear, adding a project,
approving a workflow step and merging. One
predicate decides what a live person is: an actor, plus a credential that a
person used directly. Automation and work started by automation are never live.
A surface declares the requirement once, and the dispatch path checks it.

## Roles

| Role   | What it may do                                                                      |
| ------ | ----------------------------------------------------------------------------------- |
| Owner  | Everything. The owner is also the operator, so there is no separate operator system |
| Worker | Report run events and gate results, and read the messages for its own runs          |
| Agent  | Call the MCP tools of its own thread. A sandbox agent reaches no Clyde surface      |

## What to read when changing it

- T3 Code: `apps/server/src/auth/RpcAuthorization.ts` and the RPC schemas in
  `packages/contracts/src/rpc.ts`

- [Request context](./request-context.md)
