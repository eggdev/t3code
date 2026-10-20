# 0002: No browser client, no Android client and no separate design system

- **Status:** accepted
- **Date:** 2026-10-20

## Context

The first plan was a web dashboard styled with the Linear system from
[better-design.com](https://better-design.com/design-systems/linear), a dark
shadcn registry for Tailwind v4. Then the owner chose to build Clyde on T3 Code
([0001](./0001-tracking-fork-of-t3-code.md)). T3 Code has an Electron desktop
app, whose window renders `apps/web`, and a React Native mobile app. It has its
own theme tokens and UI primitives.

## Decision

Clyde ships two clients: the desktop app and the iOS app. It ships no browser
client and no Android client. Clyde keeps T3 Code's look, and it does not
import the better-design.com system or any other design system.

## Consequences

- `apps/web` stays in the repository as the desktop app's UI. It is not a
  deploy target.
- A new screen follows T3 Code's tokens and primitives, so upstream UI changes
  merge cleanly.
- The owner reaches Clyde from a phone only through the iOS app.

**Revisit if:** the owner needs Clyde from a machine that cannot run the
desktop app or the iOS app.
