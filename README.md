# lsif-python

Sourcegraph fork of [pyright](https://github.com/microsoft/pyright) focused on generating LSIF for python projects.

Project is primarily an addition to Pyright. At this time, there are no substantial changes to the `pyright` library.

## Pre-requisites

```
$ # Install lsif-python
$ npm install -g @sourcegraph/lsif-python

$ # Install and add `lsif-typed` to your path and/or project
$ curl -Lo lsif-typed https://github.com/sourcegraph/lsif-typescript/releases/download/v0.1.8/lsif-typed && chmod +x lsif-typed
```

## Usage

```
$ npm install @sourcegraph/lsif-python

$ # NOTE: make sure to activate your virtual environment before running
$ lsif-python index . --projectName $MY_PROJECT

$ # Transform lsif-python output to traditional LSIF format
$ #     (at some point, this step will be removed)
$ lsif-typed dump.lsif-typed > dump.lsif

$ # Make sure to point towards the sourcegraph instance you're interested in uploading to.
$ #     more information at https://github.com/sourcegraph/src-cli
$ src lsif upload
```

## Sourcegraph Example Configuration

```
{
    "index_jobs": [
        {
            "indexer": "nikolaik/python-nodejs",
            "local_steps": [
                "curl -Lo lsif-typed https://github.com/sourcegraph/lsif-typescript/releases/download/v0.1.13/lsif-typed",
                "chmod +x ./lsif-typed",
                "npm install -g @sourcegraph/lsif-python",
                "lsif-python index . --projectName tjdevries-sam --projectVersion 0.1",
                "./lsif-typed dump.lsif-typed > dump.lsif",
            ],
            "indexer_args": [],
            "steps": [],
            "outfile": "",
            "root": ""
        }
    ],
    "shared_steps": []
}
```
