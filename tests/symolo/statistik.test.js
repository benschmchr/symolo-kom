/* Statistik in Symolo (4E_termine.js, 4I_statistik.js): Liefertreue, Durchlaufzeit, überfällige ABs, Verspätung.
   Dieselben Fälle wie tests/test_statistik.py; heute = Mittwoch, 14.10.2026 (KW 42). */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { umgebung } = require("./umgebung");

const json = x => JSON.parse(JSON.stringify(x));
const gleich = (a, b, text) => assert.deepEqual(json(a), json(b), text);

const v = umgebung(null, "statistik").v;
const d = t => v.tagNr(t);
const HEUTE = d("2026-10-14");

/* Ein Eintrag: ab("2026-10-07", "2026-10-06", { art, eingelagert, archiviert }) */
const ab = (lt, tv, o) => Object.assign({
    art: "ab", anzeige: "AB1", lt: lt === null ? null : d(lt), tv: tv === null ? null : d(tv),
    eingelagert: null, platz: "", mitarbeiter: "", kunde: "", archiviert: false
}, o || {}, o && o.eingelagert ? { eingelagert: d(o.eingelagert) } : {});
const plus = (tag, n) => tag + n;

/* ---------- Tage, Wochen, Monate ---------- */

test("Tageszahl und Datum sind umkehrbar, Kalenderwochen nach ISO", () => {
    assert.equal(v.tagText(d("2026-10-14")), "14.10.2026");
    assert.equal(v.tagWochentag(d("2026-10-14")), 2);  // Mittwoch
    gleich(v.tagKw(d("2026-10-14")), [2026, 42]);
    gleich(v.tagKw(d("2026-12-31")), [2026, 53]);
    gleich(v.tagKw(d("2027-01-03")), [2026, 53]);
    gleich(v.tagKw(d("2027-01-04")), [2027, 1]);
    gleich(v.tagKw(d("2024-12-30")), [2025, 1]);
    assert.equal(v.tagNr("(verschieden)"), null);
    assert.equal(v.tagNr(""), null);
    assert.equal(v.tagNr(null), null);
});

test("fünf Kalenderwochen: letzte vier und aktuelle", () => {
    gleich(v.letzteKws(HEUTE, 5), [[2026, 38], [2026, 39], [2026, 40], [2026, 41], [2026, 42]]);
});

test("Kalenderwochen über den Jahreswechsel", () => {
    gleich(v.letzteKws(d("2027-01-06"), 4), [[2026, 51], [2026, 52], [2026, 53], [2027, 1]]);
});

test("zwölf Monate bis einschließlich aktuellem", () => {
    const m = v.letzteMonate(HEUTE, 12);
    gleich(m[0], [2025, 11]);
    gleich(m[11], [2026, 10]);
    assert.equal(m.length, 12);
});

test("Zahl mit einer Stelle wie Python (.25 und .75 zur geraden Stelle)", () => {
    [[2.25, "2,2"], [2.75, "2,8"], [0.35, "0,3"], [6, "6,0"], [4.333333, "4,3"], [12.5, "12,5"], [0.05, "0,1"]]
        .forEach(([x, t]) => assert.equal(v.zahlEins(x), t, String(x)));
});

/* ---------- Liefertreue ---------- */

test("Beispiel aus der Aufgabe: zehn ABs, fünf pünktlich ergibt 50 Prozent", () => {
    const e = [];
    for (let i = 0; i < 5; i++) e.push(ab("2026-10-07", "2026-10-06"));
    for (let i = 0; i < 5; i++) e.push(ab("2026-10-07", "2026-10-10"));
    const b = v.statLiefertreueMonat(e, "ab", HEUTE).find(x => x.label === "KW 41");
    assert.equal(b.wert, 50);
    assert.equal(b.text, "50 %");
    assert.equal(b.n, 10);
    assert.equal(b.farbe, "rot");
});

test("Versand am selben Tag ist pünktlich", () => {
    const b = v.statLiefertreueMonat([ab("2026-10-07", "2026-10-07")], "ab", HEUTE)[3];
    assert.equal(b.wert, 100);
    assert.equal(b.farbe, "gruen");
});

test("ohne Versand und Liefertermin vorbei zählt als nicht pünktlich", () => {
    const b = v.statLiefertreueMonat([ab("2026-10-07", null), ab("2026-10-07", "2026-10-07")], "ab", HEUTE)[3];
    assert.equal(b.wert, 50);
});

