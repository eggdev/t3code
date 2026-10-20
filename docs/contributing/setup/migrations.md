# Migrations

A migration changes a stored shape. Once it reaches `main`, it never changes.
To change the shape again, write a new migration. See
[two-way and one-way doors](../../principles/two-way-doors.md).

## Where migrations live

Migration files live in a folder named `migrations` under `apps/` or
`packages/`. The migration tool writes there. The check below finds them by that
name, so the folder needs no configuration.

T3 Code's migrator runs at server start (`apps/server/src/persistence/Migrations.ts`),
with its numbered files in `apps/server/src/persistence/Migrations/`. Clyde's
migrations run in their own sequence, on `clyde_` tables, recorded in a
`clyde_migrations` table ([data storage](../architecture/data-storage.md#migrations)).
`pnpm migrate-dev-db` applies them to the local database. The launcher's
trial applies them in production, after a snapshot that a failed trial
restores.

## The check

`check-migrations` compares the working tree with a base commit on `main`. It
rejects a change, a rename or a deletion of a migration that the base has. A new
migration passes. It runs in `validate`, in the pre-push hook and in CI.

| Where      | Base                              |
| ---------- | --------------------------------- |
| Local      | The merge base with `origin/main` |
| CI, PR     | The PR's target branch            |
| CI, `main` | The commit before the push        |

When the check fails, restore the merged migration and write a new one.

## One-way migrations

Rehearse a one-way migration on a preview with seed data before it merges, and
attach the difference before and after to the PR. See
[seed data](./seeding.md) and [previews](./previews.md).
