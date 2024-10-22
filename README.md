# scip-python

Sourcegraph fork of [pyright](https://github.com/microsoft/pyright) focused on generating [SCIP](https://github.com/sourcegraph/scip) for python projects.

Project is primarily an addition to Pyright. At this time, there are no substantial changes to the `pyright` library.

## Pre-requisites

```
$ # Install scip-python
$ npm install -g @sourcegraph/scip-python
```

scip-python requires Node v16 or newer. See the [Dockerfile](https://github.com/sourcegraph/scip-python/blob/scip/Dockerfile) for an exact SHA that is tested.

scip-python uses `pip` to attempt to determine the versions and names of the packages available in your environment. If you do not use pip to install the packages, you can instead use the `--environment` flag to supply a list of packages to use as the environment. This will skip any calls out to pip to determine the state of your env. See [Environment](##-environment) for more information.


## Usage

```
$ npm install @sourcegraph/scip-python

$ # NOTE: make sure to activate your virtual environment before running
$ scip-python index . --project-name=$MY_PROJECT

$ # Make sure to point towards the sourcegraph instance you're interested in uploading to.
$ #     more information at https://github.com/sourcegraph/src-cli
$ src code-intel upload
```

### target-only

To run scip-python over only a particular directory, you can use the `--target-only` flag. Example:

```
$ scip-python index . --project-name=$MY_PROJECT --target-only=src/subdir
```

### project-namespace

Additionally, if your project is loaded with some prefix, you can use the `--project-namespace` to put a namespace before all the generated symbols for this project.

```
$ scip-python index . --project-name=$MY_PROJECT --project-namespace=implicit.namespace
```

Now all symbols will have `implicit.namespace` prepended to their symbol, so that you can use it for cross repository navigation, even if the directory structure in your current project does not explicitly show `implicit/namespace/myproject/__init__.py`.

## Environment

The environment file format is a JSON list of `PythonPackage`s. The `PythonPackage` has the following form:

```json
{
    "name": "PyYAML",
    "version": "6.0",
    "files": [
      "PyYAML-6.0.dist-info/INSTALLER",
      ...
      "yaml/__init__.py",
      "yaml/composer.py",
      "yaml/tokens.py",
      ...
    ]
},
```

Where:
- `name`:
  - The name of the package. Often times this is the same as the module, but is not always the case.
  - For example, `PyYAML` is the name of the package, but the module is `yaml` (i.e. `import yaml`).
- `version`:
  - The vesion of the package. This is used to generate stable references to external packages.
- `files`:
  - A list of all the files that are a member of this package.
  - Some packages declare multiple modules, so these should all be included.

The environment file should be a list of these packages:

```json
[
  { "name": "PyYAML", "version": "6.0", "files": [...] },
  { "name": "pytorch", "version": "3.0", "files": [..] },
  ...
]
```

To use the environment file, you should call scip-python like so:

```
$ scip-python index --project-name=$MY_PROJECT --environment=path/to/env.json
```

If you're just using pip, this should not be required. We should calculate this from the pip environment. If you experience any bugs, please report them. The goal is that we support standard pip installation without additional configuration. If there is other python tooling that can generate this information, you can file an issue and we'll see if we can support it as well.

## Sourcegraph Example Configuration

Using the usage example above may be quite simple to add a CI pipeline (perhaps using the `sourcegraph/scip-python:autoindex`) image
and uploading the corresponding index.scip file to Sourcegraph only for commits that you are intersted in (whether that's only HEAD
or every branch).

However, if you're interested in using the Auto-Indexing feature, an example configuration skeleton can be found below:

```
{
    "index_jobs": [
        {
            "indexer": "sourcegraph/scip-python:autoindex",
            "local_steps": [
                "pip install . || true",
            ],
            "indexer_args": [
              "scip-python", "index", ".",
              "--project-name", "<your name here>",
              "--project-version", "_"
            ],
            "steps": [],
            "outfile": "",
            "root": ""
        }
    ],
    "shared_steps": []
}
```

## To compare upstream from pyright

You can go to the following [Sourcegraph
link](https://sourcegraph.com/github.com/sourcegraph/scip-python/-/compare/pyright-mirror...scip)
to compare the changes we've made from pyright.

The changes are almost exclusively in the folder `packages/pyright-scip/` and various `package.json` files
due to adding some additional dependencies.

In general, we've tried to make very little changes to anything inside of the pyright packages.
The only changes that are inside there at this point are:
- Not bail out of indexing if it's taking a long time
- Not throw away indexed files if memory usage gets high
- Allow parsing of some additional files

## Contributing

See [pyright-scip/CONTRIBUTING.md](./packages/pyright-scip/CONTRIBUTING.md).
