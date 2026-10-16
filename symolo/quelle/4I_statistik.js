/* ===========================================================================
   STATISTIK: Liefertreue, Durchlaufzeit, überfällige ABs, Verspätung
   Nachbau von bestand/statistik.py.

   Grundlage sind die Termine aus dem Schweißen und dem Archiv (archivierte
   ABs aus dem Schweißen zählen mit, sonst gingen frühere Monate verloren):
     Liefertermin     = "Liefertermin Stahlbau" (liefertermin_stahlbau)
     Versand          = "Termin Versand" (termin_versand)
     pünktlich        = Versand am Liefertermin oder davor
     gezählt          = hat einen Versand, oder der Liefertermin liegt vor heute
                        (ohne Versand = nicht pünktlich); liegt der Liefertermin
                        heute oder später und es gibt noch keinen Versand, zählt
                        der Eintrag noch nicht
     Liefertreue in % = pünktliche geteilt durch gezählte (ganze Zahl)
     Durchlaufzeit    = Versand minus Eingelagert in Tagen (Spalte DLZ im
                        Schweißen), nach dem Versanddatum eingeordnet
   "AB" ist eine AB-Zeile (oder ein Einzelblock aus einer BG), "Bauteil" jede
   Teil-Zeile. Sind die Termine der BGs eines AB verschieden, gilt der früheste
   Liefertermin, und der Versand zählt erst, wenn alle BGs einen haben (dann
   der späteste).

   Ein Eintrag: { art: "ab" | "teil", anzeige, lt, tv, eingelagert, platz,
   mitarbeiter, kunde, archiviert } mit Terminen als Tageszahl (4E_termine.js).

   Archivierte ABs aus der Bestandsliste haben keine Termine und zählen nicht.
   OFFEN (Symolo): Wurde ein AB aus dem Schweißen archiviert, zurückgeholt und
   wieder archiviert, hat er zwei Gruppen mit demselben AB-Schlüssel. Hier
   werden sie zusammen gezählt (die Zeilen tragen keine Archiv-Nummer).
   =========================================================================== */

/* Soll der Liefertreue in % (Linie im Diagramm); ab 70 "leicht darunter" (gelb), darunter rot */
statSoll: 80,
statGelbAb: 70,
statWas: [["abs", "ABs"], ["teile", "Alle Bauteile"]],
statWasStandard: "abs",
statZeiten: [["woche", "Woche"], ["monat", "Monat"], ["jahr", "Jahr"]],
statZeitStandard: "monat",

statDlz: function (e) {

    return e.tv !== null && e.eingelagert !== null ? e.tv - e.eingelagert : null;
},

/* Liefertermin und Versand eines AB: eigener Wert, sonst aus den BGs (siehe Kopf). */
statAbTermine: function (lt, tv, bgLt, bgTv) {

    if (lt === null && bgLt.length) lt = Math.min(...bgLt);
    if (tv === null && bgTv.length && bgTv.every(x => x !== null)) tv = Math.max(...bgTv);
    return [lt, tv];
},

/* Einträge aus den berechneten Zeilen im Schweißen (swLesen). */
statAusSchweissen: function (zeilen) {

    const ergebnis = [];

    this.swBloecke(zeilen).forEach(b => {
        const kopf = this.swKopf(b);
        const bgs = b.bgs.map(g => g.bg);
        let lt, tv;

        if (b.ab !== null) {
            [lt, tv] = this.statAbTermine(
                this.tagNr(b.ab.lt), this.tagNr(b.ab.tv),
                bgs.map(x => this.tagNr(x.lt)).filter(x => x !== null),
                bgs.map(x => this.tagNr(x.tv)));
        } else {
            lt = this.tagNr(kopf.lt);
            tv = this.tagNr(kopf.tv);
        }

        ergebnis.push({
            art: "ab",
            anzeige: this.text(kopf.anzeige),
            lt: lt,
            tv: tv,
            eingelagert: this.tagNr(kopf.eingelagert),
            platz: kopf.p === this.swVerschieden ? "" : this.text(kopf.p),
            mitarbeiter: kopf.m === this.swVerschieden ? "" : this.text(kopf.m),
            kunde: this.text(kopf.kopfObj.kunde),
            archiviert: false
        });

        this.swBlockZeilen(b).forEach(z => {
            if (z.ebene !== "Teil") return;
            ergebnis.push({
                art: "teil", anzeige: this.text(z.anzeige), lt: this.tagNr(z.lt), tv: this.tagNr(z.tv),
                eingelagert: this.tagNr(z.eingelagert), platz: "", mitarbeiter: "", kunde: "", archiviert: false
            });
        });
    });

    return ergebnis;
},

/* Einträge aus den archivierten Zeilen (Schweißen, archiviert = ja). Nur
   Zeilen mit AB-Ebene oder mit einem Termin zählen. */
