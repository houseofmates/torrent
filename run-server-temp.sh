#!/bin/bash
cd /home/house/torrent || exit 1
pkill -f "node server.js" || true
pkill -f "start-app.sh" || true

# Load environment variables from .env file
if [ -f .env ]; then
    set -a
    . .env
    set +a
fi

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Building torrent app..."
npm run build

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting torrent app..."
nohup npm run start > /home/house/torrent/server-run.log 2>&1 &
pid=$!
echo "started server pid $pid"
printf "%s" "$pid" > /home/house/torrent/server-run.pid
