# Agent Instructions for pyright-scip

## Development Commands

### Testing

-   `npm test` - Run Jest tests
-   `npm run check-snapshots` - Check snapshot tests
-   `npm run update-snapshots` - Update snapshot tests

After making changes to the codebase, run tests with:
1. `npm run build-agent` - Build the development version
2. `npm run check-snapshots` - Run all tests including unit tests

### Building

-   `npm run webpack` - Development build
-   `npm run build` - Production build
-   `npm run watch` - Development build with watch mode

### Formatting

-   `npm run fix:prettier` - Fix prettier formatting issues
-   `npm run check:prettier` - Check prettier formatting

## Code Style

-   Follow existing TypeScript patterns in the codebase
-   Use the Sourcegraph ESLint config and Prettier config
-   When modifying pyright-internal code, keep changes minimal and add `NOTE(scip-python):` prefix to comments