statAusArchiv: function (zeilen) {

    const je = {};

    zeilen.forEach(z => {
        const lt = this.tagNr(z.liefertermin_stahlbau), tv = this.tagNr(z.termin_versand);
        if (this.text(z.ebene) !== "AB" && lt === null && tv === null) return;

        const s = this.text(z.ab_schluessel);
        (je[s] = je[s] || []).push({
            ebene: this.text(z.ebene), ab: this.text(z.ab_nr), lt: lt, tv: tv, eingelagert: this.tagNr(z.eingelagert),
            nr: this.mengeMilli(z.nr)
        });
    });

    const ergebnis = [];

    Object.keys(je).forEach(s => {
        const rows = je[s].sort((a, b) => a.nr - b.nr);
        const abZeile = rows.find(r => r.ebene === "AB") || null;
        const bgs = rows.filter(r => r.ebene === "BG");

        const [lt, tv] = this.statAbTermine(
            abZeile ? abZeile.lt : null, abZeile ? abZeile.tv : null,
            bgs.map(r => r.lt).filter(x => x !== null), bgs.map(r => r.tv));

        if (lt !== null || tv !== null) {
            ergebnis.push({
                art: "ab", anzeige: (abZeile || rows[0]).ab, lt: lt, tv: tv,
                eingelagert: abZeile ? abZeile.eingelagert : null, platz: "", mitarbeiter: "", kunde: "", archiviert: true
            });
        }

        rows.forEach(r => {
            if (r.ebene === "Teil" && (r.lt !== null || r.tv !== null)) {
                ergebnis.push({
                    art: "teil", anzeige: r.ab, lt: r.lt, tv: r.tv, eingelagert: r.eingelagert, platz: "",
                    mitarbeiter: "", kunde: "", archiviert: true
                });
            }
        });
    });

    return ergebnis;
},

/* Alle Einträge laden: die Zeilen im Schweißen und die archivierten (nur
   die Spalten, die gebraucht werden). */
statLaden: async function () {

    const live = await this.swLesen();
    const archiv = await this.datenLesen("schweisszeile", {
        aufloesen: false, archiv: "nur",
        felder: ["nr", "ab_nr", "ab_schluessel", "ebene", "eingelagert", "liefertermin_stahlbau", "termin_versand", "zurueckgeholt"]
    });

    /* Zeilen, die zurück in die Bestandsliste geholt wurden, zählen nicht als archiviert. */
    return this.statAusSchweissen(live).concat(this.statAusArchiv(archiv.filter(z => !this.istJa(z.zurueckgeholt))));
},

/* ---------- Rechnen ---------- */

statBalken: function (label, wert, text, hoehe, farbe, n, titel) {

    return { label: label, wert: wert, text: text, hoehe: hoehe, farbe: farbe, n: n, titel: titel };
},

/* Je Zeitraum: Anteil pünktlich versandter Einträge, deren Liefertermin in
   diesem Zeitraum liegt. schluessel() macht aus einem Zeitraum oder aus einer
   Tageszahl denselben Text, damit man beides vergleichen kann. */
statLiefertreue: function (eintraege, art, zeitraeume, schluessel, label, heute) {

    const zaehler = {};
    zeitraeume.forEach(z => { zaehler[schluessel(z)] = [0, 0]; });

    eintraege.forEach(e => {
        if (e.art !== art || e.lt === null) return;

        const z = schluessel(e.lt);
        if (!(z in zaehler) || (e.tv === null && e.lt >= heute)) return;

        zaehler[z][0]++;
        if (e.tv !== null && e.tv <= e.lt) zaehler[z][1]++;
    });

    return zeitraeume.map(z => {
        const [n, p] = zaehler[schluessel(z)];
        const l = label(z);

        if (n === 0) return this.statBalken(l, null, "–", 0, "neutral", 0, l + ": keine Liefertermine");

        const pct = this.rundenGerade(p / n * 100);
        const farbe = pct >= this.statSoll ? "gruen" : (pct >= this.statGelbAb ? "gelb" : "rot");
        return this.statBalken(l, pct, pct + " %", pct, farbe, n, l + ": " + p + " von " + n + " pünktlich");
    });
},

/* Fünf Balken: die letzten vier Kalenderwochen und die aktuelle. */
statLiefertreueMonat: function (eintraege, art, heute) {

    /* Zeitraum = [Jahr, Woche]; Tage werden über ihre Woche zugeordnet. */
    const kws = this.letzteKws(heute, 5);
    const schl = x => (Array.isArray(x) ? x.join("-") : this.tagKw(x).join("-"));
    return this.statLiefertreue(eintraege, art, kws, schl, z => "KW " + z[1], heute);
},

