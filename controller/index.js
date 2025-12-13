// controller/index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const config = require("./config");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
    // etwas großzügiger für iOS/WLAN:
    pingInterval: 25000,
    pingTimeout: 60000,
});

// ──────────────────────────────────────────────────────────────
// Static: Controller (liegt in controller/public)
// ──────────────────────────────────────────────────────────────
app.use(express.static("public"));

// ──────────────────────────────────────────────────────────────
// Game: exportierter TurboWarp-Ordner liegt in ../game
// Wir liefern alles statisch aus, aber Pong.html wird "on the fly" gepatcht.
// ──────────────────────────────────────────────────────────────
const gameDir = path.join(__dirname, "..", "game");
const pongFile = "Pong.html"; // ggf. anpassen
const pongPath = path.join(gameDir, pongFile);

function injectBeforeBodyEnd(html, snippet) {
    const MARK = "__Q3_BRIDGE_INSTALLED__";
    if (html.includes(MARK)) return html;

    const marker = "</body>";
    const i = html.lastIndexOf(marker);
    const wrapped = `\n<!-- ${MARK} -->\n${snippet}\n`;

    if (i === -1) return html + wrapped;
    return html.slice(0, i) + wrapped + html.slice(i);
}


// Bridge-Snippet: empfängt control-events und simuliert KeyboardEvents im Game
// Slot-Logik:
// - player "1": left/right = ArrowLeft/ArrowRight; start_top = ArrowUp
// - player "2": left/right = KeyA/KeyD;          start_bottom = ArrowDown
const bridgeSnippet = `
<script src="/socket.io/socket.io.js"></script>
<script>
(() => {
  const socket = io(window.location.origin, { transports: ["websocket"] });
  const held = new Set();

    // pro Player: left/right + start
  const mapByPlayer = {
    "1": { left: "KeyA",      right: "KeyD",      start: "ArrowUp"   },
    "2": { left: "ArrowLeft", right: "ArrowRight", start: "ArrowDown" },
  };

  function fire(type, code){
    // zusätzlich "key" setzen (TurboWarp/Scratch ist manchmal picky)
    const key =
      code === "ArrowLeft" ? "ArrowLeft" :
      code === "ArrowRight" ? "ArrowRight" :
      code === "ArrowUp" ? "ArrowUp" :
      code === "ArrowDown" ? "ArrowDown" :
      code.startsWith("Key") ? code.slice(3).toLowerCase() :
      "";

    const ev = new KeyboardEvent(type, {
      code,
      key,
      bubbles: true,
      cancelable: true
    });

    // in der Praxis besser auf document dispatchen
    document.dispatchEvent(ev);
  }

  function keyDown(code){
    if (held.has(code)) return;
    held.add(code);
    fire("keydown", code);
  }

  function keyUp(code){
    held.delete(code);
    fire("keyup", code);
  }

  function tap(code, ms=60){
    keyDown(code);
    setTimeout(() => keyUp(code), ms);
  }

  socket.on("connect", () => {
    socket.emit("register", { role: "game" });
    console.log("Game connected");
    try { window.focus(); document.body?.focus?.(); } catch(e){}
  });

  socket.on("control", (payload) => {
    console.log("[bridge] got control", payload); // DEBUG info
    const { type, value, player } = payload || {};
    const p = String(player || "1");
    const code = mapByPlayer[p]?.[value];
    if (!code) return;

    if (type === "tap") return tap(code);
    if (type === "press") return keyDown(code);
    if (type === "release") return keyUp(code);
    // hold ignorieren
  });

  // DEBUG: GET DISCONNECT REASON:
  socket.on("disconnect", (reason) => {
    if (socket.data.role !== "game" && reason === "transport close") {
      // Controller wird oft „normal“ geschlossen – nicht spammen
      return;
    }
    console.log("Socket getrennt:", socket.id, "role:", socket.data.role, "reason:", reason);
  });
  socket.on("disconnecting", (reason) => {
    console.log("Socket disconnecting:", socket.id, "rooms:", [...socket.rooms], "reason:", reason);
  });

  window.addEventListener("blur", () => {
    for (const code of Array.from(held)) keyUp(code);
  });
})();
</script>
`;

// Pong.html mit Injection ausliefern
app.get(`/game/${pongFile}`, (req, res) => {
    try {
        let html = fs.readFileSync(pongPath, "utf8");
        html = injectBeforeBodyEnd(html, bridgeSnippet);
        res.type("html").send(html);
    } catch (e) {
        console.error("Fehler beim Lesen von Pong.html:", e);
        res.status(500).send("Fehler: Pong.html konnte nicht geladen werden");
    }
});

// alle anderen Assets normal statisch
app.use("/game", express.static(gameDir));

app.get("/_whoami", (req, res) => {
    res.json({
        host: require("os").hostname(),
        pid: process.pid,
        time: new Date().toISOString(),
    });
});

// Startseite (optional)
app.get("/", (req, res) => {
    res.send(`
    <h1>FensterGame Controller Bridge</h1>
    <ul>
      <li><a href="/controller.html?slot=1">Controller Slot 1</a></li>
      <li><a href="/controller.html?slot=2">Controller Slot 2</a></li>
      <li><a href="/game/${pongFile}">Game (Pong)</a></li>
    </ul>
  `);
});

// ──────────────────────────────────────────────────────────────
// Socket.IO: Rooms
// ──────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
    console.log("Socket verbunden:", socket.id);

    socket.on("register", (data) => {
        if (data?.role === "game") {
            socket.join("game");
            socket.data.role = "game";
            console.log("GAME registriert:", socket.id);
            socket.emit("registered", { ok: true });
        }
    });

    socket.on("control", (payload) => {
        if (config.logInputs) console.log("control:", payload);
        io.to("game").emit("control", payload);
    });

    socket.on("disconnect", (reason) => {
        console.log("Socket getrennt:", socket.id, "role:", socket.data.role, "reason:", reason);
    });
});

// ──────────────────────────────────────────────────────────────
// Server starten
// ──────────────────────────────────────────────────────────────
server.listen(config.port, () => {
    console.log(`FensterGame Bridge läuft auf http://localhost:${config.port}`);
    console.log(`Controller: http://<deine-IP>:${config.port}/controller.html?slot=1`);
    console.log(`Game:       http://localhost:${config.port}/game/${pongFile}`);
});