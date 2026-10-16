/* Forecast und Planung in Symolo (4G_forecast.js, 4H_planung.js, 4F_schweissen.js): Termine, Ampel, Liste, Kopf,
   Häkchen, Station und Lagerort. Dieselben Fälle wie tests/test_forecast.py (R-F6 bis R-F10, W11) und
   tests/test_planung.py. Heute = Mittwoch, 14.10.2026. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { umgebung } = require("./umgebung");

const json = x => JSON.parse(JSON.stringify(x));
const gleich = (a, b, text) => assert.deepEqual(json(a), json(b), text);

const u = umgebung(null, "forecast");
const v = u.v;
const d = t => v.tagNr(t);
const HEUTE = d("2026-10-14");
const dt = t => t + "T00:00:00.0000000Z";
const tage = n => HEUTE + n;

/* ABs bauen: def = { nr, kunde, fk, bgs: { "100 A": [[zn, soll, vorhanden]] }, ohne: [...] } */
function bauen(abDefs) {
    const auftraege = [], baugruppen = [], teile = [];
    let id = 0, zeile = 0;
    abDefs.forEach(def => {
        const ab = { _id: ++id, ab_anzeige: def.nr, ab_schluessel: def.schluessel || def.nr.toUpperCase(), kunde: def.kunde || "",
            forecast_schluessel: def.fk === undefined ? "" : def.fk, verkaufsartikel: "ART " + def.nr, lagerort: def.lagerort || "",
            reihenfolge: auftraege.length };
        auftraege.push(ab);
        const teil = (zn, soll, vh, bg) => teile.push({ _id: ++id, _auftrag_id: ab._id, _baugruppe_id: bg ? bg._id : null,
            zeichnungsnummer: zn, benennung: "TEIL " + zn, menge_gesamt: soll, vorhanden: vh, zeile: ++zeile, lagerort: "" });
        (def.ohne || []).forEach(([zn, s, vh]) => teil(zn, s, vh, null));
        Object.entries(def.bgs || {}).forEach(([name, ts]) => {
            const bg = { _id: ++id, _auftrag_id: ab._id, name: name, kurz: name.split(" ")[0], zeile: ++zeile, lagerort: "" };
            baugruppen.push(bg);
            ts.forEach(([zn, s, vh]) => teil(zn, s, vh, bg));
        });
    });
    return v.bestandBaum(auftraege, baugruppen, teile);
}

/* Offener AB (Status Teilweise oder Offen) und kompletter AB */
const offen = (nr, o) => Object.assign({ nr: nr, bgs: { "100 X": [["T1", 10, 0], ["T2", 10, 4]] } }, o || {});
const komplett = (nr, o) => Object.assign({ nr: nr, bgs: { "100 X": [["T1", 10, 10]] } }, o || {});

const termine = o => v.fcTermine(Object.entries(o).map(([schluessel, t]) => ({ schluessel: schluessel, termin: t === null ? null : dt(t) })));

/* ---------- R-F6 Termin eines AB ---------- */

test("R_F6 frühester Termin je AB, Zeilen ohne Termin zählen nicht", () => {
    const t = v.fcTermine([
        { schluessel: "AB1", termin: dt("2026-11-20") }, { schluessel: "AB1", termin: dt("2026-11-05") },
        { schluessel: "AB1", termin: null }, { schluessel: "AB2", termin: null }
    ]);
    gleich(t, { AB1: d("2026-11-05") });
});

test("R_F6 Lose bekommen den Termin des Haupt-AB", () => {
    const abs = bauen([offen("AB2616200 / Los 1", { schluessel: "AB2616200|L1" })]);
    const t = termine({ AB2616200: "2026-10-19" });
    const l = v.fcListe(abs, t, HEUTE, "alle", "", "Alle")[0];
    assert.equal(l.a.o.ab_anzeige, "AB2616200 / Los 1");
    assert.equal(l.termin, d("2026-10-19"));
});

