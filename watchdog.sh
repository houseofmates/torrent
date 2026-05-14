#!/bin/bash
# Torrent watchdog script - runs at boot and manages both services

# Function to check and push git changes
sync_changes() {
    cd /home/house/torrent
    if ! git diff-index --quiet HEAD --; then
        git add -A
        git commit -m "autocommit $(date +%T)"
        git push origin main
    fi
}

# Log location - use home directory since /tmp might be read-only
LOG_DIR="$HOME/.torrent-logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/watchdog.log"

echo "$(date): Starting torrent watchdog" >> "$LOG_FILE"

# Start torrent client
cd /home/house/torrent
npm run build >> "$LOG_FILE" 2>&1
npm run start >> "$LOG_FILE" 2>&1 &
CLIENT_PID=$!
echo "$(date): Started npm start with PID $CLIENT_PID" >> "$LOG_FILE"

# Main watchdog loop
while true; do
    # Check if client process is still running
    if ! kill -0 $CLIENT_PID 2>/dev/null; then
        # Client died, restart it
        echo "$(date): Torrent client (PID $CLIENT_PID) died, restarting..." >> "$LOG_FILE"
        npm run build >> "$LOG_FILE" 2>&1
        npm run start >> "$LOG_FILE" 2>&1 &
        CLIENT_PID=$!
        echo "$(date): Restarted with new PID $CLIENT_PID" >> "$LOG_FILE"
    fi

    # Sync git changes every 10 seconds
    sync_changes

    sleep 10
done