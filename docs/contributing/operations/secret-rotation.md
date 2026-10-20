# Secret rotation

How to replace a key without data loss or a forced sign-out you did not plan.

## Key inventory

Every runtime secret lives in the 1Password vault "Clyde". The Mac mini and
the Spark read it with a 1Password service account.

| Secret                             | Purpose                                                       | Impact of rotation                                                                                          |
| ---------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `OP_SERVICE_ACCOUNT_TOKEN`         | Lets each host read the vault, on the Mac mini and the Spark  | Each host stops reading secrets until it gets the new token                                                 |
| `gh` token                         | Pushes branches and opens pull requests, on the Mac mini only | Pushes wait until the new token is in the vault                                                             |
| Linear client secret               | The OAuth app's secret, for token refresh                     | Refresh fails until the new secret is in the vault                                                          |
| Linear webhook signing secret      | Verifies each webhook                                         | Webhooks fail the HMAC check until the vault and Linear match. The start-up catch-up recovers missed events |
| Linear OAuth tokens                | Act as the Clyde agent                                        | Reconnect Linear in the app                                                                                 |
| Codex login, Claude login          | The gateways' subscription credentials                        | Runs on that provider wait until the new login is in the vault                                              |
| Worker tokens, one for each worker | Second check on the worker port                               | That worker reconnects with the new token                                                                   |
| R2 keys for Litestream and restic  | Write the backups                                             | Backups stop until the new keys are in the vault                                                            |
| restic repository password         | Encrypts the log snapshots                                    | Old snapshots need the old password. Keep it until they age out                                             |
| APNs key                           | Sends pushes to the iOS app                                   | Pushes fail until the new key is in the vault                                                               |

CI holds its own secrets in GitHub Actions: the test Linear workspace token,
the test GitHub repository token and the CI model credential. None of them
reach the owner's workspace or repositories.

## One key for each purpose

Each purpose has its own key. Session signing, token signing and data
encryption never share a key. Then a rotation of one key does not break the
others.

Never derive a second key from a key that has a different purpose.

## Signing keys: rotate with a keyring

A keyring is a list of keys. The first key signs. Every key in the list
verifies. A rotation does not end a token that is still valid.

1. Prepend the new key: `<new>,<old>`. Deploy.
2. Wait one token lifetime after the deploy ends.
3. Drop the old key: `<new>`. Deploy.

A key without a keyring ends every token it signed. Rotate it at a quiet time
and tell users before you start.

## Encryption keys: re-encrypt first

Data encrypted with the old key stays unreadable without it. Keep the old key
until the last step.

1. Store the new key in the password manager. Confirm that you can read it
   back.
2. Run a migration that decrypts each value with the old key and encrypts it
   with the new key.
3. Verify that every value decrypts with the new key. Count the failures. The
   count must be zero.
4. Deploy the new key.
5. Watch for decrypt errors after the deploy.
6. Drop the old key.

Never drop the old key before step 3 passes. A lost key is lost data, and a
one-way door. See [two-way and one-way doors](../../principles/two-way-doors.md).

## Rules

- Do not rotate a key in the same window as a deploy that you may roll back.
  See [rollback](./rollback.md).
- Make a new key with a cryptographic random source, 32 bytes or more:
  `openssl rand -base64 48`.
- Never put a key value in a chat, an issue, a log or a command argument.
- Record each key's location in [operator accounts](./operator-accounts.md).
