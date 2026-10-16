/* Prüffall 9.1 in JavaScript: tests/daten/pruef_status.csv wurde mit den originalen Excel-Formeln
   gerechnet. Die Symolo-Ansicht (45_rechnen.js, 47_bestand.js) muss jede Zeile exakt treffen.
   Eingabe sind Soll und Vorhanden aus der CSV; verglichen werden alle gerechneten Spalten. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { umgebung } = require("./umgebung");

const CSV = path.join(__dirname, "..", "daten", "pruef_status.csv");

function csvLesen() {
    const [kopf, ...zeilen] = fs.readFileSync(CSV, "utf8").trim().split(/\r?\n/);
    const namen = kopf.split(";");
    return zeilen.map(z => {
        const werte = z.split(";");
        return Object.fromEntries(namen.map((n, i) => [n, werte[i]]));
    });
}

/* CSV -> Zeilen, wie datenLesen sie liefert (unsere Feldnamen, IDs nur in _…). */
function eingabe(csv) {
    const auftraege = [], baugruppen = [], teile = [];
    let ab = null, bg = null, id = 0, zeile = 0;
    const zahl = t => (t === "" ? null : Number(t));

    csv.forEach(z => {
        zeile++;
        if (z.Ebene === "AB") {
            ab = { _id: ++id, ab_anzeige: z.AB, verkaufsartikel: z.Benennung, reihenfolge: auftraege.length + 1 };
            auftraege.push(ab);
            bg = null;
        } else if (z.Ebene === "BG") {
            bg = { _id: ++id, _auftrag_id: ab._id, name: z.Baugruppe, zeichnungsnummer: z.Zeichnungsnummer,
                benennung: z.Benennung, menge_gesamt: zahl(z["Menge Gesamt"]), zeile: zeile };
            baugruppen.push(bg);
        } else {
            teile.push({ _id: ++id, _auftrag_id: ab._id, _baugruppe_id: bg ? bg._id : null,
                zeichnungsnummer: z.Zeichnungsnummer, benennung: z.Benennung,
                menge_gesamt: zahl(z["Menge Gesamt"]), vorhanden: zahl(z.Vorhanden), zeile: zeile });
        }
    });
    return { auftraege, baugruppen, teile };
}

const r4 = x => Math.round(x * 10000) / 10000;

test("Prüffall 9.1: jede Zeile der CSV exakt", () => {
    const { v } = umgebung(null, "bestandsliste");
    const csv = csvLesen();
    const e = eingabe(csv);
    const abs = v.bestandBaum(e.auftraege, e.baugruppen, e.teile);

    const aus = [];
    abs.forEach(a => {
        const sortAb = r4(v.sortWert(a.w));
        let sortBg = -9;
        v.bestandZeilen(a).forEach(k => {
            if (k.art === "bg") sortBg = r4(v.sortWert(k.w));
            aus.push({
                Ebene: { ab: "AB", bg: "BG", teil: "Teil" }[k.art],
                Status: k.w.status,
                Fortschritt: k.w.fortschritt,
                Prozent: r4(k.w.prozent),
                SortAB: sortAb,
                SortBG: sortBg,
                Entnehmen: v.entnehmenMoeglich(k.w) ? "» entnehmen" : ""
            });
        });
    });

    assert.equal(aus.length, 36);
    assert.equal(csv.length, 36);
    csv.forEach((s, i) => {
        const soll = {
            Ebene: s.Ebene, Status: s.Status, Fortschritt: s.Fortschritt, Prozent: r4(Number(s.Prozent)),
            SortAB: r4(Number(s.SortAB)), SortBG: r4(Number(s.SortBG)), Entnehmen: s.Entnehmen
        };
        assert.deepEqual(aus[i], soll, "CSV-Zeile " + (i + 2) + " weicht ab");
    });
});

test("Prüffall 9.1: Kennzahlen aus der Übergabe", () => {
    const { v } = umgebung(null, "bestandsliste");
    const e = eingabe(csvLesen());
    const [a1, a2] = v.bestandBaum(e.auftraege, e.baugruppen, e.teile);

    assert.deepEqual([a1.w.status, a1.w.fortschritt, Math.round(a1.w.prozent * 10000) / 100], ["Teilweise", "10 von 25", 37.43]);
    const bg = Object.fromEntries(a1.bgs.map(b => [b.o.name.split(" ")[0], b]));
    assert.deepEqual([bg["100"].w.status, bg["100"].w.fortschritt], ["Komplett", "8 von 8"]);
    assert.deepEqual([bg["200"].w.status, bg["200"].w.fortschritt, Math.round(bg["200"].w.prozent * 10000) / 100],
        ["Teilweise", "2 von 14", 21.32]);
    assert.equal(bg["300"].w.status, "Offen");
    assert.ok(bg["200"].teile.some(t => t.w.fortschritt === "50 / 42  (+8 zu viel)" && t.w.status === "Komplett"));
    assert.deepEqual([a2.w.status, a2.w.fortschritt], ["Komplett", "5 von 5"]);
});
