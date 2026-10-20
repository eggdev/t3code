# Checks

Clyde's gate is T3 Code's toolchain
([0008](../decisions/0008-no-nx-in-the-fork.md)). Run every command from the
repository root.

| Command            | What it checks                                         |
| ------------------ | ------------------------------------------------------ |
| `pnpm vp check`    | Format, lint and the type-aware checks that Vite+ runs |
| `pnpm typecheck`   | The Effect `tsgo` typecheck of each package            |
| `pnpm test`        | Every Vitest project                                   |
| `pnpm knip:check`  | Unused files, exports and dependencies                 |
| `pnpm lint:mobile` | The iOS app's native static check                      |

Run them before you say a change is done. CI runs them on each PR.

## Generated files

Generators write committed files, and CI checks each one with `--check`. See
[TypeScript](./typescript.md).

## Performance

Clyde uses T3 Code's performance checks
([client performance](../architecture/client-performance.md)), such as
`pnpm test:perf:v2-wire` for the thread transport.

## CI

In the fork, T3 Code's `.github/workflows/ci.yml` is Clyde's CI: `vp check`,
knip, the generator checks, the desktop build, the typecheck and `vp test`.
Clyde adds:

- The end-to-end journeys, against the test Linear workspace and the test
  GitHub repository ([end-to-end testing](../end-to-end-testing.md)).
- The docs checks for decision records, the primitives registry and leftover
  kickoff slots. Until they run in CI, a reviewer checks them by hand.

Each workflow sets a top-level `permissions` block. Start from
`contents: read`, and grant more only in the job that needs it.
