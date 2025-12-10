// index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const robot = require("robotjs");
const config = require("./config");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Statische Dateien (Controller)
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.send(`
    <h1>Scratch Controller Bridge</h1>
    <p>Controller: <a href="/controller.html" target="_blank">/controller.html</a></p>
    <p>Öffne diese Seite auf dem Handy im gleichen Netzwerk.</p>
  `);
});

io.on("connection", (socket) => {
    console.log("Neuer Controller verbunden:", socket.id);

    socket.data.player = 1;
    socket.data.name = null;

    socket.on("identify", (data) => {
        if (data?.player) socket.data.player = parseInt(data.player, 10) || 1;
        if (data?.name) socket.data.name = String(data.name);
        console.log("IDENTIFY", socket.id, "->", socket.data);
    });

    socket.on("control", (payload) => {
        handleControl(socket, payload);
    });

    socket.on("disconnect", () => {
        console.log("Controller getrennt:", socket.id, socket.data);
        // Optional: beim Disconnect alle Tasten loslassen
        releaseAllForPlayer(socket.data.player);
    });
});

function handleControl(socket, payload) {
    const player = payload.player ? parseInt(payload.player, 10) : socket.data.player || 1;
    const type = payload.type;
    const value = payload.value;

    const keyMap = config.playerKeyMap[player] || config.playerKeyMap[1];
    const key = typeof value === "string" ? keyMap[value] : null;

    if (!key) {
        if (config.logInputs) {
            console.log("Unbekannter Wert / keine Taste gemappt:", { player, type, value });
        }
        return;
    }

    if (config.logInputs) {
        console.log("Input:", { player, type, value, key });
    }

    switch (type) {
        case "press":
            // Taste gedrückt halten
            robot.keyToggle(key, "down");
            break;
        case "release":
            // Taste loslassen
            robot.keyToggle(key, "up");
            break;
        case "tap":
            // kurzer Druck
            robot.keyTap(key);
            break;
        case "hold":
            // optional: bei Bedarf z.B. keyTap wiederholen
            // hier ignorieren wir es, weil keyToggle schon gedrückt hält
            break;
        case "tilt":
            // Falls du später Gyro-Steuerung nutzen willst (value={gamma,...})
            // hier könntest du gamma in Links/Rechts-Tasten übersetzen
            break;
        default:
            console.log("Unbekannter Typ:", type);
    }
}

function releaseAllForPlayer(player) {
    const keyMap = config.playerKeyMap[player];
    if (!keyMap) return;
    const uniqKeys = new Set(Object.values(keyMap));
    uniqKeys.forEach((k) => robot.keyToggle(k, "up"));
}

// Server starten
server.listen(config.port, () => {
    console.log(`Scratch Controller Bridge läuft auf http://localhost:${config.port}`);
    console.log(`Controller im Browser: http://<deine-IP>:${config.port}/controller.html`);
});