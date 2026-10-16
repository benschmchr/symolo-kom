/* ===========================================================================
   ANSICHT: Dashboard (R-DB1 bis R-DB6)
   Kopf mit Kacheln (Komplett, Teilweise, Offen, Aufträge, Forecast), Suche,
   Knöpfe ABs/BGs/Alles, Sortieren, Kunde und eine Karte je AB mit
   Baugruppen und Teilen. Neu in Phase 5: Spalte "Planung" (Häkchen) und die
   Kachel Forecast. Sortierung, Filter und Klappen rechnet 4A_dashboard.js,
   gezeichnet wird die Liste in 4J_liste.js.

   Noch nicht dabei: die Zeilen "Befinden sich im Schweißen" (Phase 6).

   Die Kachel Forecast zählt die roten und gelben offenen ABs (auch die ganz
   im Schweißen, W11). Fehlt der Forecast oder lässt er sich nicht laden,
   steht dort ein Strich.
   =========================================================================== */

listeSpalten: [
    ["klapp", ""], ["ab", "Arbeitsauftrag"], ["bg", "Baugruppe"], ["teil", "Einzelteil"], ["kunde", "Kunde"],
    ["lager", "Lagerort"], ["status", "Status"], ["proz", "Fortschritt"], ["balken", ""], ["stand", "Stand"],
    ["planung", "Planung"]
],
listeSortierungen: [["ab", "Absteigend"], ["auf", "Aufsteigend"]],

fcDaten: null,
swAbsListe: [],

before_set_values: async function (form, { data }) {

    const parent = this.ctrlbyBind("_output").SelfElement;

    /* Erst das Gerüst, dann die Daten (Skill, Vertrag). */
    this.geruestBauen(parent);
    this.el(this.koerper, "p", "kom-label", "Dashboard");
    this.kopfEl = this.el(this.koerper, "div", "kom-dash-reihe");
    this.listeLeisteBauen(["suche", "knoepfe", "sort", "kunde"]);
    this.meldungEl = this.el(this.koerper, "div", "kom-hinweis");
    this.listeEl = this.el(this.koerper, "div", "kom-liste");
    this.knopf(this.fuss, "Neu laden", () => this.laden());

    await this.laden();
},

laden: async function () {

    this.datenHinweise = [];
    this.statusZeigen("Lade …");

    const abs = await this.sicher(() => this.bestandLaden());
    if (abs !== null) this.abs = abs;

    /* Häkchen, Forecast und Schweißen: gehört dazu, aber das Dashboard geht auch ohne. */
    const marken = await this.sicher(() => this.plMarkenLaden());
    if (marken !== null) {
        this.markenZeilen = marken;
        this.marken = this.plAktive(marken);
    }

    this.fcDaten = await this.sicher(() => this.fcLaden());

    const sw = await this.sicher(() => this.swLesen());
    this.swAbsListe = sw === null ? [] : this.swForecastAbs(this.swBloecke(sw));

    this.alleAbs = this.fcMitSchweissen(this.abs, this.swAbsListe);

    if (abs !== null && marken !== null && this.fcDaten !== null && sw !== null) {
        this.statusZeigen(abs.length + " Arbeitsaufträge geladen.");
    }

    this.zeichnen();
},

/* ---------------------------------------------------------------------------
   Zeichnen: aus dem Zustand, nie aus den Rohdaten (Skill, Ablauf 6)
   --------------------------------------------------------------------------- */

zeichnen: function () {

    this.infoZeigen();
    this.listeHeute = this.tagHeute();
    this.listeFelderEinstellen(this.abs);
    this.kopfZeichnen();

    const gefiltert = Boolean(this.suche) || this.kunde !== this.dashAlleKunden;
    const liste = this.dashSortieren(this.dashFiltern(this.abs, this.suche, this.kunde), this.sortierung);
    this.dashKlappen(liste, this.ansichtWahl, this.gemerkt);
    this.plMarkieren(liste, this.marken);

    this.listeZeichnen(liste, "Noch keine Arbeitsaufträge in der Bestandsliste. Entweder ist die Liste leer oder sie konnte nicht gelesen werden (siehe Meldung unten).", gefiltert);
},

/* R-DB5: Kacheln in einer Reihe, zählen immer alle ABs. */
kopfZeichnen: function () {

    const k = this.dashKopf(this.abs);
    this.kopfEl.replaceChildren();

    const kachel = (titel, zahl, anteil, art) => {
        const x = this.el(this.kopfEl, "div", "kom-kachel");
        this.el(x, "span", "kom-label", titel);
        this.el(x, "span", "kom-zahl-gross", String(zahl));
        const balken = this.el(x, "span", "kom-kachel-balken " + art);
        balken.title = anteil + " % der Aufträge";
        this.el(balken, "span").style.width = anteil + "%";
    };

    kachel("Komplett", k.komplett, k.komplett_anteil, "kom-komplett");
    kachel("Teilweise", k.teilweise, k.teilweise_anteil, "kom-teilweise");
    kachel("Offen", k.offen, k.offen_anteil, "kom-offen");

    this.fcKachelZeichnen();

    const akzent = this.el(this.kopfEl, "div", "kom-kachel kom-kachel-akzent");
    this.el(akzent, "span", "kom-label", "Aufträge");
    this.el(akzent, "span", "kom-zahl-gross", String(k.ab));
    this.el(akzent, "span", "kom-label", "Gesamtfortschritt");
    this.el(akzent, "span", "kom-zahl-mittel", k.gesamt_txt);
    const balken = this.el(akzent, "span", "kom-kachel-balken kom-hell");
    balken.title = k.gesamt_txt;
    this.el(balken, "span").style.width = Math.round(k.gesamt * 100) + "%";
},

/* Kachel Forecast: rote und gelbe ABs, "vom" = Tag des Imports. */
fcKachelZeichnen: function () {

    const x = this.el(this.kopfEl, "div", "kom-kachel");
    this.el(x, "span", "kom-label", "Forecast");

    const fc = this.fcDaten;
    const kachel = fc && fc.f ? this.fcKachel(this.alleAbs, fc.f, fc.termine, this.listeHeute) : null;

    if (!kachel) {
        this.el(x, "span", "kom-zahl-gross", "–");
        this.el(x, "span", "kom-leise", fc === null ? "Forecast konnte nicht geladen werden" : "Noch kein Forecast importiert");
        return;
    }

    const zahl = this.el(x, "span", "kom-zahl-gross");
    this.el(zahl, "span", "", String(kachel.rot));
    this.el(zahl, "span", "kom-klein kom-leise", " rot · ");
    this.el(zahl, "span", "", String(kachel.gelb));
    this.el(zahl, "span", "kom-klein kom-leise", " gelb");

    const punkte = this.el(x, "span", "kom-klein kom-leise");
    this.el(punkte, "i", "kom-punkt kom-punkt-rot");
    this.el(punkte, "span", "", "bis 14 Tage · ");
    this.el(punkte, "i", "kom-punkt kom-punkt-gelb");
    this.el(punkte, "span", "", "15–30 Tage · vom " + this.tagText(kachel.vom).slice(0, 6));
},
