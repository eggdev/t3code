# Disaster recovery

How to get each store back after data loss, and how we know the path works.

| Question                              | Answer                                             |
| ------------------------------------- | -------------------------------------------------- |
| How much data can each store lose?    | The recovery targets below                         |
| What comes back, and from where?      | The three lists below                              |
| How do we know a recovery path works? | A live drill proved it. Each drill is an issue     |
| Who can delete a backup?              | No credential that can also delete production data |

## Recovery targets

| Store           | Recovery point            | Recovery time | Recovery path                                                 |
| --------------- | ------------------------- | ------------- | ------------------------------------------------------------- |
| Event store     | Seconds (Litestream)      | 1 hour        | `litestream restore` from R2 to a fresh Mac, then start Clyde |
| Log files       | 24 hours (nightly restic) | 2 hours       | `restic restore` from R2                                      |
| Worker logs     | Not needed                | None          | Each confirmed entry is already in the event store            |
| Sandboxes       | Not needed                | None          | A run resumes from its last committed step                    |
| Workflows, code | Owned by GitHub           | None          | Git is the source                                             |
| Secrets         | Owned by 1Password        | None          | The 1Password vault "Clyde"                                   |

## What comes back

Each store is on exactly one of these lists.

1. **Backed up.** A copy outside production restores it.
2. **Rebuilt.** The store is derived from other data, such as a search index or
   a cache. A command rebuilds it from the owner record. See
   [normalized source of truth](../../principles/normalized-source-of-truth.md).
3. **Accepted loss.** The owner accepts that this data can go, such as local
   logs. The entry says what users lose.

**Backed up:**

- Event store: Litestream streams the WAL to R2. Restore with
  `litestream restore`.
- Log files: restic takes a nightly snapshot to R2. Restore with
  `restic restore`.
- Secrets: 1Password keeps the vault "Clyde".

**Rebuilt:**

- Sandboxes: the worker starts a fresh sandbox and resumes the run.
- Workflows and code: Git on GitHub is the source.

**Accepted loss:**

- Worker logs: an entry the Mac mini has not confirmed is lost if the sandbox
  host's disk fails. The owner loses the last events of the runs on that host.

## A path counts only after a drill

A recovery path is a guess until a drill restores real data from it. Each drill
is an issue from the recovery drill form: the store, the backup it used, the
steps, the time it took and what failed. Until a drill proves a path, treat
its recovery target as unmet.

- Drill each backed-up store after its setup, and again after a change to its
  backup.
- Restore into a separate environment, never over production.
- A production restore follows a drill of the same path. An incident restore
  with no proven path is a one-way door. See
  [two-way and one-way doors](../../principles/two-way-doors.md).

Each drill restores into a separate folder on a laptop, after setup and again
after any backup change. Each drill is an issue in the Clyde project in Linear.

- Event store: no drill yet. The first drill follows the Litestream setup.
- Log files: no drill yet. The first drill follows the restic setup.

## Separate credentials

No single credential can delete both production data and its backups. The
backup store uses its own account or its own credential, and production
runtimes cannot delete from it. See [operator accounts](./operator-accounts.md).

In Clyde, an R2 bucket lock keeps each backup object for 30 days, so no key,
not even the Mac mini's, can delete it inside that window. Litestream's own
cleanup is off. An R2 lifecycle rule removes objects after the lock ends.

The restic repository password encrypts the log snapshots. Its escrow copy is
the 1Password vault "Clyde", and each log drill opens it.

## Encryption keys

This section applies only when the project encrypts stored data with a key that
it holds. Kickoff decides that from a stated threat. Most projects rely on the
encryption of their storage vendor and skip it.

A key that encrypts stored data has an escrow copy outside the vendor that uses
it. A drill opens the escrow copy and decrypts sample data with it. A copy that
nobody has opened is not proven. See [secret rotation](./secret-rotation.md).
