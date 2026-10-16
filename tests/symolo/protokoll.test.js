/* Änderungsprotokoll in Symolo (4B_protokoll.js, Hooks in 48_eintragen.js und 49_lagerort.js) gegen den Nachbau. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { umgebung } = require("./umgebung");

const json = x => JSON.parse(JSON.stringify(x));
const gleich = (a, b, text) => assert.deepEqual(json(a), json(b), text);

async function geladen(zusatz) {
    const u = umgebung(zusatz, "protokoll");
    u.ab = async nr => (await u.v.bestandLaden()).find(a => a.o.ab_anzeige === nr);
    u.log = async () => (await u.v.protokollLesen()).slice().reverse();   /* älteste zuerst */
    u.neue = async vorher => (await u.log()).slice(vorher);
    return u;
}

test("W7 Vorhanden: alt und neu, Teil mit BG, AB; nichts bei gleichem Wert", async () => {
    const u = await geladen();
    const ab = await u.ab("AB2515204");
    const t = ab.bgs[0].teile.find(x => x.o.zeichnungsnummer === "SK1990-977452.002.0");
    const vorher = (await u.log()).length;
    const alt = u.v.protokollMenge(t.o.vorhanden);

    await u.v.vorhandenSetzen(t, 21000);
    let neu = await u.neue(vorher);
    assert.equal(neu.length, 1);
    gleich([neu[0].art, neu[0].ab, neu[0].objekt, neu[0].alt, neu[0].neu],
        ["menge", "AB2515204", "Teil SK1990-977452.002.0 (BG " + ab.bgs[0].o.kurz + ")", alt, "21"]);
    assert.match(neu[0].zeit, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{7}Z$/);
    assert.equal(neu[0].archiviert, false);

    const t2 = (await u.ab("AB2515204")).bgs[0].teile.find(x => x.o._id === t.o._id);
    await u.v.vorhandenSetzen(t2, 21000);
    assert.equal((await u.neue(vorher)).length, 1, "gleicher Wert: kein neuer Eintrag");
});

test("W7 leer wird als \"leer\" geschrieben, Teil ohne BG ohne Klammer", async () => {
    const u = await geladen();
    const abs = await u.v.bestandLaden();
    const ab = abs.find(a => a.ohne.length);
    if (!ab) return;   /* in den Beispieldaten gibt es keinen AB mit Teilen ohne BG */
    const t = ab.ohne[0];
    const vorher = (await u.log()).length;
    await u.v.vorhandenSetzen(t, 1000);
    const e = (await u.neue(vorher))[0];
    assert.equal(e.objekt, "Teil " + (t.o.zeichnungsnummer || "(ohne Nr.)"));
});

test("W7 allesSetzen: ein Eintrag je geändertem Teil", async () => {
    const u = await geladen();
    const ab = await u.ab("AB2515204");
    const bg = ab.bgs[0];
    const vorher = (await u.log()).length;
    const n = await u.v.allesSetzen(bg);
    const neu = await u.neue(vorher);
    assert.equal(neu.length, n);
    assert.ok(neu.every(e => e.art === "menge" && e.ab === "AB2515204"));
});

test("W7 Soll ändern: Eintrag \"soll\" mit alt und neu", async () => {
    const u = await geladen();
    const ab = await u.ab("AB2515204");
    const t = ab.bgs[0].teile[0];
    const vorher = (await u.log()).length;
    const alt = u.v.sollText(t.o);
    await u.v.sollSetzen([[t, 60]]);
    const neu = await u.neue(vorher);
    assert.equal(neu.length, 1);
    gleich([neu[0].art, neu[0].alt, neu[0].neu], ["soll", alt, "0,06"]);
});