test("R_F6 der gespeicherte Forecast-Schlüssel gilt vor dem aus der AB-Nummer", () => {
    const abs = bauen([offen("AB2600001", { fk: "AB2699999" })]);
    const l = v.fcListe(abs, termine({ AB2699999: "2026-10-20", AB2600001: "2026-10-30" }), HEUTE, "alle", "", "Alle")[0];
    assert.equal(l.termin, d("2026-10-20"));
});

test("R_F6 kein Termin", () => {
    const abs = bauen([offen("AB2600001")]);
    const l = v.fcListe(abs, termine({ AB2699999: "2026-11-01" }), HEUTE, "alle", "", "Alle")[0];
    assert.equal(l.termin, null);
    assert.equal(l.ampel, "weiss");
});

/* ---------- R-F7 Ampel ---------- */

test("R_F7 Ampel nach Kalendertagen", () => {
    [[-30, "rot"], [-1, "rot"], [0, "rot"], [14, "rot"], [15, "gelb"], [30, "gelb"], [31, "weiss"], [365, "weiss"]]
        .forEach(([n, farbe]) => assert.equal(v.fcAmpel(tage(n), HEUTE), farbe, String(n)));
});

test("R_F7 ohne Termin weiß", () => {
    assert.equal(v.fcAmpel(null, HEUTE), "weiss");
});

test("R_F7 täglich neu", () => {
    const abs = bauen([offen("AB2600001")]);
    const t = termine({ AB2600001: "2026-11-03" });  // 20 Tage
    assert.equal(v.fcListe(abs, t, HEUTE, "alle", "", "Alle")[0].ampel, "gelb");
    assert.equal(v.fcListe(abs, t, HEUTE + 6, "alle", "", "Alle")[0].ampel, "rot");
});

/* ---------- R-F8 Liste ---------- */

test("R_F8 nur ABs, die nicht komplett sind, mit allen BGs und Teilen", () => {
    const abs = bauen([offen("AB2600001"), komplett("AB2600002"), offen("AB2600003", { ohne: [["T0", 1, 0]] })]);
    const t = termine({ AB2600001: "2026-10-20", AB2600002: "2026-10-20", AB2600003: "2026-10-20" });
    const l = v.fcListe(abs, t, HEUTE, "alle", "", "Alle");
    gleich(l.map(x => x.a.o.ab_anzeige), ["AB2600003", "AB2600001"]);  // gleicher Termin: der mit weniger Fortschritt zuerst
    assert.equal(l[1].gruppen.length, 1);
    assert.equal(l[1].gruppen[0].teile.length, 2);
    assert.equal(l[0].gruppen.length, 2);  // Teile ohne BG und eine BG
});

test("R_F8 Filter Liefertermin: 14, 30 Tage, alle", () => {
    const abs = bauen([offen("AB2600001"), offen("AB2600002"), offen("AB2600003"), offen("AB2600004"), offen("AB2600005")]);
    const t = termine({ AB2600001: "2026-10-01", AB2600002: "2026-10-28", AB2600003: "2026-11-10", AB2600004: "2026-12-24" });
    const nr = z => v.fcListe(abs, t, HEUTE, z, "", "Alle").map(x => x.a.o.ab_anzeige);
    gleich(nr("14"), ["AB2600001", "AB2600002"]);                  // Überfällige sind dabei
    gleich(nr("30"), ["AB2600001", "AB2600002", "AB2600003"]);
    gleich(nr("alle"), ["AB2600001", "AB2600002", "AB2600003", "AB2600004", "AB2600005"]);
});

test("R_F8 Standard sind die nächsten 30 Tage", () => {
    assert.equal(v.fcStandardZeitraum, "30");
    assert.ok(v.fcZeitraeume.some(z => z[0] === "30"));
    const abs = bauen([offen("AB2600001")]);
    gleich(v.fcListe(abs, termine({ AB2600001: "2026-12-24" }), HEUTE, "unsinn", "", "Alle"), []);
});

