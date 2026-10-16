/* ===========================================================================
   ANSICHT: Statistik
   Liefertreue (Monat = letzte fünf Kalenderwochen, IA = letzte zwölf Monate),
   durchschnittliche Durchlaufzeit, Verspätung und überfällige ABs.
   Grundlage: "Liefertermin Stahlbau" und "Termin Versand" aus dem Schweißen;
   archivierte ABs zählen mit. Rechnen: 4I_statistik.js. Nur ansehen.

   Die Diagramme sind Balken aus Elementen (kein Canvas, keine Bibliothek).
   =========================================================================== */

was: "abs",
zeit: "monat",
eintraege: [],
inhaltEl: null,
infoEl: null,
wasKnoepfe: {},
zeitKnoepfe: {},

before_set_values: async function (form, { data }) {

    const parent = this.ctrlbyBind("_output").SelfElement;

    /* Erst das Gerüst, dann die Daten (Skill, Vertrag). */
    this.geruestBauen(parent);
    this.el(this.koerper, "p", "kom-label", "Statistik");
    this.el(this.koerper, "h3", "kom-st-titel", "Liefertreue und Durchlaufzeit");
    this.infoEl = this.el(this.koerper, "p", "kom-klein kom-leise");

    const leiste = this.el(this.koerper, "div", "kom-leiste");
    const gruppe = this.el(leiste, "div", "kom-knopfgruppe");
    this.statWas.forEach(([wert, titel]) => {
        this.wasKnoepfe[wert] = this.knopf(gruppe, titel, () => { this.was = wert; this.zeichnen(); });
    });
    this.el(leiste, "span", "kom-klein kom-leise", "gilt für beide Liefertreue-Kacheln");

    this.inhaltEl = this.el(this.koerper, "div", "kom-st-gitter");
    this.knopf(this.fuss, "Neu laden", () => this.laden());

    await this.laden();
},

laden: async function () {

    this.datenHinweise = [];
    this.statusZeigen("Lade …");

    const e = await this.sicher(() => this.statLaden());
    if (e !== null) {
        this.eintraege = e;
        this.statusZeigen("Geladen.");
    }

    this.zeichnen();
},