test("ohne Versand und Liefertermin heute oder später zählt noch nicht", () => {
    const e = [ab("2026-10-14", null), ab("2026-10-15", null)];
    const aktuelle = v.statLiefertreueMonat(e, "ab", HEUTE)[4];
    assert.equal(aktuelle.wert, null);
    assert.equal(aktuelle.text, "–");
    assert.equal(aktuelle.n, 0);
    const mit = v.statLiefertreueMonat(e.concat([ab("2026-10-14", "2026-10-13")]), "ab", HEUTE)[4];
    assert.equal(mit.wert, 100);
    assert.equal(mit.n, 1);
});

test("Farben: grün ab 80, gelb 70 bis 79, rot darunter", () => {
    const pct = p => {
        const e = [];
        for (let i = 0; i < p; i++) e.push(ab("2026-10-07", "2026-10-07"));
        for (let i = 0; i < 100 - p; i++) e.push(ab("2026-10-07", "2026-10-08"));
        return v.statLiefertreueMonat(e, "ab", HEUTE)[3];
    };
    gleich([100, 80, 79, 70, 69, 0].map(p => pct(p).farbe), ["gruen", "gruen", "gelb", "gelb", "rot", "rot"]);
    assert.equal(v.statSoll, 80);
});

test("ABs und Bauteile werden getrennt ausgewertet", () => {
    const e = [ab("2026-10-07", "2026-10-07"), ab("2026-10-07", "2026-10-09"),
        ab("2026-10-07", "2026-10-07", { art: "teil" }), ab("2026-10-07", "2026-10-07", { art: "teil" }),
        ab("2026-10-07", "2026-10-07", { art: "teil" })];
    assert.equal(v.statLiefertreueMonat(e, "ab", HEUTE)[3].wert, 50);
    assert.equal(v.statLiefertreueMonat(e, "teil", HEUTE)[3].wert, 100);
});

test("Liefertermin außerhalb der fünf Wochen zählt nicht", () => {
    assert.ok(v.statLiefertreueMonat([ab("2026-09-01", "2026-09-01")], "ab", HEUTE).every(b => b.wert === null));
});

test("Liefertreue IA: zwölf Balken nach Liefermonat", () => {
    const e = [ab("2026-03-10", "2026-03-09"), ab("2026-03-20", "2026-03-25"), ab("2024-01-01", "2024-01-01")];
    const balken = v.statLiefertreueIa(e, "ab", HEUTE);
    assert.equal(balken.length, 12);
    assert.equal(balken[0].label, "Nov 25");
    assert.equal(balken[11].label, "Okt 26");
    const maerz = balken.find(b => b.label === "Mär 26");
    assert.equal(maerz.wert, 50);
    assert.equal(maerz.n, 2);
});

/* ---------- Durchlaufzeit ---------- */

test("DLZ ist Versand minus Eingelagert", () => {
    assert.equal(v.statDlz(ab("2026-10-20", "2026-10-26", { eingelagert: "2026-10-12" })), 14);
    assert.equal(v.statDlz(ab(null, null)), null);
});

test("Durchlaufzeit: Woche, Monat, Jahr", () => {
    const e = [
        ab(null, "2026-10-14", { eingelagert: "2026-10-10" }),
        ab(null, "2026-10-14", { eingelagert: "2026-10-06" }),
        ab(null, "2026-10-01", { eingelagert: "2026-09-21" }),
        ab(null, "2026-05-15", { eingelagert: "2026-05-01" })
    ];
    const woche = v.statDurchlaufzeit(e, "woche", HEUTE);
    assert.equal(woche.length, 7);
    assert.equal(woche[6].wert, 6);
    assert.equal(woche[6].text, "6,0");
    assert.equal(woche.reduce((s, b) => s + b.n, 0), 2);
    const monat = v.statDurchlaufzeit(e, "monat", HEUTE);
    gleich(monat.map(b => b.label), ["KW 39", "KW 40", "KW 41", "KW 42"]);
    assert.equal(monat[3].wert, 6);
    assert.equal(monat[1].wert, 10);
    const jahr = v.statDurchlaufzeit(e, "jahr", HEUTE);
    assert.equal(jahr.length, 12);
    assert.equal(jahr.find(b => b.label === "Mai 26").wert, 14);
    assert.equal(jahr.find(b => b.label === "Okt 26").n, 3);
});

