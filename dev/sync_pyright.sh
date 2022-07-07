#!/usr/bin/bash

set -e
set -o pipefail

if ! git diff --quiet; then
    echo "======================================="
    echo "   Please clean up your dirty repo"
    echo "======================================="
    exit 1
fi

echo "===== Syncing Pyright and Creating New Branch ====="

if ! git remote show | grep upstream -q; then
    echo "Adding upstream"
    git remote add upstream https://github.com/microsoft/pyright
fi

if ! git rev-parse --verify pyright-mirror >/dev/null 2>&1 ; then
    echo "Adding pyright main branch to local dev env as pyright-mirror"
    git fetch upstream main:pyright-mirror --no-tags
    git branch --set-upstream-to=upstream/main pyright-mirror
fi

git checkout pyright-mirror
git pull --no-tags upstream main:pyright-mirror
LATEST_PYRIGHT_COMMIT=$(git rev-parse --verify HEAD)

git checkout scip
git pull
git checkout -b pyright-sync-$(date +%F)

if ! git merge pyright-mirror; then
    echo "Checking out some files that are pretty much guaranteed to be messed up"

    git checkout --ours README.md && \
        git add README.md

    git checkout --theirs package-lock.json && \
        git add package-lock.json

    git checkout --theirs packages/pyright-internal/package-lock.json && \
        git add packages/pyright-internal/package-lock.json 

    git checkout --theirs packages/pyright/package-lock.json && \
        git add packages/pyright/package-lock.json 

    git checkout --theirs packages/vscode-pyright/package-lock.json && \
        git add packages/vscode-pyright/package-lock.json 
fi

echo $LATEST_PYRIGHT_COMMIT > pyright-last-commit

echo "Make sure to handle any merge conflicts"
echo " and rebuild the project to make sure everything is working"
echo " before we merge"
