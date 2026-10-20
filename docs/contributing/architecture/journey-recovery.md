# Journey: recovery

Clyde loses no accepted prompt and no work when a machine restarts, sleeps or
drops off the network.

| Question                                           | Answer                                                                                                                                                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Can the Mac mini sleep?                            | No. The install sets `pmset` to stay awake and to restart after a power loss.                                                                                                                                 |
| What happens when the Mac mini restarts?           | Clyde replays its event log and reconnects to each live run and chat session.                                                                                                                                 |
| What about Linear events missed while it was down? | At start, Clyde asks Linear for each agent session and delegated issue it has not seen.                                                                                                                       |
| Do runs stop when the Mac mini is unreachable?     | The agent's current turn keeps running in its sandbox, and the worker buffers its output. No new turn or step starts until the Mac mini returns ([0010](../decisions/0010-agents-driven-from-the-server.md)). |
| What happens when the Spark restarts?              | The worker resumes each run from its last committed step.                                                                                                                                                     |

## Rules

- Clyde stores each Linear event and each client message before it
  acknowledges it ([invariant 4](../project-intent.md#hard-invariants)).
- Clyde does not depend on Linear to retry a webhook. The start-up check finds
  any event it missed.
- The worker keeps each agent process's output in order on its own disk while
  the server is away. It deletes an entry only after the server confirms it.
- The server drives every turn and every workflow step. While it is away, a
  running turn finishes in its sandbox, and the next step waits.
- After a restart, the server reattaches to each live agent process through
  the worker and reads the buffered output.

## The walk

1. **The Mac mini restarts.** launchd starts Clyde at boot with no login.
2. **Replay.** Clyde replays its event log and rebuilds its state.
3. **Catch up with Linear.** Clyde lists the agent sessions and delegated
   issues it has not seen, and starts or resumes those runs.
4. **Catch up with the sandboxes.** The worker delivers each agent's buffered
   output, in order. Waiting runs start their next step.
5. **Clients reconnect.** Each app reconnects over the tailnet and shows the
   live state.

## Empty, error and offline states

| State                               | What the owner sees                                                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| The Mac mini is unreachable         | The app shows the environment as unreachable, with the last time it connected.                 |
| A sandbox host is unreachable       | The host's health shows "offline", with the last time Clyde saw it. Its runs show "waiting".   |
| Linear or GitHub is unreachable     | Their health shows "offline". Pull requests and status changes wait, and then go out in order. |
| The worker's stored events catch up | Each run's thread fills in the missing steps, in order.                                        |

The app shows the health of each part (the Mac mini, each sandbox host,
Linear and GitHub) with the last time each one was seen.

## What to read when changing it

- [Project intent](../project-intent.md#hard-invariants), invariant 4
- [Journey: ticket run](./journey-ticket-run.md)
- `linear-agent/docs/incident-2026-10-08.md`
