# Release v0.4

- remove: `--include` and `--exclude`. Instead use `pyproject.toml` and pyright configuration.
- add: `--target-only` to only emit and parse information related to some subdirectory of your project. Should still be run from root of project.
- add: `--project-namespace` to prefix any definitions in your current project. This can be useful when your package gets installed in some non-standard way and there doesn't have the appropriate prefix that other python packages would import from.
- Now respects pyright config by default (and discovers applicable pyright configuration).
- Updated pyright internal library
- Attempt to capture possible failures in pyright library so some indexing can still be completed.
