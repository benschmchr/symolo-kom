/* ===========================================================================
   ANSICHT: Bestandsliste
   Eine Karte je AB (Entwurf D): AB-Zeile, Teile ohne BG, Baugruppen mit
   ihren Teilen. Suche, Status-Filter, Sortierung, Knöpfe ABs/BGs/Alles,
   Schalter "Weitere Spalten". Status und Fortschritt rechnet 45_rechnen.js.
   Eintragen (Phase 2): Vorhanden (Doppelklick = Soll, nochmal 0), Status
   antippen, alles ✓ an AB/BG, Lagerort an AB/BG, Rechtsklick auf einen AB:
   AB bearbeiten (Soll). Entnehmen und "Befinden sich im Schweißen" kommen
   in Phase 6, Archivieren und Protokoll in Phase 4.

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
kartenJeAb: {},

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
    this.kartenJeAb = {};
    sichtbar.forEach(a => {
        const karte = this.el(inhalt, "section", "kom-karte");
        this.kartenJeAb[String(a.o._id)] = karte;
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

    if (this.nurAb !== null) sichtbar = sichtbar.filter(a => String(a.o._id) === String(this.nurAb));

    sichtbar = this.bestandSortieren(sichtbar, this.sortierung);

    sichtbar.forEach((a, i) => {
        if (this.nurAb !== null) {
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
    } else if (this.nurAb !== null) {
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

/* Status als Knopf: Teil antippen = Vorhanden = Soll (R-M2), AB/BG = alles ✓ (R-M3). */
statusZelle: function (tr, w, klick, titel) {

    const td = this.el(tr, "td");
    if (!klick) {
        this.el(td, "span", "kom-statusmarke " + this.statusKlasse(w), w.status);
        return;
    }
    const b = this.el(td, "button", "kom-statusmarke kom-statusknopf " + this.statusKlasse(w), w.status);
    b.type = "button";
    b.title = titel;
    b.onclick = klick;
},

/* Lagerort an AB oder BG (R-L1, R-L4): Auswahl statt Tippen. Teile haben
   keine eigene Auswahl, sie bekommen den Platz automatisch. */
