# 0005: No feature flag service and no product analytics

- **Status:** accepted
- **Date:** 2026-10-20

## Context

The template's default is PostHog for feature flags and product analytics.
Clyde has one user ([project intent](../project-intent.md)). In
`linear-agent`, flags such as `phaseSessions`, `buildWorkflow`,
`todoReadiness` and `planningEnabled` picked between two execution paths, and
their startup checks grew with each flag.

## Decision

Clyde has no feature flag service and no product analytics. A change ships
when it merges. A difference between projects lives in that project's
`.clyde/workflow.yaml`.

## Consequences

- One execution path for each kind of work, with no flag that picks a path.
- No analytics vendor. The event store's record of runs, gates and health is
  what the owner reads.
- T3 Code's server sends PostHog telemetry
  (`docs/internals/product-analytics.md` in T3 Code). Clyde turns it off with
  T3 Code's own opt-out setting, so no upstream file changes.
- T3 Code's own settings stay as upstream ships them. Clyde adds no flag to
  them.
- A risky change cannot reach part of the traffic first. The gates and the
  owner's review stand in for a staged rollout.

**Revisit if:** a second person uses Clyde, or a change needs a staged rollout
that the gates cannot cover.
