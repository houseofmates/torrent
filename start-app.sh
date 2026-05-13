#!/bin/bash
# Simple app starter that builds and keeps the production server running

cd /home/house/torrent

while true; do
    echo "Building torrent app..."
    npm run build
    echo "Starting torrent app..."
    npm run start
    echo "App exited, restarting in 2 seconds..."
    sleep 2
done
