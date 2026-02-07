#!/bin/bash
# Restore original VSCode User settings after extension development

SETTINGS_FILE="$HOME/Library/Application Support/Code/User/settings.json"
BACKUP_FILE="$HOME/Library/Application Support/Code/User/settings.json.backup"

if [ -f "$BACKUP_FILE" ]; then
    mv "$BACKUP_FILE" "$SETTINGS_FILE"
    echo "✓ Original VSCode settings restored"
else
    echo "✗ No backup file found at: $BACKUP_FILE"
    exit 1
fi
