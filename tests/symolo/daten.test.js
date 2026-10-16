/* Tests der Datenschicht (symolo/quelle/40_daten.js) gegen den lokalen Nachbau.
   Ohne Browser, ohne Symolo. Start: node --test tests/symolo/  (läuft auch in python -m pytest mit). */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SYMOLO = path.join(__dirname, "..", "..", "symolo");

/* Frische Umgebung je Test: Beispieldaten, Nachbau, alle Ansichten. */
function umgebung(zusatz) {
    const ctx = { console: { warn() {}, log: console.log }, setTimeout, clearTimeout, Promise, JSON };
    ctx.window = ctx;
    vm.createContext(ctx);
    for (const datei of ["lokal/beispieldaten.js", "lokal/symolo-nachbau.js", "fertig/lokal_ansichten.js"]) {
        vm.runInContext(fs.readFileSync(path.join(SYMOLO, datei), "utf8"), ctx, { filename: datei });
    }
    const v = ctx.KOM_ANSICHTEN.verbindungstest();
    if (zusatz) zusatz(ctx, v);
    return { ctx, v, db: ctx.symolo._nachbau.daten() };
}

test("Lesen: Namen statt IDs, Verweis zu Gruppennamen aufgelöst", async () => {
    const { v } = umgebung();
    const liste = await v.datenLesen("prozess", { sortierung: ["name"] });
    assert.equal(liste.length, 5);
    const montage = liste.find(z => z.name === "Montage");
    assert.equal(montage.gruppe, "Beispielgruppe 3");
    assert.equal(montage._gruppe_id, 3);
    assert.equal(liste.find(z => z.name === "Sonstiges").gruppe, "");
    /* Sichtbare Felder enthalten keine ID */
    for (const z of liste) {
        for (const k of Object.keys(z)) if (k.charAt(0) !== "_") assert.notEqual(k, "id");
    }
});

test("Lesen klappt auch mit fremder Schreibweise der Spalten", async () => {
    const { v, ctx } = umgebung();
    ctx.symolo._nachbau.schalter.schreibweise = true;
    const liste = await v.datenLesen("prozess", {});
    assert.equal(liste.find(z => z._id === 7).name, "Montage");
    assert.equal(liste.find(z => z._id === 7).gruppe, "Beispielgruppe 3");
});

test("Anlegen setzt keine ID; Symolo (Nachbau) vergibt sie", async () => {
    const { v, db } = umgebung();
    const neu = await v.datenAnlegen("prozess", { name: "Neu" });
    assert.ok(neu._id > 13);
    assert.equal(db["fwm.stamm_prozesse"].zeilen.length, 6);
    await assert.rejects(v.datenAnlegen("prozess", { id: 99, name: "x" }), /ID/);
});

test("Ändern schickt das komplette Objekt: andere Felder bleiben erhalten", async () => {
    const { v, db } = umgebung();
    const montage = (await v.datenLesen("prozess", {})).find(z => z.name === "Montage");
    await v.datenAendern("prozess", montage, { name: "Montage neu" });
    const roh = db["fwm.stamm_prozesse"].zeilen.find(z => z.id === 7);
    assert.equal(roh.name, "Montage neu");
    assert.equal(roh.standard_gruppe_id_gruppe, 3);
    assert.equal(roh.iuser, 1);
});

test("Ändern erkennt, wenn inzwischen jemand anderes geändert hat", async () => {
    const { v } = umgebung();
    const montage = (await v.datenLesen("prozess", {})).find(z => z.name === "Montage");
    await v.datenAendern("prozess", montage, { name: "A" });
    await assert.rejects(v.datenAendern("prozess", montage, { name: "B" }), /inzwischen geändert/);
});