test("Durchlaufzeit ohne Daten ist leer, nicht null", () => {
    assert.ok(v.statDurchlaufzeit([], "monat", HEUTE).every(b => b.wert === null && b.text === "–"));
});

test("Durchlaufzeit zählt nur ABs", () => {
    const t = ab(null, "2026-10-14", { art: "teil", eingelagert: "2026-10-11" });
    assert.ok(v.statDurchlaufzeit([t], "woche", HEUTE).every(b => b.wert === null));
});

/* ---------- Überfällig und Verspätung ---------- */

test("überfällig: nur offene ABs aus dem Schweißen, älteste zuerst", () => {
    const e = [ab("2026-10-10", null), ab("2026-10-01", null), ab("2026-10-14", null), ab("2026-10-01", "2026-10-02"),
        ab("2026-10-01", null, { art: "teil" }), ab("2026-10-01", null, { archiviert: true })];
    gleich(v.statUeberfaellig(e, HEUTE).map(x => v.tagText(x.lt)), ["01.10.2026", "10.10.2026"]);
});

test("Verspätung: Mittel nur der zu späten", () => {
    const e = [ab("2026-10-01", "2026-10-04"), ab("2026-10-01", "2026-10-06"), ab("2026-10-01", "2026-09-30")];
    const r = v.statVerspaetung(e, HEUTE);
    gleich(r.summe, { versandt: 3, spaet: 2, mittel: "4,0" });
    assert.equal(r.balken[11].wert, 4);
    assert.equal(r.balken[11].label, "Okt 26");
});

/* ---------- Quellen: Schweißen und Archiv ---------- */

let nummer = 0;
/* Eine Zeile im Schweißen wie aus datenLesen */
const sz = (nr, ebene, ab_nr, o) => Object.assign({
    _id: ++nummer, nr: nr, ab_nr: ab_nr, ab_schluessel: ab_nr.toUpperCase(), anzeige: ab_nr, ebene: ebene, baugruppe: "",
    zeichnungsnummer: "", mitarbeiter: "", arbeitsplatz: "", liefertermin_stahlbau: null, termin_versand: null,
    eingelagert: null, kopf: "{}", status: ""
}, o || {});
const dt = t => t + "T00:00:00.0000000Z";

test("Quelle Schweißen: AB und Bauteile", () => {
    const zeilen = v.swBerechnen([
        sz(1, "AB", "AB2600001", { liefertermin_stahlbau: dt("2026-10-07"), termin_versand: dt("2026-10-06"), eingelagert: dt("2026-10-01") }),
        sz(2, "BG", "AB2600001", { baugruppe: "100 X", liefertermin_stahlbau: dt("2026-10-07"), termin_versand: dt("2026-10-06") }),
        sz(3, "Teil", "AB2600001", { baugruppe: "100 X", zeichnungsnummer: "T1", liefertermin_stahlbau: dt("2026-10-07"), termin_versand: dt("2026-10-06") })
    ]);
    const e = v.statAusSchweissen(zeilen);
    gleich(e.map(x => x.art), ["ab", "teil"]);
    assert.equal(v.statDlz(e[0]), 5);
    assert.equal(e[0].lt, d("2026-10-07"));
});

test("Quelle Schweißen: verschiedene BG-Termine, frühester Liefertermin, spätester Versand", () => {
    const bauen = tv2 => v.swBerechnen([
        sz(1, "AB", "AB2600001"),
        sz(2, "BG", "AB2600001", { baugruppe: "100 X", liefertermin_stahlbau: dt("2026-10-09"), termin_versand: dt("2026-10-08") }),
        sz(3, "BG", "AB2600001", { baugruppe: "200 Y", liefertermin_stahlbau: dt("2026-10-07"), termin_versand: tv2 })
    ]);
    const e = v.statAusSchweissen(bauen(dt("2026-10-12")))[0];
    assert.equal(e.lt, d("2026-10-07"));
    assert.equal(e.tv, d("2026-10-12"));
    assert.equal(v.statAusSchweissen(bauen(null))[0].tv, null);  // nicht alle BGs versandt
});

