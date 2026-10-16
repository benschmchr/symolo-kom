/* ===========================================================================
   ANSICHT: Arbeitsplätze (R-AP1 bis R-AP5)
   Der Hallenplan wie die Magnettafel: je Arbeitsplatz die ABs und
   Baugruppen im Schweißen, darunter "Nicht einsortiert", "Sonstiges"
   (Platz steht nicht in der Platzliste) und die Liste "Einsortiert".
   Eintrag antippen: Arbeitsplatz wählen. Am PC auch auf einen anderen
   Platz oder nach "Nicht einsortiert" ziehen. Rechtsklick (am Handy
   "AB-Menü"): AB aufsplitten, zusammenführen, Mitarbeiter ändern.
   Die Einträge berechnet hpHallenplan (4M_hallenplan.js).

   OFFEN (Symolo): Der Sprung zum AB in der Ansicht Schweißen
   (Ansichtswechsel) geht erst, wenn klar ist, wie Symolo zwischen
   Formularen wechselt.
   =========================================================================== */

zeilen: [],
plaetze: [],
namen: [],
plan: null,
ziehen: null,
planEl: null,

before_set_values: async function (form, { data }) {

    const parent = this.ctrlbyBind("_output").SelfElement;

    /* Erst das Gerüst, dann die Daten (Skill, Vertrag). */
    this.geruestBauen(parent);
    this.el(this.koerper, "p", "kom-leise",
        "Wie die Magnettafel in der Halle. Eintrag antippen, um den Arbeitsplatz zu ändern; am PC auch auf einen anderen " +
        "Platz oder nach „Nicht einsortiert“ ziehen. Rechtsklick auf einen Eintrag: AB aufsplitten bzw. zusammenführen " +
        "und Mitarbeiter ändern. Der Platz gilt dann auch im Schweißen.");
    this.planEl = this.el(this.koerper, "div", "kom-plan");
    this.knopf(this.fuss, "Neu laden", () => this.laden());

    await this.laden();
},

datenHolen: async function () {

    const [zeilen, plaetze, namen] = await Promise.all([this.swLesen(), this.swPlaetzeLaden(), this.swMitarbeiterNamen()]);
    return { zeilen: zeilen, plaetze: plaetze, namen: namen };
},

laden: async function () {

    this.datenHinweise = [];
    this.statusZeigen("Lade …");

    const d = await this.sicher(() => this.datenHolen());
    if (d !== null) {
        this.zeilen = d.zeilen;
        this.plaetze = d.plaetze;
        this.namen = d.namen;
        this.statusZeigen(d.plaetze.length + " Arbeitsplätze geladen.");
    }

    this.zeichnen();
},

/* ---------------------------------------------------------------------------
   Zeichnen
   --------------------------------------------------------------------------- */

zeichnen: function () {

    this.infoZeigen();
    const p = this.hpHallenplan(this.zeilen, this.plaetze);
    this.plan = p;
    const inhalt = this.el(null, "div");

    if (!this.plaetze.length) {
        this.el(inhalt, "div", "kom-leer", "Es sind noch keine Arbeitsplätze angelegt.");
    }

    const halle = this.el(inhalt, "div", "kom-halle");
    p.plaetze.forEach(x => {
        const platz = x.p;
        const feld = this.el(halle, "div", "kom-ap kom-tafel-" + this.text(platz.farbe));
        feld.style.gridColumn = this.zahlOder(platz.spalte, 1) + " / span " + this.zahlOder(platz.breite, 1);
        feld.style.gridRow = this.zahlOder(platz.zeile, 1) + " / span " + this.zahlOder(platz.hoehe, 1);
        this.el(feld, "h3", "kom-ap-name", platz.name);
        this.ablage(feld, this.text(platz.name));

        const liste = this.el(feld, "div", "kom-eintraege");
        if (x.eintraege.length) x.eintraege.forEach(e => this.eintragBauen(liste, e, false));
        else this.el(liste, "span", "kom-leise", "frei");
    });

    const listen = this.el(inhalt, "div", "kom-listen");

    const nicht = this.liste(listen, "Nicht einsortiert", p.nicht.length);
    this.ablage(nicht.karte, "");
    if (p.nicht.length) p.nicht.forEach(e => this.eintragBauen(nicht.eintraege, e, false));
    else this.el(nicht.eintraege, "p", "kom-leise", "Alles einsortiert");

    const sonst = this.liste(listen, "Sonstiges", p.ungueltig.length);
    if (p.ungueltig.length) p.ungueltig.forEach(e => this.eintragBauen(sonst.eintraege, e, true));
    else this.el(sonst.eintraege, "p", "kom-leise", "keine");

    const eins = this.liste(listen, "Einsortiert", p.einsortiert.length);
    if (p.einsortiert.length) p.einsortiert.forEach(([e, platz]) => this.eintragBauen(eins.eintraege, Object.assign({}, e, { platz: this.text(platz.name) }), true));
    else this.el(eins.eintraege, "p", "kom-leise", "keine");

    this.planEl.replaceChildren(inhalt);
},

