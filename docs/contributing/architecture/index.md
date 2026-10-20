# Architecture

This folder describes how the system works. Read
[project intent](../project-intent.md) for what the product is. Read
[decision records](../decisions/index.md) before you propose a new primitive,
surface or storage home.

## Runtime map

| Unit                    | Public surface                                            | Owns                                                                     | Binds                                                         |
| ----------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Clyde server (Mac mini) | Tailscale HTTPS for the apps; the Linear webhook route    | Threads, chat sessions and their agents, projects, Linear, the `gh` push | Event store, log files, 1Password, Linear, GitHub, the worker |
| Clyde worker (Spark)    | None. It connects outbound to the server over the tailnet | Ticket runs: the workflow engine, agent sandboxes and gate sandboxes     | Worker log, model gateway, Docker, the server                 |
| Clyde worker (Mac mini) | None. It connects to the server on the same machine       | iOS ticket runs in Tart macOS VMs                                        | Tart, Worker log, the server                                  |
| Model gateway (Spark)   | The sandboxes' internal network only                      | Model keys; adds them to each model call                                 | 1Password, hosted model APIs                                  |
| Desktop app and iOS app | None                                                      | The owner's view and input                                               | The server                                                    |
| Event store (SQLite)    | None                                                      | The server's state, in T3 Code's event shape plus Clyde's tables         | Litestream to R2                                              |
| Worker log (SQLite)     | None                                                      | Each run's events until the server confirms them                         | None                                                          |
| Log files               | None                                                      | Full agent and gate logs                                                 | restic to R2                                                  |

## Modules

The [primitives registry](./primitives.yaml) is the list of primitives. Each
entry names its group, its kind (service, domain, app or tool), the folders it
owns, its docs and, for a service, its vendors. The registry never records dependencies between primitives. The imports show
them.

Clyde is the T3 Code server with Clyde's own modules for Linear, workflows,
gates and sandboxes. The Spark worker is a headless run engine built from T3
Code's provider packages, and it streams each ticket run into a T3 Code thread
on the server. The product primitives join the registry as their code folders land in this
fork.

Services are molecules: focused and the same everywhere. Domains are organisms:
they combine services into a feature. The import rules are in
[import boundaries](../import-boundaries.md).

## Module layout

```
packages/<name>/src/
  client.ts        plain TypeScript for apps and organisms
  server.ts        server entry
  server/db/**     schemas and queries
  ui/**            organisms and hooks (domains)
  testing/**       setup builders and vendor fakes, for tests only
```

## Workspace layout

- `apps/`: runnable applications: the server, the desktop app, the iOS app and
  the web UI that the desktop app renders.
- `packages/`: services, domains and the design system.
- `scripts/`: repository automation, as in T3 Code.

## Module design

- Prefer deep modules: a small caller interface that hides real complexity.
  Avoid pass-through layers and speculative packages.
- Add a module when ownership, lifecycle or callers need independent behavior.
- Test through caller-facing interfaces. See
  [test the workflow](../../principles/test-the-workflow.md).

## Source of truth in code

These are T3 Code's entry points. Clyde's own modules join them in the fork.

- `apps/server/src/bin.ts`: the server CLI, which starts the Clyde server on
  the Mac mini.
- `apps/server/src/bootstrap.ts`: the server's composition root, which builds
  its Effect layers.
- `apps/server/src/orchestration-v2/Orchestrator.ts`: decides events from
  commands.
- `apps/web/src/main.tsx` and `apps/web/src/routes/`: the desktop app's UI and
  its TanStack routes.
- `apps/desktop/src/boot.ts`: the Electron main process.
- `apps/mobile/src/App.tsx`: the iOS app.

## Pages

- [Request context](./request-context.md): how a request becomes an actor and
  a project
- [Authorization](./authorization.md): the access check, and the permission
  each surface declares
- [Data storage](./data-storage.md): tenant isolation, the data inventory and
  frozen storage contracts
- [Feature flags](./feature-flags.md): why Clyde has none, and where a
  per-project choice goes
- [API errors](./api-errors.md): one error shape, and the code for each status
- [Soft delete](./soft-delete.md): delete events, and how long each kind of
  data stays
- [MCP server](./mcp.md): the tools that agents call, and how to add one
- [Local-first sync](./local-first-sync.md): the local store, the mutation
  queue, and the writes that wait for the server
- [Client performance](./client-performance.md): the speed budgets and the
  check for each one
- [Styling](./styling.md): the token roles, the theme, the platforms and the
  styling checks

- [Journey: first setup](./journey-first-setup.md): the one server, the
  clients and the tailnet sign-in

- [Journey: chat session to pull request](./journey-chat-to-pull-request.md):
  how a chat reaches the gates, and where the gates run

- [Journey: ticket run](./journey-ticket-run.md): how a Linear issue moves
  through a workflow to a pull request, and how runs stack

- [Journey: edit a project's workflow](./journey-edit-workflow.md): where a
  workflow lives, and which version checks a workflow change

- [Journey: recovery](./journey-recovery.md): restarts, sleep and lost
  networks, and how runs continue without the Mac mini

- [Linear](./linear.md): the OAuth app, the events, the team-to-project map
  and the status rules
- [Model gateway](./model-gateway.md): how ticket runs reach hosted models
  with the owner's subscriptions

- [Notifications](./notifications.md): how Clyde tells the owner that
  something needs them
- [Sandboxes](./sandboxes.md): the sandbox hosts, their isolation and their
  network rules

## Page shape

Each page here follows one shape, so readers know where a fact lives:

1. A table that answers the page's core questions.
2. The rules, each one a sentence that a test or a check can prove.
3. A recipe for the common extension, such as a new entry point or a new
   store, when one exists.
4. "What to read when changing it": the files and pages to open first.

A runbook for a one-time operation lives in
[operations](../operations/index.md).
