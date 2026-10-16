/* Importieren in Symolo (4S_import_speichern.js, 4T_forecast_import.js): Kommissionierlisten ersetzen ohne Löschen
   (R-I8, R-I9, R-I10, R-AB6, U3) und den Forecast ersetzen (R-F1, R-F4, R-F5, R-F11). Die Dateien liefert dieselbe
   Fallliste wie excel_lesen.test.js (tests/symolo_korpus.py, Weg in KOM_EXCEL_KORPUS). Gegen den Nachbau. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { umgebung } = require("./umgebung.js");

const datei = process.env.KOM_EXCEL_KORPUS;

if (!datei) {
    test("Importieren: braucht die Dateien aus tests/test_symolo.py", { skip: true }, () => {});
} else {
    const korpus = JSON.parse(fs.readFileSync(datei, "utf8"));
    const json = x => JSON.parse(JSON.stringify(x));
    const gleich = (a, b, text) => assert.deepEqual(json(a), json(b), text);

    const bytes = name => {
        const f = korpus.find(k => k.name === name || k.name.startsWith(name));
        assert.ok(f && f.daten, "Datei fehlt: " + name);
        return { bytes: new Uint8Array(Buffer.from(f.daten, "base64")), dateiname: f.dateiname };
    };

    const HEUTE = "2026-10-16T00:00:00.0000000Z";
    const SPAETER = "2026-10-20T00:00:00.0000000Z";

    async function frisch() {
        const u = umgebung(null, "bestandsliste");
        u.lesen = async name => { const f = bytes(name); return u.v.impLesen(f.bytes, f.dateiname); };
        u.import = async (name, tag, ab) => u.v.impSpeichern(await u.lesen(name), ab, tag || HEUTE);
        u.teile = async (auftrag, archiv) => (await u.v.datenLesenIn("teil", "auftrag", [auftrag._id], { aufloesen: false, archiv: archiv || "ohne", sortierung: ["zeile"] }));
        u.bgs = async (auftrag, archiv) => (await u.v.datenLesenIn("baugruppe", "auftrag", [auftrag._id], { aufloesen: false, archiv: archiv || "ohne", sortierung: ["zeile"] }));
        u.abs = async () => u.v.datenLesen("auftrag", { wo: { bereich: "bestand" }, aufloesen: false });
        return u;
    }

    /* ---------- R-I8 / R-I9: anlegen und ersetzen ---------- */

    test("R_I8 neue AB-Nummer: wird angelegt, ans Ende der Liste, Teile mit Daten nach R-T1", async () => {
        const u = await frisch();
        const vorher = await u.abs();
        const hoechste = Math.max(...vorher.map(a => u.v.mengeMilli(a.reihenfolge))) / 1000;

        const erg = await u.import("S Daten der Mengen");
        assert.equal(erg.ersetzt, false);
        assert.equal(erg.auftrag.ab_anzeige, "AB123456");
        assert.equal(erg.auftrag.bereich, "bestand");
        assert.equal(u.v.mengeMilli(erg.auftrag.reihenfolge) / 1000, hoechste + 1);
        assert.equal((await u.abs()).length, vorher.length + 1);

        /* R-I9: Daten der Mengen aus der Datei */
        const t = await u.teile(erg.auftrag);
        gleich(t.map(x => [x.zeichnungsnummer, x.datum_eingelagert, x.datum_komplett]), [
            ["T-1", HEUTE, HEUTE], ["T-2", HEUTE, null], ["T-3", null, null]
        ]);
    });

    test("R_I9 Meldung nach dem Import", async () => {
        const { v } = await frisch();
        assert.equal(v.impMeldung(0, 0), "Es wurde nichts importiert.");
        assert.equal(v.impMeldung(1, 0), "1 Arbeitsauftrag importiert.");
        assert.equal(v.impMeldung(2, 1), "3 Arbeitsaufträge importiert. Davon ersetzt: 1.");
        assert.equal(v.impMeldung(0, 1), "1 Arbeitsauftrag importiert. Davon ersetzt: 1.");
    });

    test("R_I8 ersetzen übernimmt Menge, Lagerort und Daten, die alten Zeilen sind archiviert, der AB bleibt am Platz", async () => {
        const u = await frisch();
        const a1 = (await u.import("R_I Beispiel 204")).auftrag;
        const alt = await u.teile(a1);
        assert.equal(alt.length, 25);

        const ziel = alt.find(t => t.zeichnungsnummer === "SK1990-977451.009.0");
        await u.v.datenAendern("teil", ziel, { vorhanden: 21, lagerort: "L3", datum_eingelagert: HEUTE, datum_komplett: SPAETER });
        await u.v.datenAendern("auftrag", a1, { lagerort: "L3" });
        const anzahl = (await u.abs()).length;
        const bgArchivVorher = (await u.bgs(a1, "nur")).length, bgAktiv = (await u.bgs(a1)).length;
        const archivVorher = (await u.teile(a1, "nur")).length;   /* der Beispiel-AB hatte schon eine ältere Fassung */

        const erg = await u.import("R_I Beispiel 204", "2026-11-01T00:00:00.0000000Z");
        assert.equal(erg.ersetzt, true);
        assert.equal(String(erg.auftrag._id), String(a1._id), "derselbe AB-Kopf");
        assert.equal((await u.abs()).length, anzahl, "kein zweiter AB");
        assert.equal(u.v.mengeMilli(erg.auftrag.reihenfolge), u.v.mengeMilli(a1.reihenfolge), "Platz bleibt (U3)");
        assert.equal(erg.auftrag.lagerort, "", "Lagerort am AB geht verloren (wie Excel)");

        const neu = await u.teile(erg.auftrag);
        assert.equal(neu.length, 25);
        const t = neu.find(x => x.zeichnungsnummer === "SK1990-977451.009.0");
        assert.equal(u.v.mengeMilli(t.vorhanden), 21000);
        assert.equal(t.lagerort, "L3");
        assert.equal(t.datum_eingelagert, HEUTE);
        assert.equal(t.datum_komplett, SPAETER);
        assert.ok(neu.every(x => String(x._id) !== String(ziel._id)), "neue Zeilen");
        gleich([...new Set((await u.bgs(erg.auftrag)).map(b => b.lagerort))], [""]);

        /* Die bisherigen Zeilen sind nur ausgeblendet, nichts gelöscht. */
        assert.equal((await u.teile(erg.auftrag, "nur")).length, archivVorher + 25);
        assert.equal((await u.teile(erg.auftrag, "alle")).length, archivVorher + 50);
        assert.equal((await u.bgs(erg.auftrag, "nur")).length, bgArchivVorher + bgAktiv);

        /* Die neuen Teile hängen an den neuen Baugruppen. */
        const bgIds = new Set((await u.bgs(erg.auftrag)).map(b => String(b._id)));
        assert.ok(neu.filter(x => x._baugruppe_id !== null && x._baugruppe_id !== "").every(x => bgIds.has(String(x._baugruppe_id))));
    });

    test("R_I8 Menge aus der Datei hat Vorrang", async () => {
        const u = await frisch();
        const a = (await u.import("S Teil 5 Stück")).auftrag;
        const t = (await u.teile(a))[0];
        await u.v.datenAendern("teil", t, { vorhanden: 2 });

        const b = (await u.import("S Teil 5 Stück, 4 vorhanden", SPAETER)).auftrag;
        const neu = await u.teile(b);
        assert.equal(neu.length, 1);
        assert.equal(u.v.mengeMilli(neu[0].vorhanden), 4000);
        assert.equal(neu[0].datum_eingelagert, SPAETER);
    });

    test("R_I8 Schlüssel Baugruppe, Zeichnungsnummer, LK-Nummer ohne Groß-/Kleinschreibung", async () => {
        const u = await frisch();
        const a = (await u.import("S Schlüssel erste Liste")).auftrag;
        for (const t of await u.teile(a)) await u.v.datenAendern("teil", t, { vorhanden: 3 });

        const b = (await u.import("S Schlüssel zweite Liste")).auftrag;
        const teile = await u.teile(b);
        gleich(teile.map(t => [t.zeichnungsnummer, t.vorhanden === null ? null : u.v.mengeMilli(t.vorhanden) / 1000]), [["T-1", 3], ["T-2", null]]);
    });

    test("R_I8 doppelte Teile: die erste Menge gilt für beide, die Datei gibt einen Hinweis", async () => {
        const u = await frisch();
        const g = await u.lesen("S doppelte Teile");
        assert.ok(g.hinweise.some(h => h.indexOf("Doppelte Teile") >= 0));

        const a = (await u.v.impSpeichern(g, "", HEUTE)).auftrag;
        const teile = await u.teile(a);
        await u.v.datenAendern("teil", teile.find(t => t.benennung === "A"), { vorhanden: 1 });
        await u.v.datenAendern("teil", teile.find(t => t.benennung === "B"), { vorhanden: 2 });

        const b = (await u.v.impSpeichern(g, "", HEUTE)).auftrag;
        gleich((await u.teile(b)).map(t => u.v.mengeMilli(t.vorhanden) / 1000), [1, 1]);
    });

    test("R_AB6 U3 R_I8 die richtige Schreibweise und der Platz bleiben, andere Los-Schreibweise findet denselben AB", async () => {
        const u = await frisch();
        const erster = (await u.import("S Los 1 Schreibweise")).auftrag;
        await u.import("S AB999");
        const a = (await u.import("S Los 01 andere Schreibweise")).auftrag;

        assert.equal(String(a._id), String(erster._id));
        assert.equal(a.ab_anzeige, "AB2616200 / Los 1");
        const namen = (await u.abs()).map(x => x.ab_anzeige).filter(n => n === "AB2616200 / Los 1" || n === "AB999");
        gleich(namen, ["AB2616200 / Los 1", "AB999"]);
    });

    test("R_I4 ohne Fertigungs-AB: die eingetragene Nummer gilt, ohne Nummer geht es nicht", async () => {
        const u = await frisch();
        const g = await u.lesen("S ohne Fertigungs-AB");
        assert.equal(u.v.impAb(g), "");
        await assert.rejects(() => u.v.impSpeichern(g, "", HEUTE), /Fertigungs-AB-Nummer fehlt/);

        const erg = await u.v.impSpeichern(g, "777777", HEUTE);
        assert.equal(erg.auftrag.ab_anzeige, "AB777777");
        assert.equal(erg.auftrag.kunde, "KNDS");
    });

    test("R_I8 jeder Import steht im Protokoll", async () => {
        const u = await frisch();
        await u.import("S Teil 5 Stück");
        await u.import("S Teil 5 Stück");
        const p = (await u.v.protokollLesen()).filter(e => e.ab === "AB123456");
        gleich(p.map(e => e.art).sort(), ["ersetzt", "import"]);
        assert.ok(p.every(e => e.neu === "t.xlsx"));
    });

    /* ---------- Vorschau und Entscheidungen ---------- */

    test("R_I8 Vorschau: vorhandener AB wird gezeigt, dieselbe Nummer in zwei Dateien gilt nur einmal (die letzte)", async () => {
        const u = await frisch();
        await u.import("S Teil 5 Stück");
        const g1 = await u.lesen("S Teil 5 Stück");
        const g2 = await u.lesen("S Teil 5 Stück, 4 vorhanden");
        const vor = await u.v.impVorschau([g1, g2]);

        assert.equal(vor[0].doppelt, true);
        assert.equal(vor[1].doppelt, false);
        assert.ok(vor[1].alt && vor[1].alt.ab_anzeige === "AB123456");
        assert.equal(vor[1].imSchweissen, false);
    });

    test("R_I8 Nein heißt überspringen: ohne Ersetzen bleibt alles wie es ist", async () => {
        const u = await frisch();
        await u.import("S Teil 5 Stück");
        const vor = await u.v.impVorschau([await u.lesen("S Teil 5 Stück, 4 vorhanden")]);

        const nein = await u.v.impAusfuehren(vor, { 0: { ersetzen: false } }, HEUTE);
        assert.equal(nein.neu + nein.ersetzt, 0);
        assert.equal(nein.meldung, "Es wurde nichts importiert.");

        const ja = await u.v.impAusfuehren(vor, { 0: { ersetzen: true } }, HEUTE);
        assert.equal(ja.ersetzt, 1);
        assert.equal(ja.meldung, "1 Arbeitsauftrag importiert. Davon ersetzt: 1.");
        assert.equal(ja.zuletzt.ab_anzeige, "AB123456");
    });

    test("R_I10 liegt der AB schon im Schweißen: nur mit ausdrücklichem Ja importieren", async () => {
        const u = await frisch();
        await u.v.datenAnlegen("schweisszeile", {
            nr: 1, ab_nr: "AB123456", ab_schluessel: "AB123456", anzeige: "AB123456", ebene: "AB", archiviert: false
        });
        const g = await u.lesen("S Teil 5 Stück");
        const vor = await u.v.impVorschau([g]);
        assert.equal(vor[0].imSchweissen, true);

        const nein = await u.v.impAusfuehren(vor, { 0: {} }, HEUTE);
        assert.equal(nein.neu, 0);
        assert.equal((await u.abs()).filter(a => a.ab_anzeige === "AB123456").length, 0);

        const ja = await u.v.impAusfuehren(vor, { 0: { schweissen: true } }, HEUTE);
        assert.equal(ja.neu, 1);
    });

    test("R_I4 R_I10 fehlt die Nummer in der Datei, gilt die eingetragene auch für die Rückfrage", async () => {
        const u = await frisch();
        const g = await u.lesen("S ohne Fertigungs-AB");
        const vor = await u.v.impVorschau([g]);
        const leer = await u.v.impAusfuehren(vor, { 0: { ab: "" } }, HEUTE);
        assert.equal(leer.neu, 0);

        const erg = await u.v.impAusfuehren(vor, { 0: { ab: "888888" } }, HEUTE);
        assert.equal(erg.neu, 1);
        assert.equal(erg.zuletzt.ab_anzeige, "AB888888");
    });

    /* ---------- Forecast ---------- */

    const FC = "R_F4 Zahlen und Uhrzeit in den Spalten";

    test("R_F1 Link bereinigen und nur http als Link zeigen", async () => {
        const { v } = await frisch();
        const FAELLE = [
            ["\"https://x.sharepoint.com/:x:/r/sites/a/b.xlsx?d=w1&csf=1\"", "https://x.sharepoint.com/sites/a/b.xlsx"],
            ["  \\\\server\\ordner\\f.xlsx  ", "\\\\server\\ordner\\f.xlsx"], ["", ""]
        ];
        FAELLE.forEach(([ein, aus]) => assert.equal(v.fcQuelleBereinigen(ein), aus, ein));
        assert.equal(v.fcQuelleLink("https://a.de/x"), "https://a.de/x");
        assert.equal(v.fcQuelleLink("javascript:alert(1)"), "");
        assert.equal(v.fcQuelleLink("\\\\server\\x"), "");
    });

    test("R_F1 Link hinterlegen: gespeichert wird der bereinigte Link, ein zweites Mal wird geändert", async () => {
        const u = await frisch();
        assert.equal(await u.v.fcQuelleLesen(), "");
        await u.v.fcQuelleSpeichern("\"https://a.de/:x:/r/b.xlsx?x=1\"");
        assert.equal(await u.v.fcQuelleLesen(), "https://a.de/b.xlsx");
        await u.v.fcQuelleSpeichern("https://c.de/d.xlsx");
        assert.equal(await u.v.fcQuelleLesen(), "https://c.de/d.xlsx");
        assert.equal((await u.v.datenLesen("einstellung", { wo: { name: "forecast_link" }, aufloesen: false })).length, 1);
    });

    test("R_F4 R_F5 Forecast importieren ersetzt den bisherigen, der alte ist archiviert, die Meldung stimmt", async () => {
        const u = await frisch();
        const f = bytes(FC);
        const g = await u.v.fcLesen(f.bytes, f.dateiname);
        const gemeldet = [];

        const vorher = await u.v.fcLaden();
        assert.ok(vorher.f, "die Beispieldaten haben einen Forecast");

        const e = await u.v.fcSpeichern(g, t => gemeldet.push(t));
        assert.equal(e.zeilen, g.zeilen.length);
        assert.ok(gemeldet.length >= 3);

        const jetzt = await u.v.fcLaden();
        assert.notEqual(String(jetzt.f._id), String(vorher.f._id));
        assert.equal(jetzt.f.datei, g.datei);
        assert.equal((await u.v.datenLesen("forecast", { aufloesen: false })).length, 1, "nur der neue ist sichtbar");
        assert.equal((await u.v.datenLesen("forecast", { aufloesen: false, archiv: "nur" })).length, 1);
        assert.equal((await u.v.datenLesenIn("forecast_zeile", "forecast", [jetzt.f._id], { aufloesen: false })).length, g.zeilen.length);

        assert.equal(u.v.fcMeldung({ zeilen: 2, absMitTermin: 1, treffer: 1, absBestand: 5 }),
            "Forecast importiert: 2 Zeilen, 1 ABs mit offenem Liefertermin; 1 von 5 ABs der Bestandsliste haben einen Liefertermin.");

        const p = (await u.v.protokollLesen()).filter(x => x.art === "forecast");
        assert.equal(p.length, 1);
        assert.equal(p[0].objekt, g.datei);
    });

    test("R_F4 bricht der Import ab, gilt weiter der bisherige Forecast", async () => {
        const u = await frisch();
        const f = bytes(FC);
        const g = await u.v.fcLesen(f.bytes, f.dateiname);
        const vorher = await u.v.fcLaden();

        const anlegen = u.v.datenAnlegen;
        let n = 0;
        u.v.datenAnlegen = function (name, werte) {
            if (name === "forecast_zeile" && ++n > 1) return Promise.reject(new Error("Verbindung weg"));
            return anlegen.call(this, name, werte);
        };
        await assert.rejects(() => u.v.fcSpeichern(g), /Verbindung weg/);
        u.v.datenAnlegen = anlegen;

        const jetzt = await u.v.fcLaden();
        assert.equal(String(jetzt.f._id), String(vorher.f._id), "der bisherige Forecast gilt");
        assert.equal((await u.v.datenLesen("forecast", { aufloesen: false })).length, 1);
    });

    test("R_F11 alle Spalten, Suche in allen Spalten, Reihenfolge der Zeilen", async () => {
        const u = await frisch();
        const f = bytes(FC);
        const g = await u.v.fcLesen(f.bytes, f.dateiname);
        await u.v.fcSpeichern(g);

        const { f: aktuell } = await u.v.fcLaden();
        const d = await u.v.fcDatenLaden(aktuell);
        gleich(d.kopf, g.kopf);
        gleich(d.zeilen.map(z => z.schluessel), g.zeilen.map(z => z.schluessel));
        gleich(d.zeilen.map(z => z.werte), g.zeilen.map(z => z.werte));

        const ein = u.v.fcDatenFiltern(d.zeilen, d.zeilen[0].schluessel.toLowerCase());
        assert.ok(ein.length >= 1 && ein.every(z => z.schluessel.toLowerCase().indexOf(d.zeilen[0].schluessel.toLowerCase()) > -1 || z.werte.some(w => String(w).toLowerCase().indexOf(d.zeilen[0].schluessel.toLowerCase()) > -1)));
        assert.equal(u.v.fcDatenFiltern(d.zeilen, "gibt-es-nicht-xyz").length, 0);
        assert.equal(u.v.fcDatenFiltern(d.zeilen, "  ").length, d.zeilen.length);

        gleich(await u.v.fcDatenLaden(null), { kopf: [], zeilen: [] });
    });

    test("Archiv: nur eine Stelle schreibt das Archiv-Feld", async () => {
        const u = await frisch();
        const a = (await u.import("S Teil 5 Stück")).auftrag;
        const t = (await u.teile(a))[0];
        await u.v.datenArchivieren("teil", t);
        assert.equal((await u.teile(a)).length, 0);
        assert.equal((await u.teile(a, "nur")).length, 1);
        await assert.rejects(() => u.v.datenArchivieren("einstellung", { _id: 1 }), /nicht archiviert/);
    });
}
