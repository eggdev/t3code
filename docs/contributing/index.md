# Contributing

This is the documentation for people and agents who develop this project. Open
the page that owns your task. Do not read this folder from top to bottom.

## Start here

- [Project intent](./project-intent.md): users, goals, hard invariants and
  what not to assume. Read it before a product decision.
- [Engineering principles](../principles/index.md)
- [Decision records](./decisions/index.md): the nos already decided. Read them
  before you propose a new primitive, surface or storage home.
- [Root README](../../README.md): set up and run the project from a fresh clone

## Setup and workflow

- [Setup](./setup/index.md): local services, configuration, checks
- [Harness engineering](./harness-engineering.md): the agent-first loop, how to
  turn a repeated lesson into a check, and PR review
- [Testing](./testing.md) and [end-to-end testing](./end-to-end-testing.md):
  which test type to write, console output, journeys
- [Security](./security.md): the rules each change keeps, and the risks
  accepted on purpose
- [Operations](./operations/index.md): rollback, secret rotation, operator
  accounts and the runbook shape

## Architecture

- [Architecture](./architecture/index.md): runtime map, module ownership and one
  page for each system

- [Journey: ticket run](./architecture/journey-ticket-run.md): changing how a
  Linear issue moves through a workflow
- [Journey: chat session to pull request](./architecture/journey-chat-to-pull-request.md):
  changing chats, or where gates run
- [Sandboxes](./architecture/sandboxes.md): changing a sandbox host, its
  isolation or its network
- [Linear](./architecture/linear.md): changing the Linear app, its events or
  the team-to-project map
- [Data storage](./architecture/data-storage.md): adding a table, a stored
  shape or a migration

## Code and tooling

- [Import boundaries](./import-boundaries.md): where Clyde's code lives, and
  vendor owners
- [Checks](./setup/checks.md): T3 Code's gate, and what Clyde adds

## Writing docs

- [User docs](../users/README.md): page types and frontmatter for docs that
  users and their agents read
- [Documentation principles](./documentation.md): present tense, no status,
  one home for each fact, checks over should-lists
- [Documentation maintenance](./setup/documentation-maintenance.md)
