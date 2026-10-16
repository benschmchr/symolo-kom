/* Gemeinsame Testumgebung für die Node-Tests: frische Beispieldaten, Nachbau von window.symolo,
   alle gebauten Ansichten. Ohne Browser, ohne Symolo. */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SYMOLO = path.join(__dirname, "..", "..", "symolo");

/* zusatz(ctx, v) darf die Umgebung vor dem Test anpassen; name wählt die Ansicht. */
function umgebung(zusatz, name) {
    const ctx = { console: { warn() {}, log: console.log }, setTimeout, clearTimeout, Promise, JSON };
    ctx.window = ctx;
    vm.createContext(ctx);
    for (const datei of ["lokal/beispieldaten.js", "lokal/symolo-nachbau.js", "fertig/lokal_ansichten.js"]) {
        vm.runInContext(fs.readFileSync(path.join(SYMOLO, datei), "utf8"), ctx, { filename: datei });
    }
    const v = ctx.KOM_ANSICHTEN[name || "verbindungstest"]();
    if (zusatz) zusatz(ctx, v);
    return { ctx, v, db: ctx.symolo._nachbau.daten() };
}

module.exports = { umgebung, SYMOLO };
