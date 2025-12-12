#!/bin/bash

echo "Stoppe alte Prozesse..."
pkill -f node
pkill -f cloudflared

sleep 1

echo "Starte Controller..."
cd ~/projects/FensterGame/controller
npm install --omit=dev
nohup node index.js > controller.log 2>&1 &

echo "Starte Cloudflare Tunnel..."
nohup cloudflared tunnel run controller-tunnel > tunnel.log 2>&1 &

echo "OK – alles läuft."