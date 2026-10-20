# 0007: No per-PR preview environment

- **Status:** accepted
- **Date:** 2026-10-20

## Context

The template's default gives each PR a live preview and deploys production on
merge. Clyde's only host is the Mac mini
([journey: first setup](../architecture/journey-first-setup.md)). A live
Clyde needs a Linear app, sandbox hosts and a tailnet address. T3 Code's
launcher installs an exact version, snapshots SQLite, runs the new version as
a trial and rolls back a failed trial (`docs/internals/server-updates.md` in T3
Code).

## Decision

Clyde has no per-PR preview environment. A merge to `main` deploys production
through T3 Code's launcher. The end-to-end journeys run in CI against a
throwaway server, a test Linear workspace and a test GitHub repository.

## Consequences

- One live Clyde, on the Mac mini. No second Linear app, tailnet address or
  sandbox pool for each PR.
- A PR proves its flows through the CI journeys, not by a walk through a
  preview.
- A bad release reaches production. The launcher's trial and rollback, and the
  rollback runbook, limit the damage.

**Revisit if:** a change that passed the CI journeys breaks production twice
in one month.
