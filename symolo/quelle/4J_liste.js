/* ===========================================================================
   LISTE: die Karten-Liste von Dashboard, Forecast und Planung (R-DB1, R-F8)
   Eine Karte je AB mit Baugruppen und Teilen, gleiche Spalten in Kopfzeile
   und jeder Karte. Welche Spalten es gibt, legt die Ansicht in
   listeSpalten fest: [[Art, Titel]]. Arten:
     klapp, ab, bg, teil, kunde, station, lager, status, termin, proz,
     balken, stand, planung
   Die Ansicht rechnet (Sortieren, Filtern in 4A/4G/4H), diese Datei zeichnet.

   Zustand, den die Ansicht führt: abs, suche, kunde, ansichtWahl, sortierung,
   gemerkt (R-DB4), markenZeilen/marken (Planung), listeHeute (Tageszahl).
   Der Klappzustand (Ansicht und Auf-/Zuklappen) bleibt im Browser dieses
   Geräts gespeichert (localStorage, laut Skill für solche Zustände erlaubt).
   OFFEN (Symolo): Je Benutzer auf jedem Gerät geht erst mit einer Tabelle
   (Benutzer, Ansicht, Schlüssel) und der Benutzer-Anbindung.
   =========================================================================== */

suche: "",
kunde: "Alle",
ansichtWahl: "bg",
sortierung: "ab",
zeitraum: "30",
gemerkt: {},

abs: [],
alleAbs: [],
markenZeilen: [],
marken: {},
listeHeute: 0,
listeSpalten: [],
listeStation: false,
imSwJeAb: {},

kopfEl: null,
meldungEl: null,
listeEl: null,
sucheEl: null,
kundeEl: null,
sortEl: null,
terminEl: null,
ansichtKnoepfe: {},

/* ---------------------------------------------------------------------------
   Leiste: Suche, Knöpfe, Auswahlfelder
   felder: Reihenfolge, z. B. ["suche", "termin", "knoepfe", "kunde"]
   --------------------------------------------------------------------------- */

listeLeisteBauen: function (felder) {

    this.klappenLaden();
    const leiste = this.el(this.koerper, "div", "kom-leiste");

    felder.forEach(f => {
        if (f === "suche") this.listeSucheBauen(leiste);

        if (f === "knoepfe") {
            const knoepfe = this.el(leiste, "div", "kom-knopfgruppe");
            this.dashAnsichten.forEach(([wert, titel]) => {
                this.ansichtKnoepfe[wert] = this.knopf(knoepfe, titel, () => {
                    /* R-DB4: Ansicht umstellen = Startzustand der neuen Ansicht */
                    this.ansichtWahl = wert;
                    this.gemerkt = {};
                    this.klappenMerken();
                    this.zeichnen();
                });
            });
        }

        if (f === "sort") {
            this.sortEl = this.auswahlBauen(leiste, "Sortieren", this.listeSortierungen, this.sortierung, w => {
                this.sortierung = w;
                this.zeichnen();
            });
        }

        if (f === "termin") {
            this.terminEl = this.auswahlBauen(leiste, "Liefertermin",
                this.fcZeitraeume.map(z => [z[0], z[1]]), this.zeitraum, w => {
                    this.zeitraum = w;
                    this.zeichnen();
                });
        }

        if (f === "kunde") {
            this.kundeEl = this.auswahlBauen(leiste, "Kunde", [[this.dashAlleKunden, this.dashAlleKunden]], this.kunde, w => {
                this.kunde = w;
                this.zeichnen();
            });
        }
    });
},