zahlOder: function (wert, vorgabe) {

    const n = Number(this.text(wert));
    return Number.isFinite(n) && n >= 1 ? Math.round(n) : vorgabe;
},

liste: function (parent, titel, anzahl) {

    const karte = this.el(parent, "section", "kom-liste-karte");
    const h = this.el(karte, "h3", "kom-liste-titel", titel + " ");
    this.el(h, "span", "kom-anzahl", String(anzahl));
    return { karte: karte, eintraege: this.el(karte, "div", "kom-eintraege") };
},

/* Ein Eintrag: antippen = Platz wählen, ziehen = ablegen, Rechtsklick = Menü.
   Kein Knopf, damit Firefox ihn ziehen kann (Ben, 14.10.2026). */
eintragBauen: function (parent, e, mitPlatz) {

    const x = this.el(parent, "span", "kom-eintrag", this.hpAnzeige(e));
    if (mitPlatz) this.el(x, "span", "kom-eintrag-platz", " · " + e.platz);

    x.tabIndex = 0;
    x.setAttribute("role", "button");
    x.title = this.hpAnzeige(e);
    x.draggable = true;

    x.onclick = () => this.platzDialog(e);
    x.onkeydown = k => { if (k.key === "Enter" || k.key === " ") { k.preventDefault(); this.platzDialog(e); } };
    x.oncontextmenu = k => { k.preventDefault(); this.eintragMenue(e); };
    x.ondragstart = k => { this.ziehen = e; k.dataTransfer.setData("text/plain", e.name); };
    x.ondragend = () => { this.ziehen = null; };
},

/* Platz oder Liste als Ziel zum Ablegen. */
ablage: function (el, platz) {

    el.ondragover = k => { if (this.ziehen) { k.preventDefault(); el.classList.add("kom-ziel"); } };
    el.ondragleave = () => el.classList.remove("kom-ziel");
    el.ondrop = k => {
        k.preventDefault();
        el.classList.remove("kom-ziel");
        const e = this.ziehen;
        this.ziehen = null;
        if (e && this.hpKlein(e.platz) !== this.hpKlein(platz)) this.platzSetzen(e, platz);
    };
},

/* ---------------------------------------------------------------------------
   Ändern
   --------------------------------------------------------------------------- */

