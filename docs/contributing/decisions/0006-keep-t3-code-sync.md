# 0006: Keep T3 Code's command-and-receipt sync; no separate sync engine

- **Status:** accepted
- **Date:** 2026-10-20

## Context

The template's [local first](../../principles/local-first.md) principle
applies each write to a local store first and syncs it through a sync engine.
T3 Code ([0001](./0001-tracking-fork-of-t3-code.md)) uses an event log on the
server. A client sends a command. The server commits the events and a receipt
in one transaction and pushes the events to every client over a WebSocket. The
client keeps cached projections and drafts through a disconnect
(`docs/internals/overview.md` and `docs/internals/connection-runtime.md` in T3
Code).

## Decision

Clyde keeps T3 Code's sync model. It adds no sync engine and no client
mutation queue.

## Consequences

- Screens read the client's cached projections. A command's control shows a
  pending state until its receipt arrives.
- Every Clyde action changes state on the Mac mini or a sandbox host, so the
  server confirms each one.
- Messages append, so two devices never conflict on a message. On a setting,
  the last write wins.
- A command made while the Mac mini is unreachable does not apply. The client
  keeps the draft and sends it after it reconnects.
- No change to T3 Code's most central code, so upstream merges stay small.

**Revisit if:** the owner needs to act on a run while no client can reach the
Mac mini.
