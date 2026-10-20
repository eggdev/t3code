# TypeScript

Each runtime gets its own TypeScript environment. Code for a browser, a server
runtime and a test runner see different globals, so one shared config would let
a global type-check in code that cannot use it.

## Configs

Clyde uses T3 Code's TypeScript configs: `tsconfig.base.json` at the root and
one config in each package and app. `pnpm typecheck` runs Effect's `tsgo` over
each package ([0008](../decisions/0008-no-nx-in-the-fork.md)).

## Generated types

Some types come from a generator, such as route types. Commit the generated
file. CI runs each generator with `--check` and fails when the output differs
from the committed file.

T3 Code's generators, each checked in CI with `--check`:

- TanStack Router writes `apps/web/src/routeTree.gen.ts`.
- `vp run --filter @t3tools/source-control-github generate` writes the GitHub
  GraphQL operations.
- `vp run --filter t3 generate` writes the Expo GraphQL operations.
