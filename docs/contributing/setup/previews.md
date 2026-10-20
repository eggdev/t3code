# Previews

Clyde has no per-PR preview environment
([0007](../decisions/0007-no-per-pr-previews.md)). A merge to `main` deploys
production on the Mac mini through T3 Code's launcher, which runs the new
version as a trial and rolls back a failed one. There is no staging step.

## The CI journeys stand in for a preview

The end-to-end journeys run in CI against a throwaway server, a test Linear
workspace and a test GitHub repository. For a change that the owner can see,
the PR names the journeys that cover it. A green health check shows only that
the server started. See the
[PR template](../../../.github/pull_request_template.md).

## Destructive automation checks the name first

Each script or workflow that deletes a cloud resource checks the resource name
before the call. The check accepts only the names that the script may delete,
such as the preview prefix. It throws on any other name. This stops a cleanup
script that reads the wrong variable from deleting production.

- Put the guard in the same function as the delete call.
- Cleanup runs again safely. A resource that is already gone is a success.
- A cleanup run reports one failure for all resources that it could not delete.
  It never stops at the first one.

Clyde's destructive automation deletes three kinds of resources. Each guard
accepts only its prefix:

- Sandbox cleanup deletes only containers and Tart VMs named `clyde-sbx-`.
- The nightly log job deletes only files under Clyde's log folder.
- CI cleanup deletes only branches named `clyde/` in the test GitHub
  repository, and only issues in the test Linear workspace.

Until a check rejects a delete call without its guard, CodeRabbit flags an
unguarded delete.
