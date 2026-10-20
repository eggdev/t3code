# Journey: recovery

Clyde loses no accepted prompt and no work when a machine restarts, sleeps or
drops off the network.

| Question                                              | Answer                                                                                  |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Can the Mac mini sleep?                               | No. The install sets `pmset` to stay awake and to restart after a power loss.           |
| What happens when the Mac mini restarts?              | Clyde replays its event log and reconnects to each live run and chat session.           |
| What about Linear events missed while it was down?    | At start, Clyde asks Linear for each agent session and delegated issue it has not seen. |
| Do ticket runs stop when the Mac mini is unreachable? | No. They keep working on the Spark, and the worker stores their events on its own disk. |
| What happens when the Spark restarts?                 | The worker resumes each run from its last committed step.                               |

## Rules

- Clyde stores each Linear event and each client message before it
  acknowledges it ([invariant 4](../project-intent.md#hard-invariants)).
- Clyde does not depend on Linear to retry a webhook. The start-up check finds
  any event it missed.
- The Spark worker keeps an ordered log of each run's events and gate results
  on its own disk. It deletes an entry only after the Mac mini confirms it.
- A ticket run needs the Mac mini only to open a pull request and to update
  Linear. Every other step runs on the sandbox host alone.
- A chat session's agent runs in a sandbox, like a ticket run's. After a
  restart, the worker resumes it in the same way.

## The walk

1. **The Mac mini restarts.** launchd starts Clyde at boot with no login.
2. **Replay.** Clyde replays its event log and rebuilds its state.
3. **Catch up with Linear.** Clyde lists the agent sessions and delegated
   issues it has not seen, and starts or resumes those runs.
4. **Catch up with the Spark.** The worker delivers the events it stored, in
   order. Runs that reached their gates open their pull requests.
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
