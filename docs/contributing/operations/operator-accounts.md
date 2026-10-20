# Operator accounts

A map of each vendor account that the product or its CI uses. If the operator
loses access, this page and the password manager get it back.

This page holds secret names. Secret values never go in the repository.

## Accounts

For each vendor, record:

| Field         | Content                                                         |
| ------------- | --------------------------------------------------------------- |
| Owns          | What the account runs or stores for the product                 |
| Secret names  | Each secret and variable name, and who holds it (CI or runtime) |
| Configured in | The file, workflow or dashboard page that sets it               |
| Recovery      | How to get access back: login, recovery codes, support contact  |

### Cloudflare

| Field         | Content                                                                    |
| ------------- | -------------------------------------------------------------------------- |
| Owns          | The R2 bucket for backups, with its 30-day bucket lock                     |
| Secret names  | Runtime: the R2 keys for Litestream and restic, in the vault               |
| Configured in | The Cloudflare dashboard: the bucket, its lock and its lifecycle rule      |
| Recovery      | Password manager: the Cloudflare login, its recovery codes and the R2 keys |

### 1Password

| Field         | Content                                                           |
| ------------- | ----------------------------------------------------------------- |
| Owns          | The vault "Clyde", which holds every runtime secret               |
| Secret names  | Runtime: `OP_SERVICE_ACCOUNT_TOKEN` on the Mac mini and the Spark |
| Configured in | The launchd and systemd service definitions                       |
| Recovery      | The owner's 1Password account and its Emergency Kit               |

### Tailscale

| Field         | Content                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------- |
| Owns          | The tailnet, Serve for the apps, Funnel for `/linear/webhook`, and the ACL for the worker port |
| Secret names  | None in Clyde                                                                                  |
| Configured in | The Tailscale admin console: the ACL policy, and Serve and Funnel on the Mac mini              |
| Recovery      | Password manager: the identity provider login that owns the tailnet                            |

### Linear

| Field         | Content                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------- |
| Owns          | The "Clyde" OAuth app in the `zaggers` workspace, and the test workspace for CI                   |
| Secret names  | Runtime: Linear client secret, webhook signing secret, OAuth tokens. CI: the test workspace token |
| Configured in | Linear Settings → API, in each workspace                                                          |
| Recovery      | Password manager: the Linear login for each workspace                                             |

### GitHub

| Field         | Content                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| Owns          | The source host for eggdev/t3code, the projects' repositories, the test repository and CI              |
| Secret names  | Runtime: the `gh` token. CI: the test repository token, the test Linear token, the CI model credential |
| Configured in | `.github/workflows/`, and each repository's branch protection                                          |
| Recovery      | Password manager: the GitHub login and its recovery codes                                              |

### OpenAI and Anthropic

| Field         | Content                                                                        |
| ------------- | ------------------------------------------------------------------------------ |
| Owns          | The ChatGPT subscription for Codex and the Claude subscription for Claude Code |
| Secret names  | Runtime: the Codex login and the Claude login, in the vault                    |
| Configured in | The gateway on each sandbox host                                               |
| Recovery      | Password manager: each provider's login                                        |

### Apple Developer Program

| Field         | Content                                                    |
| ------------- | ---------------------------------------------------------- |
| Owns          | The iOS app's signing and the APNs key                     |
| Secret names  | Runtime: the APNs key, in the vault                        |
| Configured in | The Apple Developer portal, and the iOS app's build config |
| Recovery      | Password manager: the Apple ID and its recovery key        |

## Password manager coverage

The password manager holds each fact that the repository cannot hold:
account logins, recovery codes, registrar details and secret values.

Each item on this page names what the password manager records. Use the form
`Password manager: <what is recorded>`. Never write the value.

The owner uses 1Password. For each vendor it records:

1. 1Password: the account login and the Emergency Kit.
2. Tailscale: the identity provider login.
3. Linear: the login for each workspace.
4. GitHub: the login and its recovery codes.
5. Cloudflare: the login, its recovery codes and the R2 keys.
6. OpenAI and Anthropic: each login.
7. Apple: the Apple ID and its recovery key.

## Runtime tokens

1. Each runtime gets its own token.
2. Each token has the smallest permission set that its runtime needs. Record
   the permissions in the account section.
3. The deploy token stays in CI. Never give it to a runtime.
4. CI stops the deploy before any production write when a runtime token is
   missing, or when it equals the deploy token. That check belongs in CI, next
   to the deploy job.

A leaked runtime token then exposes only that runtime.

## Rules

- Add a vendor to this page in the same change that adds its first secret.
- When a token changes, update its name or permissions here in the same change.
- To rotate a key, see [secret rotation](./secret-rotation.md).
- Each variable has one home for its meaning. See
  [environment variables](../setup/environment-variables.md).
