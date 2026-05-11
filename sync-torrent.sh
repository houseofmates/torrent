#!/bin/bash
cd /home/house/torrent
while true; do
    if ! git diff-index --quiet HEAD --; then
        git add -A
        git commit -m autocommit 23:46:39
        git push origin main
    fi
    sleep 10
done
