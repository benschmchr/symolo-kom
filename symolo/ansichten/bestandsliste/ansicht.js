/* ===========================================================================
   ANSICHT: Bestandsliste (Phase 1: nur lesen)
   Eine Karte je AB (Entwurf D): AB-Zeile, Teile ohne BG, Baugruppen mit
   ihren Teilen. Suche, Status-Filter, Sortierung, Knöpfe ABs/BGs/Alles,
   Schalter "Weitere Spalten". Status und Fortschritt rechnet 45_rechnen.js.
   Eintragen (Vorhanden, Lagerort, AB bearbeiten) kommt in Phase 2,
   Entnehmen und "Befinden sich im Schweißen" in Phase 6.

   Schnell auch bei vielen ABs: Zeilen unter einem AB werden erst gebaut,
   wenn der AB aufgeklappt ist.
   =========================================================================== */

abs: [],
suche: "",
anzeige: "alles",
statusWahl: "alle",
sortierung: "import",
nurAb: null,

zaehlerEl: null,
meldungEl: null,
listeEl: null,
sucheEl: null,
statusWahlEl: null,
sortEl: null,
anzeigeKnoepfe: {},

before_set_values: async function (form, { data }) {

    const parent = this.ctrlbyBind("_output").SelfElement;

    /* Erst das Gerüst, dann die Daten (Skill, Vertrag). */
    this.geruestBauen(parent);
    this.leisteBauen();
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
   Leiste: Zähler, Suche, Status, Sortierung, Knöpfe
   --------------------------------------------------------------------------- */

leisteBauen: function () {

    const oben = this.el(this.koerper, "div", "kom-oben");
    this.zaehlerEl = this.el(oben, "div", "kom-zaehler");

    const leiste = this.el(oben, "div", "kom-leiste");

    /* Suche: Enter oder Lupe. Leere Suche zeigt wieder alles. */
    const suchFeld = this.el(leiste, "label", "kom-feld kom-suchfeld");
    this.el(suchFeld, "span", "kom-feldname", "Suche");
    const zeile = this.el(suchFeld, "span", "kom-suchzeile");
    this.sucheEl = this.el(zeile, "input", "kom-eingabe");
    this.sucheEl.type = "search";
    this.sucheEl.placeholder = "AB, Zeichnungsnr., Benennung, LK oder Lagerort";
    this.sucheEl.onkeydown = e => { if (e.key === "Enter") this.suchen(); };
    this.sucheEl.onsearch = () => { if (this.sucheEl.value === "") this.suchen(); };
    this.knopf(zeile, "Suchen", () => this.suchen(), "haupt");

    this.statusWahlEl = this.auswahlBauen(leiste, "Status", this.bestandStatusWahl, this.statusWahl, w => {
        this.statusWahl = w;
        this.suche = this.sucheEl.value = "";
        this.anzeigen();
    });

    this.sortEl = this.auswahlBauen(leiste, "Sortierung", this.bestandSortierungen, this.sortierung, w => {
        this.sortierung = w;
        this.anzeigen();
    });

    const knoepfe = this.el(leiste, "div", "kom-knopfgruppe");
    this.bestandAnzeigen.forEach(([wert, titel]) => {
        this.anzeigeKnoepfe[wert] = this.knopf(knoepfe, titel, () => {
            this.anzeige = wert;
            this.statusWahl = this.statusWahlEl.value = "alle";
            this.suche = this.sucheEl.value = "";
            this.nurAb = null;
            this.anzeigen();
        });
    });

    const schalter = this.el(leiste, "label", "kom-schalter");
    const box = this.el(schalter, "input");
    box.type = "checkbox";
    box.onchange = () => { this.koerper.classList.toggle("kom-mehr-an", box.checked); };
    this.el(schalter, "span", "", "Weitere Spalten");

    this.meldungEl = this.el(this.koerper, "div", "kom-hinweis");
    this.listeEl = this.el(this.koerper, "div", "kom-liste");
},

auswahlBauen: function (parent, titel, werte, wert, wechsel) {

    const feld = this.el(parent, "label", "kom-feld");
    this.el(feld, "span", "kom-feldname", titel);
    const sel = this.el(feld, "select", "kom-eingabe");

    werte.forEach(([w, t]) => {
        const o = this.el(sel, "option", "", t);
        o.value = w;
    });

    sel.value = wert;
    sel.onchange = () => wechsel(sel.value);
    return sel;
},

/* R-A3: Die Suche setzt Anzeige und Status zurück. */
suchen: function () {

    this.suche = this.text(this.sucheEl.value);
    this.anzeige = "alles";
    this.statusWahl = this.statusWahlEl.value = "alle";
    this.nurAb = null;
    this.anzeigen();
},

/* Nach jeder Auswahl: neu zeichnen, ohne neu zu laden. */
anzeigen: function () {

    this.zeichnen();
},

/* ---------------------------------------------------------------------------
   Zeichnen: aus dem Zustand, nie aus den Rohdaten (Skill, Ablauf 6)
   --------------------------------------------------------------------------- */

zeichnen: function () {

    this.infoZeigen();
    this.zaehlerZeichnen();

    Object.keys(this.anzeigeKnoepfe).forEach(w => {
        this.anzeigeKnoepfe[w].classList.toggle("kom-gewaehlt", w === this.anzeige && !this.suche && this.statusWahl === "alle");
    });

    const sichtbar = this.sichtbareAbs();
    this.listeEl.replaceChildren();

    if (sichtbar.length === 0) {
        if (!this.meldungEl.textContent) {
            this.el(this.listeEl, "div", "kom-leer",
                "Keine Arbeitsaufträge in der Bestandsliste. Entweder ist die Liste leer oder sie konnte nicht gelesen werden (siehe Meldung unten).");
        }
        return;
    }

    /* Erst ohne Eltern bauen, dann auf einmal einhängen: viel schneller
       bei vielen Zeilen, weil der Browser nur einmal neu rechnet. */
    const inhalt = this.el(null, "div", "kom-liste-inhalt");
    this.kopfzeileBauen(inhalt);
    sichtbar.forEach(a => {
        const karte = this.el(inhalt, "section", "kom-karte");
        this.karteZeichnen(karte, a);
    });
    this.listeEl.replaceChildren(inhalt);
},

zaehlerZeichnen: function () {

    const z = this.bestandZaehler(this.abs);
    this.zaehlerEl.replaceChildren();

    this.el(this.zaehlerEl, "span", "kom-pille", "Arbeitsaufträge: " + z.ab + " gesamt");
    this.el(this.zaehlerEl, "span", "kom-pille kom-komplett", z.komplett + " komplett");
    this.el(this.zaehlerEl, "span", "kom-pille kom-teilweise", z.teilweise + " teilweise");
    this.el(this.zaehlerEl, "span", "kom-pille kom-offen", z.offen + " offen");
},

/* Suche oder Filter anwenden, sortieren, Startzustand der Klappen setzen
   (wie bestand/views.py, Funktion liste). */
sichtbareAbs: function () {

    const q = this.suche;
    let meldung = "";

    this.abs.forEach(a => this.bestandZeilen(a).forEach(z => { z.zeigen = true; }));

    if (q) {
        if (!this.bestandSuchen(this.abs, q)) meldung = "Kein Treffer für „" + q + "“.";
    } else if (this.anzeige !== "alles" || this.statusWahl !== "alle") {
        if (!this.bestandFiltern(this.abs, this.anzeige, this.statusWahl)) meldung = "Keine Einträge für diese Auswahl.";
    }

    const gefiltert = Boolean(q) || this.anzeige !== "alles" || this.statusWahl !== "alle";
    let sichtbar = gefiltert ? this.abs.filter(a => a.zeigen) : this.abs.slice();

    if (this.nurAb) sichtbar = sichtbar.filter(a => a === this.nurAb);

    sichtbar = this.bestandSortieren(sichtbar, this.sortierung);

    sichtbar.forEach((a, i) => {
        if (this.nurAb) {
            a.offen = true;
        } else if (this.anzeige === "ab" || this.anzeige === "bg") {
            a.offen = this.anzeige === "bg";   /* "ABs": alles zu; "BGs": ABs auf, Baugruppen zu */
        } else {
            a.offen = Boolean(q) || this.statusWahl !== "alle" || i === 0;   /* sonst nur der erste AB offen */
        }
        a.bgs.forEach(b => {
            b.offen = (this.anzeige === "ab" || this.anzeige === "bg")
                ? false
                : Boolean(q) || this.statusWahl !== "alle" || b.w.status !== "Komplett";
        });
    });

    this.meldungEl.replaceChildren();
    if (meldung) {
        this.meldungEl.textContent = meldung + " ";
        this.knopf(this.meldungEl, "Alles anzeigen", () => this.allesZeigen());
    } else if (this.nurAb) {
        this.meldungEl.textContent = "Nur dieser AB wird angezeigt. ";
        this.knopf(this.meldungEl, "Alle ABs anzeigen", () => this.allesZeigen());
    }

    return sichtbar;
},

allesZeigen: function () {

    this.suche = this.sucheEl.value = "";
    this.anzeige = "alles";
    this.statusWahl = this.statusWahlEl.value = "alle";
    this.nurAb = null;
    this.anzeigen();
},

/* ---------------------------------------------------------------------------
   Tabelle: gleiche Spalten in Kopfzeile und jeder Karte
   --------------------------------------------------------------------------- */

bestandSpalten: [
    ["klapp", ""], ["nr", "AB / Zeichnungsnummer"], ["ben", "Benennung"], ["lk", "LK"], ["soll", "Soll"],
    ["vh", "Vorhanden"], ["lager", "Lagerort"], ["status", "Status"], ["fort", "Fortschritt"], ["balken", ""],
    ["datum", "Eingelagert"], ["datum", "Komplett"],
    ["mbg", "Menge / BG", true], ["idx", "Index", true], ["text", "Arbeitsgang", true], ["text", "Material", true],
    ["text", "Profil", true], ["text", "Abmaße", true], ["text", "Bemerkung", true]
],

tabelleNeu: function (parent, klasse) {

    const tab = this.el(parent, "table", "kom-bestand " + (klasse || ""));
    const gruppe = this.el(tab, "colgroup");
    this.bestandSpalten.forEach(([art, , mehr]) => this.el(gruppe, "col", "kom-c-" + art + (mehr ? " kom-mehr" : "")));
    return tab;
},

kopfzeileBauen: function (parent) {

    const tab = this.tabelleNeu(parent, "kom-kopfzeile");
    const tr = this.el(this.el(tab, "thead"), "tr");
    this.bestandSpalten.forEach(([art, titel, mehr]) => {
        const zahl = art === "lk" || art === "soll" || art === "vh" || art === "mbg";
        this.el(tr, "th", (zahl ? "kom-zahl" : "") + (mehr ? " kom-mehr" : ""), titel);
    });
},

/* Eine Zelle; leere Werte bleiben leer (wie die bisherige Liste). */
zelle: function (tr, wert, klasse, titel) {

    const td = this.el(tr, "td", klasse || "", wert);
    if (titel) td.title = this.text(titel);
    return td;
},

statusZelle: function (tr, w) {

    const td = this.el(tr, "td");
    this.el(td, "span", "kom-statusmarke " + this.statusKlasse(w), w.status);
},

balkenZelle: function (tr, w) {

    const td = this.el(tr, "td");
    const balken = this.el(td, "div", "kom-balken");
    const fuell = this.el(balken, "span");
    fuell.style.width = Math.round(w.prozent * 100) + "%";
    balken.title = Math.round(w.prozent * 100) + " %";
},

/* Klapp-Knopf (▾/▸) und Name als Knopf: Einfachklick klappt. */
klappZellen: function (tr, name, offen, klappen, doppel) {

    const td1 = this.el(tr, "td");
    const td2 = this.el(tr, "td");
    td2.title = this.text(name);

    if (!klappen) {
        td2.textContent = this.text(name);
        return;
    }

    const pfeil = this.el(td1, "button", "kom-klapp", offen ? "▾" : "▸");
    pfeil.type = "button";
    pfeil.title = "Auf- oder zuklappen";
    pfeil.onclick = klappen;

    const nameKnopf = this.el(td2, "button", "kom-name", name);
    nameKnopf.type = "button";
    nameKnopf.onclick = klappen;
    if (doppel) nameKnopf.ondblclick = doppel;
},

mehrZellen: function (tr, o) {

    this.zelle(tr, o.menge_bg, "kom-zahl kom-mehr");
    this.zelle(tr, o.index, "kom-mehr");
    ["arbeitsgang", "material", "profil", "abmasse", "bemerkung"].forEach(f => this.zelle(tr, o[f], "kom-mehr", o[f]));
},

/* Eine AB-Karte. Wird beim Auf- und Zuklappen neu gezeichnet. */
karteZeichnen: function (karte, a) {

    karte.replaceChildren();

    const tab = this.tabelleNeu(karte);
    const kopf = this.el(tab, "tbody");
    const hatUnter = this.bestandZeilen(a).some(z => z !== a && z.zeigen);

    /* AB-Zeile */
    const tr = this.el(kopf, "tr", "kom-ab " + this.statusKlasse(a.w));
    const neu = () => this.karteZeichnen(karte, a);
    this.klappZellen(tr, a.o.ab_anzeige, a.offen,
        hatUnter ? () => { a.offen = !a.offen; neu(); } : null,
        () => { this.nurAb = a; this.anzeigen(); });   /* Doppelklick: nur dieser AB */

    const kunde = this.text(a.o.kunde);
    this.zelle(tr, this.text(a.o.verkaufsartikel) + (kunde ? " · " + kunde : ""), "", a.o.verkaufsartikel);
    this.zelle(tr, "");
    this.zelle(tr, "");
    this.zelle(tr, "", "kom-zahl");
    this.zelle(tr, a.o.lagerort, "kom-mitte");
    this.statusZelle(tr, a.w);
    this.zelle(tr, a.w.fortschritt);
    this.balkenZelle(tr, a.w);
    this.zelle(tr, this.datumText(a.w.eingelagert));
    this.zelle(tr, this.datumText(a.w.komplett));
    this.zelle(tr, "", "kom-mehr");
    this.zelle(tr, "", "kom-mehr");
    this.zelle(tr, kunde ? "Kunde: " + kunde : "", "kom-mehr");
    this.zelle(tr, this.text(a.o.haupt_ab) ? "Haupt-AB: " + this.text(a.o.haupt_ab) : "", "kom-mehr");
    this.zelle(tr, this.text(a.o.ersteller) ? "Ersteller: " + this.text(a.o.ersteller) : "", "kom-mehr");
    this.zelle(tr, this.text(a.o.datum_liste) ? "Datum: " + this.text(a.o.datum_liste) : "", "kom-mehr");
    this.zelle(tr, this.text(a.o.dispoliste) ? "Dispoliste: " + this.text(a.o.dispoliste) : "", "kom-mehr", a.o.dispoliste);

    if (!a.offen) return;

    a.ohne.forEach(t => { if (t.zeigen) this.teilZeile(kopf, t); });

    a.bgs.forEach(b => {
        if (!b.zeigen) return;
        const block = this.el(tab, "tbody", "kom-bg-block");
        const btr = this.el(block, "tr", "kom-bg " + this.statusKlasse(b.w));

        this.klappZellen(btr, b.o.name, b.offen, b.teile.length ? () => { b.offen = !b.offen; neu(); } : null);
        this.zelle(btr, b.o.zeichnungsnummer, "", b.o.zeichnungsnummer);
        this.zelle(btr, b.o.lk_nummer, "kom-zahl");
        this.zelle(btr, this.sollText(b.o), "kom-zahl");
        this.zelle(btr, "", "kom-zahl");
        this.zelle(btr, b.o.lagerort, "kom-mitte");
        this.statusZelle(btr, b.w);
        this.zelle(btr, b.w.fortschritt);
        this.balkenZelle(btr, b.w);
        this.zelle(btr, this.datumText(b.w.eingelagert));
        this.zelle(btr, this.datumText(b.w.komplett));
        this.mehrZellen(btr, b.o);

        if (b.offen) b.teile.forEach(t => { if (t.zeigen) this.teilZeile(block, t); });
    });
},

teilZeile: function (parent, t) {

    const tr = this.el(parent, "tr", "kom-teil " + this.statusKlasse(t.w));
    const o = t.o;
    const vh = o.vorhanden === null || o.vorhanden === undefined || o.vorhanden === "" ? "" : this.zahlText(this.mengeMilli(o.vorhanden));

    this.zelle(tr, "");
    this.zelle(tr, o.zeichnungsnummer, "", o.zeichnungsnummer);
    this.zelle(tr, o.benennung, "", o.benennung);
    this.zelle(tr, o.lk_nummer, "kom-zahl");
    this.zelle(tr, this.sollText(o), "kom-zahl");
    this.zelle(tr, vh, "kom-zahl");
    this.zelle(tr, this.text(o.lagerort) || "–", "kom-mitte kom-leise");
    this.statusZelle(tr, t.w);
    this.zelle(tr, t.w.fortschritt);
    this.balkenZelle(tr, t.w);
    this.zelle(tr, this.datumText(t.w.eingelagert));
    this.zelle(tr, this.datumText(t.w.komplett));
    this.mehrZellen(tr, o);
},
