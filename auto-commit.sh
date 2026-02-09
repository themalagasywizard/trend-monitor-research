#!/bin/bash
# Auto-commit script for trend monitor reports

cd /tmp/trend-monitor-research

# Pull latest changes first
git pull origin main

# Add any new files
git add -A

# Commit if there are changes
if git diff --cached --quiet; then
    echo "No changes to commit"
else
    git commit -m "Auto-update: $(date +%Y-%m-%d-%H:%M) report"
    git push origin main
    echo "Pushed updates to GitHub"
fi