test("Archivieren statt Löschen; archivierte ABs sind sonst ausgeblendet", async () => {
    const { v, db } = umgebung();
    const vorher = await v.datenLesen("auftrag", { aufloesen: false });
    const archivVorher = await v.datenLesen("auftrag", { archiv: "nur", aufloesen: false });
    assert.ok(vorher.length > 0 && archivVorher.length > 0);
    await v.datenArchivieren("auftrag", vorher[0]);
    assert.equal((await v.datenLesen("auftrag", { aufloesen: false })).length, vorher.length - 1);
    assert.equal((await v.datenLesen("auftrag", { archiv: "nur", aufloesen: false })).length, archivVorher.length + 1);
    /* Die Zeile ist noch da, nur markiert */
    assert.equal(db["fwm.kom_auftrag"].zeilen.length, vorher.length + archivVorher.length);
    await assert.rejects(v.datenArchivieren("prozess", vorher[0]), /nicht archiviert/);
});

test("Teile: Verweise auf AB und Baugruppe werden zu Namen", async () => {
    const { v } = umgebung();
    const teile = await v.datenLesen("teil", {});
    const mitBg = teile.find(t => t._baugruppe_id !== null);
    assert.match(mitBg.auftrag, /^AB/);
    assert.notEqual(mitBg.baugruppe, "");
});

test("Bedingungen: =, in, is null und Texte mit Hochkomma", async () => {
    const { v } = umgebung();
    assert.equal((await v.datenLesen("prozess", { wo: { name: "Montage" } })).length, 1);
    assert.equal((await v.datenLesen("prozess", { wo: { gruppe: [3, 5] } })).length, 3);
    assert.equal((await v.datenLesen("prozess", { wo: { gruppe: null } })).length, 2);
    assert.equal((await v.datenLesen("prozess", { wo: { gruppe: [] } })).length, 0);
    assert.equal((await v.datenLesen("prozess", { wo: { name: "O'Brien" } })).length, 0);
    assert.equal(v.sqlBauen("prozess", { wo: { name: "O'Brien" } }),
        "select * from fwm.stamm_prozesse where name = 'O''Brien'");
    assert.throws(() => v.sqlBauen("prozess", { wo: { gibtsnicht: 1 } }), /Unbekanntes Feld/);
});

test("Zeitlimit: tote Verbindung führt zu einer Meldung statt zu ewigem Warten", async () => {
    const { v, ctx } = umgebung();
    ctx.symolo._nachbau.schalter.tot = true;
    v.einstellungen.timeoutMs = 50;
    await assert.rejects(v.datenLesen("prozess", {}), /Keine Antwort nach/);
});

test("Im Symolo-Fenster: internal.connection und Schreibsperre", async () => {
    const aufrufe = [];
    const { v } = umgebung(ctx => {
        ctx.symolo.internal = {
            connection: { websocket: { request: (e, n) => { aufrufe.push(n.cmd); return ctx.symolo.network.websocket.request(e, n); } } }
        };
    });
    assert.equal(v.datenQuelle(), "symolo");
    assert.equal((await v.datenLesen("prozess", {})).length, 5);
    assert.ok(aufrufe.includes("dsf.Database.Select"));
    await assert.rejects(v.datenAnlegen("prozess", { name: "x" }), /noch nicht freigegeben/);
    v.einstellungen.schreibenErlaubtInSymolo = true;
    await v.datenAnlegen("prozess", { name: "x" });
    assert.ok(aufrufe.includes("dsf.dbo.CreateObjectJson"));
});

test("Jede Spalte aus 20_tabellen.js gibt es in den Beispieldaten", () => {
    const { v, db } = umgebung();
    for (const name of Object.keys(v.tabellen)) {
        if (name === "_standard") continue;
        const t = v.tabellen[name];
        const felder = db[t.tabelle].felder.map(f => f.toLowerCase());
        for (const sp of Object.values(t.felder)) assert.ok(felder.includes(sp.toLowerCase()), t.tabelle + ": " + sp);
        for (const sp of Object.values(v.tabellen._standard)) assert.ok(felder.includes(sp), t.tabelle + ": " + sp);
    }
});