platzZelle: function (tr, ab, bg) {

    const o = bg ? bg.o : ab.o;
    const wert = this.text(o.lagerort);
    const aktiv = this.platzGueltig(wert) ? this.platzNorm(wert) : wert;
    const td = this.el(tr, "td", "kom-mitte");
    const sel = this.el(td, "select", "kom-platzwahl");
    sel.title = "Lagerort " + this.text(bg ? bg.o.name : ab.o.ab_anzeige) + " (gilt für alles darunter)";

    const option = (parent, w, text) => { const x = this.el(parent, "option", "", text); x.value = w; return x; };

    /* Erst nur der aktuelle Platz; die ganze Liste beim ersten Antippen
       (spart bei vielen ABs tausende Elemente). */
    option(sel, aktiv, aktiv || "–");
    const fuellen = () => {
        if (sel.options.length > 1) return;
        sel.replaceChildren();
        option(sel, "", "–");
        ["L", "R"].forEach(seite => {
            const gruppe = this.el(sel, "optgroup");
            gruppe.label = seite === "L" ? "Links" : "Rechts";
            [1, 2, 3, 4, 5, 6].forEach(n => option(gruppe, seite + n, seite + n + (seite + n === "R3" ? " · Sperrlager" : "")));
        });
        if (aktiv && this.regalPlaetze.indexOf(aktiv) < 0) option(sel, aktiv, aktiv);
        option(sel, "__frei__", "Anderer Platz …");
        sel.value = aktiv;
    };
    sel.onmousedown = fuellen;
    sel.onfocus = fuellen;
    sel.ontouchstart = fuellen;

    sel.onchange = () => {
        let neu = sel.value;
        sel.value = aktiv;
        if (neu === "__frei__") {
            neu = this.text(window.prompt("Anderer Platz (kein Regalfach), z. B. „Kiste 4“:", ""));
            if (!neu) return;
            const p = this.platzEingabe(neu);
            if (p && !this.platzGueltig(p) && !window.confirm("„" + p + "“ ist kein Regalplatz (L1–L6, R1–R6). Trotzdem eintragen? " +
                "Er steht dann im Regal unter „Sonstiges“.")) return;
        }
        const name = bg ? this.text(ab.o.ab_anzeige) + "_BG" + this.text(bg.o.kurz) : this.text(ab.o.ab_anzeige);
        this.abAendern(ab, async () => {
            const p = bg ? await this.lagerortBg(ab, bg, neu, false) : await this.lagerortAb(ab, neu);
            return name + ": " + (p ? "Platz " + p : "kein Platz mehr") + ".";
        });
    };
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
        () => { this.nurAb = a.o._id; this.anzeigen(); });   /* Doppelklick: nur dieser AB */

    /* Rechtsklick auf den AB oder eine seiner Zeilen: AB-Menü */
    karte.oncontextmenu = e => { e.preventDefault(); this.abMenue(a); };

    const kunde = this.text(a.o.kunde);
    this.zelle(tr, this.text(a.o.verkaufsartikel) + (kunde ? " · " + kunde : ""), "", a.o.verkaufsartikel);
    this.zelle(tr, "");
    this.zelle(tr, "");
    this.zelle(tr, "", "kom-zahl");
    this.platzZelle(tr, a, null);
    this.statusZelle(tr, a.w, a.w.anzTeile ? () => this.allesFragen(a, a, "AB " + this.text(a.o.ab_anzeige)) : null,
        "Antippen: alle Teile auf Soll setzen (bei Komplett: auf 0)");
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

    a.ohne.forEach(t => { if (t.zeigen) this.teilZeile(kopf, t, a); });

    a.bgs.forEach(b => {
        if (!b.zeigen) return;
        const block = this.el(tab, "tbody", "kom-bg-block");
        const btr = this.el(block, "tr", "kom-bg " + this.statusKlasse(b.w));

        this.klappZellen(btr, b.o.name, b.offen, b.teile.length ? () => { b.offen = !b.offen; neu(); } : null);
        this.zelle(btr, b.o.zeichnungsnummer, "", b.o.zeichnungsnummer);
        this.zelle(btr, b.o.lk_nummer, "kom-zahl");
        this.zelle(btr, this.sollText(b.o), "kom-zahl");
        this.zelle(btr, "", "kom-zahl");
        this.platzZelle(btr, a, b);
        this.statusZelle(btr, b.w, b.teile.length ? () => this.allesFragen(a, b, "Baugruppe " + this.text(b.o.name)) : null,
            "Antippen: alle Teile auf Soll setzen (bei Komplett: auf 0)");
        this.zelle(btr, b.w.fortschritt);
        this.balkenZelle(btr, b.w);
        this.zelle(btr, this.datumText(b.w.eingelagert));
        this.zelle(btr, this.datumText(b.w.komplett));
        this.mehrZellen(btr, b.o);

        if (b.offen) b.teile.forEach(t => { if (t.zeigen) this.teilZeile(block, t, a); });
    });
},

teilZeile: function (parent, t, a) {

    const tr = this.el(parent, "tr", "kom-teil " + this.statusKlasse(t.w));
    const o = t.o;
    const vh = o.vorhanden === null || o.vorhanden === undefined || o.vorhanden === "" ? "" : this.zahlText(this.mengeMilli(o.vorhanden));

    this.zelle(tr, "");
    this.zelle(tr, o.zeichnungsnummer, "", o.zeichnungsnummer);
    this.zelle(tr, o.benennung, "", o.benennung);
    this.zelle(tr, o.lk_nummer, "kom-zahl");
    this.zelle(tr, this.sollText(o), "kom-zahl");
    this.vorhandenZelle(tr, t, a, vh);
    this.zelle(tr, this.text(o.lagerort) || "–", "kom-mitte kom-leise");
    const hatSoll = !(o.menge_gesamt === null || o.menge_gesamt === undefined || o.menge_gesamt === "");
    this.statusZelle(tr, t.w, hatSoll ? () => this.abAendern(a, () => this.teilUmschalten(t)) : null,
        "Antippen: Vorhanden = Soll (bei Komplett: 0)");
    this.zelle(tr, t.w.fortschritt);
    this.balkenZelle(tr, t.w);
    this.zelle(tr, this.datumText(t.w.eingelagert));
    this.zelle(tr, this.datumText(t.w.komplett));
    this.mehrZellen(tr, o);
},

