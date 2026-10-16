/* ===========================================================================
   ANSICHT: Forecast (R-F6 bis R-F10, W11)
   Offene Aufträge nach Liefertermin. Kopf mit vier Kacheln (bis 14 Tage rot,
   15 bis 30 Tage gelb, ohne Termin, Forecast vom), Suche, Liefertermin,
   Knöpfe ABs/BGs/Alles, Kunde und eine Karte je AB in Ampelfarbe.
   Rechnen: 4G_forecast.js, 4H_planung.js. Zeichnen: 4J_liste.js.

   Noch nicht dabei: "Forecast importieren" und "Forecast-Daten ansehen"
   (Phase 7, mit dem Einlesen der Excel-Datei).

   Ohne importierten Forecast hat kein AB einen Termin; die Liste ist dann
   (bei "Alle") nur nach Fortschritt sortiert und der Kopf sagt es.
   =========================================================================== */

listeSpalten: [
    ["klapp", ""], ["ab", "Arbeitsauftrag"], ["bg", "Baugruppe"], ["teil", "Einzelteil"], ["kunde", "Kunde"],
    ["station", "Station"], ["lager", "Lagerort"], ["termin", "Liefertermin"], ["proz", "Fortschritt"],
    ["balken", ""], ["stand", "Stand"], ["planung", "Planung"]
],
listeStation: true,
listeSortierungen: null,
zeitraum: "30",

fcDaten: null,
einzelnePlaetze: {},

before_set_values: async function (form, { data }) {

    const parent = this.ctrlbyBind("_output").SelfElement;

    /* Erst das Gerüst, dann die Daten (Skill, Vertrag). */
    this.geruestBauen(parent);
    this.el(this.koerper, "p", "kom-label", "Forecast");
    this.kopfEl = this.el(this.koerper, "div", "kom-dash-reihe");
    this.listeLeisteBauen(["suche", "termin", "knoepfe", "kunde"]);

    const erklaerung = this.el(this.koerper, "p", "kom-klein kom-leise kom-erklaerung");
    this.el(erklaerung, "i", "kom-punkt kom-punkt-rot");
    this.el(erklaerung, "span", "", "Liefertermin in höchstens 14 Tagen oder überfällig · ");
    this.el(erklaerung, "i", "kom-punkt kom-punkt-gelb");
    this.el(erklaerung, "span", "", "in 15–30 Tagen · Überfällige sind bei 14 und 30 Tagen immer dabei.");

    this.meldungEl = this.el(this.koerper, "div", "kom-hinweis");
    this.listeEl = this.el(this.koerper, "div", "kom-liste");
    this.knopf(this.fuss, "Neu laden", () => this.laden());

    await this.laden();
},

laden: async function () {

    this.datenHinweise = [];
    this.statusZeigen("Lade …");

    const abs = await this.sicher(() => this.bestandLaden());
    const sw = await this.sicher(() => this.swLesen());
    const marken = await this.sicher(() => this.plMarkenLaden());
    const fc = await this.sicher(() => this.fcLaden());

    if (abs !== null) this.abs = abs;
    if (marken !== null) {
        this.markenZeilen = marken;
        this.marken = this.plAktive(marken);
    }
    this.fcDaten = fc;

    /* W11: auch die ganzen ABs im Schweißen */
    const bloecke = sw === null ? [] : this.swBloecke(sw);
    this.einzelnePlaetze = this.swEinzelnePlaetze(bloecke);
    this.alleAbs = this.fcMitSchweissen(this.abs, this.swForecastAbs(bloecke));

    if (abs !== null && sw !== null && marken !== null && fc !== null) {
        this.statusZeigen(this.alleAbs.length + " Arbeitsaufträge geladen.");
    }

    this.zeichnen();
},

zeichnen: function () {

    this.infoZeigen();
    this.listeHeute = this.tagHeute();
    /* Die Kundenliste kommt nur aus der Bestandsliste (wie bisher), gefiltert wird über alle. */
    this.listeFelderEinstellen(this.abs);

    const f = this.fcDaten ? this.fcDaten.f : null;
    const termine = this.fcDaten ? this.fcDaten.termine : {};
    const liste = this.fcListe(this.alleAbs, termine, this.listeHeute, this.zeitraum, this.suche, this.kunde);
    this.dashKlappen(liste, this.ansichtWahl, this.gemerkt);
    this.plMarkieren(liste, this.marken);
    this.plOrteSetzen(liste, this.einzelnePlaetze);

    this.kopfZeichnen(this.fcKopf(liste, f, this.listeHeute), f);

    const gefiltert = Boolean(this.suche) || this.kunde !== this.dashAlleKunden || this.zeitraum !== "alle";
    const tage = this.fcZeitraeume.find(z => z[0] === this.zeitraum);

    this.listeZeichnen(liste, "", gefiltert);

    /* R-F8: Der Satz nennt den Grund, wenn nichts da ist. */
    if (liste.length === 0) {
        this.meldungEl.replaceChildren();
        this.meldungEl.textContent = "Keine offenen Aufträge" +
            (tage && tage[2] !== null ? " mit Liefertermin in den nächsten " + tage[2] + " Tagen" : "") +
            (this.suche ? " für „" + this.suche + "“" : "") + ". ";
        if (gefiltert) this.knopf(this.meldungEl, "Alle zeigen", () => this.alleZeigen());
    }
},

/* R-F10: Zähler über die angezeigten ABs, "Forecast vom" orange, wenn älter als 8 Tage. */
kopfZeichnen: function (k, f) {

    this.kopfEl.replaceChildren();

    const kachel = (klasse, titel, zahl, klein) => {
        const x = this.el(this.kopfEl, "div", "kom-kachel " + klasse);
        this.el(x, "span", "kom-label", titel);
        this.el(x, "span", "kom-zahl-gross", String(zahl));
        this.el(x, "span", "kom-klein", klein);
        return x;
    };

    kachel("kom-kachel-rot", "Bis 14 Tage", k.rot, "rot, auch überfällige");
    kachel("kom-kachel-gelb", "15–30 Tage", k.gelb, "gelb");
    kachel("", "Ohne Termin", k.ohne, "nur bei Liefertermin „Alle“").classList.add("kom-leise-kachel");

    const vom = kachel(k.alt ? "kom-kachel-alt" : "", "Forecast vom", k.vom === null ? "–" : this.tagText(k.vom), "");
    const klein = vom.lastChild;
    if (f) {
        const teile = [f.datei, "Blatt „" + this.text(f.blatt) + "“"];
        if (this.text(f.stand)) teile.push(this.text(f.stand));
        klein.textContent = (k.alt ? "Älter als 8 Tage, bitte neu importieren. " : "") + teile.map(t => this.text(t)).join(" · ");
    } else {
        klein.textContent = "Noch kein Forecast importiert (macht der Stahlbau).";
    }
},
