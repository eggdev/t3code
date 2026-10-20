# 0011: An interrupted turn retries after a restart; no reattach

- **Status:** accepted
- **Date:** 2026-10-20

## Context

[0010](./0010-agents-driven-from-the-server.md) had the agent's current turn
keep running in its sandbox through a Mac mini outage, with the worker
buffering its output for the server to read after a restart. T3 Code's
recovery does not reattach to a running agent process: it retires the old
turn and resumes the thread from its saved history. Reattaching would mean
rewriting that recovery, which is the merge-heavy path 0010 avoided. When
the server stops, the ssh relay closes and the sandbox stops with it.

## Decision

When the server stops, the running turn stops. The prompt and every
completed step stay in the thread. After the restart, Clyde resumes the
thread, and a ticket run retries the interrupted step from its last committed
state. The worker buffers nothing.

## Consequences

- Invariant 4 holds: no accepted prompt is lost.
- An outage costs the interrupted step's work, which the retry repeats.
- No change to T3 Code's recovery, so upstream merges stay small.
- The Mac mini never sleeps and the launcher restarts it, so outages stay rare
  and short.

**Revisit if:** retried steps cost more than one hour of agent work in a month.
