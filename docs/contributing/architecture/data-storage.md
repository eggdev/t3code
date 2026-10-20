# Data storage

Where each fact lives, and the lines that keep projects apart.

| Question                        | Answer                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------ |
| Which stores exist?             | The data inventory below                                                       |
| Which tenant owns a record?     | None. Clyde has no tenant model ([0003](../decisions/0003-no-tenant-model.md)) |
| What separates data?            | The Clyde project and the Linear workspace                                     |
| What can never change in place? | The frozen storage contracts below                                             |

## Project and workspace isolation

Clyde has one owner and no tenant model. Two lines separate data:

- **Clyde project.** A run, its sandbox, its grants and its logs belong to one
  project. A run never reads another project's checkout or secrets. Each
  project-scoped test covers both paths: a run reads its own project, and a
  read of another project fails.
- **Linear workspace.** Every stored Linear reference (team, issue, project,
  agent session, OAuth token) carries its workspace ID.

## Data inventory

One inventory lists every store that holds tenant data. Deletion and export both
read it, so they always cover the same data. A test fails when a table that
grows has no retention rule or a written exemption.

| Store                        | Where                                                         | What it holds                                                                                                                       | Retention                              | Exported  |
| ---------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------- |
| T3 Code's SQLite event store | Mac mini                                                      | Threads, runs, gate results, Linear sessions, projects. Clyde adds its own tables through T3 Code's migrations, in Clyde's modules. | Kept                                   | Backup    |
| Worker log (SQLite)          | Spark                                                         | Each run's events and gate results, in order                                                                                        | Until the Mac mini confirms each entry | No        |
| Gate and run logs (files)    | Mac mini disk                                                 | Full logs, referenced by ID from the event store                                                                                    | 90 days                                | Backup    |
| Git                          | GitHub                                                        | Code, and each project's `.clyde/workflow.yaml`                                                                                     | Owned by GitHub                        | It is Git |
| Secrets                      | 1Password vault "Clyde", read headless with a service account | The `gh` token, Linear OAuth tokens, model keys, R2 keys                                                                            | Until the owner revokes them           | Never     |

Backups go to one Cloudflare R2 bucket:

- Litestream streams the event store's WAL to R2 within seconds and restores
  to any point in time. T3 Code runs SQLite in WAL mode
  (`apps/server/src/persistence/Sqlite.ts`).
- restic takes a nightly encrypted snapshot of the log files.

T3 Code sets `synchronous = NORMAL`, so a power loss can drop the last commits
before a checkpoint. Linear events survive this, because Clyde asks Linear for
missed sessions at start. A client resends a message until it gets the
server's receipt.

## Frozen storage contracts

Some identifiers and stored shapes outlive any deploy: key formats, object
names, JSON stored in a column. They are cheap to list and costly to discover
later. A change to one adds fields on write and stays compatible on read,
unless a migration rewrites every stored copy. See
[two-way and one-way doors](../../principles/two-way-doors.md).

| Contract                          | Shape                                                                                                                                                                                 | Why it is frozen                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `.clyde/workflow.yaml`            | Starts with `version: 1`. Clyde reads every version it shipped. A new version adds fields with defaults. A breaking change ships as a new version and a pull request to each project. | Copies live in other repositories and old branches              |
| Clyde's events in the event store | T3 Code's event envelope, with `clyde.*` event types. Fields are only added.                                                                                                          | The log replays from the start                                  |
| Gate result                       | Run ID, gate ID, commit SHA, workflow SHA, outcome, command, log tail, log file ID, time                                                                                              | [Invariant 1](../project-intent.md#hard-invariants) rests on it |
| Worker log entry                  | Run ID, sequence number, event                                                                                                                                                        | The Mac mini confirms entries by sequence number                |
| Branch names                      | `clyde/chat-<thread-id>` and `clyde/<linear-issue-identifier>`                                                                                                                        | Open pull requests point at them                                |
| Linear activity IDs               | Derived from the run ID and the sequence number, so a retry posts once                                                                                                                | Linear keeps them                                               |

## Migrations

Clyde's tables use the `clyde_` prefix and their own migration sequence, kept
in a `clyde_migrations` table. A Clyde migration never joins T3 Code's
numbered list in `apps/server/src/persistence/Migrations/`, so an upstream
migration never collides with a Clyde number at merge time.

## What to read when changing it

- T3 Code: `apps/server/src/persistence/Sqlite.ts`,
  `apps/server/src/persistence/Migrations.ts` and
  `apps/server/src/persistence/OrchestrationEventStore.ts`

- [Normalized source of truth](../../principles/normalized-source-of-truth.md)
- [Soft delete](./soft-delete.md): what delete does, and when data goes for good