zeichnen: function () {

    this.infoZeigen();
    const heute = this.tagHeute();
    const art = this.was === "abs" ? "ab" : "teil";
    const wer = this.was === "abs" ? "der ABs" : "aller Bauteile";

    this.infoEl.textContent = "Grundlage: „Liefertermin Stahlbau“ und „Termin Versand“ aus dem Schweißen, archivierte ABs zählen mit. Stand: " +
        this.tagText(heute) + ".";

    Object.keys(this.wasKnoepfe).forEach(w => this.wasKnoepfe[w].classList.toggle("kom-gewaehlt", w === this.was));
    this.inhaltEl.replaceChildren();

    const e = this.eintraege;
    const kachel = (titel, breit) => {
        const x = this.el(this.inhaltEl, "section", "kom-kachel" + (breit ? " kom-st-breit" : ""));
        this.el(x, "h4", "kom-label", titel);
        return x;
    };

    let x = kachel("Liefertreue Monat");
    this.el(x, "p", "kom-klein kom-leise",
        "Letzte und aktuelle KW: Anteil " + wer + ", die am Liefertermin oder davor versendet wurden.");
    this.diagrammBauen(x, this.statLiefertreueMonat(e, art, heute), this.statSoll, "", "Liefertreue Monat");

    x = kachel("Liefertreue IA");
    this.el(x, "p", "kom-klein kom-leise",
        "Letzte zwölf Monate: Anteil " + wer + ", die am Liefertermin oder davor versendet wurden.");
    this.diagrammBauen(x, this.statLiefertreueIa(e, art, heute), this.statSoll, "", "Liefertreue IA");

    x = kachel("Durchschnittliche Durchlaufzeit");
    const knoepfe = this.el(x, "div", "kom-knopfgruppe");
    this.statZeiten.forEach(([wert, titel]) => {
        const b = this.knopf(knoepfe, titel, () => { this.zeit = wert; this.zeichnen(); });
        b.classList.toggle("kom-gewaehlt", wert === this.zeit);
    });
    const zeitraum = { woche: "Letzte 7 Tage.", jahr: "Letzte 12 Monate.", monat: "Letzte 4 Kalenderwochen." }[this.zeit];
    this.el(x, "p", "kom-klein kom-leise",
        "Ø Tage von „Eingelagert“ bis „Termin Versand“ je AB, nach dem Versanddatum eingeordnet. " + zeitraum);
    this.diagrammBauen(x, this.statDurchlaufzeit(e, this.zeit, heute), null, "Tage", "Durchschnittliche Durchlaufzeit");

    const v = this.statVerspaetung(e, heute);
    let satz = "Von " + v.summe.versandt + " versendeten ABs mit Termin waren " + v.summe.spaet + " zu spät, im Schnitt um " + v.summe.mittel + " Tage.";
    if (!v.summe.versandt) satz = "Noch kein AB mit Termin versendet.";
    else if (!v.summe.spaet) satz = "Von " + v.summe.versandt + " versendeten ABs mit Termin war keiner zu spät.";
    x = kachel("Verspätung");
    this.el(x, "p", "kom-klein kom-leise", "Ø Tage Verspätung der zu spät versendeten ABs, nach Versandmonat (letzte 12 Monate). " + satz);
    this.diagrammBauen(x, v.balken, null, "Tage", "Verspätung");

    /* Überfällige ABs: Liefertermin vorbei, noch kein Versand */
    x = kachel("Überfällige ABs", true);
    const ueber = this.statUeberfaellig(e, heute);
    if (ueber.length === 0) {
        this.el(x, "p", "kom-klein kom-leise", "Keine überfälligen ABs. Alle ABs im Schweißen mit Liefertermin sind versendet oder noch nicht fällig.");
    } else {
        this.el(x, "p", "kom-klein kom-leise",
            ueber.length + " AB" + (ueber.length === 1 ? "" : "s") + " im Schweißen mit vergangenem Liefertermin und ohne Termin Versand.");
        this.tabelleBauen(x, [
            { feld: "anzeige", titel: "Arbeitsauftrag" }, { feld: "lt", titel: "Liefertermin" },
            { feld: "seit", titel: "Überfällig seit", art: "zahl" }, { feld: "platz", titel: "Arbeitsplatz" },
            { feld: "mitarbeiter", titel: "Mitarbeiter" }
        ], ueber.map(u => ({
            anzeige: u.anzeige, lt: this.tagText(u.lt), seit: (heute - u.lt) + " Tage", platz: u.platz, mitarbeiter: u.mitarbeiter
        })), "");
    }
},

/* Balkendiagramm aus Elementen. soll: Linie in % (oder null). */
diagrammBauen: function (parent, balken, soll, einheit, beschriftung) {

    if (!balken.some(b => b.wert !== null)) {
        this.el(parent, "p", "kom-klein kom-leise", "Dafür gibt es noch keine Daten.");
        return;
    }

    const d = this.el(parent, "div", "kom-sb-diagramm");
    d.setAttribute("role", "img");
    d.setAttribute("aria-label", beschriftung + ": " + balken.map(b => b.label + " " + b.text).join(", "));

    const flaeche = this.el(d, "div", "kom-sb-flaeche");
    if (soll) {
        const linie = this.el(flaeche, "div", "kom-sb-soll");
        linie.style.bottom = soll + "%";
        this.el(linie, "span", "", "Soll " + soll + " %");
    }

    balken.forEach(b => {
        const spalte = this.el(flaeche, "div", "kom-sb-spalte");
        spalte.title = b.titel;
        const s = this.el(spalte, "div", "kom-sb-balken kom-sb-" + b.farbe + (b.hoehe < 14 ? " kom-sb-klein" : ""));
        s.style.height = b.hoehe + "%";
        const wert = this.el(s, "span", "kom-sb-wert", b.text);
        if (b.wert !== null && einheit) this.el(wert, "small", "", " " + einheit);
    });

    const achse = this.el(d, "div", "kom-sb-achse");
    balken.forEach(b => this.el(achse, "span", "", b.label));
},
