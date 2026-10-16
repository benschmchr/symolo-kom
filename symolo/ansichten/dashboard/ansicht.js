/* ===========================================================================
   ANSICHT: Dashboard (R-DB1 bis R-DB6)
   Kopf mit vier Kacheln, Suche, Knöpfe ABs/BGs/Alles, Sortieren, Kunde und
   eine Karte je AB mit Baugruppen und Teilen (nur ansehen).
   Sortierung, Filter und Klappen rechnet 4A_dashboard.js.

   Noch nicht dabei: Spalte "Planung" (Phase 5) und die Zeilen
   "Befinden sich im Schweißen" (Phase 6).

   OFFEN (Symolo): Der Klappzustand wird bisher nur solange gemerkt, wie das
   Fenster offen ist. Je Benutzer dauerhaft geht erst mit einer Tabelle
   (Benutzer, Ansicht, Schlüssel) und der Benutzer-Anbindung.
   =========================================================================== */

abs: [],
suche: "",
kunde: "Alle",
ansichtWahl: "bg",
sortierung: "ab",
gemerkt: {},

kopfEl: null,
meldungEl: null,
listeEl: null,
sucheEl: null,
kundeEl: null,
sortEl: null,
ansichtKnoepfe: {},

before_set_values: async function (form, { data }) {

    const parent = this.ctrlbyBind("_output").SelfElement;

    /* Erst das Gerüst, dann die Daten (Skill, Vertrag). */
    this.geruestBauen(parent);
    this.el(this.koerper, "p", "kom-label", "Dashboard");
    this.kopfEl = this.el(this.koerper, "div", "kom-dash-reihe");
    this.leisteBauen();
    this.meldungEl = this.el(this.koerper, "div", "kom-hinweis");
    this.listeEl = this.el(this.koerper, "div", "kom-liste");
    this.knopf(this.fuss, "Neu laden", () => this.laden());

    await this.laden();
},

laden: async function () {

    this.datenHinweise = [];
    this.statusZeigen("Lade …");

    const abs = await this.sicher(() => this.bestandLaden());
    if (abs !== null) {
        this.abs = abs;
        this.statusZeigen(abs.length + " Arbeitsaufträge geladen.");
    }

    this.zeichnen();
},

/* ---------------------------------------------------------------------------
   Leiste: Suche, Knöpfe, Sortieren, Kunde
   --------------------------------------------------------------------------- */

leisteBauen: function () {

    const leiste = this.el(this.koerper, "div", "kom-leiste");

    const suchFeld = this.el(leiste, "label", "kom-feld kom-suchfeld");
    this.el(suchFeld, "span", "kom-feldname", "AB-Suche");
    const zeile = this.el(suchFeld, "span", "kom-suchzeile");
    this.sucheEl = this.el(zeile, "input", "kom-eingabe");
    this.sucheEl.type = "search";
    this.sucheEl.placeholder = "Teil der AB-Nummer";
    this.sucheEl.onkeydown = e => { if (e.key === "Enter") this.suchen(); };
    this.sucheEl.onsearch = () => { if (this.sucheEl.value === "") this.suchen(); };
    this.knopf(zeile, "Suchen", () => this.suchen(), "haupt");

    const knoepfe = this.el(leiste, "div", "kom-knopfgruppe");
    this.dashAnsichten.forEach(([wert, titel]) => {
        this.ansichtKnoepfe[wert] = this.knopf(knoepfe, titel, () => {
            /* R-DB4: Ansicht umstellen = Startzustand der neuen Ansicht */
            this.ansichtWahl = wert;
            this.gemerkt = {};
            this.zeichnen();
        });
    });

    this.sortEl = this.auswahlBauen(leiste, "Sortieren", this.dashSortierungen, this.sortierung, w => {
        this.sortierung = w;
        this.zeichnen();
    });

    this.kundeEl = this.auswahlBauen(leiste, "Kunde", [[this.dashAlleKunden, this.dashAlleKunden]], this.kunde, w => {
        this.kunde = w;
        this.zeichnen();
    });
},

auswahlBauen: function (parent, titel, werte, wert, wechsel) {

    const feld = this.el(parent, "label", "kom-feld");
    this.el(feld, "span", "kom-feldname", titel);
    const sel = this.el(feld, "select", "kom-eingabe");
    this.auswahlFuellen(sel, werte, wert);
    sel.onchange = () => wechsel(sel.value);
    return sel;
},

auswahlFuellen: function (sel, werte, wert) {

    sel.replaceChildren();
    werte.forEach(([w, t]) => {
        const o = this.el(sel, "option", "", t);
        o.value = w;
    });
    sel.value = wert;
},

suchen: function () {

    this.suche = this.text(this.sucheEl.value);
    this.zeichnen();
},

alleZeigen: function () {

    this.suche = this.sucheEl.value = "";
    this.kunde = this.dashAlleKunden;
    this.zeichnen();
},

