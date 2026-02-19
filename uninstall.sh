#!/usr/bin/env bash
set -euo pipefail

# Uninstall script for Custom Hosting Panel
# Run this from inside the repo folder:
#   cd ~/custom-hosting-panel
#   chmod +x uninstall.sh
#   ./uninstall.sh
#
# It will stop containers and (optionally) remove volumes/images, then remove the repo folder.

if [[ ! -f "./docker-compose.yml" ]]; then
  echo "ERROR: Run this from the repo root (where docker-compose.yml is)."
  echo "Example: cd ~/custom-hosting-panel"
  exit 1
fi

REPO_DIR="$(pwd)"
PARENT_DIR="$(dirname "$REPO_DIR")"
REPO_NAME="$(basename "$REPO_DIR")"

echo "== Custom Hosting Panel Uninstall =="
echo "Repo: $REPO_DIR"
echo

read -r -p "Stop and remove containers (docker compose down)? [Y/n] " ans
ans="${ans:-Y}"
if [[ "$ans" =~ ^[Yy]$ ]]; then
  docker compose down --remove-orphans || true
  echo "Containers stopped/removed."
else
  echo "Skipped docker compose down."
fi

echo
read -r -p "Remove Docker volumes (this deletes database data)? [y/N] " ansv
ansv="${ansv:-N}"
if [[ "$ansv" =~ ^[Yy]$ ]]; then
  docker compose down -v --remove-orphans || true
  echo "Volumes removed."
else
  echo "Volumes kept."
fi

echo
read -r -p "Remove Docker images built for this panel? [y/N] " ansi
ansi="${ansi:-N}"
if [[ "$ansi" =~ ^[Yy]$ ]]; then
  # These are the default image names from compose build
  docker image rm -f custom-hosting-panel-web custom-hosting-panel-api 2>/dev/null || true
  # Also prune dangling images (safe)
  docker image prune -f || true
  echo "Images removed/pruned."
else
  echo "Images kept."
fi

echo
read -r -p "Delete the panel folder '$REPO_DIR'? [y/N] " ansd
ansd="${ansd:-N}"
if [[ "$ansd" =~ ^[Yy]$ ]]; then
  echo "Deleting folder..."
  cd "$PARENT_DIR"
  # Use sudo if needed (docker may have created root-owned files)
  if rm -rf "$REPO_NAME" 2>/dev/null; then
    echo "Deleted with normal permissions."
  else
    echo "Normal delete failed (permissions). Trying with sudo..."
    sudo rm -rf "$REPO_NAME"
  fi
  echo "Done. Panel removed."
else
  echo "Folder not deleted. Uninstall finished."
fi
