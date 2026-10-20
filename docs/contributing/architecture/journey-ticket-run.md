# Journey: ticket run from Linear to pull request

The owner hands a Linear issue to Clyde. The project's workflow takes it
through its steps and gates to a pull request, and the owner can talk with the
run at any step.

| Question                          | Answer                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| What starts a run?                | The owner delegates the issue to Clyde, or mentions Clyde on it.                       |
| Which project runs it?            | The Clyde project mapped to the issue's Linear team, and its Linear project if any.    |
| What moves the run between steps? | The project's workflow. Clyde sets the Linear status to match the current step.        |
| Where does each step run?         | In its own sandbox on the project's sandbox host.                                      |
| Where can the owner talk with it? | In the Linear agent session and in the run's thread in the apps. Both reach the agent. |
| When does a pull request stack?   | When an issue that blocks this one has an open Clyde pull request.                     |

## Rules

- The workflow is the one source of the step order. The Linear status mirrors
  it. When the owner moves the status, Clyde treats it as a command: back to
  **Backlog** plans the issue again.
- A step that needs the owner's approval is a step in the workflow. The run
  waits there, and the owner approves in Linear or in the app.
- Clyde accepts a run only from the owner
  ([invariant 2](../project-intent.md#hard-invariants)).
- Runs on different issues run at the same time. Each sandbox host has a limit
  on concurrent sandboxes, and runs past the limit wait in the queue.
- A stacked run branches from its base's branch, and its pull request targets
  that branch. When the base merges, Clyde rebases the stack and runs the gates
  again.

## The walk

1. **Start.** The owner delegates the issue. Within seconds, the Linear agent
   session shows Clyde's first thought.
2. **Workflow.** Clyde starts the project's workflow. The default steps are
   plan, build, the gates (`validate`, then review) and pull request.
3. **Watch.** The run is a thread in the apps, beside the chats. It shows the
   workflow, the current step and the agent's stream. The Linear session shows
   the same activity in short form.
4. **Converse.** A reply in Linear or in the app goes to the run's agent. When
   the agent needs an answer, it asks in both places, and the run waits.
5. **Open.** When every gate passes, the trusted process pushes the branch and
   opens the pull request. Clyde links it to the issue and moves the issue to
   **In Review**.
6. **Merge.** The owner merges the pull request. Clyde moves the issue to
   **Done**.

## Empty, error and offline states

| State                               | What the owner sees                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| The issue's team maps to no project | In Linear: "No Clyde project for this team", with a link to add one in the app.             |
| Another workspace member starts it  | In Linear: "Only the owner can start Clyde." Nothing runs.                                  |
| The agent asks a question           | An elicitation in Linear and a waiting badge on the run's thread in the apps.               |
| A gate fails                        | The gate, its command and its log tail, in both places. The workflow decides the next step. |
| The sandbox host is full or offline | "Waiting for a sandbox", with the run's place in the queue.                                 |
| The base of a stack fails its gates | The stacked run waits, with a link to the base run.                                         |

## What to read when changing it

- [Project intent](../project-intent.md#hard-invariants), invariants 1 to 4
- [Journey: chat session to pull request](./journey-chat-to-pull-request.md)
- `linear-agent/docs/platform.md` for the Linear agent session API
