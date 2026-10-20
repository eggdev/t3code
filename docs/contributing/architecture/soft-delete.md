# Soft delete

Clyde has no soft-delete module and no purge lane. T3 Code's event log keeps
history, and one nightly job removes old log files.

| Data                          | Delete                                                               | Retention                                  |
| ----------------------------- | -------------------------------------------------------------------- | ------------------------------------------ |
| Threads (chats and runs)      | T3 Code's own archive and delete events. Clyde adds no `deleted_at`. | Kept in the event log for good             |
| Gate results                  | Never ([invariant 1](../project-intent.md#hard-invariants))          | For good                                   |
| Projects                      | Removing a project stops new runs. Its runs and gate results stay.   | For good                                   |
| Full agent and gate log files | No delete action                                                     | 90 days, then the nightly job removes them |
| Worker log on each host       | None                                                                 | Until the Mac mini confirms each entry     |
| Sandboxes and their checkouts | Removed when their step ends                                         | The step's length                          |

## Rules

- **A delete is an event.** The projections hide a deleted thread. The event
  log keeps it. No query filters on a `deleted_at` column, because none exists.
- **A gate result outlives its log file.** The result row keeps the command,
  the outcome, the commit SHA and the log tail. After 90 days the full log file
  goes, and the row still proves the pull request.
- **The log job runs nightly in its own lane.** It removes log files older than
  90 days, after restic has taken that night's snapshot. It writes one event
  that counts what it removed.
- Nothing in Clyde has a legal duty to erase.

## What to read when changing it

- [Data storage](./data-storage.md)
- T3 Code: `apps/server/src/orchestration-v2/` for archive and delete events
