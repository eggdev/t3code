# Journey: edit a project's workflow

Each project's workflow is a file in that project's repository. The owner
changes it through a chat, and the change reaches the default branch through
the gates.

| Question                                 | Answer                                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| Where does a workflow live?              | `.clyde/workflow.yaml` in the project's repository.                                    |
| What does it hold?                       | The steps, the gates, the approval steps, and each agent step's provider and model.    |
| Which version does a run use?            | The version on the default branch when the run starts, until the run ends.             |
| How does the owner change it?            | **Edit workflow** opens a chat with the file in context. The change is a pull request. |
| Which workflow checks a workflow change? | The current one on the default branch, never the version in the pull request.          |

## Rules

- Git is the only store for workflows. Clyde keeps no copy of a workflow in
  its database. A run records the commit SHA of the workflow it uses.
- A pull request that changes `.clyde/workflow.yaml` passes the gates of the
  workflow on the default branch. An agent cannot weaken a gate in the pull
  request that the gate checks.
- A project with no workflow file uses Clyde's default workflow: plan, build,
  `validate`, review and pull request.
- Clyde validates the file before it starts a run. An invalid file stops the
  run before its first step, with the line and the reason.

## The walk

1. **See it.** The project's page shows the workflow as a graph, with each
   live run on its current step.
2. **Change it.** The owner selects **Edit workflow** and describes the
   change, or edits the graph. The agent writes the file.
3. **Gate it.** The owner opens a pull request. The current workflow's gates
   check it.
4. **Use it.** After the owner merges, each new run uses the new version. Runs
   that started before the merge keep their version.

## Empty, error and offline states

| State                                     | What the owner sees                                                              |
| ----------------------------------------- | -------------------------------------------------------------------------------- |
| No workflow file                          | The default workflow, marked "Default", with **Edit workflow** to make the file. |
| The file on the default branch is invalid | The graph view shows the line and the reason. New runs wait until a fix merges.  |
| The graph edit makes an invalid file      | The chat shows the reason before it commits.                                     |

## What to read when changing it

- [Project intent](../project-intent.md#hard-invariants), invariant 1
- [Journey: ticket run](./journey-ticket-run.md)