test("Quelle Schweißen: Einzelblock und Kunde aus dem Kopf", () => {
    const kopf = JSON.stringify({ kunde: "KNDS" });
    const zeilen = v.swBerechnen([
        sz(1, "BG", "AB2600003", { anzeige: "AB2600003_BG100", baugruppe: "100 X", kopf: kopf, liefertermin_stahlbau: dt("2026-10-09") }),
        sz(2, "Teil", "AB2600003", { anzeige: "AB2600003_BG100", baugruppe: "100 X", liefertermin_stahlbau: dt("2026-10-09") })
    ]);
    const e = v.statAusSchweissen(zeilen);
    assert.equal(e[0].anzeige, "AB2600003_BG100");
    assert.equal(e[0].kunde, "KNDS");
    assert.equal(e[0].lt, d("2026-10-09"));
});

test("Quelle Archiv: zählt mit, Löschungen aus der Bestandsliste nicht", () => {
    const a = (nr, ebene, schluessel, o) => Object.assign({ nr: nr, ebene: ebene, ab_nr: schluessel, ab_schluessel: schluessel,
        eingelagert: null, liefertermin_stahlbau: null, termin_versand: null }, o || {});
    const e = v.statAusArchiv([
        a(1, "AB", "AB1", { eingelagert: dt("2026-10-01"), liefertermin_stahlbau: dt("2026-10-07"), termin_versand: dt("2026-10-06") }),
        a(2, "Teil", "AB1", { liefertermin_stahlbau: dt("2026-10-07"), termin_versand: dt("2026-10-08") }),
        a(3, "Teil", "AB1"),                                   // ohne Termine: zählt nicht
        a(1, "AB", "AB2")                                      // AB ohne Termine: kein Eintrag
    ]);
    gleich(e.map(x => x.art).sort(), ["ab", "teil"]);
    assert.ok(e.every(x => x.archiviert));
    assert.equal(v.statDlz(e.find(x => x.art === "ab")), 5);
    assert.equal(v.statLiefertreueMonat(e, "ab", HEUTE)[3].wert, 100);
    assert.equal(v.statLiefertreueMonat(e, "teil", HEUTE)[3].wert, 0);
});

test("Beispieldaten: Statistik lädt aus dem Nachbau", async () => {
    const u = umgebung(null, "statistik");
    const e = await u.v.statLaden();
    assert.ok(e.length > 100);
    assert.ok(e.some(x => x.archiviert) && e.some(x => !x.archiviert));
    assert.ok(u.v.statLiefertreueIa(e, "ab", HEUTE).some(b => b.wert !== null));
});

/* ---------- Vergleich mit der bisherigen App (tests/test_symolo.py) ---------- */

test("Vergleich: Eingabe aus Python, Ausgabe für Python", { skip: !process.env.KOM_STAT_EINGABE }, () => {
    const eing = JSON.parse(fs.readFileSync(process.env.KOM_STAT_EINGABE, "utf8"));
    const heute = d(eing.heute);
    const e = eing.eintraege.map(x => ({
        art: x.art, anzeige: x.anzeige, lt: x.lt === null ? null : d(x.lt), tv: x.tv === null ? null : d(x.tv),
        eingelagert: x.eingelagert === null ? null : d(x.eingelagert), platz: "", mitarbeiter: "", kunde: "", archiviert: x.archiviert
    }));
    const b = l => l.map(x => [x.label, x.wert, x.text, x.hoehe, x.farbe, x.n, x.titel]);
    const aus = {
        monat_ab: b(v.statLiefertreueMonat(e, "ab", heute)), monat_teil: b(v.statLiefertreueMonat(e, "teil", heute)),
        ia_ab: b(v.statLiefertreueIa(e, "ab", heute)), ia_teil: b(v.statLiefertreueIa(e, "teil", heute)),
        dlz_woche: b(v.statDurchlaufzeit(e, "woche", heute)), dlz_monat: b(v.statDurchlaufzeit(e, "monat", heute)),
        dlz_jahr: b(v.statDurchlaufzeit(e, "jahr", heute)),
        ueberfaellig: v.statUeberfaellig(e, heute).map(x => [x.anzeige, v.tagText(x.lt)]),
        verspaetung: [b(v.statVerspaetung(e, heute).balken), v.statVerspaetung(e, heute).summe]
    };
    fs.writeFileSync(process.env.KOM_STAT_AUSGABE, JSON.stringify(aus));
});
