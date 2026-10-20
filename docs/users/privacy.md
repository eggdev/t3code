---
id: privacy
title: Privacy
summary: Load this when a user asks what the product stores, who can see it, how long it is kept, or how to export or delete it.
type: reference
---

# Privacy

What the product stores about you, who can see it, how long it is kept, and how
to get it or remove it.

## Who is responsible for your data

You are. Clyde runs on your own Mac mini and Spark, for you alone. No company
runs it for you, and no one else has an account.

## What Clyde stores

| Data                                       | Why Clyde needs it                                | Where it lives                      |
| ------------------------------------------ | ------------------------------------------------- | ----------------------------------- |
| Chats, ticket runs, gate results, projects | To show and resume your work                      | The event store on the Mac mini     |
| Full agent and gate logs                   | To show what each step and gate did               | Files on the Mac mini               |
| Run events not yet delivered               | So a run keeps working while the Mac mini is away | The worker log on each sandbox host |
| Code and workflows                         | The work itself                                   | Your GitHub repositories            |
| Linear, GitHub, model and push credentials | To act for you                                    | The 1Password vault "Clyde"         |
| Encrypted backups                          | To recover from a lost disk                       | Your Cloudflare R2 bucket           |

## Who can see your data

Only you, from a device on your tailnet with your Tailscale identity. Agents
see the project they work on, and only that project.

## What an agent can never see

- Your Linear, GitHub, model and push credentials.
- Another project's code, runs or secrets.
- Your Mac mini's files outside the run's sandbox.

## How long Clyde keeps data

| Data                      | How long                         | Why                                                |
| ------------------------- | -------------------------------- | -------------------------------------------------- |
| Chats, runs, gate results | For good                         | Gate results prove each pull request               |
| Full agent and gate logs  | 90 days                          | They are large. The gate result keeps the log tail |
| Undelivered run events    | Until the Mac mini confirms them | They exist only to cross an outage                 |
| Backups                   | At least 30 days, locked         | So no key can delete a recent backup               |

## Service providers

| Provider          | What it processes                               |
| ----------------- | ----------------------------------------------- |
| Linear            | Your tickets and Clyde's agent activity         |
| GitHub            | Your code, branches and pull requests           |
| OpenAI, Anthropic | The prompts and code that agents send to models |
| Tailscale         | The connection between your devices and Clyde   |
| Cloudflare        | Encrypted backups in R2                         |
| 1Password         | Clyde's credentials                             |
| Apple             | Push notifications to the iOS app               |

## Your choices

- **Export.** Your data is on your own Mac mini: the event store is a SQLite
  file, and the logs are plain files.
- **Delete.** Delete a thread in the app. Remove Clyde's state folder to remove
  everything. The locked backups go when their 30 days end.

## Operator access

You are the only operator. No one else can reach Clyde.
