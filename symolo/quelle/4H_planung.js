/* ===========================================================================
   PLANUNG (Häkchen, Station, Lagerort)
   Nachbau von bestand/planung.py und views_planung.py: Häkchen an ABs im
   Dashboard und im Forecast (ein gemeinsamer Stand), die Ansicht Planung
   mit den vorgemerkten ABs und die Spalten Station und Lagerort.

   Das Häkchen hängt am AB-Schlüssel (R-AB3, Beispiel "AB2616200|L1") und
   gilt für alle. Entfernen archiviert den Eintrag statt ihn zu löschen;
   setzt jemand das Häkchen wieder, wird er wieder eingeblendet.
   Rechte fallen vorerst weg (Ben, 16.10.2026): jeder darf haken.
   =========================================================================== */

plStationBestand: "Kom.",
plStationSchweissen: "Schw.",
plStationBeide: "Kom. + Schw.",

plSortierungen: [["termin", "Liefertermin"], ["ab", "Fortschritt absteigend"], ["auf", "Fortschritt aufsteigend"]],
plStandardSortierung: "termin",

/* Alle Häkchen-Einträge, auch ausgeblendete (zum Wiedereinblenden). */
plMarkenLaden: async function () {

    return this.datenLesen("planungsmarke", { aufloesen: false, archiv: "alle" });
},

/* Die gesetzten Häkchen als { AB-Schlüssel: true }. */
plAktive: function (zeilen) {

    const je = {};

    zeilen.forEach(z => {
        if (!this.istJa(z.archiviert)) je[this.text(z.ab_schluessel)] = true;
    });

    return je;
},

/* Gibt es diesen AB in der Bestandsliste oder (ganz) im Schweißen? */
plExistiert: function (alleAbs, schluessel) {

    return alleAbs.some(a => this.text(a.o.ab_schluessel) === schluessel);
},

/* Häkchen setzen oder entfernen. Gibt false zurück, wenn es den AB nicht
   gibt (beim Entfernen immer erlaubt). Doppelte Einträge (zwei Personen
   haken gleichzeitig) werden beim Entfernen alle ausgeblendet. */
plSetzen: async function (zeilen, schluessel, an, alleAbs) {

    const gleiche = zeilen.filter(z => this.text(z.ab_schluessel) === schluessel);
    const aktive = gleiche.filter(z => !this.istJa(z.archiviert));

    if (!an) {
        for (const z of aktive) await this.datenArchivieren("planungsmarke", z);
        return true;
    }

    if (!this.plExistiert(alleAbs, schluessel)) return false;
    if (aktive.length) return true;

    if (gleiche.length) await this.datenAendern("planungsmarke", gleiche[0], { archiviert: false });
    else await this.datenAnlegen("planungsmarke", { ab_schluessel: schluessel, archiviert: false });

    return true;
},

/* Setzt d.geplant an jedem Eintrag der Liste. */
plMarkieren: function (liste, aktive) {

    liste.forEach(d => { d.geplant = Boolean(aktive[this.text(d.a.o.ab_schluessel)]); });
},

/* Nur die ABs mit Häkchen. */
plGeplante: function (abs, aktive) {

    return abs.filter(a => aktive[this.text(a.o.ab_schluessel)]);
},

/* Planung: vorgemerkte ABs sortiert nach Liefertermin (früheste oben, ohne
   Termin unten, dann AB-Nummer) oder nach Fortschritt. */
plListe: function (abs, termine, suche, kunde, sortierung) {

    const nachProzent = sortierung === "termin" ? "" : sortierung;
    const liste = this.dashSortieren(this.dashFiltern(abs, suche, kunde), nachProzent);
    liste.forEach(d => { d.termin = this.fcTerminVon(d.a, termine); });

    if (sortierung === "termin") {
        const vergleich = (x, y) => (x < y ? -1 : (x > y ? 1 : 0));
        liste.sort((p, q) =>
            vergleich(p.termin === null ? 1 : 0, q.termin === null ? 1 : 0) ||
            vergleich(p.termin === null ? 0 : p.termin, q.termin === null ? 0 : q.termin) ||
            vergleich(this.dashText(p.a.o.ab_anzeige), this.dashText(q.a.o.ab_anzeige)));
    }

    return liste;
},

/* Plätze ohne Doppelte, ohne leere und ohne "(verschieden)", mit Komma. */
plPlaetze: function (namen) {

    const aus = [];

    namen.forEach(n => {
        const t = this.text(n);
        if (t && t !== this.swVerschieden && aus.indexOf(t) < 0) aus.push(t);
    });

    return aus.join(", ");
},

/* Setzt an jedem Eintrag und jeder Gruppe station und ort, an jedem Teil ort.
   Bestandsliste: Lagerort im Regal. Schweißen: Arbeitsplatz. Liegen einzelne
   BGs eines AB im Schweißen (Einzelblöcke), steht beim AB "Kom. + Schw." und
   beides unter Lagerort. einzeln: swEinzelnePlaetze(bloecke). */
plOrteSetzen: function (liste, einzeln) {

    liste.forEach(d => {
        const a = d.a;

        if (a.schweissen) {
            d.station = this.plStationSchweissen;
            d.ort = this.text(a.o.arbeitsplatz);

            d.gruppen.forEach(g => {
                g.station = this.plStationSchweissen;
                g.ort = (g.bg ? this.text(g.bg.o.arbeitsplatz) : "") || d.ort;
                g.teile.forEach(t => { t.ort = this.text(t.o.arbeitsplatz) || g.ort; });
            });
            return;
        }

        const plaetze = einzeln[this.text(a.o.ab_schluessel)];
        d.station = plaetze ? this.plStationBeide : this.plStationBestand;
        d.ort = [this.text(a.o.lagerort), this.plPlaetze(plaetze || [])].filter(Boolean).join(" · ");

        d.gruppen.forEach(g => {
            g.station = this.plStationBestand;
            g.ort = g.bg ? this.text(g.bg.o.lagerort) : "";
            g.teile.forEach(t => { t.ort = this.text(t.o.lagerort); });
        });
    });
},
