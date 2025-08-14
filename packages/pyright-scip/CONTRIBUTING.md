# Contributing to scip-python

- [Development](#development)
  - [Installing dependencies](#installing-dependencies)
  - [Building the code](#building-the-code)
  - [Running tests](#running-tests)
- [Publishing releases](#publishing-releases)

## Development

### Installing dependencies

1. Install [ASDF](https://asdf-vm.com/guide/getting-started.html).
2. Install the correct versions of Node and Python:
    ```bash
    asdf plugin add nodejs
    asdf plugin add python
    # Install appropriate Node and Python versions based on .tool-versions
    asdf install
    ````
   You may need to restart your shell for the changes to take effect.

   NOTE: On Linux, ASDF may try to install Python from source instead of
   using prebuilt binaries. In that case, you need to install a bunch of
   other dependencies first:
   ```bash
   sudo apt update
   sudo apt install -y build-essential zlib1g-dev libssl-dev libbz2-dev libsqlite3-dev libncurses-dev libffi-dev readline-common libreadline-dev liblzma-dev
   ```
3. Install dependencies:
   ```bash
   # From the root of the repo
   npm install
   cd packages/pyright-scip
   npm install
   ```

All the other commands should be run from the `packages/pyright-scip`
subdirectory.

### Building the code


```bash
# Build in development mode once
npm run webpack

# Build in development mode, watch for changes
npm run watch
```

To create a release build:

```bash
npm run build
```

**WARNING:** If you create the release build and then try to run tests,
you will not get useful stack traces because source maps are disabled
for the release build.

All of the above methods should produce an `index.js` file
in `packages/pyright-scip` which can be invoked with Node
to index a test project.

```
node ./index.js <other args>
```

### Running tests

```bash
npm run check-snapshots
```

#### Filter specific snapshot tests

Use the `--filter-tests` flag to run only specific snapshot tests:
```bash
# Using npm scripts (note the -- to pass arguments)
npm run check-snapshots -- --filter-tests test1,test2,test3
```

Available snapshot tests can be found in `snapshots/input/`.

Using a different Python version other than the one specified
in `.tool-versions` may also lead to errors.

## Making changes to Pyright internals

When modifying code in the `pyright-internal` package:

1. Keep changes minimal: Every change introduces a risk of
   merge conflicts. Adding doc comments is fine, but avoid
   changing functionality if possible. Instead of changing
   access modifiers, prefer copying small functions into
   scip-pyright logic.
2. Use a `NOTE(scip-python):` prefix when adding comments to
   make it clearer which comments were added by upstream
   maintainers vs us.

## Publishing releases

1. Change the version in `packages/pyright-scip/package.json`
   to `M.N.P` and land a PR with that.
2. Add a tag `vM.N.P` to the commit on the `scip` branch
   and push that tag.
