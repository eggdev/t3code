# 0004: No GitHub App; Clyde pushes with the owner's gh login

- **Status:** accepted
- **Date:** 2026-10-20

## Context

Clyde pushes branches and opens pull requests for ticket runs and chat
sessions. `linear-agent` used the owner's `gh` login on the Spark worker, and
its docs list a scoped GitHub App as future hardening. A GitHub App gives
1-hour tokens for picked repositories and a `clyde[bot]` author.

## Decision

Clyde does not use a GitHub App. It pushes and opens pull requests with the
owner's `gh` login. The token lives in Clyde's own secret store, apart from
`gh`'s default store, and never enters a sandbox.

## Consequences

- No App to register, install on each repository or rotate keys for.
- Pull requests are authored by the owner, so the owner cannot approve them on
  GitHub. Clyde's gates are the approval.
- The token reaches every repository the owner can reach. Only the trusted
  push process reads it ([invariant 3](../project-intent.md#hard-invariants)).
  Branch protection on each default branch is the second line.

**Revisit if:** a second machine outside the owner's control needs to push, or
the owner wants pull requests authored by a bot account.
