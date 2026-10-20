# Security

This page holds the security rules that each change must keep, and the risks
that the [owner](./project-intent.md#owner) accepts.

An audit (the `audit` skill in `.agents/skills/`) or a security review reads
this page first. It does not reopen an
accepted risk. To challenge one, show that its revisit-if condition is true.

## Rules that changes keep

Read this list before you change auth, routing, response headers, storage
queries, logging or deploy configuration.

1. **Trusted HTML keeps a strict Content Security Policy.** All first-party
   pages go through one response helper that sets the security headers. Never
   add `'unsafe-inline'` or `'unsafe-eval'` to `script-src`. Allow a required
   inline script by its hash.
2. **Untrusted content runs on a separate origin.** Content that a third party
   writes never runs on the app origin. It never gets first-party cookies or
   auth headers. Do not merge its policy with the strict policy.
3. **SQL is parameterized.** Bind each value. Never put user input into a SQL
   string.
4. **Every data path is scoped to its tenant.** Each query, storage key and
   search filter includes the tenant or account ID. Data that crosses tenants is
   a bug.
5. **Credential endpoints share one rate-limit bucket.** Each endpoint that
   accepts a password, token, reset code or second factor joins the same bucket.
   Then parallel paths do not multiply the attempts. Excess requests get `429`
   with `Retry-After`.
6. **The production rate limiter fails closed.** Startup in production stops
   when the limiter is missing. A development fallback never becomes the
   production limiter.
7. **Developer-only routes fail closed in production.** A route that helps
   debug, seeds data or runs content from a test gates on one non-production
   check. In production it does not exist.
8. **Secrets never go in logs or URLs.** Do not log a secret, token, cookie or
   reset code. Do not put one in a query string. Do not pass one as a command
   argument; pipe it on stdin. Redact email addresses in error reports.
9. **The server decides.** Validate input and permissions on the server. A
   browser check is a hint for the user.
10. **New passwords go through one shared policy.** Each place that sets a
    password calls the same check.
11. **Untrusted text renders as text.** Render third-party markdown or HTML
    only through an allowlist renderer. Never use `innerHTML` or a raw HTML
    string. Allow only `http:`, `https:` and `mailto:` links.
12. **CSRF protection has one design, and each part of it holds.** Write that
    design in the project rules below. When it uses `SameSite=Lax` cookies and
    JSON bodies, no mutating endpoint accepts a form post, and no session cookie
    uses `SameSite=None`.
13. **Account recovery revokes old access.** A password reset ends every other
    session and token for the account, and tells the owner by email.
14. **Signup and reset do not show which emails have accounts.** Send the same
    response for a known and an unknown address.
15. **Background jobs do not grant access.** Role, membership, billing and
    secret grants need a signed-in person. A job, webhook or third-party code
    cannot grant itself access.
16. **Agents hold no production credential that writes data or reads customer
    content.** Production data questions run as reviewed query workflows. See
    [production access](./operations/production-access.md).

17. **The server listens on loopback only, behind Tailscale Serve, and the
    Mac mini runs no agent process.** Clyde trusts Tailscale Serve's identity
    headers only because no other process can reach the port and send them.
    A test asserts the bind address. Tart VMs reach the host through its VM
    network, never its loopback
    ([0009](./decisions/0009-every-agent-in-a-sandbox.md)).
18. **The owner's Tailscale login is the only accepted identity.** T3 Code's
    pairing links are off. See
    [request context](./architecture/request-context.md).
19. **Tailscale Funnel exposes `/linear/webhook` and nothing else.** The
    webhook checks the HMAC over the raw body, a 60-second freshness window,
    the workspace and app IDs, and that the requester is the owner.
20. **Cross-site requests cannot act.** The apps use WebSocket RPC with a
    session ticket, and the WebSocket upgrade checks the origin. Clyde has no
    browser client and no form posts.
21. **A sandbox holds no credential.** The gateway adds model credentials, the
    worker relay adds the Linear token, and only the Mac mini's push process
    reads the `gh` token
    ([invariant 3](./project-intent.md#hard-invariants)).
22. **A sandbox reaches the public internet and nothing private.** The egress
    proxy blocks private, tailnet and cloud metadata addresses. See
    [sandboxes](./architecture/sandboxes.md).
23. **Issue text never picks a repository, a path, a test or a target.** The
    team-to-project map and the workflow decide them. See
    [Linear](./architecture/linear.md).
24. **A workflow change passes the default branch's gates.** See
    [journey: edit a project's workflow](./architecture/journey-edit-workflow.md).
25. **Clyde has no tenant key.** Data is separated by Clyde project and Linear
    workspace ([0003](./decisions/0003-no-tenant-model.md)).

When a rule can be a check, add the check. See
[harness engineering](./harness-engineering.md) and [checks](./setup/checks.md).
A change that weakens a rule is a one-way door. See
[two-way and one-way doors](../principles/two-way-doors.md).

## Accepted risks

Each entry states:

| Part       | Content                                        |
| ---------- | ---------------------------------------------- |
| Risk       | What an attacker or a failure can do           |
| Why        | Why the owner accepts it, with the limit on it |
| Revisit if | The condition that ends the acceptance         |

- **The `gh` token reaches every repository the owner can reach.**
  - Risk: a leaked token can write to any of the owner's repositories.
  - Why: the owner chose `gh` login over a GitHub App
    ([0004](./decisions/0004-no-github-app.md)). Only the push process on the
    Mac mini reads the token, and branch protection blocks pushes to default
    branches.
  - Revisit if: a second machine needs to push.
- **A sandbox can send code to any public address.**
  - Risk: an agent, or a dependency it installs, can upload the project's
    checkout.
  - Why: the owner wants no block on the public internet. Each sandbox holds
    only its own project's checkout and no credential.
  - Revisit if: a project holds code that must not leave the owner's machines.
- **Subscription logins drive automated runs.**
  - Risk: a provider can rate-limit or suspend the account for heavy automated
    use, and every run on that provider stops.
  - Why: the owner chose subscriptions over API keys.
  - Revisit if: a provider warns or limits the account.
- **A power loss can drop the last commits to the event store.**
  - Risk: events that Clyde acknowledged just before the loss are gone.
  - Why: T3 Code uses `synchronous = NORMAL` for speed. Linear catch-up and
    client resends recover them.
  - Revisit if: a lost event is ever seen after a power loss.
- **Whoever holds the Mac mini holds everything.**
  - Risk: the 1Password service account token sits on its disk.
  - Why: it is the owner's machine, at home, with FileVault on.
  - Revisit if: the Mac mini moves out of the owner's control.

To add an accepted risk, get the owner's approval in the PR. To remove one, fix
the risk and delete the entry in the same change.

## Related

- [Fail loudly at the right layer](../principles/fail-loudly.md)
- [Secret rotation](./operations/secret-rotation.md)
- [Operator accounts](./operations/operator-accounts.md)
- [Environment variables](./setup/environment-variables.md)
