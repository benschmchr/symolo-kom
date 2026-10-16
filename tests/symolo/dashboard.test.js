/* Dashboard in Symolo (4A_dashboard.js): Sortierung wie die Excel-Formel DASH, Filter, Kopf, Klappen
   (R-DB1 bis R-DB5). Eingabe ist der Prüffall 9.1 oder kleine selbst gebaute ABs. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { umgebung } = require("./umgebung");
const { csvLesen, eingabe } = require("./pruefdaten");

const gleich = (a, b, text) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, text);
const r4 = x => Math.round(x * 10000) / 10000;

/* Kleine ABs bauen: bgs = { "100 A": [[zn, soll, vorhanden]] }, ohne = [[zn, soll, vorhanden]] */
function bauen(v, abDefs) {
    const auftraege = [], baugruppen = [], teile = [];
    let id = 0, zeile = 0;
    abDefs.forEach(def => {
        const ab = { _id: ++id, ab_anzeige: def.nr, ab_schluessel: def.nr, kunde: def.kunde || "", reihenfolge: auftraege.length };
        auftraege.push(ab);
        const teil = (zn, soll, vh, bg) => teile.push({ _id: ++id, _auftrag_id: ab._id, _baugruppe_id: bg ? bg._id : null,
            zeichnungsnummer: zn, benennung: "TEIL " + zn, menge_gesamt: soll, vorhanden: vh, zeile: ++zeile });
        (def.ohne || []).forEach(([zn, s, vh]) => teil(zn, s, vh, null));
        Object.entries(def.bgs || {}).forEach(([name, ts]) => {
            const bg = { _id: ++id, _auftrag_id: ab._id, name: name, kurz: name.split(" ")[0], zeile: ++zeile };
            baugruppen.push(bg);
            ts.forEach(([zn, s, vh]) => teil(zn, s, vh, bg));
        });
    });
    return v.bestandBaum(auftraege, baugruppen, teile);
}

/* Dashboard flach wie in Excel: [Ebene, AB, BG, Zeichnungsnummer] */
function flach(liste) {
    const aus = [];
    liste.forEach(d => {
        aus.push(["AB", d.a.o.ab_anzeige, "", ""]);
        d.gruppen.forEach(g => {
            const name = g.bg ? g.bg.o.name : "";
            if (g.bg) aus.push(["BG", d.a.o.ab_anzeige, name, ""]);
            g.teile.forEach(t => aus.push(["Teil", d.a.o.ab_anzeige, name, t.o.zeichnungsnummer]));
        });
    });
    return aus;
}

function pruef() {
    const { v } = umgebung(null, "dashboard");
    const csv = csvLesen();
    const e = eingabe(csv);
    return { v, csv, abs: v.bestandBaum(e.auftraege, e.baugruppen, e.teile) };
}

test("R_DB1 Fortschritt wie das Excel-Format 0 %", () => {
    const { v } = umgebung(null, "dashboard");
    [[0.3743, "37 %"], [0.2132, "21 %"], [1.0, "100 %"], [0.0, "0 %"], [0.99, "99 %"], [0.125, "13 %"],
        [0.285, "29 %"], [0.4762, "48 %"], [0.01, "1 %"]].forEach(([p, text]) => assert.equal(v.prozentText(p), text, String(p)));
});

test("R_DB1 Prüffall: jede Zeile hat Status, Fortschritt % und Stand wie in der CSV", () => {
    const { v, csv, abs } = pruef();
    const liste = v.dashSortieren(abs);
    const gefunden = {};
    liste.forEach(d => {
        const zeilen = [d.a].concat(...d.gruppen.map(g => (g.bg ? [g.bg] : []).concat(g.teile)));
        zeilen.forEach(k => {
            const schluessel = [k.w.status, v.prozentText(k.w.prozent), k.w.fortschritt].join("|");
            gefunden[schluessel] = (gefunden[schluessel] || 0) + 1;
        });
    });
    const erwartet = {};
    csv.forEach(s => {
        const schluessel = [s.Status, v.prozentText(Number(s.Prozent)), s.Fortschritt].join("|");
        erwartet[schluessel] = (erwartet[schluessel] || 0) + 1;
    });
    assert.equal(csv.length, 36);
    gleich(gefunden, erwartet);
});

