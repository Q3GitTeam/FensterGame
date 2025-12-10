// config.js

module.exports = {
    port: 3000,

    // Zuordnung: Controller-Events -> Tastatur
    playerKeyMap: {
        1: {
            left: "a",
            right: "d",
            action: "up",   // schaltet KI Player oben an / aus
        },
        2: {
            left: "left",
            right: "right",
            action: "down",   // schaltet KI Player oben an / aus
        }
    },

    // Logging-Details
    logInputs: true
};