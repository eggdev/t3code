# Journey: chat session to pull request

The owner talks with an agent about a project. When the work is ready, the
same gates that guard a ticket run decide whether it becomes a pull request.

| Question                                | Answer                                                                        |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| Where does the chat's agent work?       | In a new Git worktree on the Mac mini, on the branch `clyde/chat-<id>`.       |
| Who starts the pull request?            | The owner, with **Open pull request** or by asking the agent.                 |
| Where do the gates run?                 | In a fresh sandbox on the project's sandbox host, from the exact head commit. |
| Which gates run?                        | The gates of the project's workflow. The default is `validate`, then review.  |
| Who pushes the branch and opens the PR? | The trusted process outside the sandbox, after every gate passes.             |

## Rules

- A gate never runs in the chat's worktree. A pass there does not prove the
  commit, because the worktree can hold files that were never committed.
- Each gate result names the commit SHA it checked. A new commit makes the
  earlier results stale, and the gates run again from the start.
- The review gate is a separate agent with a fresh context. It sees the diff
  and the project's rules, and not the chat.
- A chat can link to a Linear issue at any step. The link is optional.

## The walk

1. **Start.** The owner picks a project and starts a chat. Clyde makes a
   worktree and a branch for it.
2. **Work.** The owner and the agent work in the thread. The agent edits
   files, runs commands and commits in the worktree.
3. **Ask for a pull request.** Clyde hands the head commit to the project's
   workflow, at its first gate.
4. **Gates.** Each gate runs in a fresh sandbox. Its result and log appear in
   the thread as it finishes.
5. **Fix.** When a gate fails, the owner keeps chatting. A new commit starts
   the gates again.
6. **Open.** When every gate passes, the trusted process pushes the branch and
   opens the pull request. The thread shows the link.

## Empty, error and offline states

| State                             | What the owner sees                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| A gate fails                      | The gate, its command and the tail of its log, with a link to the full log.                |
| Review asks for changes           | The review's findings in the thread. The owner and the agent work on them.                 |
| The sandbox host is offline       | "Sandbox host offline". The gates wait and start when the host returns.                    |
| The worktree has uncommitted work | **Open pull request** lists the uncommitted files and asks the agent to commit them first. |
| Push or PR creation fails         | The error from GitHub. The gate results stay valid for that commit, so a retry skips them. |

## What to read when changing it

- [Project intent](../project-intent.md#hard-invariants), invariants 1 and 3
- [Journey: first setup](./journey-first-setup.md)
