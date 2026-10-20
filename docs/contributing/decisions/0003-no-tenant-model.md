# 0003: No tenant model

- **Status:** accepted
- **Date:** 2026-10-20

## Context

The template's data storage page makes every resource belong to a tenant, with
a personal tenant even for a product with one user. Clyde has one owner, and
no second user is planned ([project intent](../project-intent.md)). Clyde is a
tracking fork of T3 Code ([0001](./0001-tracking-fork-of-t3-code.md)), and T3
Code's tables have no tenant column.

## Decision

Clyde has no tenant model. No table, key or request carries a tenant ID. The
two lines that separate data are the Clyde project and the Linear workspace.

## Consequences

- No upstream table or query changes to add a tenant column, so upstream
  merges stay small.
- A run, its sandbox, its grants and its logs belong to one Clyde project. A
  run never reads another project's checkout or secrets.
- Every Linear reference carries its workspace ID, so a second Linear
  workspace needs no change to stored shapes.
- A second human user would need a tenant model added to every Clyde table.
  The owner rules this out.

**Revisit if:** the owner decides that a second person will use Clyde.
