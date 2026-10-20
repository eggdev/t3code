# Rollback

What to do when a deploy breaks production. When stored data is wrong, a code
rollback does not fix it. Use the data recovery runbook from the
[operations map](./index.md).

## 1. Decide fast

Find the bad commit SHA. The deploy log, the error tracker release and the
health endpoint each show it.

Clyde has no error tracker. The deploy workflow, the health view in the apps
and `t3 service status` on the Mac mini each show the running SHA. The server
CLI keeps T3 Code's name, `t3`, until the fork renames it.

| Symptom                                             | First action                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| The launcher's trial failed                         | Nothing. The launcher already rolled back the code and the database |
| The server committed, then the apps cannot connect  | Path A on the server                                                |
| Runs fail on one sandbox host after a worker update | Path A on that worker                                               |
| Only the desktop or iOS app is bad                  | Install the previous app build                                      |
| The deploy changed stored data or a secret          | Path B                                                              |

## 2. Choose the path

| Path                 | What it does                                           | Time         |
| -------------------- | ------------------------------------------------------ | ------------ |
| A: platform rollback | The host serves a version it already stores            | Minutes      |
| B: forward fix       | A revert or fix PR merges and the deploy workflow runs | One CI cycle |

Path A is safe only when all of these are true:

- Each migration in the bad deploy is additive: a new table, a new nullable
  column or a new index. The old code ignores it.
- No secret rotated in the same window. Old code with a new key can end all
  sessions or make encrypted data unreadable.
- The host can restore the version. Some hosts refuse a rollback across a
  storage or binding change.

If one is false, use Path B. Migrations only move forward. See
[two-way and one-way doors](../../principles/two-way-doors.md).

## 3. Path A: platform rollback

1. Freeze merges to the main branch. A new merge queues a deploy that replaces
   the rollback.
2. Never cancel a running deploy. A cancel can stop between a migration and the
   code that needs it. Wait for it to finish, then roll back from the live
   versions.
3. List the versions of each service and pick the target version ID.
4. Roll back callers before callees. A new caller that calls an old callee
   fails. Start with the public service.
5. Check health after each service. Do not wait for the end.
6. Keep the freeze until Path B lands the same code on the main branch.

On the Mac mini:

```sh
t3 service status          # running version, SHA and log location
t3 update <version> --yes  # pin the previous exact version
t3 service restart         # start it through the launcher's trial
```

Roll back the workers before the server: a new worker that talks to an old
server fails, and an old worker works with a new server, because Clyde's event
fields are only ever added. After each step, check the health view in the
apps.

## 4. Path B: forward fix

1. Open a revert PR or a fix PR against the main branch.
2. Merge it when CI passes.
3. Watch the deploy workflow until it ends.
4. Check that health reports the new SHA.

To put a known-good commit live, make it the head of the main branch. Do not
deploy an old SHA by hand.

## 5. After any rollback

1. Check health and the error rate on each service that moved.
2. Confirm that new errors attach to the restored release.
3. Tell the [owner](../project-intent.md#owner) what broke and what you did.
4. Open an issue for each leftover.

## 6. Rehearsal

Rehearse once before launch and once each quarter. Do not roll back during a
rehearsal.

- [ ] Your token has the permission to roll back each service.
- [ ] The account ID is the production account.
- [ ] You can list the versions of each service and record the live version ID.
- [ ] The health SHA of each service matches the main branch head.
- [ ] You can find each secret that a check needs without a chat or an issue.
- [ ] The last deploy passes the Path A safety checks.

## Related

- [Secret rotation](./secret-rotation.md)
- [Fail loudly at the right layer](../../principles/fail-loudly.md)
