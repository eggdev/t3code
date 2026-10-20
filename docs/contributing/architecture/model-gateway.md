# Model gateway

Ticket runs call hosted models through a gateway on their sandbox host: the
Spark, or the Mac mini for iOS runs. The gateway
adds the owner's subscription credentials to each call, so a sandbox never
holds them.

| Question                              | Answer                                                                                   |
| ------------------------------------- | ---------------------------------------------------------------------------------------- |
| Which providers can a ticket run use? | Codex (OpenAI) and Claude Code (Anthropic).                                              |
| Which accounts pay for the calls?     | The owner's subscriptions: a ChatGPT login for Codex and a Claude login for Claude Code. |
| Where do the credentials live?        | The 1Password vault "Clyde". The gateway reads them; no sandbox does.                    |
| Which model does each step use?       | The provider and model that the workflow step names.                                     |
| What does the default workflow use?   | Codex for agent steps, and Claude for the review gate.                                   |

## Rules

- A sandbox reaches a model only through the gateway, on the sandboxes'
  internal network. The gateway is the only holder of model credentials on the
  Spark ([invariant 3](../project-intent.md#hard-invariants)).
- The review gate uses a different model family from the step that wrote the
  code, so the reviewer does not share the author's blind spots.
- Each sandbox host runs its own gateway, so a sandbox never needs a route to
  another machine. The Mac mini's gateway serves only its Tart VMs.
- Chat sessions use the gateway too, because their agents run in sandboxes
  ([0009](../decisions/0009-every-agent-in-a-sandbox.md)).
- No code assumes that a model is hosted. A step names its provider, so a
  local model can later fill one ([project intent](../project-intent.md)).

## Where it runs

The gateway and the egress proxy are `packages/clyde-sandbox-host`, run by
`clyde/sandbox/compose.yml` on each Linux sandbox host. Sandboxes reach them
on the internal `clyde-sandbox` network as `model-gateway:8080` and
`public-egress:8083`.

| Provider | How a sandbox calls it                                                           | What the gateway adds                                                     |
| -------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Codex    | `model_provider="gateway"`, set by `clyde-sandbox-exec`                          | The ChatGPT login, refreshed through Codex itself                         |
| Claude   | `ANTHROPIC_BASE_URL=http://model-gateway:8080/anthropic` and a placeholder token | The subscription token from `claude setup-token`, and the OAuth beta flag |

The logins live in `~/.config/clyde/auth` on the host, mode 0700, until the
1Password service account holds them
([secret rotation](../operations/secret-rotation.md)).

## What to read when changing it

- `packages/clyde-sandbox-host/src/modelGateway.ts` and `codexSubscription.ts`
- [Journey: ticket run](./journey-ticket-run.md)
