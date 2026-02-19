#!/usr/bin/env bash
set -euo pipefail

# Update script for Custom Hosting Panel
# Keeps your Docker volumes (database data) by default.
#
# Usage:
#   cd ~/custom-hosting-panel
#   chmod +x update.sh
#   ./update.sh
#
# Notes:
# - If you edited files locally, git may refuse to pull. In that case, commit your changes
#   or run: git stash -u
# - Your Postgres data is stored in a Docker volume (postgres_data) and will NOT be deleted
#   unless you explicitly run docker compose down -v

if [[ ! -f "./docker-compose.yml" ]]; then
  echo "ERROR: Run this from the repo root (where docker-compose.yml is)."
  exit 1
fi

echo "== Updating repo =="
git fetch --all --prune

# Determine default branch (main/master) safely
DEFAULT_BRANCH="$(git remote show origin | awk '/HEAD branch/ {print $NF}')"
if [[ -z "$DEFAULT_BRANCH" ]]; then
  DEFAULT_BRANCH="main"
fi

echo "Using branch: $DEFAULT_BRANCH"
git checkout "$DEFAULT_BRANCH" >/dev/null 2>&1 || true
git pull --ff-only origin "$DEFAULT_BRANCH"

echo
echo "== Rebuilding + restarting containers =="
docker compose up -d --build

echo
echo "== Done =="
echo "Check logs with: docker compose logs -f nginx"