/* Platz wählen. Knöpfe: "Kein Arbeitsplatz", "AB-Menü" (für das Handy) und "Abbrechen" (rot). */
platzDialog: function (e) {

    this.dialogZeigen("Arbeitsplatz ändern: " + e.name, (inhalt, knoepfe) => {
        this.el(inhalt, "p", "kom-leise", e.platz ? "Bisher: " + e.platz : "Bisher: kein Arbeitsplatz");

        const raster = this.el(inhalt, "div", "kom-platzraster");
        this.plaetze.forEach(p => {
            const name = this.text(p.name);
            const gleich = this.hpKlein(name) === this.hpKlein(e.platz);
            const b = this.knopf(raster, name, () => { this.dialogSchliessen(); this.platzSetzen(e, name); }, gleich ? "gewaehlt" : "");
            b.disabled = gleich;
        });

        this.knopf(knoepfe, "Kein Arbeitsplatz", () => { this.dialogSchliessen(); this.platzSetzen(e, ""); });
        this.knopf(knoepfe, "AB-Menü", () => { this.dialogSchliessen(); this.eintragMenue(e); });
        this.knopf(knoepfe, "Abbrechen", () => this.dialogSchliessen(), "rot");
    });
},

/* Rechtsklick: AB aufsplitten (ab zwei Baugruppen), zusammenführen, Mitarbeiter. */
eintragMenue: function (e) {

    const punkte = [];

    if (e.ganz && e.komplett && e.bgs > 1) {
        punkte.push(["AB aufsplitten", () => this.aendern(() => this.hpTeilen(e.name))]);
    } else if (!e.ganz && e.komplett) {
        punkte.push(["AB zusammenführen", () => this.aendern(() => this.hpZusammenfuehren(e.name))]);
    }
    punkte.push(["Mitarbeiter ändern", () => this.mitarbeiterDialog(e)]);

    this.dialogZeigen(e.name, (inhalt, knoepfe) => {
        knoepfe.classList.add("kom-dialog-spalte");
        punkte.forEach(([text, aktion]) => this.knopf(knoepfe, text, () => { this.dialogSchliessen(); aktion(); }));
        this.knopf(knoepfe, "Abbrechen", () => this.dialogSchliessen(), "rot");
        if (!e.komplett && e.name.toUpperCase().indexOf("_BG") > -1) {
            this.el(inhalt, "p", "kom-leise", "Zusammenführen geht nur, wenn alle Baugruppen des AB im Schweißen liegen.");
        }
    });
},

/* Mehrere Mitarbeiter wählen (Häkchen). */
mitarbeiterDialog: function (e) {

    const aktuell = this.swMitarbeiterListe(e.mitarbeiter);
    const alle = this.namen.slice();
    aktuell.forEach(n => { if (!alle.some(x => x.toLowerCase() === n.toLowerCase())) alle.push(n); });

    this.dialogZeigen("Mitarbeiter für " + e.name, (inhalt, knoepfe) => {
        const liste = this.el(inhalt, "div", "kom-auswahl");
        const boxen = alle.map(n => {
            const label = this.el(liste, "label", "kom-schalter");
            const box = this.el(label, "input");
            box.type = "checkbox";
            box.value = n;
            box.checked = aktuell.some(x => x.toLowerCase() === n.toLowerCase());
            this.el(label, "span", "", n);
            return box;
        });
        if (!alle.length) {
            this.el(inhalt, "p", "kom-leise", "Noch keine Mitarbeiter eingetragen (Ansicht Schweißen: „Mitarbeiter verwalten“).");
        }

        this.knopf(knoepfe, "Speichern", () => {
            this.dialogSchliessen();
            const wert = boxen.filter(b => b.checked).map(b => b.value).join(this.swTrenner);
            this.aendern(() => this.hpMitarbeiterSetzen(e.name, wert));
        }, "haupt");
        this.knopf(knoepfe, "Abbrechen", () => this.dialogSchliessen(), "rot");
    });
},

platzSetzen: function (e, platz) {

    this.aendern(() => this.hpPlatzSetzen(e.name, platz));
},

/* Aufgabe ausführen (liefert die Meldung), neu lesen, neu zeichnen. */
aendern: async function (aufgabe) {

    const meldung = await this.sicher(aufgabe);
    const d = await this.sicher(() => this.datenHolen());
    if (d !== null) {
        this.zeilen = d.zeilen;
        this.plaetze = d.plaetze;
        this.namen = d.namen;
    }
    this.zeichnen();
    if (meldung) this.statusZeigen(meldung);
},
