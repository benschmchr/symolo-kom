/* ===========================================================================
   ANSICHT: Archiv (R-X1 bis R-X3)
   Archivierte Arbeitsaufträge ansehen, durchsuchen und wiederherstellen.
   Die Liste zeigt je AB eine Zeile; ein Klick öffnet seine Zeilen (die 28
   Spalten wie das Excel-Blatt). Logik und Daten: 4D_archiv.js.

   Archivieren selbst geschieht in der Bestandsliste (Rechtsklick auf den AB)
   bzw. im Schweißen. Wiederherstellen bringt einen AB dorthin zurück, woher
   er kam: in die Bestandsliste oder ins Schweißen (Phase 6).
   =========================================================================== */

koepfe: [],
suche: "",
seite: 1,
offen: null,
zeilenCache: {},
alleZeilen: null,

sucheEl: null,
zaehlerEl: null,
inhaltEl: null,

before_set_values: async function (form, { data }) {

    const parent = this.ctrlbyBind("_output").SelfElement;

    /* Erst das Gerüst, dann die Daten (Skill, Vertrag). */
    this.geruestBauen(parent);
    this.el(this.koerper, "p", "kom-leise", "Archivierte Arbeitsaufträge mit allen Zeilen. " +
        "Hier kann man sie ansehen, durchsuchen und wiederherstellen.");
    this.leisteBauen();
    this.zaehlerEl = this.el(this.koerper, "div", "kom-zaehler");
    this.inhaltEl = this.el(this.koerper, "div", "kom-inhalt");
    this.fussKnopf("Neu laden", "Laden", () => this.laden());

    await this.laden();
},

laden: async function () {

    this.datenHinweise = [];
    this.statusZeigen("Lade …");

    const koepfe = await this.sicher(() => this.archivLaden());
    if (koepfe !== null) {
        this.koepfe = koepfe;
        this.alleZeilen = null;
        this.zeilenCache = {};
        this.statusZeigen(koepfe.length + " Arbeitsaufträge im Archiv.");
    }

    this.infoZeigen();
    this.zeichnen();
},

/* ---------------------------------------------------------------------------
   Suche
   --------------------------------------------------------------------------- */

leisteBauen: function () {

    const leiste = this.el(this.koerper, "div", "kom-leiste");

    const feld = this.el(leiste, "label", "kom-feld kom-suchfeld");
    this.el(feld, "span", "kom-feldname", "Suche");
    const zeile = this.el(feld, "span", "kom-suchzeile");
    this.sucheEl = this.el(zeile, "input", "kom-eingabe");
    this.sucheEl.type = "search";
    this.sucheEl.placeholder = "AB, Kunde, Zeichnungsnr., Benennung, LK oder Lagerort";
    this.sucheEl.onkeydown = e => { if (e.key === "Enter") this.suchen(); };
    this.sucheEl.onsearch = () => { if (this.sucheEl.value === "") this.suchen(); };
    this.knopf(zeile, "Suchen", () => this.suchen(), "haupt");
},

suchen: async function () {

    this.suche = this.text(this.sucheEl.value).replace(/\s+/g, " ");
    this.seite = 1;
    this.offen = null;

    /* Die Zeilen aller ABs werden erst gebraucht, wenn gesucht wird. */
    if (this.suche && this.alleZeilen === null) {
        this.statusZeigen("Suche läuft, die Zeilen werden geladen …");
        this.alleZeilen = await this.sicher(() => this.archivZeilenAlle(this.koepfe));
        this.statusZeigen("Zeilen geladen.");
    }

    this.zeichnen();
},

alleZeigen: function () {

    this.suche = this.sucheEl.value = "";
    this.seite = 1;
    this.zeichnen();
},

/* R-X3: AB, Kunde oder Verkaufsartikel passt, oder eine Zeile des AB. */
treffer: function () {

    if (!this.suche) return this.koepfe;

    return this.koepfe.filter(k => this.archivKopfTreffer(k, this.suche) ||
        (this.alleZeilen && (this.alleZeilen[String(k._id)] || []).some(z => this.archivZeileTreffer(z, this.suche))));
},

