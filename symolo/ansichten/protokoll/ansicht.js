/* ===========================================================================
   ANSICHT: Änderungsprotokoll (W7)
   Wer hat wann welche Menge, welchen Lagerort oder welches Soll geändert,
   dazu Archivieren und Wiederherstellen. Einstellungen: an/aus, mit oder
   ohne Namen, wie lange aufbewahrt. Logik und Daten: 4B_protokoll.js.

   Vorerst ohne Anmeldung und Rechte (Ben, 16.10.2026): Bisher sah nur der
   Admin diese Seite. Das prüft später Symolo.
   =========================================================================== */

liste: [],
einst: null,
suche: "",
art: "",
wer: "",
seite: 1,

hinweisEl: null,
einstEl: null,
leisteEl: null,
inhaltEl: null,
sucheEl: null,
artEl: null,
werEl: null,

before_set_values: async function (form, { data }) {

    const parent = this.ctrlbyBind("_output").SelfElement;

    /* Erst das Gerüst, dann die Daten (Skill, Vertrag). */
    this.geruestBauen(parent);
    this.el(this.koerper, "p", "kom-leise", "Wer hat wann welche Menge, welchen Lagerort oder welches Soll geändert, " +
        "dazu Import, Archivieren und Wiederherstellen.");
    this.hinweisEl = this.el(this.koerper, "div", "kom-hinweis");
    this.einstEl = this.el(this.koerper, "div", "kom-einstellungen");
    this.leisteEl = this.el(this.koerper, "div", "kom-leiste");
    this.inhaltEl = this.el(this.koerper, "div", "kom-inhalt");
    this.knopf(this.fuss, "Neu laden", () => this.laden());

    await this.laden();
},

laden: async function () {

    this.datenHinweise = [];
    this.statusZeigen("Lade …");

    const fertig = await this.sicher(async () => {
        this.einst = await this.protokollEinstellung(true);
        let liste = await this.protokollLesen();

        /* Alte Einträge werden beim Öffnen ausgeblendet (Aufbewahren). */
        const weg = await this.protokollAufraeumen(liste, this.einst.tage);
        if (weg) liste = await this.protokollLesen();

        this.liste = liste;
        return true;
    });

    if (fertig) this.statusZeigen(this.liste.length + " Einträge.");

    this.infoZeigen();
    this.kopfZeichnen();
    this.zeichnen();
},

/* Hinweis, Einstellungen und Filter. Der Filter wird nur neu gebaut, wenn sich die Namen ändern. */
kopfZeichnen: function () {

    this.hinweisEl.replaceChildren();
    this.einstEl.replaceChildren();
    this.leisteEl.replaceChildren();
    if (!this.einst) return;

    if (!this.einst.aktiv) {
        const b = this.el(this.hinweisEl, "div", "kom-warnung");
        this.el(b, "b", "", "Das Protokoll ist ausgeschaltet. ");
        this.el(b, "span", "", "Es werden keine neuen Einträge geschrieben.");
    } else if (!this.einst.namen) {
        const b = this.el(this.hinweisEl, "div", "kom-warnung kom-ruhig");
        this.el(b, "span", "", "Das Protokoll läuft ohne Namen: gespeichert wird nur, was wann geändert wurde.");
    }

    this.einstellungenBauen();
    this.leisteBauen();
},

