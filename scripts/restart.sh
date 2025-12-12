#!/bin/bash
export DISPLAY=:0
export XAUTHORITY=/home/ich/.Xauthority
set -e

URL="file:///home/ich/projects/FensterGame/game/pong.html"
# Wenn Screen 2 rechts vom Laptop liegt: X = Breite von Screen 1 (z.B. 1920)
SCREEN2_X=1920
SCREEN2_Y=0

echo "Stoppe alte Prozesse..."
pkill -f "node index.js" || true
pkill -f "cloudflared tunnel run controller-tunnel" || true
pkill -f "firefox.*pong.html" || true
pkill -f "firefox.*--kiosk" || true

sleep 1

echo "Starte Controller..."
cd /home/ich/projects/FensterGame/controller
npm install --omit=dev
nohup node index.js > controller.log 2>&1 &

echo "Starte Cloudflare Tunnel..."
nohup cloudflared tunnel run controller-tunnel > tunnel.log 2>&1 &

echo "Starte Firefox im Kiosk..."
nohup firefox --kiosk "$URL" > firefox.log 2>&1 &

# Fenster verschieben + fullscreen
# (wmctrl braucht ein paar Sekunden, bis das Fenster existiert)
echo "Warte auf Firefox-Fenster..."
sleep 3

# Fenster auf Screen 2 verschieben (X,Y) und fullscreen setzen
# -e: gravity,X,Y,width,height (-1 = unverändert)
wmctrl -r "Firefox" -e "0,${SCREEN2_X},${SCREEN2_Y},-1,-1" || true
wmctrl -r "Firefox" -b add,fullscreen || true

echo "OK – alles läuft."