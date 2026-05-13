#!/bin/bash
cd /home/house/torrent
pkill -f "node server.js" || true
pkill -f "start-app.sh" || true
set -a
. .env
set +a
nohup node server.js > /home/house/torrent/server-run.log 2>&1 &
pid=$!
echo "started server pid $pid"
printf "%s" "$pid" > /home/house/torrent/server-run.pid
