#!/usr/bin/env bash
set -e

echo "== Custom Hosting Panel installer =="

if ! command -v curl >/dev/null 2>&1; then
  sudo apt update -y
  sudo apt install -y curl
fi

echo "Installing Docker (official script)..."
curl -fsSL https://get.docker.com | sudo sh

echo "Adding current user to docker group..."
sudo usermod -aG docker "$USER" || true

echo "Installing Node.js 20 (NodeSource)..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo
echo "Done."
echo "IMPORTANT: log out and back in (or run: newgrp docker) so 'docker' works without sudo."
echo
echo "Next:"
echo "  npm run install:all"
echo "  npm run start"
