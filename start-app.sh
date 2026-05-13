#!/bin/bash
# Simple app starter that keeps the dev server running

cd /home/house/torrent

while true; do
    echo "Starting torrent app..."
    npm run dev
    echo "App exited, restarting in 2 seconds..."
    sleep 2
done
