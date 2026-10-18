/* Eintragen in Symolo (48_eintragen.js, 49_lagerort.js) gegen den Nachbau:
   Mengen (R-M1 bis R-M4), Daten (R-T1), Lagerort (R-L1 bis R-L4), Regal (R-R1 bis R-R5). */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { umgebung } = require("./umgebung");

const H = "2026-10-16T00:00:00.0000000Z";

/* Werte aus dem vm-Kontext haben andere Prototypen: als JSON vergleichen. */
const gleich = (a, b, text) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, text);

async function geladen() {
    const u = umgebung(null, "bestandsliste");
    u.abs = await u.v.bestandLaden();
    u.ab = async nr => (await u.v.bestandLaden()).find(a => a.o.ab_anzeige === nr);
    return u;
}

/* ---------- Eingaben ---------- */

test("R_M1 Vorhanden: ganze Zahlen ab 0, leer erlaubt", () => {
    const { v } = umgebung(null, "bestandsliste");
    for (const [ein, milli] of [["5", 5000], [" 7 ", 7000], ["8,0", 8000], ["", null], ["0", 0]]) {
        gleich(v.mengeEingabe(ein, true), { milli: milli, fehler: "" }, ein);
    }
    for (const ein of ["-1", "2,5", "abc", "1e3x", "NaN"]) {
        assert.match(v.mengeEingabe(ein, true).fehler, /ganze Zahl/, ein);
    }
});

test("R_M4 Punkt-Schreibweise abgelehnt, zu groß abgelehnt, Dezimalkomma beim Soll erlaubt", () => {
    const { v } = umgebung(null, "bestandsliste");
    for (const ein of ["1.000", "1,000", "12.500", "1.000.000", "2,000"]) {
        assert.match(v.mengeEingabe(ein, true).fehler, /ohne Punkt/, ein);
        assert.match(v.mengeEingabe(ein, false).fehler, /ohne Punkt/, ein);
    }
    assert.match(v.mengeEingabe("1000000000", true).fehler, /999\.999\.999/);
    for (const [ein, milli] of [["0,125", 125], ["0,06", 60], ["8,0", 8000], ["2,5", 2500]]) {
        assert.equal(v.mengeEingabe(ein, false).milli, milli, ein);
    }
});

test("R_M4 Soll: höchstens drei Nachkommastellen, keine Sonderschreibweisen", () => {
    const { v } = umgebung(null, "bestandsliste");
    assert.match(v.mengeEingabe("0,0004", false).fehler, /drei Stellen/);
    assert.match(v.mengeEingabe("1,2345", false).fehler, /drei Stellen/);
    assert.equal(v.mengeEingabe("1234,567", false).milli, 1234567);
    for (const ein of ["1e5", "+5", ",5", "1 000"]) {
        assert.match(v.mengeEingabe(ein, false).fehler, /Zahl ab 0/, ein);
        assert.match(v.mengeEingabe(ein, true).fehler, /ganze Zahl/, ein);
    }
});

test("R_T1 Daten je Teil", () => {
    const { v } = umgebung(null, "bestandsliste");
    const T1 = "2026-10-01T00:00:00.0000000Z", T2 = "2026-10-02T00:00:00.0000000Z";
    gleich(v.datenStempeln(5, 10, null, null, H), [H, null]);
    gleich(v.datenStempeln(10, 10, T1, null, H), [T1, H]);
    gleich(v.datenStempeln(12, 10, T1, T2, H), [T1, T2]);
    gleich(v.datenStempeln(5, 10, T1, T2, H), [T1, null]);
    gleich(v.datenStempeln(0, 10, T1, T2, H), [null, null]);
    gleich(v.datenStempeln(null, 10, T1, null, H), [null, null]);
});

/* ---------- Mengen schreiben ---------- */

test("R_M1 Vorhanden speichern, mit Datum (R_T1); IDs und andere Felder bleiben", async () => {
    const u = await geladen();
    const ab = await u.ab("AB2515204");
    const t = ab.bgs[0].teile.find(x => x.o.zeichnungsnummer === "SK1990-977452.002.0");
    assert.equal(await u.v.vorhandenSetzen(t, 21000), "");

    const roh = u.db["fwm.kom_teil"].zeilen.find(x => x.id === t.o._id);
    assert.equal(roh.vorhanden, 21);
    assert.ok(roh.datum_eingelagert && roh.datum_komplett);
    assert.equal(roh.zeichnungsnummer, "SK1990-977452.002.0");
    assert.equal(roh.baugruppe_id_baugruppe, t.o._baugruppe_id);

    const neu = (await u.ab("AB2515204")).bgs[0].teile.find(x => x.o._id === t.o._id);
    assert.equal(neu.w.status, "Komplett");
});

