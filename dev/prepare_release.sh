#!/usr/bin/env bash

# Bumps the scip-python version and adds an editable CHANGELOG entry
# listing the commits since the latest release tag.
#
# Inputs:
# NEW_VERSION (optional) should be a string M.N.P. Defaults to the
# next patch version after the latest release tag.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../packages/pyright-scip"

LAST_TAG="$(git describe --tags --abbrev=0 --match 'v[0-9]*')"
IFS=. read -r MAJOR MINOR PATCH <<<"${LAST_TAG#v}"
NEW_VERSION="${NEW_VERSION:-$MAJOR.$MINOR.$((PATCH + 1))}"

if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "error: NEW_VERSION=$NEW_VERSION is not of the form M.N.P"
  exit 1
fi
if [ "$(printf '%s\n%s\n' "${LAST_TAG#v}" "$NEW_VERSION" | sort -V | tail -n 1)" != "$NEW_VERSION" ] ||
  [ "$NEW_VERSION" = "${LAST_TAG#v}" ]; then
  echo "error: NEW_VERSION=$NEW_VERSION must be newer than the latest release $LAST_TAG"
  exit 1
fi

# Update package.json and package-lock.json before the CHANGELOG: npm version fails
# when they already have NEW_VERSION, as on a second run, so no duplicate entry is added.
npm version "$NEW_VERSION" --no-git-tag-version --ignore-scripts >/dev/null

# Renovate updates are covered by the Docker image line.
CHANGES="$(git log --format='- %s' "$LAST_TAG..HEAD" | grep -v '^- chore(deps)' || true)"
ENTRY="$(printf '## v%s\n\n- Rebuilds the Docker image with the latest Alpine package updates.\n%s' "$NEW_VERSION" "$CHANGES")"

# ENVIRON, unlike awk -v, keeps backslashes in commit subjects as they are.
ENTRY="$ENTRY" awk '
  !inserted && /^## v/ {
    print ENVIRON["ENTRY"] "\n"
    inserted = 1
  }
  { print }
' CHANGELOG.md >CHANGELOG.md.new
mv CHANGELOG.md.new CHANGELOG.md

echo "Prepared release v$NEW_VERSION"
