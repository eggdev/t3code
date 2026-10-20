# Notifications

Clyde tells the owner when something needs them. It has no external error
tracker.

| Event                                                                       | How the owner hears                                 |
| --------------------------------------------------------------------------- | --------------------------------------------------- |
| A ticket run asks a question or waits for approval                          | Linear's own notification, from the elicitation     |
| A chat session finishes or waits                                            | An APNs push from the Mac mini to the Clyde iOS app |
| A part is unhealthy: a sandbox host, the Linear token, a backup or the disk | An APNs push, and a red badge on the health view    |

## Rules

- The Mac mini sends pushes straight to APNs. Clyde does not use T3 Connect's
  relay, which carries T3 Code's pushes upstream
  (`apps/mobile/src/features/agent-awareness/` in T3 Code).
- The APNs key lives in the 1Password vault "Clyde". It needs the owner's Apple
  Developer Program membership, which also keeps the iOS app's builds from
  expiring after 7 days.
- Server errors go to the event store and the health view. No error tracker
  vendor gets them.
- Each unhealthy part sends one push when it fails and one when it recovers,
  not one push for each failed check.

## What to read when changing it

- [Journey: recovery](./journey-recovery.md)
- [Linear](./linear.md)
