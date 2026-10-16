/* ===========================================================================
   FORECAST IMPORTIEREN UND ANSEHEN (R-F1, R-F4, R-F5, R-F11)
   Nachbau von bestand/forecast.py (speichern) und views_forecast.py. Gelesen
   wird in 4R_forecast_lesen.js, angezeigt in 4G_forecast.js.

   Der Import ersetzt den ganzen Forecast, aber ohne zu löschen: Der neue
   Forecast wird versteckt angelegt (archiviert), samt allen Zeilen. Erst wenn
   alles da ist, wird er sichtbar und der bisherige archiviert. Bricht der
   Import ab, bleibt der bisherige Forecast gültig.
   OFFEN (Symolo): keine Transaktion, kein Anlegen mehrerer Zeilen auf einmal
   (die Vorlage hat rund 800 Zeilen mit je bis zu 80 Spalten). Die archivierten
   alten Forecasts bleiben mit ihren Zeilen in der Datenbank (IT räumt auf).
   =========================================================================== */

fcDatenJeSeite: 250,

/* R-F1: SharePoint-Link aus der Adresszeile in den Pfad der Datei umbauen (wie QuelleBereinigen):
   Anführungszeichen außen weg; bei http... alles ab "?" weg und "/:x:/r/" -> "/". */
fcQuelleBereinigen: function (q) {

    let t = this.text(q).trim();
    if (t.length > 1 && t.charAt(0) === "\"" && t.charAt(t.length - 1) === "\"") t = t.slice(1, -1);

    if (t.slice(0, 4).toLowerCase() === "http") {
        t = t.split("?")[0].replace(/\/:x:\/r\//gi, "/");
    }
    return t;
},

/* Als Link zum Öffnen gilt nur http und https (nie javascript: o. ä.). */
fcQuelleLink: function (q) {

    return /^https?:\/\//i.test(this.text(q)) ? this.text(q) : "";
},

fcQuelleLesen: async function () {

    const z = (await this.datenLesen("einstellung", { wo: { name: "forecast_link" }, aufloesen: false }))[0];
    return z ? this.text(z.wert) : "";
},

/* R-F1: Link hinterlegen (bereinigt, höchstens 1000 Zeichen). Gibt den gespeicherten Link zurück. */
fcQuelleSpeichern: async function (eingabe) {

    const wert = this.fcQuelleBereinigen(eingabe).slice(0, 1000);
    const z = (await this.datenLesen("einstellung", { wo: { name: "forecast_link" }, aufloesen: false }))[0];

    if (z) await this.datenAendern("einstellung", z, { wert: wert });
    else await this.datenAnlegen("einstellung", { name: "forecast_link", wert: wert });

    return wert;
},

/* Datum { j, m, t } als Text, wie Symolo es liefert ("2026-12-02T00:00:00.0000000Z"). */
fcTerminText: function (t) {

    if (!t) return null;
    return String(t.j).padStart(4, "0") + "-" + this.impTag2(t.m) + "-" + this.impTag2(t.t) + "T00:00:00.0000000Z";
},

/* R-F4: ersetzt den ganzen Forecast. melden(text): Fortschritt. Gibt die Zahlen für die Meldung (R-F5) zurück. */
fcSpeichern: async function (g, melden) {

    const sage = text => { if (melden) melden(text); };
    const bisher = await this.datenLesen("forecast", { aufloesen: false });

    sage("Lege den Forecast an …");
    const f = await this.datenAnlegen("forecast", {
        zeit: this.zeitJetzt(), datei: this.text(g.datei).slice(0, 255), blatt: this.text(g.blatt).slice(0, 120),
        stand: this.text(g.stand).slice(0, 200), kopf: JSON.stringify(g.kopf), archiviert: true
    });

    for (let i = 0; i < g.zeilen.length; i += 100) {
        sage("Lege die Zeilen an (" + Math.min(i + 100, g.zeilen.length) + " von " + g.zeilen.length + ") …");

        await this.jeAcht(g.zeilen.slice(i, i + 100).map((z, k) => [z, i + k + 1]), ([z, nr]) => this.datenAnlegen("forecast_zeile", {
            forecast: f._id, nr: nr, schluessel: z.schluessel, termin: this.fcTerminText(z.termin), werte: JSON.stringify(z.werte)
        }));
    }

    sage("Schalte den neuen Forecast frei …");
    await this.datenAendern("forecast", f, { archiviert: false });
    await this.jeAcht(bisher, alt => this.datenArchivieren("forecast", alt));

    const mit = {};
    g.zeilen.forEach(z => { if (z.termin) mit[z.schluessel] = true; });

    const abs = await this.datenLesen("auftrag", { wo: { bereich: "bestand" }, aufloesen: false, felder: ["ab_anzeige", "forecast_schluessel"] });
    const treffer = abs.filter(a => (this.text(a.forecast_schluessel) || this.abForecastSchluessel(a.ab_anzeige)) in mit).length;

    await this.protokollSchreiben("forecast", "", g.datei, "", g.zeilen.length + " Zeilen");

    return { zeilen: g.zeilen.length, absMitTermin: Object.keys(mit).length, treffer: treffer, absBestand: abs.length };
},

/* R-F5 */
fcMeldung: function (e) {

    return "Forecast importiert: " + e.zeilen + " Zeilen, " + e.absMitTermin + " ABs mit offenem Liefertermin; " +
        e.treffer + " von " + e.absBestand + " ABs der Bestandsliste haben einen Liefertermin.";
},

/* R-F11: alle Zeilen des aktuellen Forecasts mit allen Spalten. f = Forecast aus fcLaden (oder null).
   Ergebnis: { kopf: [Spaltennamen], zeilen: [{ schluessel, termin, werte: [Text] }] } nach Zeilennummer. */
fcDatenLaden: async function (f) {

    if (!f) return { kopf: [], zeilen: [] };

    let kopf = [];
    try { kopf = JSON.parse(this.text(f.kopf) || "[]"); } catch (fehler) { kopf = []; }

    const zeilen = await this.datenLesenIn("forecast_zeile", "forecast", [f._id], { aufloesen: false });
    zeilen.sort((a, b) => (this.mengeMilli(a.nr) - this.mengeMilli(b.nr)) || this.idVergleich(a._id, b._id));

    return {
        kopf: kopf,
        zeilen: zeilen.map(z => {
            let werte = [];
            try { werte = JSON.parse(this.text(z.werte) || "[]"); } catch (fehler) { werte = []; }
            return { schluessel: this.text(z.schluessel), termin: this.text(z.termin), werte: werte };
        })
    };
},

/* R-F11: Suche in AB-Schlüssel und allen Spalten (ohne Groß-/Kleinschreibung). */
fcDatenFiltern: function (zeilen, suche) {

    const q = this.text(suche).trim().toLowerCase();
    if (!q) return zeilen;

    return zeilen.filter(z => z.schluessel.toLowerCase().indexOf(q) > -1 || z.werte.some(w => this.text(w).toLowerCase().indexOf(q) > -1));
},