test("Gleichzeitig ändern: die letzte Eingabe gilt, mit Hinweis", async () => {
    const u = await geladen();
    const ab = await u.ab("AB2515204");
    const t = ab.bgs[0].teile[1];
    const anderer = (await u.ab("AB2515204")).bgs[0].teile[1];
    await u.v.vorhandenSetzen(anderer, 3000);
    const hinweis = await u.v.vorhandenSetzen(t, 5000);
    assert.match(hinweis, /inzwischen von jemand anderem geändert \(zuletzt 3\)/);
    assert.equal(u.db["fwm.kom_teil"].zeilen.find(x => x.id === t.o._id).vorhanden, 5);
});

test("R_M2 Status antippen: Vorhanden = Soll, bei Komplett 0", async () => {
    const u = await geladen();
    let t = (await u.ab("AB2515204")).bgs[0].teile[1];
    await u.v.teilUmschalten(t);
    t = (await u.ab("AB2515204")).bgs[0].teile[1];
    assert.equal(t.w.status, "Komplett");
    await u.v.teilUmschalten(t);
    t = (await u.ab("AB2515204")).bgs[0].teile[1];
    assert.equal(t.w.status, "Offen");
    assert.equal(t.o.datum_eingelagert, null);
});

test("R_M3 alles ✓ an BG und AB; größere Mengen bleiben; komplett -> alles 0", async () => {
    const u = await geladen();
    let ab = await u.ab("AB2515204");
    const zuViel = ab.bgs[0].teile.find(x => u.v.mengeMilli(x.o.vorhanden) > u.v.mengeMilli(x.o.menge_gesamt));
    await u.v.allesSetzen(ab.bgs[0]);
    ab = await u.ab("AB2515204");
    assert.equal(ab.bgs[0].w.status, "Komplett");
    if (zuViel) assert.equal(ab.bgs[0].teile.find(x => x.o._id === zuViel.o._id).o.vorhanden, zuViel.o.vorhanden);

    await u.v.allesSetzen(ab);
    ab = await u.ab("AB2515204");
    assert.equal(ab.w.status, "Komplett");
    await u.v.allesSetzen(ab);
    ab = await u.ab("AB2515204");
    assert.equal(ab.w.status, "Offen");
});

test("AB bearbeiten: Soll ändern, nur geänderte Teile, R_T1 danach", async () => {
    const u = await geladen();
    let ab = await u.ab("AB2515204");
    const t = ab.bgs[0].teile[0];    /* Vorhanden 10 von 21 */
    assert.equal(await u.v.sollSetzen(u.v.bestandTeile(ab).map(x => [x, x === t ? 10000 : u.v.mengeMilli(x.o.menge_gesamt)])), 1);
    ab = await u.ab("AB2515204");
    const neu = ab.bgs[0].teile[0];
    assert.equal(neu.w.status, "Komplett");
    assert.ok(neu.o.datum_komplett);
});

test("Schreibsperre: in Symolo wird nichts geschrieben, solange sie an ist", async () => {
    const u = await geladen();
    const t = (await u.ab("AB2515204")).bgs[0].teile[1];
    u.v.schreibenErlaubt = () => false;
    await assert.rejects(u.v.vorhandenSetzen(t, 1000), /noch nicht freigegeben/);
});

/* ---------- Lagerort ---------- */

test("R_L4 Eingabe: Plätze, Kurzformen, leeren, freier Text, zu lang", () => {
    const { v } = umgebung(null, "bestandsliste");
    const faelle = [["l 2", "L2"], ["  r6 ", "R6"], ["R3", "R3"], ["R3S", "R3"], ["r3-s", "R3"], ["R3V", "R3"], ["R3-V", "R3"],
        ["Sperrlager", "R3"], ["SPERR", "R3"], ["vermessen", "R3"], ["", ""], ["0", ""], ["-", ""], ["  ", ""],
        ["Kiste 4", "Kiste 4"], ["  Kiste   4 ", "Kiste 4"], ["L7", "L7"]];
    faelle.forEach(([ein, aus]) => assert.equal(v.platzEingabe(ein), aus, ein));
    assert.deepEqual(Array.from(v.regalPlaetze), ["L6", "R6", "L5", "R5", "L4", "R4", "L3", "R3", "L2", "R2", "L1", "R1"]);
    assert.ok(v.platzGueltig("sperr") && v.platzGueltig("l1") && !v.platzGueltig("L7"));
    assert.throws(() => v.platzEingabe("x".repeat(41)), /zu lang/);
});

const plaetze = ab => ({ ab: ab.o.lagerort, bgs: ab.bgs.map(b => b.o.lagerort) });

test("R_L2 Platz am AB gilt für alle BGs und alle Teile", async () => {
    const u = await geladen();
    await u.v.lagerortAb(await u.ab("AB2515901"), "l 2");
    const ab = await u.ab("AB2515901");
    assert.equal(ab.o.lagerort, "L2");
    assert.ok(ab.bgs.every(b => b.o.lagerort === "L2"));
    assert.ok(u.v.bestandTeile(ab).every(t => t.o.lagerort === "L2"));
});

