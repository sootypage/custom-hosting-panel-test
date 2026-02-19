#!/usr/bin/env bash
set -euo pipefail

# Update script that keeps your .env + data volumes

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "== Updating Custom Hosting Panel =="

if command -v git >/dev/null 2>&1 && [ -d .git ]; then
  echo "Pulling latest from git..."
  # keep local changes safe
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Local changes detected; stashing..."
    git stash push -u -m "auto-stash before update" >/dev/null
    STASHED=1
  else
    STASHED=0
  fi
  git pull --rebase

  if [ "${STASHED}" = "1" ]; then
    echo "Re-applying your local changes..."
    git stash pop || true
  fi
else
  echo "No git repo detected, skipping git pull."
fi

echo "Installing workspace dependencies..."
npm install --workspaces

echo "Rebuilding + restarting containers..."
docker compose --profile panel --profile node up -d --build

echo "Done."
