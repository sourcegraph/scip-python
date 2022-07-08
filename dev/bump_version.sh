#!/usr/bin/bash

set -e

if ! git diff --quiet; then
    echo "======================================="
    echo "   Please clean up your dirty repo"
    echo "======================================="
    exit 1
fi

read -p "set version to > " -r VERSION

if [[ $VERSION =~ ^v[0-9]+\.[0-9]+\.[0-9]$ ]]; then
    echo "valid version: $VERSION"
else
    echo "Invalid semver specifier. Expected 'v0.0.0'"
    exit 1
fi

# shellcheck disable=SC2001
# Use sed, cause it's OK
PACKAGE_VERSION=$(echo "$VERSION" | sed 's/^v//')
eval "cd packages/pyright-scip/ && yarn version --no-git-tag-version --new-version $PACKAGE_VERSION"

git commit -am "bump version: $VERSION"
git push

git tag -fa "$VERSION" -m "$VERSION"
git push -f origin "$VERSION"
