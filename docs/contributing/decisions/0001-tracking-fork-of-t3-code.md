# 0001: Clyde is a tracking fork of T3 Code, not a hard fork

- **Status:** accepted
- **Date:** 2026-10-20

## Context

Clyde needs chat sessions with coding agents, a desktop app, an iOS app and
remote access over the tailnet. T3 Code
([eggdev/t3code](https://github.com/eggdev/t3code), a fork of
[pingdotgg/t3code](https://github.com/pingdotgg/t3code)) has all of these. It
has about 830k lines of TypeScript and a fast upstream: its PR numbers are near
22,300. It uses pnpm, Vite+, Vitest and Effect.

The project template installer replaces `AGENTS.md`, `docs/`, `.github/` and
the lint and build config. T3 Code has its own version of each file. The
earlier prototype, `linear-agent`, was a separate Node service with its own
small UI.

## Decision

eggdev/t3code is the product repository, and it tracks upstream. The owner
merges `pingdotgg/t3code` into the fork on a schedule. Clyde does not become a
hard fork, and it does not move T3 Code to the template's toolchain.

## Consequences

- Clyde's code lives in its own packages and server modules (Linear, workflows
  and gates, sandboxes), in new folders. A change to an upstream file is kept
  as small as possible, because each one costs a merge.
- T3 Code's toolchain (pnpm, Vite+, Vitest, Effect) is the build and the gate.
  The template's principles and docs apply. Its toolchain does not.
- Upstream features (new providers, fixes, desktop and mobile work) arrive with
  each merge.
- Clyde depends on upstream's direction. A large upstream rewrite of a module
  that Clyde extends costs a large merge.

**Revisit if:** an upstream merge takes more than one working day on two
merges in a row, or upstream changes its license away from MIT.
