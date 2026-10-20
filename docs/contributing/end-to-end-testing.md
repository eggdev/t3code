# End-to-end testing

End-to-end tests drive the real app through a browser. They are slow and
costly to keep, so the bar to add one is high.

## What to test

- Each [hard invariant](./project-intent.md#hard-invariants) has one journey.
  Project intent lists them.
- Add a journey only when the flow is user-critical and a faster test cannot
  cover it.
- Prefer one broad journey over many narrow regression tests. Do not add a
  journey to lock in a bug fix that is unlikely to come back.
- Do not test styling, implementation details or utility functions here.

## Structure

- Flat `test(...)`. Inline the setup. No `describe` and no shared `beforeEach`.
- Write each test like a manual tester's script: one setup, then each action
  and assertion of the journey.
- Do not split one journey into small tests to isolate each assertion.

## Locators

- `getByRole` for buttons, links, headings and inputs.
- `getByLabel` for form fields.
- `getByText` only for short, stable copy.
- A CSS locator only when no accessible locator exists.

## Assertions

- Assert what the user sees: a message, a redirect, a visible element.
- Wait for the UI result. Never wait for a fixed time.
- Assert the important states between steps inside the same journey. Do not
  write separate tests for a loading state or a transition.
- Use real input values. Keep credentials and email addresses fake and local.

## Server health and retries

- Before each test, probe the server health route. When the server is dead,
  fail at once with a named error. Do not spend retries on a refused
  connection.
- In CI, retry only failures that match a known infrastructure pattern, such
  as a web server that did not start. Never retry an assertion failure.

Clyde's journeys are Vitest `.e2e.test.ts` files, one for each
[hard invariant](./project-intent.md#end-to-end-journeys):

- They drive a real Clyde server through `packages/client-runtime`, the
  connection code that the apps use.
- Linear and GitHub are real: a test Linear workspace and a test GitHub
  repository, never the owner's.
- A Linux CI runner with Docker is the sandbox host, with the real worker and
  the real gateway. The model credential comes from a CI secret, and each
  journey uses the smallest model its provider offers.
- iOS sandboxes are not in the journeys. GitHub's macOS runners do not allow
  the nested virtualization that Tart needs, and no invariant depends on iOS.

The fork adds an `e2e` Vitest project for these files. Run the suite with
`pnpm vp test run --project e2e`, and one file with `pnpm vp test run <path>`. Each journey probes the server's health route
before it starts.

CI retries a journey only when the server fails to start or Docker fails to
pull an image. It never retries a failed assertion.
