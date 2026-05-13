#!/bin/bash
# Simple app starter that builds and keeps the production server running

cd /home/house/torrent || exit 1

# Load environment variables from .env file
if [ -f .env ]; then
    set -a
    . .env
    set +a
fi

while true; do
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Building torrent app..."
    npm run build
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting torrent app..."
    npm run start >> /home/house/torrent/server-run.log 2>&1
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] App exited, restarting in 2 seconds..."
    sleep 2
 done
