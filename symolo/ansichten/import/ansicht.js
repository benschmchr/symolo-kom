/* ===========================================================================
   ANSICHT: Kommissionierlisten importieren (R-I1 bis R-I10)
   Schritt 1: Dateien hineinziehen oder auswählen. Schritt 2: Vorschau mit den
   Fragen "ersetzen?" (R-I8) und "trotzdem, obwohl im Schweißen?" (R-I10).
   Schritt 3: Meldung (R-I9) und Sprung zur Bestandsliste.
   Lesen: 4P_excel.js, 4Q_import_lesen.js. Speichern: 4S_import_speichern.js.
   Recht: kom.edit.canimportkomlisten (50_benutzer.js).
   =========================================================================== */

gewaehlt: [],
vorschau: [],
wahl: {},
laeuft: false,
inhalt: null,
pruefenKnopf: null,
importKnopf: null,

before_set_values: async function (form, { data }) {

    const parent = this.ctrlbyBind("_output").SelfElement;

    /* Erst das Gerüst, dann die Daten (Skill, Vertrag). */
    this.geruestBauen(parent);
    this.infoZeigen();
    this.knopf(this.fuss, "← Bestandsliste", () => this.bereichOeffnen("bestandsliste"));

    this.inhalt = this.el(this.koerper, "div", "kom-zusammen");

    if (!this.darf(this.rechte.importKomlisten)) {
        this.el(this.inhalt, "div", "kom-hinweis", this.rechtFehlt());
        return;
    }

    this.schritt1();
},

schritt1: function () {

    this.inhalt.replaceChildren();
    this.gewaehlt = [];

    this.el(this.inhalt, "p", "kom-leise", "Eine oder mehrere Kommissionierlisten hochladen. Im nächsten Schritt siehst du, " +
        "was übernommen wird, und entscheidest, ob schon vorhandene ABs ersetzt werden.");

    this.ablageBauen(this.inhalt, true, "Dateien hierher ziehen",
        "oder auswählen · eine oder mehrere Kommissionierlisten (.xlsx, .xlsm), bis " + this.impMaxDateien + " auf einmal",
        liste => {
            this.gewaehlt = liste;
            this.pruefenKnopf.disabled = liste.length === 0;
        });

    this.el(this.inhalt, "p", "kom-leise kom-klein", "Die Dateien werden nur gelesen, Makros werden nie ausgeführt.");

    const zeile = this.el(this.inhalt, "div", "kom-knopfzeile");
    this.pruefenKnopf = this.knopf(zeile, "Prüfen →", () => this.pruefen(), "haupt");
    this.pruefenKnopf.disabled = true;
    this.knopf(zeile, "Abbrechen", () => this.bereichOeffnen("bestandsliste"));
},

/* Dateien lesen; was nicht lesbar ist, wird mit dem Grund aufgelistet (R-I1 bis R-I3). */
pruefen: async function () {

    if (this.laeuft || this.gewaehlt.length === 0) return;
    this.laeuft = true;
    this.pruefenKnopf.disabled = true;
    this.statusZeigen("Lese die Dateien …");

    const gelesen = [], fehler = [];
    const dateien = this.gewaehlt.slice(0, this.impMaxDateien);

    for (const f of dateien) {
        try {
            const bytes = await this.dateiBytes(f, this.impMaxGroesse / (1024 * 1024));
            gelesen.push(await this.impLesen(bytes, f.name));
        } catch (fehlerObjekt) {
            console.warn("import:", fehlerObjekt);
            fehler.push([f.name, fehlerObjekt && fehlerObjekt.message ? fehlerObjekt.message : "Die Datei kann nicht gelesen werden."]);
        }
    }

    const vorschau = await this.sicher(() => this.impVorschau(gelesen));
    this.laeuft = false;

    if (vorschau === null) {
        this.pruefenKnopf.disabled = false;
        return;
    }

    this.statusZeigen(dateien.length + (dateien.length === 1 ? " Datei gelesen." : " Dateien gelesen."));
    this.schritt2(vorschau, fehler);
},

schritt2: function (vorschau, fehler) {

    this.vorschau = vorschau;
    this.wahl = {};
    vorschau.forEach(z => { this.wahl[z.nr] = { ab: "", ersetzen: false, schweissen: false }; });

    this.inhalt.replaceChildren();
    this.el(this.inhalt, "p", "", "Bitte prüfen. Übernommen wird erst mit „Importieren“.");

    if (fehler.length) {
        const box = this.el(this.inhalt, "div", "kom-hinweis");
        this.el(box, "strong", "", "Nicht lesbar:");
        const liste = this.el(box, "ul");
        fehler.forEach(([name, text]) => this.el(liste, "li", "", name + ": " + text));
    }

    if (vorschau.length) {
        const rahmen = this.el(this.inhalt, "div", "kom-rahmen");
        const tab = this.el(rahmen, "table", "kom-tabelle kom-import-tabelle");
        const kopf = this.el(this.el(tab, "thead"), "tr");
        [["Datei", ""], ["AB", ""], ["Kunde · Verkaufsartikel", ""], ["Baugruppen", "kom-zahl"], ["Teile", "kom-zahl"], ["Was passiert", ""]]
            .forEach(([t, k]) => this.el(kopf, "th", k, t));

        const koerper = this.el(tab, "tbody");
        vorschau.forEach(z => this.vorschauZeile(koerper, z));
    }

    const zeile = this.el(this.inhalt, "div", "kom-knopfzeile");
    if (vorschau.length) {
        this.importKnopf = this.knopf(zeile, "Importieren →", () => this.ausfuehren(), "haupt");
    }
    this.knopf(zeile, "Andere Dateien wählen", () => this.schritt1());
},