test("R_DB3 Reihenfolge wie die Excel-Formel DASH (SORTBY) mit dem Prüffall", () => {
    const { v, csv, abs } = pruef();
    const statuswert = { Komplett: 0, Teilweise: 2 };
    const stufe = { AB: 1, BG: 2, Teil: 3 };
    const klein = x => x.toLowerCase();
    const cmp = (a, b) => (a < b ? -1 : (a > b ? 1 : 0));
    const soll = csv.slice().sort((a, b) => {
        const k = s => [r4(Number(s.SortAB)), klein(s.AB), stufe[s.Ebene] > 1 ? 1 : 0, r4(Number(s.SortBG)), klein(s.Baugruppe),
            stufe[s.Ebene] > 2 ? 1 : 0, r4((statuswert[s.Status] ?? 4) - Number(s.Prozent)), klein(s.Zeichnungsnummer)];
        const x = k(a), y = k(b);
        for (let i = 0; i < x.length; i++) { const c = cmp(x[i], y[i]); if (c) return c; }
        return 0;
    });
    /* Die CSV schreibt AB2616624 ohne "AB" in der ersten Spalte; der Import macht daraus "AB2616624". */
    const ab = s => (/^\d+$/.test(s.AB) ? "AB" + s.AB : s.AB);
    const erwartet = soll.map(s => [s.Ebene, ab(s), s.Baugruppe, s.Ebene === "Teil" ? (s.Zeichnungsnummer === "2616624" ? "AB2616624" : s.Zeichnungsnummer) : ""]);
    gleich(flach(v.dashSortieren(abs)).map(z => z.map(String)), erwartet.map(z => z.map(String)));
    gleich(erwartet[0], ["AB", "AB2616624", "", ""]);    /* komplett zuerst */
});

test("R_DB3 ABs: komplett, teilweise (hoher Fortschritt zuerst), dann offen; gleiche nach Nummer", () => {
    const { v } = umgebung(null, "dashboard");
    const abs = bauen(v, [
        { nr: "AB5", bgs: { "10 X": [["A", 10, null]] } },
        { nr: "AB4", bgs: { "10 X": [["A", 10, 2]] } },
        { nr: "AB3", bgs: { "10 X": [["A", 10, 8]] } },
        { nr: "AB2", bgs: { "10 X": [["A", 10, 10]] } },
        { nr: "AB1", bgs: { "10 X": [["A", 10, null]] } },
        { nr: "AB0" }
    ]);
    gleich(v.dashSortieren(abs).map(d => d.a.o.ab_anzeige), ["AB2", "AB3", "AB4", "AB0", "AB1", "AB5"]);

    const klein = bauen(v, ["ab2", "AB1", "AB3"].map(nr => ({ nr: nr, bgs: { "10 X": [["A", 1, 1]] } })));
    gleich(v.dashSortieren(klein).map(d => d.a.o.ab_anzeige), ["AB1", "ab2", "AB3"]);
});

test("R_DB3 BGs im AB und Teile in der BG; Teile ohne BG stehen vor den BGs", () => {
    const { v } = umgebung(null, "dashboard");
    const abs = bauen(v, [{ nr: "AB1", bgs: {
        "300 C": [["Z", 4, null], ["Y", 4, null]],
        "100 A": [["K2", 4, 4], ["K1", 4, 4]],
        "200 B": [["T3", 4, null], ["T2", 4, 1], ["T1", 4, 3], ["T0", 4, 4]],
        "050 D": [["Q", 4, null]]
    } }]);
    gleich(flach(v.dashSortieren(abs)), [
        ["AB", "AB1", "", ""],
        ["BG", "AB1", "100 A", ""], ["Teil", "AB1", "100 A", "K1"], ["Teil", "AB1", "100 A", "K2"],
        ["BG", "AB1", "200 B", ""], ["Teil", "AB1", "200 B", "T0"], ["Teil", "AB1", "200 B", "T1"],
        ["Teil", "AB1", "200 B", "T2"], ["Teil", "AB1", "200 B", "T3"],
        ["BG", "AB1", "050 D", ""], ["Teil", "AB1", "050 D", "Q"],
        ["BG", "AB1", "300 C", ""], ["Teil", "AB1", "300 C", "Y"], ["Teil", "AB1", "300 C", "Z"]
    ]);

    const ohne = bauen(v, [{ nr: "AB1", ohne: [["O2", 1, null], ["O1", 1, 1]], bgs: { "100 A": [["K", 1, 1]] } }]);
    gleich(flach(v.dashSortieren(ohne)), [
        ["AB", "AB1", "", ""], ["Teil", "AB1", "", "O1"], ["Teil", "AB1", "", "O2"],
        ["BG", "AB1", "100 A", ""], ["Teil", "AB1", "100 A", "K"]
    ]);
});

