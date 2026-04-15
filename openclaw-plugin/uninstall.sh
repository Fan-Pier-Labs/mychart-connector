#!/usr/bin/env bash
set -euo pipefail

# OpenRecord Plugin Uninstall Script
# Removes the OpenRecord plugin and its config entries

echo "=== OpenRecord Plugin Uninstall ==="

# Check OpenClaw is installed
if ! command -v openclaw &>/dev/null; then
  echo "ERROR: OpenClaw is not installed."
  exit 1
fi

# Uninstall the plugin
echo "[1/3] Uninstalling OpenRecord plugin..."
echo "y" | openclaw plugins uninstall openclaw-openrecord 2>/dev/null || true

# Reset MyChart credentials
echo "[2/3] Resetting OpenRecord data..."
openclaw openrecord reset 2>/dev/null || true

# Clean up config entries
# Remove extension directory
rm -rf ~/.openclaw/extensions/openclaw-openrecord

echo "[3/3] Cleaning up config..."
python3 -c "
import json, os

config_path = os.path.expanduser('~/.openclaw/openclaw.json')
with open(config_path) as f:
    config = json.load(f)

changed = False
plugins = config.get('plugins', {})

# Remove from entries
if 'openclaw-openrecord' in plugins.get('entries', {}):
    del plugins['entries']['openclaw-openrecord']
    changed = True

# Remove from installs
if 'openclaw-openrecord' in plugins.get('installs', {}):
    del plugins['installs']['openclaw-openrecord']
    changed = True

# Remove from allow list
allow = plugins.get('allow', [])
if 'openclaw-openrecord' in allow:
    allow.remove('openclaw-openrecord')
    changed = True

if changed:
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    print('Config cleaned up')
else:
    print('Nothing to clean up')
"

echo ""
echo "=== Uninstall Complete ==="
echo ""
