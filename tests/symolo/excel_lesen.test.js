/* Excel einlesen: 4P_excel.js, 4Q_import_lesen.js und 4R_forecast_lesen.js lesen dieselben Dateien wie die
   bisherige App (bestand/importer.py, bestand/forecast.py). Die Dateien und das Ergebnis der bisherigen App
   erzeugt tests/test_symolo.py (tests/symolo_korpus.py) und gibt den Weg in KOM_EXCEL_KORPUS an. Ohne die
   Variable gibt es nichts zu vergleichen. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { umgebung } = require("./umgebung.js");

const datei = process.env.KOM_EXCEL_KORPUS;

if (!datei) {
    test("Excel einlesen: Vergleich mit der bisherigen App braucht tests/test_symolo.py", { skip: true }, () => {});
} else {
    const korpus = JSON.parse(fs.readFileSync(datei, "utf8"));
    const { v } = umgebung(null, "bestandsliste");

    const bytes = f => (f.daten ? new Uint8Array(Buffer.from(f.daten, "base64")) : Uint8Array.from({ length: f.groesse }, (x, i) => (i === 0 ? 0x50 : i === 1 ? 0x4b : 0x30)));

    const zahl = s => (s === null || s === undefined ? null : Number(s));

    const gleichKom = (ist, soll) => {
        assert.deepEqual(JSON.parse(JSON.stringify(ist.kopf)), soll.kopf);
        assert.deepEqual(JSON.parse(JSON.stringify(ist.hinweise)), soll.hinweise);
        assert.equal(ist.zeilen.length, soll.zeilen.length);

        ist.zeilen.forEach((z, i) => {
            const s = soll.zeilen[i];
            assert.equal(z.ebene, s.ebene, "Ebene Zeile " + i);
            assert.equal(z.bg, s.bg, "BG Zeile " + i);

            Object.keys(s.werte).forEach(feld => {
                if (feld === "menge_gesamt" || feld === "vorhanden") {
                    assert.equal(z.werte[feld], zahl(s.werte[feld]), feld + " Zeile " + i);
                } else {
                    assert.equal(z.werte[feld] === undefined ? "" : z.werte[feld], s.werte[feld] === null ? "" : s.werte[feld], feld + " Zeile " + i);
                }
            });
            assert.equal(Object.keys(z.werte).filter(f => !(f in s.werte)).length, 0, "überzählige Felder Zeile " + i);
        });
    };

    const tagText = t => (t === null ? null : String(t.j).padStart(4, "0") + "-" + String(t.m).padStart(2, "0") + "-" + String(t.t).padStart(2, "0"));

    const gleichForecast = (ist, soll) => {
        assert.equal(ist.datei, soll.datei);
        assert.equal(ist.blatt, soll.blatt);
        assert.equal(ist.stand, soll.stand);
        assert.deepEqual(JSON.parse(JSON.stringify(ist.kopf)), soll.kopf);
        assert.equal(ist.zeilen.length, soll.zeilen.length);

        ist.zeilen.forEach((z, i) => {
            assert.equal(z.schluessel, soll.zeilen[i][0], "Schlüssel Zeile " + i);
            assert.equal(tagText(z.termin), soll.zeilen[i][1], "Termin Zeile " + i);
            assert.deepEqual(JSON.parse(JSON.stringify(z.werte)), soll.zeilen[i][2], "Werte Zeile " + i);
        });
    };

    korpus.forEach(f => {
        test("Lesen wie die bisherige App: " + f.name, async () => {
            let ist = null, fehler = null;

            try {
                ist = f.art === "kom" ? await v.impLesen(bytes(f), f.dateiname) : await v.fcLesen(bytes(f), f.dateiname);
            } catch (e) {
                fehler = e.message;
            }

            if (f.erwartet.fehler !== undefined) {
                assert.equal(fehler, f.erwartet.fehler);
            } else {
                assert.equal(fehler, null, "unerwarteter Fehler: " + fehler);
                (f.art === "kom" ? gleichKom : gleichForecast)(ist, f.erwartet.ergebnis);
            }
        });
    });

    test("Excel einlesen: es wurden genug Fälle verglichen", () => {
        assert.ok(korpus.length >= 50, "Fälle: " + korpus.length);
        assert.ok(korpus.some(f => f.erwartet.fehler !== undefined) && korpus.some(f => f.erwartet.ergebnis !== undefined));
    });
}