test("R_L2 Platz an der BG gilt nur für ihre Teile; R_L3 alle gleich -> AB bekommt ihn", async () => {
    const u = await geladen();
    let ab = await u.ab("AB2515901");
    await u.v.lagerortBg(ab, ab.bgs[0], "L4", false);
    ab = await u.ab("AB2515901");
    assert.equal(ab.bgs[0].o.lagerort, "L4");
    assert.ok(ab.bgs[0].teile.every(t => t.o.lagerort === "L4"));
    assert.ok(ab.bgs[1].teile.every(t => t.o.lagerort !== "L4"));

    await u.v.lagerortBg(ab, ab.bgs[1], "L4", false);
    await u.v.lagerortBg(ab, ab.bgs[2], "L4", false);
    ab = await u.ab("AB2515901");
    gleich(plaetze(ab), { ab: "L4", bgs: ["L4", "L4", "L4"] });
});

test("R_L3 verschiedene Plätze: BGs ohne Platz bekommen den bisherigen AB-Platz, AB wird leer (X3)", async () => {
    const u = await geladen();
    await u.v.lagerortAb(await u.ab("AB2515901"), "L1");
    let ab = await u.ab("AB2515901");
    await u.v.lagerortBg(ab, ab.bgs[0], "", false);   /* zurück auf: eine BG leer */
    ab = await u.ab("AB2515901");
    await u.v.lagerortBg(ab, ab.bgs[1], "R2", false);
    ab = await u.ab("AB2515901");
    gleich(plaetze(ab), { ab: "", bgs: ["L1", "R2", "L1"] });
});

test("R_L3 X2 Kurzformen gelten beim Abgleich als gleich", async () => {
    const u = await geladen();
    let ab = await u.ab("AB2515901");
    await u.v.lagerortBg(ab, ab.bgs[0], "SPERR", false);
    await u.v.lagerortBg(ab, ab.bgs[1], "r3", false);
    await u.v.lagerortBg(ab, ab.bgs[2], "Vermessen", false);
    ab = await u.ab("AB2515901");
    assert.equal(ab.o.lagerort, "R3");
});

/* ---------- Regal ---------- */

test("R_R1 ein Eintrag je AB, wenn alle BGs gleich; sonst je BG", async () => {
    const u = await geladen();
    await u.v.lagerortAb(await u.ab("AB2515901"), "L2");
    let abs = await u.v.bestandLaden();
    let r = u.v.regalEintraege(abs);
    assert.ok(r.faecher.L2.some(e => e.name === "AB2515901" && !e.bg));

    let ab = abs.find(a => a.o.ab_anzeige === "AB2515901");
    await u.v.lagerortBg(ab, ab.bgs[0], "R5", false);
    abs = await u.v.bestandLaden();
    r = u.v.regalEintraege(abs);
    assert.ok(r.faecher.R5.some(e => e.name === "AB2515901_BG100"));
    assert.ok(r.faecher.L2.some(e => e.name === "AB2515901_BG200"));
});

test("R_R4 X1 AB ohne Baugruppe erscheint; ohne Platz unter Nicht einsortiert; R_R3 Sonstiges", async () => {
    const u = await geladen();
    const abs = await u.v.bestandLaden();
    const ohneBg = abs.find(a => a.bgs.length === 0);
    const r = u.v.regalEintraege(abs);
    if (ohneBg) {
        const alle = r.einsortiert.concat(r.nicht);
        assert.ok(alle.some(e => e.name === ohneBg.o.ab_anzeige));
    }
    await u.v.lagerortAb(abs[0], "Kiste 4");
    const r2 = u.v.regalEintraege(await u.v.bestandLaden());
    assert.ok(r2.ungueltig.some(e => e.platz === "KISTE 4"));
});

test("R_R5 Regal: BG einzeln verschieben splittet den AB; zusammenführen", async () => {
    const u = await geladen();
    await u.v.lagerortAb(await u.ab("AB2515901"), "L2");
    let ab = await u.ab("AB2515901");
    await u.v.lagerortBg(ab, ab.bgs[0], "R6", true);
    ab = await u.ab("AB2515901");
    assert.equal(u.v.istJa(ab.o.regal_geteilt), true);
    gleich(ab.bgs.map(b => b.o.lagerort), ["R6", "L2", "L2"]);

    await u.v.regalZusammenfuehren(ab, ab.bgs[0]);
    ab = await u.ab("AB2515901");
    assert.equal(u.v.istJa(ab.o.regal_geteilt), false);
    gleich(plaetze(ab), { ab: "R6", bgs: ["R6", "R6", "R6"] });
});

test("R_R5 Aufsplitten erst ab zwei Baugruppen", async () => {
    const u = await geladen();
    const abs = await u.v.bestandLaden();
    const eine = abs.find(a => a.bgs.length === 1);
    if (eine) await assert.rejects(u.v.regalTeilen(eine), /mindestens zwei/);
    const ab = abs.find(a => a.o.ab_anzeige === "AB2515901");
    await u.v.regalTeilen(ab);
    const r = u.v.regalEintraege(await u.v.bestandLaden());
    assert.ok(r.einsortiert.concat(r.nicht).some(e => e.name === "AB2515901_BG300"));
});
