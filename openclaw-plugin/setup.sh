#!/usr/bin/env bash
set -euo pipefail

# OpenRecord Plugin Setup Script
# Prerequisites: OpenClaw already installed and configured
# Run: bash setup.sh

echo "=== OpenRecord Plugin Setup ==="

# Check OpenClaw is installed
if ! command -v openclaw &>/dev/null; then
  echo "ERROR: OpenClaw is not installed. Install it first."
  exit 1
fi
echo "[1/3] OpenClaw found: $(openclaw --version 2>&1 | head -1)"

# Clean up any stale extension directory
rm -rf ~/.openclaw/extensions/openclaw-openrecord 2>/dev/null || true

# Install the plugin
echo "[2/3] Installing OpenRecord plugin..."
openclaw plugins install openclaw-openrecord

# Ensure it's in the allow list
echo "[3/3] Enabling plugin..."
python3 -c "
import json, os

config_path = os.path.expanduser('~/.openclaw/openclaw.json')
with open(config_path) as f:
    config = json.load(f)

config.setdefault('plugins', {}).setdefault('allow', [])
if 'openclaw-openrecord' not in config['plugins']['allow']:
    config['plugins']['allow'].append('openclaw-openrecord')
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    print('Added openclaw-openrecord to plugins.allow')
else:
    print('openclaw-openrecord already in plugins.allow')
"

# --- Uncomment below to auto-configure the test MyChart instance ---
# echo "[*] Configuring test MyChart account (Springfield General / Homer Simpson)..."
# python3 -c "
# import json, os
# config_path = os.path.expanduser('~/.openclaw/openclaw.json')
# with open(config_path) as f:
#     config = json.load(f)
# config['plugins']['entries']['openclaw-openrecord'] = {
#     'enabled': True,
#     'config': {
#         'hostname': 'fake-mychart.fanpierlabs.com',
#         'username': 'homer',
#         'password': 'donuts123'
#     }
# }
# with open(config_path, 'w') as f:
#     json.dump(config, f, indent=2)
# print('Test MyChart account configured')
# "
# --- End test account config ---

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Set up your MyChart credentials: openclaw openrecord setup"
echo "  2. Verify it works: openclaw openrecord ping"
echo ""