/* ---------------------------------------------------------------------------
   Zeichnen: aus dem Zustand, nie aus den Rohdaten (Skill, Ablauf 6)
   --------------------------------------------------------------------------- */

zeichnen: function () {

    this.infoZeigen();

    /* Kunden aus den geladenen ABs; ein unbekannter Kunde zählt als "Alle". */
    const kunden = this.dashKunden(this.abs);
    const gleich = kunden.find(k => k.toLowerCase() === this.dashText(this.kunde));
    this.kunde = gleich || this.dashAlleKunden;
    this.auswahlFuellen(this.kundeEl, kunden.map(k => [k, k]), this.kunde);

    Object.keys(this.ansichtKnoepfe).forEach(w => {
        this.ansichtKnoepfe[w].classList.toggle("kom-gewaehlt", w === this.ansichtWahl);
    });

    this.kopfZeichnen();

    const gefiltert = Boolean(this.suche) || this.kunde !== this.dashAlleKunden;
    const liste = this.dashSortieren(this.dashFiltern(this.abs, this.suche, this.kunde), this.sortierung);
    this.dashKlappen(liste, this.ansichtWahl, this.gemerkt);

    this.meldungEl.replaceChildren();
    this.listeEl.replaceChildren();

    if (liste.length === 0) {
        if (gefiltert) {
            this.meldungEl.textContent = "Keine Einträge" + (this.suche ? " für „" + this.suche + "“" : "") + ". ";
            this.knopf(this.meldungEl, "Alle zeigen", () => this.alleZeigen());
        } else {
            this.el(this.listeEl, "div", "kom-leer",
                "Noch keine Arbeitsaufträge in der Bestandsliste. Entweder ist die Liste leer oder sie konnte nicht gelesen werden (siehe Meldung unten).");
        }
        return;
    }

    /* Erst ohne Eltern bauen, dann auf einmal einhängen (schnell bei vielen Zeilen). */
    const inhalt = this.el(null, "div", "kom-liste-inhalt");
    this.kopfzeileBauen(inhalt);
    liste.forEach(d => {
        const karte = this.el(inhalt, "section", "kom-karte");
        this.karteZeichnen(karte, d);
    });
    this.listeEl.replaceChildren(inhalt);
},

/* R-DB5: vier Kacheln in einer Reihe, zählen immer alle ABs. */
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

    const akzent = this.el(this.kopfEl, "div", "kom-kachel kom-kachel-akzent");
    this.el(akzent, "span", "kom-label", "Aufträge");
    this.el(akzent, "span", "kom-zahl-gross", String(k.ab));
    this.el(akzent, "span", "kom-label", "Gesamtfortschritt");
    this.el(akzent, "span", "kom-zahl-mittel", k.gesamt_txt);
    const balken = this.el(akzent, "span", "kom-kachel-balken kom-hell");
    balken.title = k.gesamt_txt;
    this.el(balken, "span").style.width = Math.round(k.gesamt * 100) + "%";
},

/* ---------------------------------------------------------------------------
   Tabelle: gleiche Spalten in Kopfzeile und jeder Karte (R-DB1)
   --------------------------------------------------------------------------- */

dashSpalten: [
    ["klapp", ""], ["ab", "Arbeitsauftrag"], ["bg", "Baugruppe"], ["teil", "Einzelteil"], ["kunde", "Kunde"],
    ["lager", "Lagerort"], ["status", "Status"], ["proz", "Fortschritt"], ["balken", ""], ["stand", "Stand"]
],

tabelleNeu: function (parent, klasse) {

    const tab = this.el(parent, "table", "kom-dash " + (klasse || ""));
    const gruppe = this.el(tab, "colgroup");
    this.dashSpalten.forEach(([art]) => this.el(gruppe, "col", "kom-c-" + art));
    return tab;
},

kopfzeileBauen: function (parent) {

    const tab = this.tabelleNeu(parent, "kom-kopfzeile");
    const tr = this.el(this.el(tab, "thead"), "tr");
    this.dashSpalten.forEach(([art, titel]) => {
        this.el(tr, "th", art === "proz" ? "kom-zahl" : (art === "lager" ? "kom-mitte" : ""), titel);
    });
},

zelle: function (tr, wert, klasse, titel, spannt) {

    const td = this.el(tr, "td", klasse || "", wert);
    if (titel) td.title = this.text(titel);
    if (spannt) td.colSpan = spannt;
    return td;
},

statusZelle: function (tr, w) {

    const td = this.el(tr, "td");
    this.el(td, "span", "kom-statusmarke " + this.statusKlasse(w), w.status);
},

balkenZelle: function (tr, w) {

    const td = this.el(tr, "td");
    const balken = this.el(td, "div", "kom-balken");
    this.el(balken, "span").style.width = Math.round(w.prozent * 100) + "%";
    balken.title = this.prozentText(w.prozent);
},

