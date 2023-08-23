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
node --enable-source-maps ./index.js <other args>
```

### Running tests

```bash
npm run check-snapshots
```

**WARNING:** At the moment, there are [some known test failures on macOS](https://github.com/sourcegraph/scip-python/issues/91).

Using a different Python version other than the one specified
in `.tool-versions` may also lead to errors.

## Publishing releases

1. Change the version in `packages/pyright/package.json`
   to `M.N.P` and land a PR with that.
2. Add a tag `vM.N.P` to the commit on the `scip` branch
   and push that tag.
