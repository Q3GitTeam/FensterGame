(() => {
    const socket = io(window.location.origin);

    const positionEl = document.getElementById("playerPosition");

    // Slot aus URL auslesen
    const params = new URLSearchParams(window.location.search);
    const slotParam = params.get("slot"); // "1" oder "2" (oder null)

    // Spieler-ID bestimmen (Default = 1)
    const playerId = (slotParam === "2") ? "2" : "1";

    // Hinweistext anzeigen
    positionEl.textContent = "NICHT Verbunden ❌";

    function vibrate(ms = 30) {
        if (navigator.vibrate) navigator.vibrate(ms);
    }

    const REP_MS = 80;
    let holdTimer = null;

    function send(type, value) {
        socket.emit("control", {
            type,
            value,
            player: playerId,
        });
    }

    // Auto-Start: beim ersten Connect einmal "tap" senden
    let didAutoStart = false;
    function autoStartOnce() {
        if (didAutoStart) return;
        didAutoStart = true;

        // slot=1 -> Pfeil hoch, slot=2 -> Pfeil runter (als serverseitiges Mapping)
        const startKey = (playerId === "1") ? "start_top" : "start_bottom";
        send("tap", startKey);
    }

    socket.on("connect", () => {
        positionEl.textContent = (playerId === "1") ? "Du spielst OBEN" : "Du spielst UNTEN";
        setTimeout(autoStartOnce, 150);
    });

    socket.on("disconnect", () => {
        positionEl.textContent = "NICHT Verbunden ❌";
    });

    function startHold(ev, value) {
        ev.preventDefault();
        vibrate(10);
        send("press", value);
        holdTimer = setInterval(() => send("hold", value), REP_MS);
    }

    function endHold(ev, value) {
        ev?.preventDefault();
        clearInterval(holdTimer);
        holdTimer = null;
        send("release", value);
    }

    document.querySelectorAll("[data-emit]").forEach((btn) => {
        const value = btn.dataset.emit;

        // Touch
        btn.addEventListener("touchstart", (e) => startHold(e, value), { passive: false });
        btn.addEventListener("touchend", (e) => endHold(e, value), { passive: false });
        btn.addEventListener("touchcancel", (e) => endHold(e, value), { passive: false });

        // Maus (für Tests am PC)
        btn.addEventListener("mousedown", (e) => startHold(e, value));
        btn.addEventListener("mouseup", (e) => endHold(e, value));
        btn.addEventListener("mouseleave", (e) => endHold(e, value));
    });
})();