# Client performance

The speed budgets for the client, and the checks that keep them. The rules
behind this page are [local first](../../principles/local-first.md),
[fast first load](../../principles/fast-first-load.md) and
[compositor-only motion](../../principles/compositor-only-motion.md).

## Budgets

These budgets are the same in every project that starts from the template. A
project can make a budget stricter. It never makes one looser. Each budget has
a check in CI.

| Budget                                       | Limit                       | Measured by                                          |
| -------------------------------------------- | --------------------------- | ---------------------------------------------------- |
| Input to next paint, for a local write       | 50 ms at p75                | End-to-end test with a trace                         |
| Network requests before a warm screen paints | 0                           | End-to-end test with a warm store                    |
| JavaScript for the first screen, compressed  | 150 KB                      | Build output check                                   |
| Largest contentful paint, cold visit         | 1.5 s at p75 on a mid phone | Lab run against each preview                         |
| Largest contentful paint, warm visit         | 0.5 s at p75                | Lab run against each preview                         |
| Animated layout properties                   | 0                           | `lint`: `no-low-performance-animation-properties`    |
| Duration literals outside the speed tokens   | 0                           | `lint`: `declaration-property-value-disallowed-list` |
| Duration classes outside the speed tokens    | 0                           | `lint`: `repo-classes/speed-tokens-only`             |
| `transition-all` classes                     | 0                           | `lint`: `repo-classes/no-transition-all`             |
| Longest speed token                          | 350 ms                      | `lint`: `declaration-property-value-allowed-list`    |
| Motion for a frequent interaction            | 150 ms                      | The quick and fade-out speed tokens                  |

In the fork, T3 Code's lint (`vp lint` with `oxlint-plugin-t3code/`) runs the
lint rules it has. A rule in this table that T3 Code's lint does not have is
an open gap, tracked in Linear.

Clyde has no public site, so the cold-visit and live-site checks do not
apply. T3 Code's performance rules and regression checks
(`docs/internals/performance-regressions.md` in T3 Code) carry the other
budgets, run by T3 Code's toolchain
([0001](../decisions/0001-tracking-fork-of-t3-code.md)). Clyde adds one check:
a run's thread paints from the cached projections with no network request
first. It is the warm-store test for Clyde's screens.

## Rules

- A stricter budget goes in the same PR as the reason for it.
- The build marks the app start with `performance.mark('appStart')` in the
  inline boot script. Each budget that starts at boot measures from that mark.
- A new dependency in the first-screen chunks names its compressed size in
  the PR.

## Build

Clyde builds with T3 Code's toolchain: Vite+ for `apps/web` inside Electron,
and the React Native build for `apps/mobile`. Electron loads the app from
disk, so there is no service worker and no browser target list.

## What to read when changing it

- T3 Code: `vite.config.ts`, `apps/web/`, `apps/desktop/` and
  `docs/internals/performance-regressions.md`

- [Local-first sync](./local-first-sync.md)
- [Fix the root bottleneck](../../principles/fix-the-root-bottleneck.md)
