---
id: troubleshooting
title: Troubleshooting
summary: Load this when something in the product does not work, or the user quotes an error message.
type: reference
---

# Troubleshooting

## Contact support

Clyde has no support desk. You run it. Start with the health view in the
apps, then `t3 service status` on the Mac mini, which shows the version and
the log location.

Find the heading that matches what you see. If none matches, open an issue
in the Clyde project in Linear with what you saw.

## How each entry reads

Each H2 is a symptom in the user's words, or the exact error text. Quote the
error text as the product shows it, so a user or an agent can search for it.
Then give the cause in one or two sentences. Then give the fix as numbered
steps.

```markdown
## Sign-in fails with `session_expired`

Your sign-in lasts a fixed time. After that time, the product asks you to sign
in again.

1. Sign out.
2. Sign in again.
3. If the error comes back in less than an hour, contact support with the time
   you saw it.
```

## "This Clyde belongs to another tailnet user."

The device is signed in to Tailscale with another identity.

1. Open the Tailscale app on the device.
2. Sign in with your own account.
3. Open Clyde again.

## "Sandbox host offline"

Clyde cannot reach the Spark, or the Mac mini's Tart host. Runs on that host
wait in the queue.

1. Check that the host is on and on the tailnet.
2. On the host, check that the Clyde worker service runs.
3. The waiting runs start when the host returns.

## "Reconnect Linear"

Linear revoked Clyde's token, or the refresh failed.

1. Select **Reconnect Linear**.
2. Approve the OAuth screen in the browser.
3. Waiting ticket runs go on.

## "No Clyde project for this team"

The issue's Linear team maps to no Clyde project.

1. Open **Add a project** in the app.
2. Pick the repository and that Linear team.
3. Delegate the issue to Clyde again.

## A gate failed

The gate's command failed on the exact commit. The run's thread shows the
command and the log tail.

1. Open the full log from the gate result.
2. Fix the cause in the chat or the ticket run.
3. A new commit runs the gates again.

## For support and agents: what to ask the user for

Ask for these before you guess at a cause:

- The exact error text, or a screenshot of the screen.
- The time it happened, and the time zone.
- The device, the browser or app version, and the network.
- The steps the user took just before it happened.
- The email address on the account. Never ask for a password, a code or a key.