test("R_F8 AB-Suche und Kunde", () => {
    const abs = bauen([offen("AB2600001", { kunde: "KNDS" }), offen("AB2600002", { kunde: "DIEHL" })]);
    const t = termine({ AB2600001: "2026-10-20", AB2600002: "2026-10-20" });
    gleich(v.fcListe(abs, t, HEUTE, "30", "0002", "Alle").map(x => x.a.o.ab_anzeige), ["AB2600002"]);
    gleich(v.fcListe(abs, t, HEUTE, "30", "", "knds").map(x => x.a.o.ab_anzeige), ["AB2600001"]);
});

test("R_F8 Ansicht und Klappen wie im Dashboard", () => {
    const abs = bauen([offen("AB2600001")]);
    const l = v.fcListe(abs, termine({ AB2600001: "2026-10-20" }), HEUTE, "30", "", "Alle");
    v.dashKlappen(l, "ab", {});
    assert.equal(l[0].offen, false);
    v.dashKlappen(l, "alles", {});
    assert.equal(l[0].offen && l[0].gruppen[0].offen, true);
});

/* ---------- R-F9 Sortierung ---------- */

test("R_F9 Termin, dann Fortschritt aufsteigend, dann AB-Nummer; ohne Termin unten", () => {
    const abs = bauen([
        offen("AB2600005"),                                                                   // kein Termin
        offen("AB2600003", { bgs: { "100 X": [["T1", 10, 5]] } }),                            // 50 %
        offen("AB2600002", { bgs: { "100 X": [["T1", 10, 2]] } }),                            // 20 %
        offen("AB2600004", { bgs: { "100 X": [["T1", 10, 2]] } }),                            // 20 %, gleiche Zeit
        offen("AB2600001")
    ]);
    const t = termine({ AB2600001: "2026-10-16", AB2600002: "2026-10-20", AB2600003: "2026-10-20", AB2600004: "2026-10-20" });
    gleich(v.fcListe(abs, t, HEUTE, "alle", "", "Alle").map(x => x.a.o.ab_anzeige),
        ["AB2600001", "AB2600002", "AB2600004", "AB2600003", "AB2600005"]);
});

test("R_F9 innerhalb des AB wie im Dashboard", () => {
    const abs = bauen([offen("AB2600001", { ohne: [["TX", 5, 5]], bgs: { "200 B": [["T1", 10, 0]], "100 A": [["T2", 10, 10]] } })]);
    const l = v.fcListe(abs, termine({ AB2600001: "2026-10-20" }), HEUTE, "alle", "", "Alle")[0];
    const d2 = v.dashSortieren(abs, "")[0];
    gleich(l.gruppen.map(g => g.schluessel), d2.gruppen.map(g => g.schluessel));
});

/* ---------- R-F10 Kopf ---------- */

test("R_F10 Zähler über die angezeigten ABs", () => {
    const abs = bauen([offen("AB2600001"), offen("AB2600002"), offen("AB2600003"), offen("AB2600004")]);
    const t = termine({ AB2600001: "2026-10-16", AB2600002: "2026-10-30", AB2600003: "2026-11-30" });
    const l = v.fcListe(abs, t, HEUTE, "alle", "", "Alle");
    const k = v.fcKopf(l, { zeit: "2026-10-13T10:00:00.0000000Z" }, HEUTE);
    assert.equal(k.rot, 1);
    assert.equal(k.gelb, 1);
    assert.equal(k.ohne, 1);
    assert.equal(k.ab, 4);
    const k30 = v.fcKopf(v.fcListe(abs, t, HEUTE, "30", "", "Alle"), { zeit: "2026-10-13T10:00:00.0000000Z" }, HEUTE);
    assert.equal(k30.ohne, 0);
    assert.equal(k30.ab, 2);
});

test("R_F10 Forecast vom wird orange, wenn älter als 8 Tage", () => {
    const f = tag => ({ zeit: tag + "T12:00:00.0000000Z" });
    assert.equal(v.fcKopf([], f("2026-10-06"), HEUTE).alt, false);  // 8 Tage
    assert.equal(v.fcKopf([], f("2026-10-05"), HEUTE).alt, true);   // 9 Tage
    assert.equal(v.fcKopf([], f("2026-10-14"), HEUTE).alt, false);
});

