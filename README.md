# scip-python

Sourcegraph fork of [pyright](https://github.com/microsoft/pyright) focused on generating [SCIP](https://github.com/sourcegraph/scip) for python projects.

Project is primarily an addition to Pyright. At this time, there are no substantial changes to the `pyright` library.

## Pre-requisites

```
$ # Install scip-python
$ npm install -g @sourcegraph/scip-python
```

## Usage

```
$ npm install @sourcegraph/scip-python

$ # NOTE: make sure to activate your virtual environment before running
$ scip-python index . --project-name $MY_PROJECT

$ # Make sure to point towards the sourcegraph instance you're interested in uploading to.
$ #     more information at https://github.com/sourcegraph/src-cli
$ src code-intel upload
```

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
