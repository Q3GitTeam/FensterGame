#!/bin/bash
export DISPLAY=:0
export XAUTHORITY=/home/ich/.Xauthority
set -e

URL="http://localhost:3000/game/Pong.html" 
# served by node and injected controller connection and key emulation

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

echo "Prüfe, ob Domain auf diesen Rechner zeigt..."

EXPECTED_HOST="$(hostname)"

WHOAMI_JSON=""
for i in {1..20}; do
  WHOAMI_JSON="$(curl -fsS --max-time 3 https://controller.qdreigaming.org/_whoami 2>/dev/null || true)"
  if [ -n "$WHOAMI_JSON" ]; then
    break
  fi
  echo "…warte auf Tunnel ($i/20)"
  sleep 1
done

if [ -z "$WHOAMI_JSON" ]; then
  echo "❌ FEHLER: Keine Antwort von https://controller.qdreigaming.org/_whoami"
  echo "   → Tunnel ist nicht online oder DNS zeigt woanders hin."
  exit 1
fi

RESPONSE_HOST="$(printf '%s' "$WHOAMI_JSON" | jq -r '.host' 2>/dev/null || true)"

if [ -z "$RESPONSE_HOST" ] || [ "$RESPONSE_HOST" = "null" ]; then
  echo "❌ FEHLER: _whoami ist keine gültige JSON-Antwort oder enthält keinen .host"
  echo "   Antwort war:"
  echo "$WHOAMI_JSON"
  exit 1
fi

if [ "$RESPONSE_HOST" != "$EXPECTED_HOST" ]; then
  echo "❌ FEHLER: Tunnel zeigt auf '$RESPONSE_HOST', nicht auf '$EXPECTED_HOST'"
  exit 1
fi

echo "✅ Tunnel zeigt korrekt auf diesen Rechner ($EXPECTED_HOST)"

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