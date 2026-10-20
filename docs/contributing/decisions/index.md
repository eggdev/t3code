# Decision records

A steering list of product-shaped decisions that are already made. Most are a no
with a revisit-if. Read the steering list before you propose a new primitive,
surface or storage home. [Architecture](../architecture/index.md) and code
describe how the system works.

## Keep a record short

Agents load these records often. A record has three parts: context, decision,
consequences. It has at most 500 words. A record that needs more is usually two
decisions, or an architecture page.

## When to add a record

Write one after you decide not to build something that the next agent would
otherwise propose again. Also write one before you go through a
[one-way door](../../principles/two-way-doors.md), such as a stored shape change.

1. Copy [`0000-template.md`](./0000-template.md) to the next unused number, with
   a kebab-case slug. Check this index on `main` first.
2. Add the record to the steering list below with a one-line summary of the no.

Do not write a record for each PR, for a layout or UI change, or for a library
pick that the code already shows.

The `check-decisions` target rejects:

- A duplicate number, or a file name that is not `NNNN-kebab-slug.md`
- A status other than the three above, or a status link to a record that does
  not exist or is not later
- A record with no `**Revisit if:**` line
- A record over 500 words
- A record that this index does not list once, or lists in the wrong section

## Changing a decision

Do not edit or delete an accepted record. Write a new record, then change only
the status line of the old one:

| The new record               | Old status                             | Old record in the index |
| ---------------------------- | -------------------------------------- | ----------------------- |
| Replaces the whole decision  | `superseded by [NNNN](./NNNN-slug.md)` | Historical              |
| Changes part of the decision | `amended by [NNNN](./NNNN-slug.md)`    | Steering list           |

A record amended more than once lists each amending record:
`amended by [0007](./0007-a.md), [0012](./0012-b.md)`.

## Steering list

- [0001](./0001-tracking-fork-of-t3-code.md): Clyde tracks upstream T3 Code
  and does not become a hard fork or take the template's toolchain.
- [0002](./0002-native-clients-only.md): no browser client, no Android client
  and no separate design system.

- [0003](./0003-no-tenant-model.md): no tenant model; data is separated by
  Clyde project and Linear workspace.

- [0004](./0004-no-github-app.md): no GitHub App; Clyde pushes with the
  owner's `gh` login from its own secret store.

- [0005](./0005-no-feature-flags-or-analytics.md): no feature flag service
  and no product analytics.

- [0006](./0006-keep-t3-code-sync.md): keep T3 Code's command-and-receipt
  sync; no separate sync engine or mutation queue.

- [0007](./0007-no-per-pr-previews.md): no per-PR preview environment; CI
  journeys and the launcher's rollback cover it.

- [0008](./0008-no-nx-in-the-fork.md): no Nx remote cache; T3 Code's CI and
  setup replace the template's.
- [0009](./0009-every-agent-in-a-sandbox.md): no agent process on the Mac
  mini; chats run in sandboxes like ticket runs.
- [0010](./0010-agents-driven-from-the-server.md): the server drives agents;
  only the agent CLI runs in the sandbox, and runs pause during an outage.

## Historical

None yet.
