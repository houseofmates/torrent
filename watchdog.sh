#!/bin/bash
# Torrent watchdog script - runs at boot and manages the frontend server

set -e

REPO_DIR="/home/house/torrent"
LOG_DIR="$HOME/.torrent-logs"
LOG_FILE="$LOG_DIR/watchdog.log"

mkdir -p "$LOG_DIR"
cd "$REPO_DIR" || exit 1

# Load environment variables from .env file if present
if [ -f .env ]; then
    set -a
    . .env
    set +a
fi

sync_changes() {
    cd "$REPO_DIR" || return 1
    if ! git diff-index --quiet HEAD --; then
        git add -A
        git commit -m "autocommit $(date +%T)"
        git push origin main
    fi
}

fetch_remote() {
    cd "$REPO_DIR" || return 1
    git fetch origin main >> "$LOG_FILE" 2>&1 || true
}

restart_server() {
    cd "$REPO_DIR" || return 1
    if [ -n "$CLIENT_PID" ] && kill -0 "$CLIENT_PID" 2>/dev/null; then
        echo "$(date): Stopping existing server PID $CLIENT_PID" >> "$LOG_FILE"
        kill "$CLIENT_PID" || true
        wait "$CLIENT_PID" 2>/dev/null || true
    fi

    echo "$(date): Building torrent app..." >> "$LOG_FILE"
    npm run build >> "$LOG_FILE" 2>&1

    echo "$(date): Starting torrent app..." >> "$LOG_FILE"
    nohup npm run start >> "$LOG_FILE" 2>&1 &
    CLIENT_PID=$!
    echo "$(date): Started npm start with PID $CLIENT_PID" >> "$LOG_FILE"
}

current_head=""
remote_head=""

echo "$(date): Starting torrent watchdog" >> "$LOG_FILE"
restart_server
current_head=$(git rev-parse HEAD 2>/dev/null || echo "")

while true; do
    if [ -z "$CLIENT_PID" ] || ! kill -0 "$CLIENT_PID" 2>/dev/null; then
        echo "$(date): Torrent client (PID $CLIENT_PID) not running, restarting..." >> "$LOG_FILE"
        restart_server
        current_head=$(git rev-parse HEAD 2>/dev/null || echo "")
    else
        fetch_remote
        remote_head=$(git rev-parse origin/main 2>/dev/null || echo "")
        if [ -n "$remote_head" ] && [ "$remote_head" != "$current_head" ]; then
            echo "$(date): Remote repository updated, pulling and redeploying..." >> "$LOG_FILE"
            git pull --ff-only origin main >> "$LOG_FILE" 2>&1 || true
            current_head=$(git rev-parse HEAD 2>/dev/null || echo "")
            restart_server
        fi
    fi

    sync_changes
    sleep 10
done