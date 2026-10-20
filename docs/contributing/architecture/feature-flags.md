# Feature flags

Clyde has no feature flag service and no product analytics
([0005](../decisions/0005-no-feature-flags-or-analytics.md)).

| Question                                    | Answer                                               |
| ------------------------------------------- | ---------------------------------------------------- |
| Which flags exist?                          | None                                                 |
| How does a change reach the owner?          | It ships when it merges                              |
| Where does one project differ from another? | In that project's `.clyde/workflow.yaml`             |
| Where do T3 Code's own settings live?       | Where upstream puts them. Clyde adds no flag to them |

## Rules

- **No code picks between two execution paths with a flag.** A new path
  replaces the old one in the same change. See
  [delete what is off the common path](../../principles/delete-off-the-common-path.md).
- **A per-project choice is a workflow field.** Add it to the workflow schema,
  and give it a default in Clyde's default workflow.

## What to read when changing it

- [Journey: edit a project's workflow](./journey-edit-workflow.md)
