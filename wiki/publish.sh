#!/usr/bin/env bash
# Publishes the pages in this directory to the repository's GitHub wiki.
#
# The wiki git repository does not exist until the first page is created through
# the web UI, so create any page there once before running this. Pushing also
# needs write access to the wiki: either push access on the repository, or
# "Restrict editing to users with push access" unchecked under Settings ->
# Features -> Wikis.
#
# README.md documents this directory and is deliberately not published.
set -euo pipefail

REPO="${1:-podlodka-ai-club/flywheel}"
SRC="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git clone "https://github.com/${REPO}.wiki.git" "$TMP/wiki"

for page in "$SRC"/*.md; do
  [ "$(basename "$page")" = "README.md" ] && continue
  cp "$page" "$TMP/wiki/"
done

cd "$TMP/wiki"
git add -A
if git diff --cached --quiet; then
  echo "No changes to publish."
  exit 0
fi

git commit -m "Update Facility Support Group internal documentation"
git push origin HEAD
echo "Published: https://github.com/${REPO}/wiki"
