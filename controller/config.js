// config.js

module.exports = {
    port: 3000,

    // Zuordnung: Controller-Events -> Tastatur
    playerKeyMap: {
        1: {
            left: "a",
            right: "d",
            start_top: "up",   // schaltet KI Player oben an / aus
        },
        2: {
            left: "left",
            right: "right",
            start_bottom: "down",   // schaltet KI Player oben an / aus
        }
    },

    // Logging-Details
    logInputs: true
};