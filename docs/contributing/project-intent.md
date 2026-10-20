# Project intent

Clyde is a software factory for one owner, built on a fork of T3 Code. Its
server runs on the owner's Mac mini. The owner reaches it over the tailnet from
the Clyde desktop app and the Clyde iOS app, and works in two modes, side by
side:

- **Chat sessions.** The owner talks with an agent about a configured project,
  as in T3 Code. Each session runs in its own sandbox on the project's
  sandbox host.
- **Ticket runs.** The owner assigns a Linear ticket to Clyde. Clyde runs it
  through the project's workflow in a sandbox on the DGX Spark or a remote
  host. The owner can chat with a ticket run from Linear or from the apps.

The core idea that every decision protects: **each pull request passes through
the gates of its project's workflow.** A chat session that opens a pull
request goes through the same gates as a ticket run. The owner sees the result
of each gate.

Read this file before you make a product decision. When other docs or code
conflict with it, this file states the intent.

## Owner

The owner is Brendan Eggers. An agent asks a question in a comment on the
Linear issue it works on, and mentions the owner. To ask for approval of a
one-way change, the agent adds the `needs-owner` label to the issue. It stops
work on that issue until the owner removes the label.

Work that is not done lives in Linear: the **Clyde** project in the
[ZAG team](https://linear.app/zaggers/team/ZAG/overview) of the `zaggers`
workspace. Docs never hold status.

## Who this is for

| User                               | Goal                                                                                                             |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Owner (the only user; nobody pays) | Turn ideas into merged code across many projects, from chat or from Linear tickets, without watching each agent. |
| Agents (no person behind them)     | Do one chat session or one ticket run inside a sandbox, with only the access that the project's workflow grants. |

Clyde is for the owner alone. No user group comes later, and nobody is
invited. Linear workspace members other than the owner cannot start or steer a
run.

The owner is one developer in the United States who runs many projects at the
same time: web apps, and iOS and Android apps that run on the Mac's
simulators. Clyde has no billing and no currency. The interface is in English
only.

Optimize for:

- **Trust in the gates.** The owner sees each gate's command, result and log
  for every pull request. Then the owner reviews outcomes and does not watch
  the agents.
- **Always on.** A run survives a Mac sleep, a restart or a lost network, and
  no prompt is lost.
- **Long, healthy runs.** A ticket run can work for hours. Clyde sets no limit
  on turns, time or spend for a run or a phase. The owner sees each run's
  progress.
- **One way to run work.** Each project has one workflow definition and one
  execution path. No feature flag picks between paths.
- **Fast native clients.** In the desktop app and the iOS app, chat sessions
  and ticket runs show side by side, update live and work from the keyboard.

Do not optimize for:

- **Other people.** Clyde has no teams, roles, sharing or public sign-up,
  because it has one user.
- **Public hosting.** Clyde runs on the owner's machines, and its clients
  connect over the tailnet. The Linear webhook route is the only public route. Agents and
  sandboxes can still reach the public internet.
- **A browser client or an Android client.** Clyde ships a desktop app and an
  iOS app only. Its look comes from T3 Code, with no separate design system.
- **Other trackers.** Clyde reads Linear only, and not GitHub Issues or Jira,
  because the owner plans work in Linear.
- **Local model inference.** Agents call hosted models. The Spark's GPU runs
  sandboxes and not models.
- **Old data.** Clyde does not import jobs, workflows or history from
  `linear-agent`. The old repository stays as a reference.

Later, not now:

- **More than one Linear workspace.** The owner may connect a second Linear
  workspace, each with its own teams. Clyde connects to one workspace and many
  of its teams now.
- **Auto-merge.** The owner merges each pull request now. Clyde can merge
  after its gates pass when the owner turns it on for a project.
- **Health rules for long runs.** Clyde stops no run today. A later rule
  defines an unhealthy run (no progress, or the same step in a loop), and
  Clyde stops only a run that breaks it.
- **Cloud sandboxes** (E2B, Daytona or Modal). They come in when a project
  needs more concurrent sandboxes than the Spark and the Mac mini hold.
- **Model inference on the Spark's GPU.** This comes when a local model passes
  a project's gates as well as a hosted model.

Do not build these yet, and do not design them out:

- Every stored Linear reference (team, issue, project, agent session, OAuth
  token) carries its Linear workspace ID. Code never assumes one workspace.

- Clyde stores each gate result against the exact commit SHA that it checked,
  so auto-merge can later prove that the merged commit passed every gate.
- A workflow step names its agent provider and model. No code assumes that a
  model is hosted, so a model on the Spark's GPU can later fill a step.

- Add no speculative code: no empty tables, no flags for features that do not
  exist, and no placeholder branches. See
  [delete what is off the common path](../principles/delete-off-the-common-path.md).

## Hard invariants

A change that breaks one of these breaks the business. Treat each change that
touches them as a one-way door
([two-way and one-way doors](../principles/two-way-doors.md)) and ask the
[owner](#owner).

1. **Each pull request that Clyde opens has a passing result for every gate
   of its project's workflow, on the pull request's head commit.** A new push
   makes the old results stale. Gate results are append-only. Nothing edits or
   deletes one. A pull request that changes a workflow passes the gates of the
   workflow on the default branch, never its own.
2. **Only the owner starts or steers work.** Clyde refuses a Linear agent
   session from any other workspace member. The clients connect only from a
   device on the owner's tailnet that carries the owner's Tailscale identity.
3. **Every agent runs in a sandbox, and a sandbox never holds Clyde's
   credentials or changes the default branch.** Chat sessions and ticket runs
   both run their agents in sandboxes, so the Mac mini runs no agent process.
   Linear OAuth tokens, model credentials and the `gh` token stay outside the
   sandbox. The agent commits inside the sandbox. A trusted process outside it
   takes the commits and pushes them to the run's branch. No agent pushes to
   the default branch, force-pushes, merges or deletes a branch.
4. **Clyde never loses an accepted prompt.** Clyde stores each Linear event
   and each client message before it acknowledges it. A run continues after a
   restart, a sleep or a lost connection.

## End-to-end journeys

Each hard invariant has one journey that proves it. See
[test the workflow](../principles/test-the-workflow.md).

1. **Gates guard every pull request.** The owner opens a pull request from a
   chat. A failing `validate` gate blocks it. After a fix commit, both gates
   pass on the new head SHA and the pull request opens. A pull request that
   weakens the workflow file is checked by the default branch's workflow and
   blocked.
2. **Only the owner.** A Linear session from another workspace member gets
   "Only the owner can start Clyde", and no run starts. A request with another
   Tailscale identity gets no data.
3. **The sandbox holds no credentials.** A ticket run's agent searches its
   sandbox's environment and files for the Linear, model and GitHub tokens and
   finds none. Its push to the default branch fails. The run's own branch
   reaches GitHub through the trusted process.
4. **No prompt is lost.** The owner replies to a ticket run, and the test kills
   the Clyde server before the agent reads the reply. The run keeps working on
   the sandbox host. After a restart, the agent gets the reply, and the run's
   thread shows every step in order.

## What not to assume

- **Clyde is T3 Code with a Linear plugin.** Clyde adds per-project workflows
  with gates. Ticket runs and chat sessions reach a pull request through the
  same gates.
- **The code from `linear-agent` gets ported.** `linear-agent` is a reference
  for behavior and security rules. Its code, its feature flags and its two
  execution paths do not move.
- **Tailscale is only a network route.** In T3 Code it is a route, and the
  user still pairs the client. In Clyde, the owner's Tailscale identity is the
  sign-in.
- **A long run is a stuck run.** A ticket run can work for hours. Do not add a
  timeout or a turn limit to a run or a phase.
- **The template's toolchain applies.** Clyde uses T3 Code's pnpm, Vite+ and
  Vitest ([0001](./decisions/0001-tracking-fork-of-t3-code.md)). The
  template's principles apply.

- **This is not a prototype.** This app is the one that ships, and `main` is
  production. The conclusion of a spike goes into a
  [decision record](./decisions/index.md). The code of the spike does not stay
  in the repository.

## Agent guidance

- Read this file before you add a screen, field, role or flow.
- Name the user. Each feature serves a goal from this page. If you cannot name
  one, ask the [owner](#owner) before you build.
- Check each change against the hard invariants. If a change touches one, ask
  the owner.
- Use the present tense only for behavior that exists in the repository. Keep
  roadmap items in "Later, not now".