/* Klappen merken (R-DB4) und diese Karte neu zeichnen. */
klappKnopf: function (td, offen, name, umschalten) {

    const b = this.el(td, "button", "kom-klapp", offen ? "▾" : "▸");
    b.type = "button";
    b.title = "Auf- oder zuklappen";
    b.setAttribute("aria-label", this.text(name) + " auf- oder zuklappen");
    b.onclick = umschalten;
},

nameKnopf: function (td, name, umschalten) {

    const b = this.el(td, "button", "kom-name", name);
    b.type = "button";
    b.onclick = umschalten;
},

karteZeichnen: function (karte, d) {

    karte.replaceChildren();

    const a = d.a;
    const tab = this.tabelleNeu(karte);
    const koerper = this.el(tab, "tbody");
    const neu = () => this.karteZeichnen(karte, d);
    const abUmschalten = () => { d.offen = !d.offen; this.gemerkt[d.schluessel] = d.offen; neu(); };

    /* AB-Zeile: Nummer, Verkaufsartikel, Kunde */
    const tr = this.el(koerper, "tr", "kom-dab " + this.statusKlasse(a.w));
    const hatUnter = d.gruppen.length > 0;
    const td1 = this.el(tr, "td");
    if (hatUnter) this.klappKnopf(td1, d.offen, a.o.ab_anzeige, abUmschalten);
    const td2 = this.el(tr, "td", "", undefined);
    td2.colSpan = 3;
    td2.title = this.text(a.o.ab_anzeige) + "   " + this.text(a.o.verkaufsartikel);
    if (hatUnter) this.nameKnopf(td2, a.o.ab_anzeige, abUmschalten);
    else this.el(td2, "span", "kom-ab-nr", a.o.ab_anzeige);
    this.el(td2, "span", "kom-ab-text", a.o.verkaufsartikel);
    this.zelle(tr, a.o.kunde, "", a.o.kunde);
    this.zelle(tr, "", "kom-mitte");
    this.statusZelle(tr, a.w);
    this.zelle(tr, this.prozentText(a.w.prozent), "kom-zahl");
    this.balkenZelle(tr, a.w);
    this.zelle(tr, a.w.fortschritt);

    if (!d.offen) return;

    d.gruppen.forEach(g => {
        const gUmschalten = () => { g.offen = !g.offen; this.gemerkt[g.schluessel] = g.offen; neu(); };

        if (g.bg) {
            const b = g.bg;
            const btr = this.el(koerper, "tr", "kom-dbg");
            const k = this.el(btr, "td");
            if (g.teile.length) this.klappKnopf(k, g.offen, b.o.name, gUmschalten);
            this.zelle(btr, "");
            const nameZelle = this.zelle(btr, "", "", b.o.name, 2);
            if (g.teile.length) this.nameKnopf(nameZelle, b.o.name, gUmschalten);
            else nameZelle.textContent = this.text(b.o.name);
            this.zelle(btr, "");
            this.zelle(btr, "", "kom-mitte");
            this.statusZelle(btr, b.w);
            this.zelle(btr, this.prozentText(b.w.prozent), "kom-zahl");
            this.balkenZelle(btr, b.w);
            this.zelle(btr, b.w.fortschritt);
        } else {
            /* Teile ohne Baugruppe: eigene graue Zeile, damit man sie klappen kann */
            const otr = this.el(koerper, "tr", "kom-dbg kom-dohne");
            this.klappKnopf(this.el(otr, "td"), g.offen, "Teile ohne Baugruppe", gUmschalten);
            this.zelle(otr, "");
            const nameZelle = this.zelle(otr, "", "", undefined, 2);
            this.nameKnopf(nameZelle, "Teile ohne Baugruppe", gUmschalten);
            this.zelle(otr, "", undefined, undefined, 5);
            this.zelle(otr, g.teile.length + (g.teile.length === 1 ? " Teil" : " Teile"), "kom-leise");
        }

        if (!g.offen) return;

        g.teile.forEach(t => {
            const ttr = this.el(koerper, "tr", "kom-dteil " + this.statusKlasse(t.w));
            this.zelle(ttr, "", undefined, undefined, 3);
            const tz = this.zelle(ttr, "", "", this.text(t.o.zeichnungsnummer) + "   " + this.text(t.o.benennung));
            this.el(tz, "span", "kom-ab-nr", t.o.zeichnungsnummer);
            this.el(tz, "span", "kom-ab-text", t.o.benennung);
            this.zelle(ttr, "");
            this.zelle(ttr, this.text(t.o.lagerort), "kom-mitte");
            this.statusZelle(ttr, t.w);
            this.zelle(ttr, this.prozentText(t.w.prozent), "kom-zahl");
            this.balkenZelle(ttr, t.w);
            this.zelle(ttr, t.w.fortschritt);
        });
    });
},
