# API errors

Every HTTP error from the product has one shape, so a client, an agent and a
test read every failure the same way. This page applies
[one door for each decision](../../principles/one-door-for-each-decision.md)
and [fail loudly](../../principles/fail-loudly.md).

| Question                        | Answer                                                       |
| ------------------------------- | ------------------------------------------------------------ |
| What does an error look like?   | `{ "error": { "code", "message", "details" } }`              |
| Which status goes with a code?  | The table below. One function maps each code to its status   |
| What does an unknown error get? | `500` with `internal_error`. The message hides the internals |
| Which errors reach the tracker? | Server errors (`5xx`) only. A caller error is the caller's   |

Clyde has two doors for errors:

- **RPC.** The apps call T3 Code's WebSocket RPC. Each RPC declares its typed
  errors with Effect Schema in `packages/contracts`. Clyde's RPCs declare
  Clyde's errors in Clyde's own contract files there, with the codes below.
- **HTTP.** The Linear webhook and the worker port use the shape in this
  page. One function in Clyde's server module maps each code to its status.

## Rules

- **One shape.** `code` is stable `snake_case` that a client can branch on.
  `message` is for people and can change. `details` is optional and holds
  facts that a program reads, such as the limit and the current count.
- **One door.** Code throws a typed error with its code. One function turns it
  into a response with the status from the table. A handler never builds an
  error response by hand.
- **A closed set of codes.** A new code is a row in the table, in the change
  that adds it. A code never changes meaning. A client that sees an unknown
  code treats it as the generic code for its status.
- **No internals in a response.** A `5xx` response never carries a stack, a
  query or a vendor message. The error tracker gets them.
- **No caching.** Each error response sets `Cache-Control: no-store`.
- **Caller errors stay out of the tracker.** A `4xx` is the expected result of a
  bad request. Reporting it would hide real server errors in noise.

## Codes

| Status | Code                                |
| ------ | ----------------------------------- |
| 400    | `invalid_request`                   |
| 401    | `unauthorized`                      |
| 403    | `forbidden`                         |
| 404    | `not_found`                         |
| 409    | `conflict`                          |
| 413    | `payload_too_large`                 |
| 415    | `unsupported_media_type`            |
| 429    | `rate_limited` (with `Retry-After`) |
| 500    | `internal_error`                    |

Clyde's own codes, used on both doors:

| Status | Code                   | When                                                                             |
| ------ | ---------------------- | -------------------------------------------------------------------------------- |
| 403    | `not_owner`            | A Linear requester or a Tailscale identity that is not the owner                 |
| 404    | `project_not_mapped`   | A Linear team with no Clyde project                                              |
| 409    | `stale_commit`         | A gate result or a push for a commit that is not the head now                    |
| 422    | `workflow_invalid`     | `.clyde/workflow.yaml` fails validation. `details` holds the line and the reason |
| 503    | `sandbox_host_offline` | A run needs a sandbox host that Clyde cannot reach                               |

## What to read when changing it

- [Authorization](./authorization.md): where `401` and `403` come from
- T3 Code: `packages/contracts/src/rpc.ts`
