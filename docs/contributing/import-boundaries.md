# Import boundaries

Clyde follows T3 Code's import rules and lint
([0008](./decisions/0008-no-nx-in-the-fork.md)): Oxlint with T3 Code's own
plugin in `oxlint-plugin-t3code/`, run by `vp lint`, and knip for unused code.

| Question                                   | Answer                                                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Where does Clyde's code live?              | In its own packages and server modules, in new folders (Linear, workflows and gates, sandboxes) |
| Who may import a vendor SDK?               | Only the one module that owns the vendor, such as the Linear module for Linear's SDK            |
| May Clyde code import T3 Code's internals? | Through T3 Code's package entry points and Effect services, not deep file paths                 |
| May T3 Code's code import Clyde's?         | Only at the composition roots: the server's bootstrap, the routes and the toolkits              |

## Rules

- **One owner for each vendor.** A second module that needs the vendor calls
  the owner module. See [generic platform](../principles/generic-platform.md).
- **Upstream files change as little as possible.** A Clyde feature adds a
  module and registers it at a composition root. It does not edit T3 Code's
  modules in place ([0001](./decisions/0001-tracking-fork-of-t3-code.md)).
- **Tests import the module's public entry.** A test never reaches into
  another module's internals.

## What to read when changing it

- T3 Code: `oxlint-plugin-t3code/`, `knip.jsonc` and
  `docs/internals/effect-services.md`