/* Zwölf Balken: die letzten zwölf Monate bis einschließlich des aktuellen. */
statLiefertreueIa: function (eintraege, art, heute) {

    const monate = this.letzteMonate(heute, 12);
    const schl = x => (Array.isArray(x) ? x.join("-") : this.tagTeile(x).slice(0, 2).join("-"));
    return this.statLiefertreue(eintraege, art, monate, schl,
        z => this.monatsNamen[z[1] - 1] + " " + String(z[0]).slice(2), heute);
},

/* Mittelwert je Zeitraum; Balkenhöhe relativ zum größten Wert.
   werte: { Schlüssel: [Zahlen] } */
statDurchschnitt: function (werte, zeitraeume, schluessel, label, einheit, farbe) {

    const mittel = zeitraeume.map(z => {
        const w = werte[schluessel(z)] || [];
        return w.length ? w.reduce((a, b) => a + b, 0) / w.length : null;
    });
    const groesst = Math.max(0, ...mittel.filter(m => m !== null && m > 0));

    return zeitraeume.map((z, i) => {
        const m = mittel[i], n = (werte[schluessel(z)] || []).length, l = label(z);

        if (m === null) return this.statBalken(l, null, "–", 0, "neutral", 0, l + ": keine Daten");

        const h = groesst ? this.rundenGerade(Math.max(m, 0) / groesst * 100) : 0;
        return this.statBalken(l, m, this.zahlEins(m), Math.max(h, 2), farbe || "neutral", n,
            l + ": Ø " + this.zahlEins(m) + " " + einheit + " bei " + n + " AB" + (n !== 1 ? "s" : ""));
    });
},

/* Ø Durchlaufzeit der ABs (Versand minus Eingelagert), nach Versanddatum:
   Woche = letzte 7 Tage (je Tag), Monat = letzte 4 Kalenderwochen, Jahr = letzte 12 Monate. */
statDurchlaufzeit: function (eintraege, zeit, heute) {

    const abs = eintraege.filter(e => e.art === "ab" && this.statDlz(e) !== null);
    const sammeln = schluessel => {
        const je = {};
        abs.forEach(e => { (je[schluessel(e.tv)] = je[schluessel(e.tv)] || []).push(this.statDlz(e)); });
        return je;
    };

    if (zeit === "woche") {
        const tage = [];
        for (let i = 6; i >= 0; i--) tage.push(heute - i);
        const schl = x => String(x);
        return this.statDurchschnitt(sammeln(schl), tage, schl,
            t => this.tagesNamen[this.tagWochentag(t)] + " " + this.tagKurz(t), "Tage");
    }

    if (zeit === "jahr") {
        const schl = x => (Array.isArray(x) ? x.join("-") : this.tagTeile(x).slice(0, 2).join("-"));
        return this.statDurchschnitt(sammeln(schl), this.letzteMonate(heute, 12), schl,
            z => this.monatsNamen[z[1] - 1] + " " + String(z[0]).slice(2), "Tage");
    }

    const schl = x => (Array.isArray(x) ? x.join("-") : this.tagKw(x).join("-"));
    return this.statDurchschnitt(sammeln(schl), this.letzteKws(heute, 4), schl, z => "KW " + z[1], "Tage");
},

/* ABs im Schweißen, deren Liefertermin vorbei ist und die noch keinen
   Versand haben, älteste zuerst. */
statUeberfaellig: function (eintraege, heute) {

    return eintraege.filter(e => e.art === "ab" && !e.archiviert && e.lt !== null && e.tv === null && e.lt < heute)
        .sort((a, b) => (a.lt - b.lt) || (this.text(a.anzeige) < this.text(b.anzeige) ? -1 : (this.text(a.anzeige) > this.text(b.anzeige) ? 1 : 0)));
},

/* Ø Verspätung der zu spät versandten ABs je Monat (Versand nach Liefertermin),
   letzte 12 Monate, dazu die Summe: { balken, summe: { versandt, spaet, mittel } } */
statVerspaetung: function (eintraege, heute) {

    const monate = this.letzteMonate(heute, 12);
    const schl = x => (Array.isArray(x) ? x.join("-") : this.tagTeile(x).slice(0, 2).join("-"));
    const je = {};
    monate.forEach(m => { je[schl(m)] = []; });
    let versandt = 0, spaet = 0;

    eintraege.forEach(e => {
        if (e.art !== "ab" || e.lt === null || e.tv === null || !(schl(e.tv) in je)) return;

        versandt++;
        if (e.tv > e.lt) {
            spaet++;
            je[schl(e.tv)].push(e.tv - e.lt);
        }
    });

    const alle = [].concat(...Object.values(je));
    const summe = { versandt: versandt, spaet: spaet, mittel: alle.length ? this.zahlEins(alle.reduce((a, b) => a + b, 0) / alle.length) : "–" };

    return {
        balken: this.statDurchschnitt(je, monate, schl, z => this.monatsNamen[z[1] - 1] + " " + String(z[0]).slice(2), "Tage", "neutral"),
        summe: summe
    };
},