test("W7 Lagerort: AB, BG, Regal; Folgeänderungen stehen nicht einzeln darin", async () => {
    const u = await geladen();
    let ab = await u.ab("AB2515901");
    const vorher = (await u.log()).length;

    await u.v.lagerortAb(ab, "L2");
    let neu = await u.neue(vorher);
    assert.equal(neu.length, 1, "AB, BGs und Teile erben den Platz: ein Eintrag");
    gleich([neu[0].art, neu[0].ab, neu[0].objekt, neu[0].alt, neu[0].neu], ["lagerort", "AB2515901", "", "leer", "L2"]);

    ab = await u.ab("AB2515901");
    await u.v.lagerortAb(ab, "L2");
    assert.equal((await u.neue(vorher)).length, 1, "gleicher Platz: nichts");

    ab = await u.ab("AB2515901");
    await u.v.lagerortBg(ab, ab.bgs[0], "R3", true);
    neu = await u.neue(vorher);
    const bgEintrag = neu[neu.length - 1];
    gleich([bgEintrag.art, bgEintrag.objekt, bgEintrag.alt, bgEintrag.neu], ["lagerort", "BG " + ab.bgs[0].o.name, "L2", "R3"]);
    assert.equal(neu.length, 2, "das Aufsplitten im Regal und R-L3 stehen nicht einzeln darin");

    ab = await u.ab("AB2515901");
    assert.ok(u.v.istJa(ab.o.regal_geteilt));
    await u.v.regalZusammenfuehren(ab, ab.bgs[0]);
    neu = await u.neue(vorher);
    assert.equal(neu.length, 3, "Zusammenführen: nur der Regal-Eintrag");
    const z = neu[2];
    gleich([z.art, z.objekt, z.alt], ["lagerort", "Regal", "Baugruppen einzeln"]);
    assert.match(z.neu, /^AB zusammen \(/);
});

test("W7 Aufsplitten im Regal steht als \"Baugruppen einzeln\"", async () => {
    const u = await geladen();
    const ab = await u.ab("AB2515901");
    const vorher = (await u.log()).length;
    await u.v.regalTeilen(ab);
    const neu = await u.neue(vorher);
    assert.equal(neu.length, 1);
    gleich([neu[0].art, neu[0].ab, neu[0].objekt, neu[0].alt, neu[0].neu], ["lagerort", "AB2515901", "Regal", "AB", "Baugruppen einzeln"]);
});

test("W7 Namen nur, wenn eingeschaltet", async () => {
    const u = await geladen(null);
    u.v.benutzer = () => ({ name: "Anna Beispiel", rollen: [] });
    const t = (await u.ab("AB2515204")).bgs[0].teile[0];
    const vorher = (await u.log()).length;

    await u.v.vorhandenSetzen(t, 1000);
    assert.equal((await u.neue(vorher))[0].benutzer_name, "Anna Beispiel");

    await u.v.protokollEinstellen(true, false, 90);
    await u.v.vorhandenSetzen((await u.ab("AB2515204")).bgs[0].teile[0], 2000);
    assert.equal((await u.neue(vorher))[1].benutzer_name, "", "ohne Namen");
});

test("W7 Protokoll aus: nichts wird geschrieben, die Änderung läuft trotzdem", async () => {
    const u = await geladen();
    await u.v.protokollEinstellen(false, true, 90);
    const t = (await u.ab("AB2515204")).bgs[0].teile[0];
    const vorher = (await u.log()).length;
    await u.v.vorhandenSetzen(t, 3000);
    assert.equal((await u.log()).length, vorher);
    assert.equal((await u.ab("AB2515204")).bgs[0].teile[0].o.vorhanden, 3);
});

test("W7 Einstellungen: speichern, wieder lesen, Zahl von 0 bis 3650", async () => {
    const u = await geladen();
    const e0 = await u.v.protokollEinstellung(true);
    gleich([e0.aktiv, e0.namen, e0.tage], [true, true, 90]);
    const e = await u.v.protokollEinstellen(false, false, 30);
    gleich([e.aktiv, e.namen, e.tage], [false, false, 30]);
    const e2 = await u.v.protokollEinstellung(true);
    gleich([e2.aktiv, e2.namen, e2.tage], [false, false, 30]);
    const werte = u.db["fwm.kom_einstellung"].zeilen.filter(x => /^protokoll_/.test(x.name));
    assert.equal(werte.length, 3, "kein doppelter Eintrag");
});

test("W7 Fehler im Protokoll verhindern die Änderung nicht", async () => {
    const u = await geladen();
    const echt = u.v.datenAnlegen.bind(u.v);
    u.v.datenAnlegen = (name, werte) => (name === "aenderung" ? Promise.reject(new Error("kaputt")) : echt(name, werte));
    const t = (await u.ab("AB2515204")).bgs[0].teile[0];
    assert.equal(await u.v.vorhandenSetzen(t, 4000), "");
    assert.equal((await u.ab("AB2515204")).bgs[0].teile[0].o.vorhanden, 4);
    assert.ok(u.v.datenHinweise.some(h => /Protokoll konnte nicht geschrieben werden/.test(h)));
});

test("W7 Aufbewahren: alte Einträge werden ausgeblendet, nicht gelöscht", async () => {
    const u = await geladen();
    const alle = await u.v.protokollLesen();
    const gesamt = u.db["fwm.kom_aenderung"].zeilen.length;
    const tage = 30;
    const grenze = Date.now() - tage * 86400000;
    const alt = alle.filter(z => u.v.zeitMs(z.zeit) < grenze).length;
    assert.ok(alt > 0 && alt < alle.length);

    const n = await u.v.protokollAufraeumen(alle, tage);
    assert.equal(n, alt);
    assert.equal((await u.v.protokollLesen()).length, alle.length - alt);
    assert.equal(u.db["fwm.kom_aenderung"].zeilen.length, gesamt, "nichts gelöscht");
    assert.equal(await u.v.protokollAufraeumen(await u.v.protokollLesen(), 0), 0, "0 = unbegrenzt");
});

test("W7 Leeren blendet alles aus; Namen entfernen überschreibt sie auch in ausgeblendeten", async () => {
    const u = await geladen();
    const gesamt = u.db["fwm.kom_aenderung"].zeilen.length;
    const mitNamen = u.db["fwm.kom_aenderung"].zeilen.filter(x => x.benutzer_name).length;
    assert.ok(mitNamen > 0);

    const liste = await u.v.protokollLesen();
    assert.equal(await u.v.protokollLeeren(liste), liste.length);
    assert.equal((await u.v.protokollLesen()).length, 0);
    assert.equal(u.db["fwm.kom_aenderung"].zeilen.length, gesamt);

    assert.equal(await u.v.protokollNamenEntfernen(), mitNamen);
    assert.equal(u.db["fwm.kom_aenderung"].zeilen.filter(x => x.benutzer_name).length, 0);
});

test("W7 Liste: neueste zuerst; Suche in AB und Zeile, Art, Person", async () => {
    const u = await geladen();
    const liste = await u.v.protokollLesen();
    const zeiten = liste.map(z => u.v.zeitMs(z.zeit));
    gleich(zeiten, zeiten.slice().sort((a, b) => b - a));

    const ab = liste.find(z => z.ab).ab;
    const nachAb = u.v.protokollFiltern(liste, ab.toLowerCase(), "", "");
    assert.ok(nachAb.length > 0 && nachAb.every(z => z.ab.toLowerCase().indexOf(ab.toLowerCase()) > -1 || z.objekt.toLowerCase().indexOf(ab.toLowerCase()) > -1));

    const art = liste[0].art;
    assert.ok(u.v.protokollFiltern(liste, "", art, "").every(z => z.art === art));
    assert.equal(u.v.protokollFiltern(liste, "gibt-es-nicht-xyz", "", "").length, 0);

    const namen = u.v.protokollNamen(liste);
    assert.ok(namen.length > 0);
    assert.ok(u.v.protokollFiltern(liste, "", "", namen[0]).every(z => z.benutzer_name === namen[0]));
    gleich(namen, namen.slice().sort());
});

test("W7 Zeit in Ortszeit, mit und ohne Sekunden; Datum ohne Uhrzeit bleibt Datum", async () => {
    const { v } = await geladen();
    assert.match(v.zeitOrtText("2026-10-16T13:20:33.0000000Z"), /^1[0-9]\.10\.2026 \d{2}:\d{2}$/);
    assert.match(v.zeitOrtText("2026-10-16T13:20:33.0000000Z", true), /^\d{2}\.\d{2}\.2026 \d{2}:\d{2}:33$/);
    assert.equal(v.zeitOrtText("2026-10-16"), "16.10.2026");
    assert.equal(v.zeitOrtText(null), "");
    assert.ok(Math.abs(v.zeitMs(v.zeitJetzt()) - Date.now()) < 5000);
});

test("W7 alle Arten, die der Code schreibt, haben einen Namen", async () => {
    const { v } = await geladen();
    const arten = v.protokollArten.map(x => x[0]);
    for (const a of ["menge", "lagerort", "soll", "archiviert", "wiederhergestellt"]) assert.ok(arten.indexOf(a) > -1, a);
    assert.equal(new Set(arten).size, arten.length);
});