listeSucheBauen: function (leiste) {

    const suchFeld = this.el(leiste, "label", "kom-feld kom-suchfeld");
    this.el(suchFeld, "span", "kom-feldname", "AB-Suche");
    const zeile = this.el(suchFeld, "span", "kom-suchzeile");
    this.sucheEl = this.el(zeile, "input", "kom-eingabe");
    this.sucheEl.type = "search";
    this.sucheEl.placeholder = "Teil der AB-Nummer";
    this.sucheEl.onkeydown = e => { if (e.key === "Enter") this.suchen(); };
    this.sucheEl.onsearch = () => { if (this.sucheEl.value === "") this.suchen(); };
    this.knopf(zeile, "Suchen", () => this.suchen(), "haupt");
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

/* Filter zurücksetzen (Knopf "Alle zeigen"). */
alleZeigen: function () {

    this.suche = this.sucheEl.value = "";
    this.kunde = this.dashAlleKunden;
    if (this.terminEl) this.zeitraum = "alle";
    this.zeichnen();
},

/* Kunden aus den geladenen ABs; ein unbekannter Kunde zählt als "Alle".
   Stellt auch die Auswahl der Knöpfe ein. */
listeFelderEinstellen: function (abs) {

    const kunden = this.dashKunden(abs);
    const gleich = kunden.find(k => k.toLowerCase() === this.dashText(this.kunde));
    this.kunde = gleich || this.dashAlleKunden;
    this.auswahlFuellen(this.kundeEl, kunden.map(k => [k, k]), this.kunde);

    Object.keys(this.ansichtKnoepfe).forEach(w => {
        this.ansichtKnoepfe[w].classList.toggle("kom-gewaehlt", w === this.ansichtWahl);
    });

    if (this.terminEl) this.auswahlFuellen(this.terminEl, this.fcZeitraeume.map(z => [z[0], z[1]]), this.zeitraum);
    if (this.sortEl) this.auswahlFuellen(this.sortEl, this.listeSortierungen, this.sortierung);
},

/* ---------------------------------------------------------------------------
   Liste zeichnen: aus dem Zustand, nie aus den Rohdaten (Skill, Ablauf 6)
   --------------------------------------------------------------------------- */

/* leerText: Satz, wenn es gar nichts gibt. gefiltert: Filter sind gesetzt. */
listeZeichnen: function (liste, leerText, gefiltert) {

    this.meldungEl.replaceChildren();
    this.listeEl.replaceChildren();

    if (liste.length === 0) {
        if (gefiltert) {
            this.meldungEl.textContent = "Keine Einträge" + (this.suche ? " für „" + this.suche + "“" : "") + ". ";
            this.knopf(this.meldungEl, "Alle zeigen", () => this.alleZeigen());
        } else {
            this.el(this.listeEl, "div", "kom-leer", leerText);
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

/* ---------------------------------------------------------------------------
   Tabelle: gleiche Spalten in Kopfzeile und jeder Karte (R-DB1)
   --------------------------------------------------------------------------- */

tabelleNeu: function (parent, klasse) {

    const tab = this.el(parent, "table", "kom-dash " + (klasse || ""));
    const gruppe = this.el(tab, "colgroup");
    this.listeSpalten.forEach(([art]) => this.el(gruppe, "col", "kom-c-" + art));
    return tab;
},

kopfzeileBauen: function (parent) {

    const tab = this.tabelleNeu(parent, "kom-kopfzeile");
    const tr = this.el(this.el(tab, "thead"), "tr");
    this.listeSpalten.forEach(([art, titel]) => {
        this.el(tr, "th", art === "proz" ? "kom-zahl" : (art === "lager" || art === "planung" ? "kom-mitte" : ""), titel);
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

/* R-F6: Liefertermin eines AB: Datum (überfällig als Hinweis) oder "kein Termin". */
terminZelle: function (tr, d) {

    const td = this.el(tr, "td");

    if (d.termin === null || d.termin === undefined) {
        this.el(td, "span", "kom-leise", "kein Termin");
        return;
    }

    this.el(td, "b", "", this.tagText(d.termin));
    if (d.termin < this.listeHeute) this.el(td, "span", "kom-klein", " überfällig");
},

/* Häkchen "Planung" (gemeinsam für Dashboard, Forecast, Planung). */
planungZelle: function (tr, d) {

    const td = this.el(tr, "td", "kom-mitte");
    const label = this.el(td, "label", "kom-haken");
    const box = this.el(label, "input");
    box.type = "checkbox";
    box.checked = Boolean(d.geplant);
    box.disabled = !this.schreibenErlaubt();
    box.title = box.disabled ? "Speichern noch gesperrt" : "Zur Planung vormerken";
    box.setAttribute("aria-label", this.text(d.a.o.ab_anzeige) + " zur Planung vormerken");
    box.onchange = () => { this.planungHaken(d, box); };
},

/* Häkchen setzen oder entfernen und neu zeichnen. */
planungHaken: async function (d, box) {

    const an = box.checked;
    box.disabled = true;

    const ok = await this.sicher(() => this.plSetzen(this.markenZeilen, this.text(d.a.o.ab_schluessel), an, this.alleAbs));
    if (ok === false) this.statusZeigen("Diesen Arbeitsauftrag gibt es nicht (mehr).", "fehler");

    if (ok !== null) {
        const zeilen = await this.sicher(() => this.plMarkenLaden());
        if (zeilen !== null) {
            this.markenZeilen = zeilen;
            this.marken = this.plAktive(zeilen);
        }
    }

    this.zeichnen();
},

/* R-DB4: Ansicht und Klappzustand im Browser merken. Ohne Speicher (privates Fenster, gesperrt) gilt
   der Startzustand, wie bisher nur solange das Fenster offen ist. */
klappenSchluessel: function () {

    return "kom." + this.ansicht.name + ".klappen";
},

klappenLaden: function () {

    try {
        const z = JSON.parse(window.localStorage.getItem(this.klappenSchluessel()) || "null");
        if (!z || typeof z !== "object") return;
        if (this.dashAnsichten.some(a => a[0] === z.ansicht)) this.ansichtWahl = z.ansicht;
        this.gemerkt = z.gemerkt && typeof z.gemerkt === "object" ? z.gemerkt : {};
    } catch (fehler) {
        /* kein Speicher: Startzustand */
    }
},

klappenMerken: function () {

    try {
        window.localStorage.setItem(this.klappenSchluessel(), JSON.stringify({ ansicht: this.ansichtWahl, gemerkt: this.gemerkt }));
    } catch (fehler) {
        /* kein Speicher: nur solange das Fenster offen ist */
    }
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

/* Eine Zeile der Karte. art: "ab", "bg", "ohne" (Teile ohne Baugruppe), "teil".
   k: { knoten (mit o und w), d, g, klapp: { zeigen, offen, name, umschalten },
   name: Text oder null, namensZelle: Funktion(td) }. Die Zellen folgen
   listeSpalten; Namen und Klappknopf stehen über mehrere Spalten. */
zeileBauen: function (tr, art, k) {

    const s = this.listeSpalten.map(x => x[0]);
    const leer = (klasse, spannt) => this.zelle(tr, "", klasse, undefined, spannt);
    let i = 0;

    while (i < s.length) {
        const spalte = s[i];

        if (spalte === "klapp") {
            if (art === "teil") { leer("", 3); i += 3; continue; }
            const td = this.el(tr, "td");
            if (k.klapp) this.klappKnopf(td, k.klapp.offen, k.klapp.name, k.klapp.umschalten);
        } else if (spalte === "ab") {
            if (art === "ab") {
                const td = this.zelle(tr, "", "", this.text(k.knoten.o.ab_anzeige) + "   " + this.text(k.knoten.o.verkaufsartikel), 3);
                if (k.klapp) this.nameKnopf(td, k.knoten.o.ab_anzeige, k.klapp.umschalten);
                else this.el(td, "span", "kom-ab-nr", k.knoten.o.ab_anzeige);
                this.el(td, "span", "kom-ab-text", k.knoten.o.verkaufsartikel);
                i += 3;
                continue;
            }
            leer();
        } else if (spalte === "bg") {
            if (art === "bg" || art === "ohne" || art === "sw") {
                const td = this.zelle(tr, "", "", art === "bg" ? k.knoten.o.name : undefined, 2);
                if (art === "sw") td.textContent = this.text(k.sw.baugruppe);
                else if (art === "bg" && k.klapp) this.nameKnopf(td, k.knoten.o.name, k.klapp.umschalten);
                else if (art === "bg") td.textContent = this.text(k.knoten.o.name);
                else this.nameKnopf(td, "Teile ohne Baugruppe", k.klapp.umschalten);
                i += 2;
                continue;
            }
            leer();
        } else if (spalte === "teil") {
            const t = k.knoten;
            const td = this.zelle(tr, "", "", this.text(t.o.zeichnungsnummer) + "   " + this.text(t.o.benennung));
            this.el(td, "span", "kom-ab-nr", t.o.zeichnungsnummer);
            this.el(td, "span", "kom-ab-text", t.o.benennung);
        } else if (spalte === "kunde") {
            if (art === "ab") this.zelle(tr, k.knoten.o.kunde, "", k.knoten.o.kunde);
            else leer();
        } else if (spalte === "station") {
            const wert = art === "ab" ? k.d.station : (art === "bg" ? k.g.station : "");
            this.zelle(tr, wert || "");
        } else if (spalte === "lager") {
            let wert = "";
            if (this.listeStation) {
                if (art === "ab") wert = k.d.ort;
                if (art === "bg") wert = k.g.ort;
                if (art === "teil") wert = k.knoten.ort;
            } else if (art === "teil") {
                wert = this.text(k.knoten.o.lagerort);
            }
            this.zelle(tr, wert, "kom-mitte", wert);
        } else if (spalte === "status") {
            if (art === "sw") {
                const m = this.el(this.el(tr, "td"), "button", "kom-statusmarke kom-schweissen kom-statusknopf", "Schweißen");
                m.type = "button";
                m.title = "Im Schweißen ansehen";
                m.onclick = () => this.bereichOeffnen("schweissen", { suche: this.text(k.sw.ab_nr) });
            }
            else if (art === "ohne") leer();
            else this.statusZelle(tr, k.knoten.w);
        } else if (spalte === "termin") {
            if (art === "ab") this.terminZelle(tr, k.d);
            else leer();
        } else if (spalte === "proz") {
            if (art === "ohne" || art === "sw") leer();
            else this.zelle(tr, this.prozentText(k.knoten.w.prozent), "kom-zahl");
        } else if (spalte === "balken") {
            if (art === "ohne" || art === "sw") leer();
            else this.balkenZelle(tr, k.knoten.w);
        } else if (spalte === "stand") {
            if (art === "sw") leer();
            else if (art === "ohne") this.zelle(tr, k.g.teile.length + (k.g.teile.length === 1 ? " Teil" : " Teile"), "kom-leise");
            else this.zelle(tr, k.knoten.w.fortschritt);
        } else if (spalte === "planung") {
            if (art === "ab") this.planungZelle(tr, k.d);
            else leer("kom-mitte");
        }

        i++;
    }
},

karteZeichnen: function (karte, d) {

    karte.replaceChildren();

    const a = d.a;
    const tab = this.tabelleNeu(karte, d.ampel ? "kom-ampel kom-ampel-" + d.ampel : "");
    const koerper = this.el(tab, "tbody");
    const neu = () => this.karteZeichnen(karte, d);
    /* Baugruppen dieses AB, die einzeln im Schweißen liegen */
    const imSw = this.imSwJeAb[this.text(a.o.ab_schluessel)] || [];
    const abUmschalten = () => { d.offen = !d.offen; this.gemerkt[d.schluessel] = d.offen; this.klappenMerken(); neu(); };

    /* AB-Zeile: Nummer, Verkaufsartikel, Kunde */
    const tr = this.el(koerper, "tr", "kom-dab " + this.statusKlasse(a.w));
    this.zeileBauen(tr, "ab", {
        knoten: a, d: d,
        klapp: d.gruppen.length > 0 || imSw.length > 0 ? { offen: d.offen, name: a.o.ab_anzeige, umschalten: abUmschalten } : null
    });

    if (!d.offen) return;

    d.gruppen.forEach(g => {
        const gUmschalten = () => { g.offen = !g.offen; this.gemerkt[g.schluessel] = g.offen; this.klappenMerken(); neu(); };

        if (g.bg) {
            const btr = this.el(koerper, "tr", "kom-dbg");
            this.zeileBauen(btr, "bg", {
                knoten: g.bg, d: d, g: g,
                klapp: g.teile.length ? { offen: g.offen, name: g.bg.o.name, umschalten: gUmschalten } : null
            });
        } else {
            /* Teile ohne Baugruppe: eigene graue Zeile, damit man sie klappen kann */
            const otr = this.el(koerper, "tr", "kom-dbg kom-dohne");
            this.zeileBauen(otr, "ohne", {
                knoten: {}, d: d, g: g,
                klapp: { offen: g.offen, name: "Teile ohne Baugruppe", umschalten: gUmschalten }
            });
        }

        if (!g.offen) return;

        g.teile.forEach(t => {
            const ttr = this.el(koerper, "tr", "kom-dteil " + this.statusKlasse(t.w));
            this.zeileBauen(ttr, "teil", { knoten: t, d: d, g: g, klapp: null });
        });
    });

    imSw.forEach(z => {
        const str = this.el(koerper, "tr", "kom-dsw");
        const td = this.el(str, "td", "kom-kacheln");
        td.colSpan = this.listeSpalten.length;
        this.rotKnopf(td, "▶ " + this.text(z.baugruppe) + " befindet sich im Schweißen", "Im Schweißen ansehen",
            () => this.bereichOeffnen("schweissen", { suche: this.text(z.ab_nr) }));
    });
},
