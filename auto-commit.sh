#!/bin/bash
# Auto-commit script for trend monitor reports
# Sends Telegram notification after push

REPORT_DATE=$(date +%Y-%m-%d)
REPORT_TIME=$(date +%H:%M)
REPORT_FILE="/tmp/trend-monitor-research/daily-summaries/${REPORT_DATE}-*.md"

cd /tmp/trend-monitor-research

# Pull latest changes first
git pull origin main

# Add any new files
git add -A

# Commit if there are changes
if git diff --cached --quiet; then
    echo "No changes to commit"
    exit 0
fi

git commit -m "Auto-update: ${REPORT_DATE}-${REPORT_TIME} report"

# Push to GitHub and capture result
if git push origin main; then
    echo "✅ Report pushed to GitHub successfully"
    # Send Telegram notification via OpenClaw
    # This will be sent by the agent after execution
else
    echo "❌ Failed to push to GitHub"
    exit 1
fi