vorschauZeile: function (koerper, z) {

    const g = z.g;
    const ab = this.impAb(g);
    const tr = this.el(koerper, "tr");

    this.el(tr, "td", "", g.datei);

    const abZelle = this.el(tr, "td");
    if (ab) {
        this.el(abZelle, "strong", "", ab);
        const haupt = this.text(g.kopf.haupt_ab);
        if (haupt && haupt !== "-") {
            this.el(this.el(abZelle, "div"), "span", "kom-leise kom-klein", "Haupt-AB " + haupt);
        }
    } else {
        this.el(abZelle, "div", "kom-klein", "Fertigungs-AB fehlt in der Datei, bitte eintragen:");
        const eingabe = this.el(abZelle, "input", "kom-eingabe");
        eingabe.type = "text";
        eingabe.placeholder = "z. B. AB2616200 L1";
        eingabe.setAttribute("aria-label", "Fertigungs-AB für " + g.datei);
        eingabe.oninput = () => { this.wahl[z.nr].ab = eingabe.value; };
    }

    this.el(tr, "td", "", (this.text(g.kopf.kunde) || "–") + " · " + (this.text(g.kopf.verkaufsartikel) || "–"));
    this.el(tr, "td", "kom-zahl", this.impAnzBg(g));
    this.el(tr, "td", "kom-zahl", this.impAnzTeile(g));

    const was = this.el(tr, "td");

    if (z.doppelt) {
        this.el(was, "span", "kom-leise", "Kommt weiter unten noch einmal vor, die letzte Datei gilt.");
    } else if (z.alt) {
        this.el(was, "strong", "", this.text(z.alt.ab_anzeige) + " ist schon in der Bestandsliste.");
        this.wahlBauen(was, "komImErsetzen" + z.nr, [
            [true, "Ersetzen (erfasste Mengen, Lagerort und Daten der Teile werden übernommen)", false],
            [false, "Nicht importieren", true]
        ], wert => { this.wahl[z.nr].ersetzen = wert; });
        this.el(was, "span", "kom-leise kom-klein", "Hinweis: Der Lagerort am AB und an den Baugruppen geht beim Ersetzen verloren (wie in Excel).");
    } else {
        this.el(was, "span", "", "Neu");
    }

    if (z.imSchweissen) {
        const box = this.el(was, "div");
        this.el(box, "strong", "", "Dieser AB liegt schon im Bereich Schweißen.");
        this.wahlBauen(box, "komImSchweissen" + z.nr, [
            [true, "Trotzdem in die Bestandsliste importieren", false],
            [false, "Nicht importieren", true]
        ], wert => { this.wahl[z.nr].schweissen = wert; });
    }

    g.hinweise.forEach(h => this.el(was, "div", "kom-klein kom-leise", h));
},

ausfuehren: async function () {

    if (this.laeuft) return;
    this.laeuft = true;
    this.importKnopf.disabled = true;

    const erg = await this.sicher(() => this.impAusfuehren(this.vorschau, this.wahl, undefined, t => this.statusZeigen(t)));
    this.laeuft = false;

    if (erg === null) {
        /* Mittendrin abgebrochen: nichts fehlt, höchstens steht etwas doppelt da (4S). */
        this.el(this.inhalt, "div", "kom-hinweis",
            "Der Import wurde unterbrochen. Bitte prüfe die Bestandsliste und importiere die Datei noch einmal.");
        this.importKnopf.disabled = false;
        return;
    }

    this.fertig(erg);
},

/* R-I9 */
fertig: function (erg) {

    this.inhalt.replaceChildren();
    this.el(this.inhalt, "div", "kom-hinweis", erg.meldung);

    const zeile = this.el(this.inhalt, "div", "kom-knopfzeile");
    const suche = erg.zuletzt ? this.text(erg.zuletzt.ab_anzeige) : "";
    this.knopf(zeile, "Zur Bestandsliste", () => this.bereichOeffnen("bestandsliste", suche ? { suche: suche } : {}), "haupt");
    this.knopf(zeile, "Weitere Dateien importieren", () => this.schritt1());
    this.statusZeigen(erg.meldung);
},
