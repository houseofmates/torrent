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

# Start torrent client
cd /home/house/torrent
npm run dev --port 3004 --host &
CLIENT_PID=$!

# Main watchdog loop
while true; do
    # Check if client process is still running
    if ! kill -0 $CLIENT_PID 2>/dev/null; then
        # Client died, restart it
        echo "$(date): Torrent client died, restarting..." >> /tmp/torrent-watchdog.log
        npm run dev --port 3004 --host &
        CLIENT_PID=$!
    fi

    # Sync git changes every 10 seconds
    sync_changes

    sleep 10
done