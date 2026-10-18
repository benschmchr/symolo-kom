/* ===========================================================================
   ANSICHT: Planung
   Alle ABs, die im Dashboard oder im Forecast ein Häkchen "Planung" haben,
   mit Baugruppen und Teilen. Hier abhaken nimmt den Auftrag aus der Planung.
   Sortieren nach Liefertermin (Standard) oder Fortschritt.
   Rechnen: 4H_planung.js. Zeichnen: 4J_liste.js.

   Rechte fallen vorerst weg (Ben, 16.10.2026): jeder darf haken.
   =========================================================================== */

listeSpalten: [
    ["klapp", ""], ["ab", "Arbeitsauftrag"], ["bg", "Baugruppe"], ["teil", "Einzelteil"], ["kunde", "Kunde"],
    ["station", "Station"], ["lager", "Lagerort"], ["status", "Status"], ["proz", "Fortschritt"], ["balken", ""],
    ["stand", "Stand"], ["termin", "Liefertermin"], ["planung", "Planung"]
],
listeStation: true,
listeSortierungen: null,
sortierung: "termin",

fcDaten: null,
einzelnePlaetze: {},
infoEl: null,

before_set_values: async function (form, { data }) {

    const parent = this.ctrlbyBind("_output").SelfElement;

    this.listeSortierungen = this.plSortierungen;

    /* Erst das Gerüst, dann die Daten (Skill, Vertrag). */
    this.geruestBauen(parent);
    this.el(this.koerper, "p", "kom-label", "Planung");
    this.infoEl = this.el(this.koerper, "p", "kom-klein kom-leise");
    this.listeLeisteBauen(["suche", "knoepfe", "sort", "kunde"]);
    this.meldungEl = this.el(this.koerper, "div", "kom-hinweis");
    this.listeEl = this.el(this.koerper, "div", "kom-liste");
    this.fussKnopf("Neu laden", "Laden", () => this.laden());

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

    const bloecke = sw === null ? [] : this.swBloecke(sw);
    this.einzelnePlaetze = this.swEinzelnePlaetze(bloecke);
    this.imSwJeAb = sw === null ? {} : this.swImSchweissen(sw);
    this.alleAbs = this.fcMitSchweissen(this.abs, this.swForecastAbs(bloecke));

    if (abs !== null && sw !== null && marken !== null && fc !== null) this.statusZeigen("Geladen.");

    this.zeichnen();
},

zeichnen: function () {

    this.infoZeigen();
    this.listeHeute = this.tagHeute();

    const geplant = this.plGeplante(this.alleAbs, this.marken);
    this.listeFelderEinstellen(geplant);

    this.infoEl.textContent = geplant.length + " Arbeitsauftr" + (geplant.length === 1 ? "ag" : "äge") +
        " mit Häkchen im Dashboard oder im Forecast. Hier abhaken nimmt den Auftrag aus der Planung.";

    const termine = this.fcDaten ? this.fcDaten.termine : {};
    const liste = this.plListe(geplant, termine, this.suche, this.kunde, this.sortierung);
    this.dashKlappen(liste, this.ansichtWahl, this.gemerkt);
    this.plMarkieren(liste, this.marken);
    this.plOrteSetzen(liste, this.einzelnePlaetze);

    const gefiltert = Boolean(this.suche) || this.kunde !== this.dashAlleKunden;
    this.listeZeichnen(liste,
        "Noch kein Arbeitsauftrag zur Planung vorgemerkt. Im Dashboard oder im Forecast in der Spalte „Planung“ abhaken.",
        gefiltert);
},