/* Vorhanden eintragen (R-M1): gespeichert wird beim Verlassen oder mit Enter.
   Doppelklick: Soll eintragen, noch einmal: 0 (Ben, 14.10.2026). */
vorhandenZelle: function (tr, t, a, vh) {

    const td = this.el(tr, "td", "kom-zahl");
    const f = this.el(td, "input", "kom-eingabe kom-vh");
    f.type = "text";
    f.inputMode = "numeric";
    f.autocomplete = "off";
    f.value = vh;
    f.setAttribute("aria-label", "Vorhanden " + this.text(t.o.zeichnungsnummer));

    const speichern = () => {
        if (this.text(f.value) === vh) return;
        const e = this.mengeEingabe(f.value, true);
        if (e.fehler) {
            f.classList.add("kom-ungueltig");
            f.title = e.fehler;
            this.statusZeigen(e.fehler, "fehler");
            return;
        }
        f.classList.remove("kom-ungueltig");
        this.abAendern(a, () => this.vorhandenSetzen(t, e.milli));
    };

    f.onchange = speichern;
    f.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); f.blur(); } };
    f.ondblclick = () => {
        const soll = this.sollText(t.o);
        if (soll === "" || this.mengeMilli(t.o.menge_gesamt) % 1000 !== 0) return;
        f.value = this.text(f.value) === soll ? "0" : soll;
        speichern();
    };
},

/* ---------------------------------------------------------------------------
   Ändern: Aufgabe ausführen, AB neu laden, Karte und Zähler neu zeichnen
   --------------------------------------------------------------------------- */

/* aufgabe liefert optional eine Meldung (Hinweis oder Bestätigung). */
abAendern: async function (ab, aufgabe) {

    const meldung = await this.sicher(aufgabe);
    await this.abNeuLaden(ab);
    if (meldung) this.statusZeigen(meldung, meldung.indexOf("Achtung") === 0 ? "fehler" : "");
    else if (meldung === "") this.statusZeigen("Gespeichert.");   /* null = Fehler, steht schon da */
},

/* Nur diesen AB neu lesen; Klappen und Treffer bleiben, wie sie waren. */
abNeuLaden: async function (ab) {

    const neu = await this.sicher(() => this.bestandLaden([ab.o._id]));
    const i = this.abs.indexOf(ab);
    if (!neu || i < 0) return;

    if (neu.length === 0) {
        this.abs.splice(i, 1);   /* nicht mehr in der Bestandsliste */
        this.zeichnen();
        return;
    }

    const n = neu[0];
    const alt = {};
    this.bestandZeilen(ab).forEach(z => { alt[z.art + String(z.o._id)] = z; });
    this.bestandZeilen(n).forEach(z => {
        const vorher = alt[z.art + String(z.o._id)];
        if (vorher) { z.zeigen = vorher.zeigen; if ("offen" in vorher) z.offen = vorher.offen; }
    });
    this.abs[i] = n;

    this.zaehlerZeichnen();
    const karte = this.kartenJeAb[String(n.o._id)];
    if (!karte) return;

    /* Fokus behalten: wer mit Tab zum nächsten Feld gesprungen ist, tippt dort weiter. */
    const fokus = document.activeElement;
    const label = fokus && karte.contains(fokus) ? fokus.getAttribute("aria-label") : null;
    this.karteZeichnen(karte, n);
    if (label) {
        const felder = karte.getElementsByTagName("input");
        for (let k = 0; k < felder.length; k++) {
            if (felder[k].getAttribute("aria-label") === label) { felder[k].focus(); felder[k].select(); break; }
        }
    }
},

