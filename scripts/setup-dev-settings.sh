#!/bin/bash
# Temporarily add c64u settings to VSCode User settings for extension development

SETTINGS_FILE="$HOME/Library/Application Support/Code/User/settings.json"
BACKUP_FILE="$HOME/Library/Application Support/Code/User/settings.json.backup"

# Create backup
cp "$SETTINGS_FILE" "$BACKUP_FILE"

# Use jq to add c64u settings (requires jq to be installed)
if command -v jq &> /dev/null; then
    jq '. + {"c64u.enabled": true, "c64u.host": "c64u.homelab.cybersorcerer.org", "c64u.port": 80}' "$BACKUP_FILE" > "$SETTINGS_FILE"
    echo "✓ C64U development settings added to VSCode User settings"
    echo "  Backup saved to: $BACKUP_FILE"
else
    echo "✗ jq is not installed. Please install it with: brew install jq"
    exit 1
fi
