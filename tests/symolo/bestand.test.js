/* Bestandsliste in Symolo (47_bestand.js): Laden aus dem Nachbau, Suche, Filter, Sortierung (R-A1 bis R-A4, R-S9). */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { umgebung } = require("./umgebung");

async function geladen(zusatz) {
    const u = umgebung(zusatz, "bestandsliste");
    u.abs = await u.v.bestandLaden();
    return u;
}

test("Laden: nur ABs der Bestandsliste, ohne archivierte, in Importreihenfolge", async () => {
    const { v, abs, db } = await geladen();
    const roh = db["fwm.kom_auftrag"].zeilen.filter(a => a.bereich === "bestand" && !a.archiviert);
    assert.equal(abs.length, roh.length);
    assert.ok(abs.length > 0);
    const reihenfolge = abs.map(a => Number(a.o.reihenfolge));
    assert.deepEqual(reihenfolge, reihenfolge.slice().sort((x, y) => x - y));
    /* Jedes Teil kommt genau einmal vor */
    const teile = db["fwm.kom_teil"].zeilen.filter(t => abs.some(a => a.o._id === t.auftrag_id_auftrag));
    assert.equal(abs.reduce((n, a) => n + v.bestandTeile(a).length, 0), teile.length);
});

test("Laden klappt auch mit fremder Schreibweise der Spalten", async () => {
    const a = await geladen();
    const b = await geladen(ctx => { ctx.symolo._nachbau.schalter.schreibweise = true; });
    assert.deepEqual(b.abs.map(x => [x.o.ab_anzeige, x.w.status, x.w.fortschritt]),
        a.abs.map(x => [x.o.ab_anzeige, x.w.status, x.w.fortschritt]));
});

test("R_S9 Zähler: ABs gesamt, komplett, teilweise, offen", async () => {
    const { v, abs } = await geladen();
    const z = v.bestandZaehler(abs);
    assert.equal(z.ab, abs.length);
    assert.ok(z.komplett + z.teilweise + z.offen <= z.ab);
});

test("R_A1 Suche: Teil zeigt AB- und BG-Kopf, AB-Nummer zeigt den ganzen AB", async () => {
    const { v, abs } = await geladen();
    const ab = abs.find(a => a.bgs.length && a.bgs[0].teile.length > 1);
    const teil = ab.bgs[0].teile[1];

    assert.ok(v.bestandSuchen(abs, teil.o.zeichnungsnummer.toLowerCase()) >= 1);
    assert.ok(ab.zeigen && ab.bgs[0].zeigen && teil.zeigen);
    assert.equal(ab.bgs[0].teile[0].zeigen, ab.bgs[0].teile[0].o.zeichnungsnummer.toLowerCase()
        .includes(teil.o.zeichnungsnummer.toLowerCase()));

    assert.equal(v.bestandSuchen(abs, ab.o.ab_anzeige), abs.filter(a => a.o.ab_anzeige.includes(ab.o.ab_anzeige)).length);
    assert.ok(v.bestandZeilen(ab).every(z => z.zeigen));

    assert.equal(v.bestandSuchen(abs, "gibt es nicht 4711"), 0);
    assert.ok(abs.every(a => !a.zeigen));
});

test("R_A3 Filter: Nur Komplett zeigt nur komplette Zeilen mit ihren Köpfen", async () => {
    const { v, abs } = await geladen();
    v.bestandFiltern(abs, "alles", "komplett");
    abs.forEach(a => {
        a.ohne.forEach(t => assert.equal(t.zeigen, t.w.status === "Komplett"));
        a.bgs.forEach(b => b.teile.forEach(t => {
            assert.equal(t.zeigen, t.w.status === "Komplett");
            if (t.zeigen) assert.ok(b.zeigen && a.zeigen);
        }));
    });
});

test("R_A2 Knopf ABs: alle ABs sichtbar, alles darunter aufklappbar", async () => {
    const { v, abs } = await geladen();
    assert.equal(v.bestandFiltern(abs, "ab", "alle"), abs.length);
    abs.forEach(a => assert.ok(v.bestandZeilen(a).every(z => z.zeigen)));
});

test("R_A4 Sortierung: wie importiert, A-Z, Z-A, Fortschritt", async () => {
    const { v, abs } = await geladen();
    const nr = l => l.map(a => a.o.ab_anzeige);
    assert.deepEqual(nr(v.bestandSortieren(abs, "import")), nr(abs));
    const az = nr(v.bestandSortieren(abs, "az"));
    assert.deepEqual(az, az.slice().sort((x, y) => (x.toLowerCase() < y.toLowerCase() ? -1 : 1)));
    assert.deepEqual(nr(v.bestandSortieren(abs, "za")), az.slice().reverse());
    const auf = v.bestandSortieren(abs, "auf").map(a => a.w.prozent);
    assert.deepEqual(auf, auf.slice().sort((x, y) => x - y));
});

test("Mengen in Tausendsteln: Text, Komma, leer", () => {
    const { v } = umgebung(null, "bestandsliste");
    assert.equal(v.mengeMilli(21), 21000);
    assert.equal(v.mengeMilli("21.000"), 21000);
    assert.equal(v.mengeMilli("0,06"), 60);
    assert.equal(v.mengeMilli(""), 0);
    assert.equal(v.mengeMilli("Rest"), 0);
    assert.equal(v.mengeMilli(null), 0);
    assert.equal(v.zahlText(60), "0,06");
    assert.equal(v.zahlText(21000), "21");
    assert.equal(v.zahlText(-3000), "-3");
    /* 0,06 + 0,02 bleibt genau 0,08 */
    const w = v.sammelWerte([v.teilWerte(0.06, 0.06), v.teilWerte(0.01, 0.02)]);
    assert.equal(w.status, "Teilweise");
    assert.equal(Math.round(w.prozent * 10000), 8750);
});

/* Für tests/test_symolo.py: rechnet alle Beispieldaten und gibt sie als JSON aus,
   damit Python sie mit bestand/rechnen.py vergleicht (gleiche Zahlen in alter und neuer Fassung). */
if (process.env.KOM_VERGLEICH_AUSGABE) {
    test("Ausgabe für den Vergleich mit Python", async () => {
        const { v, abs, db } = await geladen();
        const aus = abs.map(a => ({
            ab: a.o.ab_anzeige,
            zeilen: v.bestandZeilen(a).map(k => ({ art: k.art, id: k.o._id, status: k.w.status,
                fortschritt: k.w.fortschritt, prozent: k.w.prozent }))
        }));
        require("node:fs").writeFileSync(process.env.KOM_VERGLEICH_AUSGABE,
            JSON.stringify({ abs: aus, daten: { teil: db["fwm.kom_teil"].zeilen, baugruppe: db["fwm.kom_baugruppe"].zeilen } }));
    });
}