/* ---------------------------------------------------------------------------
   Zeichnen
   --------------------------------------------------------------------------- */

zeichnen: function () {

    this.inhaltEl.replaceChildren();
    this.zaehlerEl.replaceChildren();

    if (this.offen) this.detailZeichnen(this.offen);
    else this.listeZeichnen();
},

pille: function (parent, text, wert) {

    const p = this.el(parent, "span", "kom-pille");
    this.el(p, "span", "", text);
    if (wert !== undefined) this.el(p, "b", "", wert);
    return p;
},

statusMarke: function (parent, status) {

    const klasse = { Komplett: "kom-komplett", Teilweise: "kom-teilweise", Offen: "kom-offen" }[this.text(status)] || "";
    return this.el(parent, "span", "kom-st " + klasse, this.text(status) || "–");
},

listeZeichnen: function () {

    const liste = this.treffer();

    this.pille(this.zaehlerEl, "Im Archiv:", String(this.koepfe.length));
    if (this.suche) this.pille(this.zaehlerEl, "Treffer:", String(liste.length));

    if (liste.length === 0) {
        const leer = this.el(this.inhaltEl, "div", "kom-leer");
        if (this.suche) {
            this.el(leer, "span", "", "Kein Treffer für „" + this.suche + "“. ");
            this.knopf(leer, "Alles anzeigen", () => this.alleZeigen());
        } else {
            this.el(leer, "span", "", "Das Archiv ist noch leer. Archivierte Arbeitsaufträge landen hier.");
        }
        return;
    }

    const seiten = Math.max(1, Math.ceil(liste.length / this.archivSeite));
    this.seite = Math.min(Math.max(1, this.seite), seiten);
    const ab = (this.seite - 1) * this.archivSeite;

    const rahmen = this.el(this.inhaltEl, "div", "kom-rahmen");
    const tab = this.el(rahmen, "table", "kom-tabelle");
    const kopf = this.el(this.el(tab, "thead"), "tr");
    ["AB", "Kunde", "Verkaufsartikel", "Status beim Archivieren", "Archiviert am", "Herkunft"]
        .forEach(t => this.el(kopf, "th", "", t));
    const koerper = this.el(tab, "tbody");

    liste.slice(ab, ab + this.archivSeite).forEach(k => {
        const tr = this.el(koerper, "tr");
        const link = this.el(this.el(tr, "td"), "button", "kom-link", this.text(k.ab_anzeige));
        link.type = "button";
        link.onclick = () => { this.offen = k; this.zeichnen(); };
        this.el(tr, "td", "", this.text(k.kunde) || "–");
        this.el(tr, "td", "kom-kurz", this.text(k.verkaufsartikel) || "–").title = this.text(k.verkaufsartikel);
        this.statusMarke(this.el(tr, "td"), k.archiv_status);
        this.el(tr, "td", "", this.zeitOrtText(k.archiviert_am));
        this.el(tr, "td", "kom-leise", this.text(k.archiv_herkunft) || "alte Zeile aus Excel");
    });

    if (seiten > 1) {
        const nav = this.el(this.inhaltEl, "div", "kom-seiten");
        if (this.seite > 1) this.knopf(nav, "← Neuere", () => { this.seite--; this.zeichnen(); });
        this.el(nav, "span", "kom-leise", "Seite " + this.seite + " von " + seiten);
        if (this.seite < seiten) this.knopf(nav, "Ältere →", () => { this.seite++; this.zeichnen(); });
    }
},

