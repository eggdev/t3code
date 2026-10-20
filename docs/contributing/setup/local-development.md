# Local development

## Tools

The fork pins Node and pnpm in its root `package.json`. From the repository
root:

```sh
pnpm install
pnpm typecheck
pnpm test
```

See [checks](./checks.md) for the full gate.

## Start the app

| What                   | Command            |
| ---------------------- | ------------------ |
| Server and desktop app | `pnpm dev`         |
| Server only            | `pnpm dev:server`  |
| Desktop app only       | `pnpm dev:desktop` |

The dev server keeps its own state folder, apart from the Mac mini's
production state. The iOS app's setup is in T3 Code's
`docs/internals/mobile-development.md`.

The command that starts the app is safe to run again. Agents start it often,
and a second copy on a busy port fails in ways that are hard to read. The
command:

1. Reuses a server that is already running and healthy.
2. Otherwise starts one, and waits for its health route to answer.
3. Prints the URL and the path of the log file.
4. Stops early with a fix hint when it finds a known misconfiguration, such as
   a missing environment variable.

UI checks open that URL in a browser. They never read a rendered string in
place of the page.

## Configuration

Copy `.env.example` to `.env`. A fresh clone needs no value in it to start
the server and the desktop app. Linear, GitHub and model credentials come from
the 1Password vault "Clyde". A local run that needs them uses the `op` CLI
signed in as the owner.