/* R-M3: alles ✓ an AB oder BG, immer mit Rückfrage (am Handy tippt man leicht daneben). */
allesFragen: function (ab, knoten, name) {

    const frage = knoten.w.status === "Komplett"
        ? name + " ist komplett.\n\nAlle Mengen darunter auf 0 setzen (Status Offen)?"
        : "Alle Teile von " + name + " auf Soll setzen?\n(Teile mit größerer Menge behalten ihre Menge.)";
    if (!window.confirm(frage)) return;

    this.abAendern(ab, async () => {
        const n = await this.allesSetzen(knoten);
        return name + ": " + n + (n === 1 ? " Teil" : " Teile") + " eingetragen.";
    });
},

/* Rechtsklick auf einen AB */
abMenue: function (ab) {

    this.menueZeigen(this.text(ab.o.ab_anzeige), [
        ["AB bearbeiten (Soll ändern)", () => this.sollDialog(ab)],
        ["Nur diesen AB anzeigen", () => { this.nurAb = ab.o._id; this.anzeigen(); }]
    ]);
},

/* AB bearbeiten: Soll ("Menge Gesamt") der Teile ändern. Absichtlich nur
   über das AB-Menü. Fehler stehen am Feld; gespeichert wird nur ohne Fehler. */
sollDialog: function (ab) {

    const teile = this.bestandTeile(ab);
    if (teile.length === 0) {
        this.statusZeigen("Dieser AB hat keine Teile.");
        return;
    }

    this.dialogZeigen("AB bearbeiten: " + this.text(ab.o.ab_anzeige), (inhalt, knoepfe) => {
        this.el(inhalt, "p", "kom-leise", "Soll (Menge Gesamt) ändern. Zahlen ab 0, Komma erlaubt (z. B. 0,06).");
        const tab = this.el(inhalt, "table", "kom-tabelle kom-soll-tabelle");
        const kopf = this.el(this.el(tab, "thead"), "tr");
        ["Baugruppe", "Zeichnungsnummer", "Benennung", "Soll"].forEach((x, i) => this.el(kopf, "th", i === 3 ? "kom-zahl" : "", x));
        const koerper = this.el(tab, "tbody");

        const felder = teile.map(t => {
            const tr = this.el(koerper, "tr");
            const bg = ab.bgs.find(b => b.teile.indexOf(t) > -1);
            this.el(tr, "td", "", bg ? bg.o.name : "(ohne BG)");
            this.el(tr, "td", "", t.o.zeichnungsnummer);
            this.el(tr, "td", "", t.o.benennung);
            const td = this.el(tr, "td", "kom-zahl");
            const f = this.el(td, "input", "kom-eingabe kom-vh");
            f.type = "text";
            f.inputMode = "decimal";
            f.value = this.mengeGleich(t.o.menge_gesamt, null) ? "" : this.zahlText(this.mengeMilli(t.o.menge_gesamt));
            const fehler = this.el(td, "div", "kom-feldfehler");
            return [t, f, fehler];
        });

        this.knopf(knoepfe, "Speichern", () => {
            let ok = true;
            const neu = felder.map(([t, f, fehler]) => {
                const e = this.mengeEingabe(f.value, false);
                fehler.textContent = e.fehler;
                f.classList.toggle("kom-ungueltig", Boolean(e.fehler));
                if (e.fehler) ok = false;
                return [t, e.milli];
            });
            if (!ok) return;
            this.dialogSchliessen();
            this.abAendern(ab, async () => {
                const n = await this.sollSetzen(neu);
                return this.text(ab.o.ab_anzeige) + ": " + (n ? "Soll bei " + n + (n === 1 ? " Teil" : " Teilen") + " geändert." : "nichts geändert.");
            });
        }, "haupt");
        this.knopf(knoepfe, "Abbrechen", () => this.dialogSchliessen(), "rot");
    });
},