einstellungenBauen: function () {

    const e = this.einst;
    const wo = this.einstEl;

    const zusammen = this.el(wo, "div", "kom-einst-zeile");
    this.el(zusammen, "b", "", "Einstellungen");
    this.el(zusammen, "span", "kom-leise", " · " + (e.aktiv ? "an" : "aus") + " · " + (e.namen ? "mit Namen" : "ohne Namen") +
        " · " + (e.tage ? e.tage + " Tage aufbewahren" : "unbegrenzt aufbewahren"));
    const auf = this.knopf(zusammen, "Ändern …", () => { box.classList.toggle("kom-zu"); });

    const box = this.el(wo, "div", "kom-einst-box kom-zu");
    this.el(box, "p", "kom-leise", "Betriebsrat und Datenschutz sind noch nicht geklärt. Bis dahin lässt sich das " +
        "Protokoll hier abschalten, ohne Namen führen oder zeitlich begrenzen.");

    const aktiv = this.haken(box, "Protokoll führen", e.aktiv);
    const namen = this.haken(box, "Namen speichern (beim Ausschalten werden auch die Namen in allen bisherigen Einträgen entfernt)", e.namen);

    const feld = this.el(box, "label", "kom-feld");
    this.el(feld, "span", "kom-feldname", "Aufbewahren (Tage, 0 = unbegrenzt)");
    const tage = this.el(feld, "input", "kom-eingabe kom-schmal");
    tage.type = "number";
    tage.min = "0";
    tage.max = "3650";
    tage.value = String(e.tage);

    const knoepfe = this.el(box, "div", "kom-knopfzeile");
    this.knopf(knoepfe, "Speichern", () => this.einstellungenSpeichern(aktiv.checked, namen.checked, tage.value), "haupt");
    this.knopf(knoepfe, "Protokoll leeren …", () => this.leerenFragen(), "rot");
    auf.setAttribute("aria-label", "Einstellungen ändern");
},

haken: function (parent, text, an) {

    const zeile = this.el(parent, "label", "kom-haken");
    const k = this.el(zeile, "input");
    k.type = "checkbox";
    k.checked = Boolean(an);
    this.el(zeile, "span", "", text);
    return k;
},

einstellungenSpeichern: async function (aktiv, namen, tageText) {

    const t = this.text(tageText);
    if (!/^\d+$/.test(t) || Number(t) > 3650) {
        this.statusZeigen("Aufbewahren: bitte eine Zahl von 0 bis 3650 Tagen (0 = unbegrenzt).", "fehler");
        return;
    }

    const vorher = this.einst;
    const meldung = await this.sicher(async () => {
        let text = "Einstellungen gespeichert.";
        this.einst = await this.protokollEinstellen(aktiv, namen, Number(t));

        if (vorher.namen && !this.einst.namen) {
            const n = await this.protokollNamenEntfernen();
            text += " Namen aus " + n + " Einträgen entfernt.";
        }

        const weg = await this.protokollAufraeumen(await this.protokollLesen(), this.einst.tage);
        if (weg) text += " " + weg + " alte Einträge ausgeblendet.";
        return text;
    });

    await this.laden();
    if (meldung) this.statusZeigen(meldung);
},

/* Leeren blendet aus, es löscht nicht (Ben: nie löschen). */
leerenFragen: function () {

    this.dialogZeigen("Protokoll leeren", (inhalt, knoepfe) => {
        this.el(inhalt, "p", "", "Alle " + this.liste.length + " Einträge aus dieser Liste entfernen?");
        this.el(inhalt, "p", "kom-leise", "Sie werden nur ausgeblendet. Endgültig löschen kann die IT in der Datenbank.");

        this.knopf(knoepfe, "Ja, alle ausblenden", async () => {
            this.dialogSchliessen();
            const n = await this.sicher(() => this.protokollLeeren(this.liste));
            await this.laden();
            if (n !== null) this.statusZeigen("Protokoll geleert (" + n + " Einträge ausgeblendet).");
        }, "rot");
        const nein = this.knopf(knoepfe, "Abbrechen", () => this.dialogSchliessen());
        this.dialogFokus = nein;   /* ein versehentliches Enter blendet nichts aus */
    });
},

/* ---------------------------------------------------------------------------
   Filter und Liste
   --------------------------------------------------------------------------- */