test("R_F10 noch kein Forecast", () => {
    const k = v.fcKopf([], null, HEUTE);
    assert.equal(k.vom, null);
    assert.equal(k.alt, false);
    assert.equal(v.fcKachel([], null, {}, HEUTE), null);
});

test("Kachel Forecast zählt alle offenen ABs, ohne Filter", () => {
    const abs = bauen([offen("AB2600001"), offen("AB2600002"), komplett("AB2600003"), offen("AB2600004")]);
    const t = termine({ AB2600001: "2026-10-16", AB2600002: "2026-10-30", AB2600003: "2026-10-16", AB2600004: "2026-12-30" });
    const k = v.fcKachel(abs, { zeit: "2026-10-13T10:00:00.0000000Z" }, t, HEUTE);
    gleich(k, { rot: 1, gelb: 1, vom: d("2026-10-13") });
});

/* ---------- W11: ABs im Schweißen ---------- */

let nummer = 0;
const sz = (nr, ebene, ab, o) => Object.assign({
    _id: ++nummer, nr: nr, ab_nr: ab, ab_schluessel: ab.toUpperCase(), anzeige: ab, ebene: ebene, baugruppe: "",
    zeichnungsnummer: "", benennung: "", lk_nummer: "", lagerort: "", mitarbeiter: "", arbeitsplatz: "",
    liefertermin_stahlbau: null, termin_versand: null, eingelagert: null, komplett: null, vorhanden: "", menge_gesamt: "",
    kopf: JSON.stringify({ kunde: "KNDS", verkaufsartikel: "ART", haupt_ab: "-" }), status: ""
}, o || {});

function schweissen() {
    return v.swBloecke(v.swBerechnen([
        sz(1, "AB", "AB2600010", { arbeitsplatz: "(verschieden)" }),
        sz(2, "BG", "AB2600010", { baugruppe: "100 X", arbeitsplatz: "AP01", mitarbeiter: "Anna" }),
        sz(3, "Teil", "AB2600010", { baugruppe: "100 X", zeichnungsnummer: "T1", vorhanden: "4", menge_gesamt: "4", arbeitsplatz: "AP01" }),
        sz(4, "BG", "AB2600010", { baugruppe: "200 Y", arbeitsplatz: "AP02", mitarbeiter: "Bernd" }),
        sz(5, "Teil", "AB2600010", { baugruppe: "200 Y", zeichnungsnummer: "T2", vorhanden: "1", menge_gesamt: "2", arbeitsplatz: "AP02" }),
        /* Einzelblock: nur eine BG eines anderen AB im Schweißen */
        sz(6, "BG", "AB2600001", { anzeige: "AB2600001_BG100", baugruppe: "100 X", arbeitsplatz: "SFM" }),
        sz(7, "Teil", "AB2600001", { anzeige: "AB2600001_BG100", baugruppe: "100 X", zeichnungsnummer: "T9", vorhanden: "2", menge_gesamt: "2" })
    ]));
}

test("W11 AB-Zeile im Schweißen: Arbeitsplatz und Mitarbeiter sind (verschieden), wenn die BGs sich unterscheiden", () => {
    const ab = schweissen()[0].ab;
    assert.equal(ab.p, v.swVerschieden);
    assert.equal(ab.m, v.swVerschieden);
});

test("W11 ganze ABs im Schweißen kommen in die Liste, Einzelblöcke nicht", () => {
    const sw = v.swForecastAbs(schweissen());
    gleich(sw.map(a => a.o.ab_anzeige), ["AB2600010"]);
    assert.equal(sw[0].schweissen, true);
    assert.equal(sw[0].bgs.length, 2);
    assert.equal(sw[0].w.status, "Teilweise");
});

