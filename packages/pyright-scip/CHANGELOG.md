# scip-python CHANGELOG

## v0.6.8

- The autoindex Docker image now installs scip-python built from the
  release commit instead of from npm. The v0.6.7 image was built while
  npm was still scanning 0.6.7, so it contains scip-python 0.6.6.

## v0.6.7

- Updates the autoindex Docker image base to Alpine 3.24, Node 24 and
  Python 3.11, with ca-certificates 20261020, pip 26.2.2 and certifi
  2026.10.19, so that TLS clients in the image no longer trust the
  compromised eMudhra intermediate CAs. (#233)

## v0.6.6

- Changes package listing to use Python's `importlib` instead of
  `pip show` by default. On versions of pip 24.0 and older, `pip show`
  is much slower. This also avoids parsing of unstructured data
  returned by pip in favor of JSON.

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