leisteBauen: function () {

    const leiste = this.leisteEl;

    const sf = this.el(leiste, "label", "kom-feld kom-suchfeld");
    this.el(sf, "span", "kom-feldname", "Suche");
    const zeile = this.el(sf, "span", "kom-suchzeile");
    this.sucheEl = this.el(zeile, "input", "kom-eingabe");
    this.sucheEl.type = "search";
    this.sucheEl.placeholder = "AB oder Zeichnungsnummer";
    this.sucheEl.value = this.suche;
    this.sucheEl.onkeydown = e => { if (e.key === "Enter") this.filterSetzen(); };
    this.sucheEl.onsearch = () => { if (this.sucheEl.value === "") this.filterSetzen(); };

    const af = this.el(leiste, "label", "kom-feld");
    this.el(af, "span", "kom-feldname", "Was");
    this.artEl = this.el(af, "select", "kom-eingabe");
    this.auswahlFuellen(this.artEl, [["", "Alles"]].concat(this.protokollArten), this.art);

    const namen = this.protokollNamen(this.liste);
    this.werEl = null;
    if (namen.length) {
        const wf = this.el(leiste, "label", "kom-feld");
        this.el(wf, "span", "kom-feldname", "Wer");
        this.werEl = this.el(wf, "select", "kom-eingabe");
        this.auswahlFuellen(this.werEl, [["", "Alle"]].concat(namen.map(n => [n, n])), this.wer);
    }

    const knoepfe = this.el(leiste, "div", "kom-knopfzeile");
    this.knopf(knoepfe, "Anzeigen", () => this.filterSetzen(), "haupt");
    this.knopf(knoepfe, "Alles", () => {
        this.sucheEl.value = "";
        this.artEl.value = "";
        if (this.werEl) this.werEl.value = "";
        this.filterSetzen();
    });
},

auswahlFuellen: function (sel, werte, wert) {

    sel.replaceChildren();
    werte.forEach(([w, t]) => {
        const o = this.el(sel, "option", "", t);
        o.value = w;
    });
    sel.value = wert;
},

filterSetzen: function () {

    this.suche = this.text(this.sucheEl.value);
    this.art = this.artEl.value;
    this.wer = this.werEl ? this.werEl.value : "";
    this.seite = 1;
    this.zeichnen();
},

artText: function (art) {

    const a = this.protokollArten.find(x => x[0] === art);
    return a ? a[1] : this.text(art);
},

zeichnen: function () {

    this.inhaltEl.replaceChildren();

    const liste = this.protokollFiltern(this.liste, this.suche, this.art, this.wer);

    if (liste.length === 0) {
        const gefiltert = this.suche || this.art || this.wer;
        this.el(this.inhaltEl, "div", "kom-leer", gefiltert ? "Keine Einträge für diese Auswahl." : "Noch keine Einträge.");
        return;
    }

    const seiten = Math.max(1, Math.ceil(liste.length / this.protokollSeite));
    this.seite = Math.min(Math.max(1, this.seite), seiten);
    const ab = (this.seite - 1) * this.protokollSeite;

    const rahmen = this.el(this.inhaltEl, "div", "kom-rahmen");
    const tab = this.el(rahmen, "table", "kom-tabelle");
    const kopf = this.el(this.el(tab, "thead"), "tr");
    ["Wann", "Wer", "Was", "AB", "Zeile", "Vorher", "", "Nachher"].forEach((t, i) => this.el(kopf, "th", i === 5 ? "kom-zahl" : "", t));
    const koerper = this.el(tab, "tbody");

    liste.slice(ab, ab + this.protokollSeite).forEach(z => {
        const tr = this.el(koerper, "tr");
        this.el(tr, "td", "kom-zahl", this.zeitOrtText(z.zeit, true));
        this.el(tr, "td", "", this.text(z.benutzer_name) || "–");
        this.el(tr, "td", "", this.artText(z.art));
        this.el(this.el(tr, "td"), "b", "", this.text(z.ab));
        this.el(tr, "td", "", this.text(z.objekt) || "AB");
        this.el(tr, "td", "kom-zahl", this.text(z.alt));
        this.el(tr, "td", "kom-leise", "→");
        this.el(tr, "td", "", this.text(z.neu));
    });

    if (seiten > 1) {
        const nav = this.el(this.inhaltEl, "div", "kom-seiten");
        if (this.seite > 1) this.knopf(nav, "← Neuere", () => { this.seite--; this.zeichnen(); });
        this.el(nav, "span", "kom-leise", "Seite " + this.seite + " von " + seiten);
        if (this.seite < seiten) this.knopf(nav, "Ältere →", () => { this.seite++; this.zeichnen(); });
    }
},