test("W11 im Schweißen bleibt ein kompletter AB sichtbar, in der Bestandsliste nicht", () => {
    const kompl = [sz(1, "AB", "AB2600020"), sz(2, "BG", "AB2600020", { baugruppe: "100 X" }),
        sz(3, "Teil", "AB2600020", { baugruppe: "100 X", vorhanden: "3", menge_gesamt: "3" })];
    const sw = v.swForecastAbs(v.swBloecke(v.swBerechnen(kompl)));
    const alle = v.fcMitSchweissen(bauen([komplett("AB2600002")]), sw);
    const t = termine({ AB2600020: "2026-10-20", AB2600002: "2026-10-20" });
    gleich(v.fcListe(alle, t, HEUTE, "alle", "", "Alle").map(x => x.a.o.ab_anzeige), ["AB2600020"]);
});

test("W11 steht der AB wieder in der Bestandsliste, zählt nur dieser", () => {
    const sw = v.swForecastAbs(schweissen());
    const abs = bauen([offen("AB2600010")]);
    const alle = v.fcMitSchweissen(abs, sw);
    assert.equal(alle.length, 1);
    assert.equal(alle[0].schweissen, undefined);
});

/* ---------- Planung ---------- */

test("Station und Lagerort: Bestandsliste mit Lagerort im Regal", () => {
    const abs = bauen([offen("AB2600001", { lagerort: "R1" })]);
    abs[0].bgs[0].o.lagerort = "R1";
    abs[0].bgs[0].teile.find(t => t.o.zeichnungsnummer === "T1").o.lagerort = "R1-A";
    const l = v.fcListe(abs, termine({ AB2600001: "2026-10-20" }), HEUTE, "alle", "", "Alle");
    v.plOrteSetzen(l, {});
    assert.equal(l[0].station, "Kom.");
    assert.equal(l[0].ort, "R1");
    assert.equal(l[0].gruppen[0].ort, "R1");
    assert.equal(l[0].gruppen[0].teile.find(t => t.o.zeichnungsnummer === "T1").ort, "R1-A");
});

test("Station und Lagerort: Schweißen mit Arbeitsplatz", () => {
    const sw = v.swForecastAbs(schweissen());
    const l = v.fcListe(sw, termine({ AB2600010: "2026-10-20" }), HEUTE, "alle", "", "Alle");
    v.plOrteSetzen(l, {});
    assert.equal(l[0].station, "Schw.");
    assert.equal(l[0].ort, v.swVerschieden);
    assert.equal(l[0].gruppen[0].ort, "AP01");
    assert.equal(l[0].gruppen[1].teile[0].ort, "AP02");
});

test("Station und Lagerort: einzelne BG im Schweißen", () => {
    const abs = bauen([offen("AB2600001", { lagerort: "R1" })]);
    const einzeln = v.swEinzelnePlaetze(schweissen());
    gleich(einzeln, { AB2600001: ["SFM"] });
    const l = v.fcListe(abs, termine({ AB2600001: "2026-10-20" }), HEUTE, "alle", "", "Alle");
    v.plOrteSetzen(l, einzeln);
    assert.equal(l[0].station, "Kom. + Schw.");
    assert.equal(l[0].ort, "R1 · SFM");
    assert.equal(v.plPlaetze(["AP01", "AP01", "", "(verschieden)", "AP02"]), "AP01, AP02");
});

test("Planung zeigt nur ABs mit Häkchen, mit BGs und Teilen, nach Liefertermin", () => {
    const abs = bauen([offen("AB2600001"), offen("AB2600002"), offen("AB2600003")]);
    const aktive = { AB2600003: true, AB2600001: true };
    const t = termine({ AB2600001: "2026-10-30", AB2600003: "2026-10-20" });
    const l = v.plListe(v.plGeplante(abs, aktive), t, "", "Alle", "termin");
    gleich(l.map(x => x.a.o.ab_anzeige), ["AB2600003", "AB2600001"]);
    assert.equal(l[0].gruppen[0].teile.length, 2);
    v.plMarkieren(l, aktive);
    assert.ok(l.every(x => x.geplant));
});

