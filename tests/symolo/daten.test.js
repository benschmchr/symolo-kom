/* Tests der Datenschicht (symolo/quelle/40_daten.js) gegen den lokalen Nachbau.
   Ohne Browser, ohne Symolo. Start: node --test tests/symolo/  (läuft auch in python -m pytest mit). */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { umgebung } = require("./umgebung");

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

test("Lesen mit Spaltenliste holt nur diese Spalten (und ID, Änderungszeit, Archiv-Feld)", async () => {
    const { v } = umgebung();

    const sql = v.sqlBauen("forecast_zeile", { felder: ["schluessel", "termin"], wo: { forecast: [1] } });
    assert.equal(sql, "select id, udate, schluessel, termin from fwm.kom_forecast_zeile where forecast_id_forecast in (1)");
    assert.equal(v.sqlBauen("planungsmarke", { felder: ["ab_schluessel"] }),
        "select id, udate, archiviert, ab_schluessel from fwm.kom_planungsmarke");
    assert.equal(v.sqlBauen("forecast", {}), "select * from fwm.kom_forecast");

    const zeilen = await v.datenLesenIn("forecast_zeile", "forecast", [1], { felder: ["schluessel", "termin"] });
    assert.ok(zeilen.length > 10);
    assert.ok(zeilen.every(z => z.schluessel && z.werte === null && z.nr === null));
    assert.throws(() => v.sqlBauen("forecast_zeile", { felder: ["gibt_es_nicht"] }), /Unbekanntes Feld/);
});

test("Alter Browser-Stand ohne neue Spalte: Häkchen in der Planung lässt sich trotzdem entfernen", async () => {
    /* Gespeichert vor Phase 5: planungsmarke ohne Spalte "archiviert". */
    const vorher = umgebung().ctx.symolo._nachbau.daten();
    const t = vorher["fwm.kom_planungsmarke"];
    t.felder = t.felder.filter(f => f !== "archiviert");
    t.zeilen.forEach(z => { delete z.archiviert; });
    delete vorher["fwm.kom_forecast"];

    const speicher = { "kom-symolo-nachbau-v1": JSON.stringify(vorher) };
    const { v, ctx } = umgebung(null, "planung", c => {
        c.localStorage = {
            getItem: k => (k in speicher ? speicher[k] : null),
            setItem: (k, w) => { speicher[k] = String(w); },
            removeItem: k => { delete speicher[k]; }
        };
    });

    const db = ctx.symolo._nachbau.daten();
    assert.ok(db["fwm.kom_planungsmarke"].felder.includes("archiviert"));
    assert.ok(db["fwm.kom_forecast"].zeilen.length > 0);

    const zeilen = await v.plMarkenLaden();
    const schluessel = Object.keys(v.plAktive(zeilen))[0];
    assert.ok(schluessel);
    await v.plSetzen(zeilen, schluessel, false, []);
    assert.equal(v.plAktive(await v.plMarkenLaden())[schluessel], undefined);
    /* und der Stand wurde mit der neuen Spalte gespeichert */
    assert.ok(JSON.parse(speicher["kom-symolo-nachbau-v1"])["fwm.kom_planungsmarke"].felder.includes("archiviert"));
});

test("Archivieren über einen Status (Herr Herzog, 16.10.): die App rechnet mit ja/nein, Symolo bekommt den Statuswert", async () => {
    const { v, db } = umgebung(null, "bestandsliste");
    const zeilen = db["fwm.kom_auftrag"].zeilen;
    const vorherArchiv = zeilen.filter(z => v.istJa(z.archiviert)).length;
    /* so sähe es in Symolo aus: eine Statusspalte statt ja/nein */
    zeilen.forEach(z => { z.archiviert = v.istJa(z.archiviert) ? "archiviert" : "aktiv"; });
    v.tabellen.auftrag.archivWerte = { ja: "archiviert", nein: "aktiv" };

    const aktiv = await v.datenLesen("auftrag", { aufloesen: false });
    assert.equal((await v.datenLesen("auftrag", { archiv: "nur", aufloesen: false })).length, vorherArchiv);
    assert.equal(aktiv[0].archiviert, false);

    await v.datenArchivieren("auftrag", aktiv[0]);
    const roh = zeilen.find(z => z.id === aktiv[0]._id);
    assert.equal(roh.archiviert, "archiviert");
    const zurueck = (await v.datenLesen("auftrag", { archiv: "nur", aufloesen: false })).find(z => z._id === aktiv[0]._id);
    assert.equal(zurueck.archiviert, true);

    await v.datenAendern("auftrag", zurueck, { archiviert: false });
    assert.equal(roh.archiviert, "aktiv");
    assert.match(v.sqlBauen("auftrag", { wo: { archiviert: true } }), /= 'archiviert'$/);
    /* andere Felder werden nicht übersetzt */
    assert.match(v.sqlBauen("auftrag", { wo: { bereich: "bestand" } }), /= 'bestand'$/);
});

test("Rechte (currentRights): im Nachbau alle an, sonst nur die gesetzten; ohne Recht ist der Knopf aus", () => {
    const { v, ctx } = umgebung(null, "bestandsliste");
    const namen = Object.keys(v.rechteListe);
    assert.deepEqual(namen, ["kom.bestand.bearbeiten", "kom.schweissen.bearbeiten", "kom.planung.bearbeiten",
        "kom.import.excel", "kom.protokoll.verwalten"]);
    namen.forEach(n => { assert.match(n, /^kom\.[a-z]+\.[a-z]+$/); assert.equal(v.darf(n), true, n); });

    ctx.currentRights = { "kom.planung.bearbeiten": true, "kom.bestand.bearbeiten": "ja" };
    assert.equal(v.darf("kom.planung.bearbeiten"), true);
    assert.equal(v.darf("kom.bestand.bearbeiten"), false);   /* nur true zählt */
    assert.equal(v.darf("kom.schweissen.bearbeiten"), false);

    const knopf = { disabled: false, title: "" };
    assert.equal(v.nurMitRecht(knopf, "kom.bestand.bearbeiten"), knopf);
    assert.equal(knopf.disabled, true);
    const frei = { disabled: false, title: "" };
    v.nurMitRecht(frei, "kom.planung.bearbeiten");
    assert.equal(frei.disabled, false);

    /* in Symolo ohne currentRights: kein Recht */
    delete ctx.currentRights;
    v.datenQuelle = () => "symolo";
    namen.forEach(n => assert.equal(v.darf(n), false, n));
});

test("Rechte: jeder Name im Code steht in der Liste der Rechte", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const { v } = umgebung();
    const { SYMOLO } = require("./umgebung");
    const dateien = fs.readdirSync(path.join(SYMOLO, "quelle")).filter(d => d.endsWith(".js")).map(d => path.join(SYMOLO, "quelle", d))
        .concat(fs.readdirSync(path.join(SYMOLO, "ansichten")).map(d => path.join(SYMOLO, "ansichten", d, "ansicht.js")));
    const benutzt = new Set();
    dateien.forEach(d => (fs.readFileSync(d, "utf8").match(/"kom\.[a-z]+\.[a-z]+"/g) || []).forEach(n => benutzt.add(n.slice(1, -1))));
    assert.ok(benutzt.size >= 4);
    benutzt.forEach(n => assert.ok(n in v.rechteListe, n));
});
