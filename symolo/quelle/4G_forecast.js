/* ===========================================================================
   FORECAST ANSEHEN (R-F6 bis R-F10, W11)
   Nachbau der Ansicht aus bestand/forecast.py: früheste Termine je AB,
   Ampel, Liste, Kopf und die Kachel im Dashboard. Das Einlesen der Excel-
   Datei (R-F1 bis R-F5) kommt mit dem Import in Phase 7.

   Tage werden als Tageszahl gerechnet (4E_termine.js).
   =========================================================================== */

/* R-F7 Ampel (Kalendertage ab heute) */
fcRotTage: 14,
fcGelbTage: 30,

/* R-F8 Filter Liefertermin: [Wert, Beschriftung, Tage oder null = alle] */
fcZeitraeume: [["14", "Nächste 14 Tage", 14], ["30", "Nächste 30 Tage", 30], ["alle", "Alle", null]],
fcStandardZeitraum: "30",

/* R-F10: "Forecast vom" wird orange, wenn älter als 8 Tage */
fcAltTage: 8,

/* Der aktuelle Forecast: die neueste Datei und ihre Termine.
   Gibt { f, termine } zurück; f = null, wenn noch keiner importiert ist.
   Von den Zeilen werden nur AB-Schlüssel und Termin geholt (die Datei hat
   bis zu 80 Spalten je Zeile). OFFEN (Symolo): Beim Import (Phase 7) kommt
   der alte Forecast ins Archiv statt gelöscht zu werden; bis dahin gilt
   der mit der neuesten Zeit. */
fcLaden: async function () {

    const liste = await this.datenLesen("forecast", { aufloesen: false });
    liste.sort((a, b) => ((this.zeitMs(b.zeit) || 0) - (this.zeitMs(a.zeit) || 0)) || this.idVergleich(b._id, a._id));

    const f = liste.length ? liste[0] : null;
    if (f === null) return { f: null, termine: {} };

    const zeilen = await this.datenLesenIn("forecast_zeile", "forecast", [f._id], { felder: ["schluessel", "termin"] });
    return { f: f, termine: this.fcTermine(zeilen) };
},

/* R-F6: je AB-Schlüssel (ohne Los) der früheste Termin; Zeilen ohne Termin
   zählen nicht. Ergebnis: { schluessel: Tageszahl } */
fcTermine: function (zeilen) {

    const je = {};

    zeilen.forEach(z => {
        const tag = this.tagNr(z.termin);
        if (tag === null) return;

        const s = this.text(z.schluessel);
        if (!(s in je) || tag < je[s]) je[s] = tag;
    });

    return je;
},

/* Termin eines AB (auch eines Loses: dann der des Haupt-AB, R-AB5); null = kein Termin. */
fcTerminVon: function (a, termine) {

    const s = this.text(a.o.forecast_schluessel) || this.abForecastSchluessel(a.o.ab_anzeige);
    return s in termine ? termine[s] : null;
},

/* R-F7: bis heute + 14 (auch überfällig) rot, bis heute + 30 gelb, sonst oder ohne Termin weiß. */
fcAmpel: function (termin, heute) {

    if (termin === null || termin === undefined) return "weiss";

    const tage = termin - heute;
    return tage <= this.fcRotTage ? "rot" : (tage <= this.fcGelbTage ? "gelb" : "weiss");
},

/* W11: die ABs der Bestandsliste plus die ganzen ABs im Schweißen. Ist ein AB
   gerade wieder in der Bestandsliste (neu importiert oder zurückgeholt),
   zählt nur dieser. */
fcMitSchweissen: function (abs, swAbs) {

    const vorhanden = {};
    abs.forEach(a => { vorhanden[this.text(a.o.ab_schluessel)] = true; });

    return abs.concat(swAbs.filter(a => !vorhanden[this.text(a.o.ab_schluessel)]));
},

/* R-F8/R-F9: nur ABs mit Status ungleich Komplett (im Schweißen bleibt er
   sichtbar), mit allen BGs und Teilen; Filter AB-Suche, Kunde, Liefertermin.
   Termin aufsteigend (ohne Termin unten), dann Fortschritt aufsteigend, dann
   AB-Nummer; innerhalb des AB wie im Dashboard (R-DB3).
   Je Eintrag: termin (Tageszahl oder null) und ampel. */
fcListe: function (abs, termine, heute, zeitraum, suche, kunde) {

    const eintrag = this.fcZeitraeume.find(z => z[0] === zeitraum);
    const tage = eintrag ? eintrag[2] : this.fcGelbTage;

    const auswahl = this.dashFiltern(abs, suche, kunde).filter(a => {
        if (a.w.status === "Komplett" && !a.schweissen) return false;

        const t = this.fcTerminVon(a, termine);
        /* 14/30: mit Überfälligen, ohne "kein Termin" */
        return !(tage !== null && (t === null || t - heute > tage));
    });

    const ergebnis = this.dashSortieren(auswahl, "");
    ergebnis.forEach(d => {
        d.termin = this.fcTerminVon(d.a, termine);
        d.ampel = this.fcAmpel(d.termin, heute);
    });

    const vergleich = (x, y) => (x < y ? -1 : (x > y ? 1 : 0));
    ergebnis.sort((p, q) =>
        vergleich(p.termin === null ? 1 : 0, q.termin === null ? 1 : 0) ||
        vergleich(p.termin === null ? 0 : p.termin, q.termin === null ? 0 : q.termin) ||
        vergleich(p.a.w.prozent, q.a.w.prozent) ||
        vergleich(this.dashText(p.a.o.ab_anzeige), this.dashText(q.a.o.ab_anzeige)));

    return ergebnis;
},

/* R-F10: Zähler über die angezeigten ABs, "Forecast vom" (orange, wenn älter
   als 8 Tage) und heute. */
fcKopf: function (liste, f, heute) {

    const vom = f ? this.tagOrt(f.zeit) : null;

    return {
        rot: liste.filter(d => d.ampel === "rot").length,
        gelb: liste.filter(d => d.ampel === "gelb").length,
        ohne: liste.filter(d => d.termin === null).length,
        ab: liste.length,
        vom: vom,
        alt: vom !== null && heute - vom > this.fcAltTage,
        heute: heute
    };
},

/* Kachel im Dashboard: rote und gelbe ABs (alle offenen, ohne Filter);
   null = noch kein Forecast. abs enthält schon die ABs im Schweißen. */
fcKachel: function (abs, f, termine, heute) {

    if (!f) return null;

    const farben = abs.filter(a => a.w.status !== "Komplett" || a.schweissen)
        .map(a => this.fcAmpel(this.fcTerminVon(a, termine), heute));

    return {
        rot: farben.filter(x => x === "rot").length,
        gelb: farben.filter(x => x === "gelb").length,
        vom: this.tagOrt(f.zeit)
    };
},