test("Sortieren nach Fortschritt (Ben, 14.10.): absteigend und aufsteigend, gleiche nach AB-Nummer", () => {
    const { v } = umgebung(null, "dashboard");
    const abs = bauen(v, [
        { nr: "AB1", bgs: { "10 X": [["A", 10, 2]] } },
        { nr: "AB2", bgs: { "10 X": [["A", 10, 8]] } },
        { nr: "AB3", bgs: { "10 X": [["A", 10, 8]] } }
    ]);
    gleich(v.dashSortieren(abs, "ab").map(d => d.a.o.ab_anzeige), ["AB2", "AB3", "AB1"]);
    gleich(v.dashSortieren(abs, "auf").map(d => d.a.o.ab_anzeige), ["AB1", "AB2", "AB3"]);
});

test("R_DB2 Suche (Teilwort ohne Groß/Klein), Kunde, beides zusammen, Kundenliste", () => {
    const { v } = umgebung(null, "dashboard");
    const abs = bauen(v, [
        { nr: "AB2515204", kunde: "KNDS" }, { nr: "AB2616624", kunde: "knds" },
        { nr: "AB2700001", kunde: "Siemens" }, { nr: "AB2700002", kunde: "" }
    ]);
    gleich(v.dashFiltern(abs, "ab26", "Alle").map(a => a.o.ab_anzeige), ["AB2616624"]);
    gleich(v.dashFiltern(abs, "", "Alle").length, 4);
    gleich(v.dashFiltern(abs, "", "knds").map(a => a.o.ab_anzeige), ["AB2515204", "AB2616624"]);
    gleich(v.dashFiltern(abs, "2700", "Siemens").map(a => a.o.ab_anzeige), ["AB2700001"]);
    gleich(v.dashKunden(abs), ["Alle", "KNDS", "Siemens"]);    /* ohne doppelte, ohne leere */
});

test("R_DB5 Kopf: Zähler, Anteile und Gesamtfortschritt über alle ABs", () => {
    const { v, abs } = pruef();
    const k = v.dashKopf(abs);
    assert.equal(k.ab, 2);
    assert.equal(k.komplett, 1);
    assert.equal(k.teilweise, 1);
    assert.equal(k.offen, 0);
    assert.equal(k.komplett_anteil, 50);
    assert.match(k.gesamt_txt, /^\d+,\d %$/);

    const leer = v.dashKopf([]);
    assert.deepEqual([leer.ab, leer.gesamt, leer.gesamt_txt, leer.komplett_anteil], [0, 0, "0,0 %", 0]);
    /* Python round(): 1 von 8 = 12,5 % wird 12 */
    assert.equal(v.rundenGerade(12.5), 12);
    assert.equal(v.rundenGerade(13.5), 14);
});

test("R_DB4 Startzustand je Ansicht und gemerktes Auf- und Zuklappen", () => {
    const { v } = umgebung(null, "dashboard");
    const abs = bauen(v, [{ nr: "AB1", bgs: { "100 A": [["K", 1, 1]] } }]);
    [["ab", false, false], ["bg", true, false], ["alles", true, true]].forEach(([wahl, abOffen, bgOffen]) => {
        const liste = v.dashSortieren(abs);
        v.dashKlappen(liste, wahl, {});
        assert.equal(liste[0].offen, abOffen, wahl);
        assert.equal(liste[0].gruppen[0].offen, bgOffen, wahl);
    });
    const liste = v.dashSortieren(abs);
    const gemerkt = { [liste[0].schluessel]: false, [liste[0].gruppen[0].schluessel]: true };
    v.dashKlappen(liste, "alles", gemerkt);
    assert.equal(liste[0].offen, false);
    assert.equal(liste[0].gruppen[0].offen, true);
    /* Der Schlüssel hängt an AB-Schlüssel und BG-Name, nicht an der Datenbank-ID (bleibt nach dem Ersetzen) */
    assert.equal(liste[0].schluessel, "ab1");
    assert.equal(liste[0].gruppen[0].schluessel, "ab1|100 a");
});
