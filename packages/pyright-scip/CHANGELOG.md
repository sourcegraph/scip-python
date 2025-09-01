# scip-python CHANGELOG

## v0.6.5

- Fixes a crash when `pip show` returns more than 1MB of data. (#151)

## v0.6.4

- Updates base docker image

## v0.6.3

- Fixes a known crash when handling inheritance from class
  methods which use a decorator.
- Fixes a bug introduced in v0.6.1 which would cause
  SCIP indexes on macOS to be generated with 0 documents.

This version has much more robust testing on macOS for
path-handling issues.

## v0.6.2

**WARNING**: This release is known to have issues on macOS.
We recommend upgrading to v0.6.3 or newer.

- Fixed source maps on Linux.

## v0.6.1

**WARNING**: This release should not be used.

- Enabled source maps on macOS.

## v0.4

- remove: `--include` and `--exclude`. Instead use `pyproject.toml` and pyright configuration.
- add: `--target-only` to only emit and parse information related to some subdirectory of your project. Should still be run from root of project.
- add: `--project-namespace` to prefix any definitions in your current project. This can be useful when your package gets installed in some non-standard way and there doesn't have the appropriate prefix that other python packages would import from.
- Now respects pyright config by default (and discovers applicable pyright configuration).
- Updated pyright internal library
- Attempt to capture possible failures in pyright library so some indexing can still be completed.
