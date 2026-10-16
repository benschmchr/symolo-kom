/* Prüffall 9.1: die CSV (mit den originalen Excel-Formeln gerechnet) als Eingabe für die Symolo-Tests. */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const CSV = path.join(__dirname, "..", "daten", "pruef_status.csv");

function csvLesen() {
    const [kopf, ...zeilen] = fs.readFileSync(CSV, "utf8").trim().split(/\r?\n/);
    const namen = kopf.split(";");
    return zeilen.map(z => {
        const werte = z.split(";");
        return Object.fromEntries(namen.map((n, i) => [n, werte[i]]));
    });
}

/* Die CSV schreibt den zweiten AB ohne "AB" ("2616624"); der Import macht daraus "AB2616624" (U6). */
const abForm = x => (/^\d+$/.test(x) ? "AB" + x : x);

/* CSV -> Zeilen, wie datenLesen sie liefert (unsere Feldnamen, IDs nur in _…). */
function eingabe(csv) {
    const auftraege = [], baugruppen = [], teile = [];
    let ab = null, bg = null, id = 0, zeile = 0;
    const zahl = t => (t === "" ? null : Number(t));

    csv.forEach(z => {
        zeile++;
        if (z.Ebene === "AB") {
            ab = { _id: ++id, ab_anzeige: abForm(z.AB), verkaufsartikel: z.Benennung, reihenfolge: auftraege.length + 1 };
            auftraege.push(ab);
            bg = null;
        } else if (z.Ebene === "BG") {
            bg = { _id: ++id, _auftrag_id: ab._id, name: z.Baugruppe, zeichnungsnummer: z.Zeichnungsnummer,
                benennung: z.Benennung, menge_gesamt: zahl(z["Menge Gesamt"]), zeile: zeile };
            baugruppen.push(bg);
        } else {
            teile.push({ _id: ++id, _auftrag_id: ab._id, _baugruppe_id: bg ? bg._id : null,
                zeichnungsnummer: abForm(z.Zeichnungsnummer), benennung: z.Benennung,
                menge_gesamt: zahl(z["Menge Gesamt"]), vorhanden: zahl(z.Vorhanden), zeile: zeile });
        }
    });
    return { auftraege, baugruppen, teile };
}

module.exports = { csvLesen, eingabe };