/* Ein AB mit allen Zeilen (28 Spalten). Die Zeilen werden beim Öffnen geladen. */
detailZeichnen: async function (kopf) {

    const kopfzeile = this.el(this.inhaltEl, "div", "kom-detailkopf");
    this.knopf(kopfzeile, "← Archiv", () => { this.offen = null; this.zeichnen(); });
    this.el(kopfzeile, "h3", "kom-detailtitel", this.text(kopf.ab_anzeige) + " im Archiv");

    const platz = this.el(this.inhaltEl, "div", "kom-detail");
    this.el(platz, "div", "kom-leer", "Lade …");

    let zeilen = this.zeilenCache[String(kopf._id)];
    if (!zeilen) {
        zeilen = await this.sicher(() => this.archivZeilenLaden(kopf));
        if (zeilen === null) { platz.replaceChildren(); this.el(platz, "div", "kom-leer", "Die Zeilen konnten nicht geladen werden."); return; }
        this.zeilenCache[String(kopf._id)] = zeilen;
    }
    if (this.offen !== kopf) return;   /* inzwischen zurück zur Liste */

    platz.replaceChildren();
    this.zaehlerEl.replaceChildren();
    this.pille(this.zaehlerEl, "Archiviert am", this.zeitOrtText(kopf.archiviert_am));
    this.pille(this.zaehlerEl, this.text(kopf.archiv_herkunft) || "alte Zeile aus Excel");
    if (this.text(kopf.kunde)) this.pille(this.zaehlerEl, "Kunde:", this.text(kopf.kunde));
    this.pille(this.zaehlerEl, "Zeilen:", String(zeilen.length));

    this.nurMitRecht(this.knopf(kopfzeile, "Wiederherstellen …", () => this.wiederherstellenFragen(kopf, zeilen.length), "haupt"), "kom.bestand.bearbeiten");
    if (this.archivAusSchweissen(kopf)) {
        this.el(platz, "p", "kom-leise", "Dieser AB wurde im Schweißen archiviert. Wiederherstellen bringt ihn dorthin zurück.");
    }

    if (this.suche) this.el(platz, "p", "kom-leise", "Zeilen mit „" + this.suche + "“ sind hervorgehoben.");

    const rahmen = this.el(platz, "div", "kom-rahmen kom-breit");
    const tab = this.el(rahmen, "table", "kom-tabelle");
    const th = this.el(this.el(tab, "thead"), "tr");
    this.archivKopf.forEach(([titel]) => this.el(th, "th", "", titel));
    const koerper = this.el(tab, "tbody");

    zeilen.forEach(z => {
        const ebene = { AB: "kom-ebene-ab", BG: "kom-ebene-bg" }[z.ebene] || "kom-ebene-teil";
        const status = { Komplett: " kom-komplett", Teilweise: " kom-teilweise", Offen: " kom-offen" }[z.status] || "";
        const treffer = this.archivZeileTreffer(z, this.suche) ? " kom-treffer" : "";
        const tr = this.el(koerper, "tr", ebene + status + treffer);

        this.archivKopf.forEach(([, feld]) => {
            const zahl = this.archivZahlFelder.indexOf(feld) > -1;
            this.el(tr, "td", zahl ? "kom-zahl" : "", this.archivWert(z, feld));
        });
    });
},

/* Rückfrage vor dem Wiederherstellen. */
wiederherstellenFragen: function (kopf, n) {

    const name = this.text(kopf.ab_anzeige);
    const ziel = this.archivAusSchweissen(kopf) ? "ins Schweißen" : "in die Bestandsliste";

    this.dialogZeigen("Wiederherstellen", (inhalt, knoepfe) => {
        const p = this.el(inhalt, "p");
        this.el(p, "b", "", name);
        this.el(p, "span", "", " mit " + n + " Zeilen wieder " + ziel + " holen?");
        this.el(inhalt, "p", "kom-leise", "Mengen, Lagerort und Daten kommen so zurück, wie sie beim Archivieren waren" +
            (ziel === "ins Schweißen" ? " (auch Mitarbeiter, Arbeitsplatz und Termine)" : "") +
            ". Der Eintrag verschwindet danach aus dem Archiv.");

        this.knopf(knoepfe, "Ja, wiederherstellen", async () => {
            this.dialogSchliessen();
            const wohin = await this.sicher(() => this.archivWiederherstellen(kopf));
            if (!wohin) return;
            this.offen = null;
            await this.laden();
            this.statusZeigen(name + (wohin === "schweissen" ? " ist wieder im Schweißen." : " ist wieder in der Bestandsliste."));
        }, "haupt");
        this.knopf(knoepfe, "Abbrechen", () => this.dialogSchliessen(), "rot");
    });
},
