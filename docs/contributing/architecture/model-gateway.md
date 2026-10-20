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
- Chat sessions on the Mac mini use T3 Code's providers with the CLI logins on
  the Mac mini. They do not use the gateway.
- No code assumes that a model is hosted. A step names its provider, so a
  local model can later fill one ([project intent](../project-intent.md)).

## Open before the first ticket run

`linear-agent` ran Codex through a subscription gateway live. It never ran
Claude live. The first Claude ticket run proves that the gateway can add the
Claude subscription credential for a Claude Code sandbox.

## What to read when changing it

- `linear-agent/src/gateway.mjs` and `linear-agent/src/subscription.mjs`
- [Journey: ticket run](./journey-ticket-run.md)
