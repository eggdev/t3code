# 0008: No Nx remote cache; T3 Code's CI and setup replace the template's

- **Status:** accepted
- **Date:** 2026-10-20

## Context

The template runs every task through Nx, with a remote cache on a Cloudflare
Worker and an R2 bucket for each project (`apps/nx-cache`). Its `validate`
gate, checks, TypeScript generators and CI workflow assume Nx and Bun. Clyde
keeps T3 Code's toolchain ([0001](./0001-tracking-fork-of-t3-code.md)): pnpm,
Vite+ (`vp`), Vitest and Effect's `tsgo` typecheck. T3 Code does not use Nx.

## Decision

Clyde sets up no Nx remote cache and adds no Nx config to the fork.
`apps/nx-cache` does not move into the fork. T3 Code's scripts, checks and
`.github/workflows/ci.yml` are Clyde's gate and CI. The install's Reconcile
phase records each template file that this replaces as `keep`, with a link to
this record.

## Consequences

- No Cloudflare Worker or bucket for a cache.
- The fork's root config files stay as upstream ships them, so upstream merges
  stay small.
- The template's checks that run through Nx (`check-decisions`,
  `check-primitives`, `check-kickoff-slots`) need a `vp` or `pnpm` script in
  the fork to keep running on each PR.
- CI caching is what T3 Code's workflows do, and no more.

**Revisit if:** upstream T3 Code adopts Nx, or CI time on a PR passes 20
minutes.