test("Planung: Sortierung nach Liefertermin, ohne Termin unten; nach Fortschritt", () => {
    const abs = bauen([offen("AB2600001"), offen("AB2600002", { bgs: { "100 X": [["T1", 10, 9]] } }), offen("AB2600003")]);
    const t = termine({ AB2600003: "2026-10-20", AB2600001: "2026-10-25" });
    gleich(v.plListe(abs, t, "", "Alle", "termin").map(x => x.a.o.ab_anzeige), ["AB2600003", "AB2600001", "AB2600002"]);
    gleich(v.plListe(abs, t, "", "Alle", "ab").map(x => x.a.o.ab_anzeige), ["AB2600002", "AB2600001", "AB2600003"]);
    gleich(v.plListe(abs, t, "", "Alle", "auf").map(x => x.a.o.ab_anzeige), ["AB2600001", "AB2600003", "AB2600002"]);
});

/* ---------- Häkchen schreiben (gegen den Nachbau) ---------- */

async function frisch() {
    const x = umgebung(null, "planung");
    x.alle = async () => x.v.fcMitSchweissen(await x.v.bestandLaden(), x.v.swForecastAbs(x.v.swBloecke(await x.v.swLesen())));
    x.zeilen = async () => x.v.plMarkenLaden();
    return x;
}

test("Häkchen setzen ist wiederholbar und entfernbar (archiviert, nie gelöscht)", async () => {
    const x = await frisch();
    const alle = await x.alle();
    const vorher = (await x.zeilen()).length;

    assert.equal(await x.v.plSetzen(await x.zeilen(), "AB2515204", true, alle), true);
    assert.equal(await x.v.plSetzen(await x.zeilen(), "AB2515204", true, alle), true);  // doppelt: nichts Neues
    let z = await x.zeilen();
    assert.equal(z.length, vorher + 1);
    assert.equal(x.v.plAktive(z).AB2515204, true);

    assert.equal(await x.v.plSetzen(z, "AB2515204", false, alle), true);
    z = await x.zeilen();
    assert.equal(z.length, vorher + 1);                      // die Zeile bleibt (archiviert)
    assert.equal(x.v.plAktive(z).AB2515204, undefined);

    assert.equal(await x.v.plSetzen(z, "AB2515204", true, alle), true);  // wieder einblenden
    z = await x.zeilen();
    assert.equal(z.length, vorher + 1);
    assert.equal(x.v.plAktive(z).AB2515204, true);
});

test("Häkchen an einem unbekannten AB wird abgelehnt, Entfernen geht immer", async () => {
    const x = await frisch();
    const alle = await x.alle();
    assert.equal(await x.v.plSetzen(await x.zeilen(), "AB0000000", true, alle), false);
    assert.equal(await x.v.plSetzen(await x.zeilen(), "AB0000000", false, alle), true);
});

test("Häkchen gilt für alle: ein Eintrag in der gemeinsamen Tabelle, am AB-Schlüssel", async () => {
    const x = await frisch();
    await x.v.plSetzen(await x.zeilen(), "AB2616048", true, await x.alle());
    const tabelle = x.ctx.symolo._nachbau.daten()["fwm.kom_planungsmarke"].zeilen;
    const treffer = tabelle.filter(z => z.ab_schluessel === "AB2616048");
    assert.equal(treffer.length, 1);
    assert.equal(treffer[0].archiviert, false);
});

test("Beispieldaten: Forecast, Schweißen und Planung laden aus dem Nachbau", async () => {
    const x = await frisch();
    x.v.heuteText = () => "2026-10-16T00:00:00.0000000Z";
    const alle = await x.alle();
    const fc = await x.v.fcLaden();
    assert.ok(fc.f && Object.keys(fc.termine).length > 10);
    assert.ok(alle.some(a => a.schweissen));
    const heute = x.v.tagHeute();
    const l = x.v.fcListe(alle, fc.termine, heute, "30", "", "Alle");
    assert.ok(l.length > 5 && l.every(e => e.termin !== null));
    assert.ok(l.some(e => e.ampel === "rot") && l.some(e => e.ampel === "gelb"));
    const k = x.v.fcKachel(alle, fc.f, fc.termine, heute);
    assert.ok(k.rot > 0 && k.gelb > 0);
    const geplant = x.v.plGeplante(alle, x.v.plAktive(await x.zeilen()));
    assert.ok(geplant.length >= 3);
});
