/* Rechte in Symolo (50_benutzer.js): das Objekt currentRights füllt der Symolo-Entwickler im Framework.
   Lokal gilt alles als erlaubt; im Symolo-Fenster nur, was das Objekt mit true freigibt. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { umgebung } = require("./umgebung");

test("Rechte: lokal ohne Objekt ist alles erlaubt", () => {
    const { v } = umgebung(null, "bestandsliste");
    assert.equal(v.rechteObjekt(), null);
    assert.equal(v.darf(v.rechte.importKomlisten), true);
    assert.equal(v.darf(v.rechte.importForecast), true);
});

test("Rechte: das Objekt entscheidet, nur true erlaubt", () => {
    const { v, ctx } = umgebung(null, "bestandsliste");
    ctx.currentRights = { "kom.edit.canimportkomlisten": true, "kom.edit.canimportforecast": "ja" };

    assert.equal(v.darf(v.rechte.importKomlisten), true);
    assert.equal(v.darf(v.rechte.importForecast), false, "nur true zählt");

    ctx.currentRights = {};
    assert.equal(v.darf(v.rechte.importKomlisten), false, "ein leeres Objekt erlaubt nichts, auch lokal");
});

test("Rechte: im Symolo-Fenster ohne Objekt ist nichts erlaubt", () => {
    const { v } = umgebung(null, "bestandsliste");
    v.einstellungen.quelle = "symolo-test";
    assert.equal(v.datenQuelle(), "symolo-test");
    assert.equal(v.darf(v.rechte.importKomlisten), false);
    assert.match(v.rechtFehlt(), /Recht/);
});

test("Rechte: die Namen haben das Format modul.gruppe.recht", () => {
    const { v } = umgebung(null, "bestandsliste");
    Object.values(v.rechte).forEach(r => assert.match(r, /^[a-z]+\.[a-z]+\.can[a-z]+$/, r));
});
