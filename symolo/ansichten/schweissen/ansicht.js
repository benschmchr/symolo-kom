/* ===========================================================================
   ANSICHT: Schweißen (R-W5 bis R-W10)
   Alles, was ins Schweißen entnommen wurde: ganze ABs (mit Baugruppen und
   Teilen) und einzelne Baugruppen. Eintragen (gilt für alles darunter):
   Mitarbeiter, Arbeitsplatz, Liefertermin Stahlbau, Termin Versand.
   "Zurück" schiebt einen AB oder eine Baugruppe in die Bestandsliste,
   "Archivieren" legt einen ganzen AB ins Archiv. "Mitarbeiter verwalten"
   pflegt die Namensliste. Rechnen und Speichern: 4F, 4K, 4L, 4N.

   Nach jeder Änderung wird neu gelesen und gezeichnet; Klappen, Suche und
   Fokus bleiben. Fehler stehen am Feld (rot umrandet), das Feld bleibt.

   Die roten Kacheln springen in die Bestandsliste (bereichOeffnen, 60_anzeige.js).
   OFFEN (Symolo): Der Wechsel zwischen Formularen ist in Symolo noch nicht angebunden.
   =========================================================================== */

zeilen: [],
bloecke: [],
plaetze: [],
namen: [],
komBgs: {},

suche: "",
anzeige: "ab",
fMit: "",
fPlatz: "",
sortierung: "",
klapp: {},

zaehlerEl: null,
meldungEl: null,
listeEl: null,
sucheEl: null,
mitEl: null,
platzEl: null,
sortEl: null,
anzeigeKnoepfe: {},

/* Die Spalten, wie im Excel-Blatt Schweißen. Der vierte Wert "mehr": nur mit dem Schalter. */
swSpalten: [
    ["klapp", ""], ["nr", "AB / Zeichnungsnummer"], ["ben", "Benennung"], ["lk", "LK"], ["soll", "Soll"],
    ["swm", "Mitarbeiter"], ["swp", "Arbeitsplatz"], ["datum", "Eingelagert"], ["datum", "Entnommen"],
    ["swt", "Liefertermin Stahlbau"], ["swt", "Termin Versand"], ["dlz", "DLZ (Tage)"],
    ["mbg", "Menge / BG", true], ["idx", "Index", true], ["text", "Arbeitsgang", true], ["text", "Material", true],
    ["text", "Profil", true], ["text", "Abmaße", true], ["text", "Bemerkung", true], ["aktion", ""]
],

before_set_values: async function (form, { data }) {

    const parent = this.ctrlbyBind("_output").SelfElement;

    /* Erst das Gerüst, dann die Daten (Skill, Vertrag). */
    this.geruestBauen(parent);
    this.leisteBauen();
    const start = this.startOptionen();
    if (start.suche) this.suche = this.sucheEl.value = this.text(start.suche);   /* Sprung aus einem anderen Bereich */
    this.fussKnopf("Neu laden", "Laden", () => this.laden());
    this.nurMitRecht(this.fussKnopf("Mitarbeiter verwalten", "Mitarbeiter", () => this.verwaltenDialog()), "kom.schweissen.bearbeiten");

    await this.laden();
},

/* Alles frisch lesen: Zeilen, Plätze, Namen, dazu die Baugruppen, die einzeln im Schweißen liegen und deren AB
   noch Baugruppen in der Bestandsliste hat. */
datenHolen: async function () {

    const [zeilen, plaetze, namen] = await Promise.all([this.swLesen(), this.swPlaetzeLaden(), this.swMitarbeiterNamen()]);
    const bloecke = this.swBloecke(zeilen);

    const sammlungen = this.swSammeln(bloecke).filter(x => x.sammlung);
    await this.swSammlungenErgaenzen(sammlungen);
    const komBgs = {};
    sammlungen.forEach(s => { komBgs[s.schluessel] = s.komBgs; });

    return { zeilen: zeilen, plaetze: plaetze, namen: namen, bloecke: bloecke, komBgs: komBgs };
},

uebernehmen: function (d) {

    this.zeilen = d.zeilen;
    this.plaetze = d.plaetze;
    this.namen = d.namen;
    this.bloecke = d.bloecke;
    this.komBgs = d.komBgs;
    this.auswahlEinstellen();
},

laden: async function () {

    this.datenHinweise = [];
    this.statusZeigen("Lade …");

    const d = await this.sicher(() => this.datenHolen());
    if (d !== null) {
        this.uebernehmen(d);
        this.statusZeigen(this.swZaehler(this.bloecke).ab + " Arbeitsaufträge im Schweißen geladen.");
    }

    this.zeichnen();
},

/* Nach einer Änderung: neu lesen und zeichnen; der Fokus bleibt auf dem Feld. */
nachladen: async function () {

    const fokus = document.activeElement;
    const label = fokus && this.listeEl.contains(fokus) ? fokus.getAttribute("aria-label") : null;

    const d = await this.sicher(() => this.datenHolen());
    if (d !== null) this.uebernehmen(d);
    this.zeichnen();

    if (label) {
        ["input", "select", "button"].forEach(art => {
            const felder = this.listeEl.getElementsByTagName(art);
            for (let i = 0; i < felder.length; i++) {
                if (felder[i].getAttribute("aria-label") === label) { felder[i].focus(); return; }
            }
        });
    }
},

/* ---------------------------------------------------------------------------
   Leiste: Zähler, Suche, Filter, Sortierung, Knöpfe
   --------------------------------------------------------------------------- */

leisteBauen: function () {

    const oben = this.el(this.koerper, "div", "kom-oben");
    this.zaehlerEl = this.el(oben, "div", "kom-zaehler");
    this.el(oben, "p", "kom-leise",
        "Mitarbeiter, Arbeitsplatz und Termine hier eintragen; sie gelten für alles darunter. Termine z. B. 15.10.2026, " +
        "15.10. oder 151026. „Zurück“ schiebt einen AB oder eine Baugruppe wieder in die Bestandsliste. " +
        "Den Hallenplan gibt es im Bereich „Arbeitsplätze“.");

    const leiste = this.el(oben, "div", "kom-leiste");

    const suchFeld = this.el(leiste, "label", "kom-feld kom-suchfeld");
    this.el(suchFeld, "span", "kom-feldname", "Suche");
    const zeile = this.el(suchFeld, "span", "kom-suchzeile");
    this.sucheEl = this.el(zeile, "input", "kom-eingabe");
    this.sucheEl.type = "search";
    this.sucheEl.placeholder = "AB, Zeichnungsnr., Benennung, LK, Mitarbeiter oder Platz";
    this.sucheEl.onkeydown = e => { if (e.key === "Enter") this.suchen(); };
    this.sucheEl.onsearch = () => { if (this.sucheEl.value === "") this.suchen(); };
    this.knopf(zeile, "Suchen", () => this.suchen(), "haupt");

    const knoepfe = this.el(leiste, "div", "kom-knopfgruppe");
    this.swAnzeigen.forEach(([wert, titel]) => {
        this.anzeigeKnoepfe[wert] = this.knopf(knoepfe, titel, () => {
            this.anzeige = wert;
            this.klapp = {};
            this.zeichnen();
        });
    });

    this.mitEl = this.auswahlBauen(leiste, "Mitarbeiter", [["", "Alle"]], this.fMit, w => {
        this.fMit = w;
        this.klapp = {};
        this.zeichnen();
    });
    this.platzEl = this.auswahlBauen(leiste, "Arbeitsplatz", [["", "Alle"]], this.fPlatz, w => {
        this.fPlatz = w;
        this.klapp = {};
        this.zeichnen();
    });
    this.sortEl = this.auswahlBauen(leiste, "Sortieren", this.swSortierungen, this.sortierung, w => {
        this.sortierung = w;
        this.zeichnen();
    });

    const schalter = this.el(leiste, "label", "kom-schalter");
    const box = this.el(schalter, "input");
    box.type = "checkbox";
    box.onchange = () => { this.koerper.classList.toggle("kom-mehr-an", box.checked); };
    this.el(schalter, "span", "", "Weitere Spalten");

    this.meldungEl = this.el(this.koerper, "div", "kom-hinweis");
    this.listeEl = this.el(this.koerper, "div", "kom-liste");
},

/* Filterlisten aus den Namen und Plätzen (dazu alles, was in den Zeilen vorkommt). */
auswahlEinstellen: function () {

    const namen = this.namen.slice();
    this.zeilen.forEach(z => this.swMitarbeiterListe(z.m).forEach(n => {
        if (!namen.some(x => x.toLowerCase() === n.toLowerCase())) namen.push(n);
    }));
    namen.sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : (a.toLowerCase() > b.toLowerCase() ? 1 : 0)));
    if (this.fMit && !namen.some(x => x.toLowerCase() === this.fMit.toLowerCase())) this.fMit = "";

    const plaetze = this.plaetze.map(p => this.text(p.name));
    if (plaetze.indexOf(this.swSonstiges) < 0) plaetze.push(this.swSonstiges);
    if (this.fPlatz && !plaetze.some(x => this.hpKlein(x) === this.hpKlein(this.fPlatz))) this.fPlatz = "";

    this.auswahlFuellen(this.mitEl, [["", "Alle"]].concat(namen.map(n => [n, n])), this.fMit);
    this.auswahlFuellen(this.platzEl, [["", "Alle"]].concat(plaetze.map(p => [p, p])), this.fPlatz);
},

suchen: function () {

    this.suche = this.text(this.sucheEl.value);
    this.klapp = {};
    this.zeichnen();
},

allesZeigen: function () {

    this.suche = this.sucheEl.value = "";
    this.fMit = this.mitEl.value = "";
    this.fPlatz = this.platzEl.value = "";
    this.klapp = {};
    this.zeichnen();
},

/* ---------------------------------------------------------------------------
   Zeichnen: aus dem Zustand, nie aus den Rohdaten (Skill, Ablauf 6)
   --------------------------------------------------------------------------- */

zaehlerZeichnen: function () {

    const z = this.swZaehler(this.bloecke);
    this.zaehlerEl.replaceChildren();

    this.el(this.zaehlerEl, "span", "kom-pille", "Arbeitsaufträge im Schweißen: " + z.ab);
    if (z.einzeln) {
        this.el(this.zaehlerEl, "span", "kom-pille", "davon " + z.einzeln + (z.einzeln === 1 ? " einzelne Baugruppe" : " einzelne Baugruppen"));
    }
},

gefiltert: function () {

    return Boolean(this.suche) || Boolean(this.fMit) || Boolean(this.fPlatz);
},

/* Aufgeklappt? Was man geklickt hat, gilt; sonst der Startzustand (R-W10):
   Suche oder Filter öffnen alles, "ABs" lässt alles zu, "BGs" öffnet die ABs, "Alles" öffnet alles. */
istOffen: function (schluessel, stufe) {

    if (schluessel in this.klapp) return this.klapp[schluessel];
    if (this.gefiltert()) return true;
    return stufe === "bg" ? this.anzeige === "alles" : this.anzeige !== "ab";
},

/* Suche, Filter, Sortierung anwenden und die Blöcke zu Blöcken und Sammlungen ordnen. */
sichtbareListe: function () {

    this.swAllesZeigen(this.bloecke);
    let meldung = "";

    if (this.suche && !this.swSuchen(this.bloecke, this.suche)) meldung = "Kein Treffer für „" + this.suche + "“.";

    let bloecke = this.swBlockFiltern(this.bloecke.filter(b => b.zeigen), this.fMit, this.fPlatz);
    if (!meldung && this.gefiltert() && bloecke.length === 0) meldung = "Keine Einträge für diese Auswahl.";
    if (this.sortierung) bloecke = this.swBlockSortieren(bloecke, this.sortierung);

    const liste = this.swSammeln(bloecke);
    liste.forEach(x => { if (x.sammlung) x.komBgs = this.komBgs[x.schluessel] || []; });

    this.meldungEl.replaceChildren();
    if (meldung) {
        this.meldungEl.textContent = meldung + " ";
        this.knopf(this.meldungEl, "Alles anzeigen", () => this.allesZeigen());
    }

    return liste;
},

zeichnen: function () {

    this.infoZeigen();
    this.zaehlerZeichnen();

    Object.keys(this.anzeigeKnoepfe).forEach(w => {
        this.anzeigeKnoepfe[w].classList.toggle("kom-gewaehlt", w === this.anzeige && !this.gefiltert());
    });

    const liste = this.sichtbareListe();
    this.listeEl.replaceChildren();

    if (liste.length === 0) {
        if (!this.gefiltert()) {
            this.el(this.listeEl, "div", "kom-leer",
                "Im Schweißen liegt noch nichts. In der Bestandsliste bei einem AB oder einer Baugruppe mit Status " +
                "„Komplett“ auf „Entnehmen“ tippen.");
        }
        return;
    }

    /* Erst ohne Eltern bauen, dann auf einmal einhängen (schnell bei vielen Zeilen). */
    const inhalt = this.el(null, "div", "kom-liste-inhalt");
    this.kopfzeileBauen(inhalt);
    liste.forEach(x => {
        const karte = this.el(inhalt, "section", "kom-karte");
        this.karteZeichnen(karte, x);
    });
    this.listeEl.replaceChildren(inhalt);
},

/* ---------------------------------------------------------------------------
   Tabelle
   --------------------------------------------------------------------------- */

tabelleNeu: function (parent, klasse) {

    const tab = this.el(parent, "table", "kom-bestand " + (klasse || ""));
    const gruppe = this.el(tab, "colgroup");
    this.swSpalten.forEach(([art, , mehr]) => this.el(gruppe, "col", "kom-c-" + art + (mehr ? " kom-mehr" : "")));
    return tab;
},

kopfzeileBauen: function (parent) {

    const tab = this.tabelleNeu(parent, "kom-kopfzeile");
    const tr = this.el(this.el(tab, "thead"), "tr");
    this.swSpalten.forEach(([art, titel, mehr]) => {
        const zahl = art === "lk" || art === "soll" || art === "mbg" || art === "dlz";
        this.el(tr, "th", (zahl ? "kom-zahl" : "") + (mehr ? " kom-mehr" : "") + (art === "aktion" ? " kom-aktion" : ""), titel);
    });
},

/* Eine Karte: ein Block (AB oder Einzelblock) oder eine Sammlung. Beim Klappen wird nur sie neu gezeichnet. */
karteZeichnen: function (karte, x) {

    karte.replaceChildren();
    const neu = () => this.karteZeichnen(karte, x);
    const tab = this.tabelleNeu(karte);

    if (x.sammlung) this.sammlungZeichnen(tab, x, neu);
    else this.blockZeichnen(tab, x, neu);
},

/* Ein ganzer AB: AB-Zeile, Teile ohne BG, Baugruppen mit Teilen. */
blockZeichnen: function (tab, b, neu) {

    const kopf = this.el(tab, "tbody");
    const a = b.ab;
    const schluessel = "a" + String(a._id);
    const hatUnter = b.ohne.concat(...b.bgs.map(g => [g.bg].concat(g.teile))).some(z => z.zeigen);
    const offen = this.istOffen(schluessel, "ab");
    const k = a.kopfObj || {};
    const kunde = this.text(k.kunde);

    this.zeileBauen(kopf, a, "ab", {
        name: a.anzeige, zweite: this.text(a.benennung) || this.text(k.verkaufsartikel) + (kunde ? " · " + kunde : ""),
        offen: offen, archivieren: true,
        klappen: hatUnter ? () => { this.klapp[schluessel] = !offen; neu(); } : null
    });

    if (!offen) return;

    b.ohne.forEach(t => { if (t.zeigen) this.zeileBauen(kopf, t, "teil", {}); });

    b.bgs.forEach(g => {
        if (!g.bg.zeigen) return;
        const block = this.el(tab, "tbody", "kom-bg-block");
        const gs = "g" + String(g.bg._id);
        const gOffen = this.istOffen(gs, "bg");

        this.zeileBauen(block, g.bg, "bg", {
            name: g.bg.baugruppe, zweite: g.bg.zeichnungsnummer, offen: gOffen,
            klappen: g.teile.length ? () => { this.klapp[gs] = !gOffen; neu(); } : null
        });
        if (gOffen) g.teile.forEach(t => { if (t.zeigen) this.zeileBauen(block, t, "teil", {}); });
    });
},

/* Sammlung (Ben, 15.10.): Baugruppen eines AB, die einzeln im Schweißen liegen, unter einer AB-Überschrift;
   darunter die Baugruppen, die noch in der Bestandsliste stehen, als rote Kacheln. */
sammlungZeichnen: function (tab, s, neu) {

    const kopf = this.swSammlungKopf(s);
    const schluessel = "s" + s.schluessel;
    const offen = this.istOffen(schluessel, "ab");
    const klappen = () => { this.klapp[schluessel] = !offen; neu(); };

    const koerper = this.el(tab, "tbody");
    const tr = this.el(koerper, "tr", "kom-ab kom-sammlung");
    this.klappZellen(tr, kopf.anzeige, offen, klappen);
    this.zelle(tr, kopf.benennung + (kopf.kunde ? " · " + kopf.kunde : ""), "", kopf.benennung, 2);
    this.zelle(tr, "Einzelne Baugruppen im Schweißen", "kom-leise", undefined, this.spaltenZaehlen(this.swSpalten).sichtbar - 4);
    this.mehrRest(tr, this.swSpalten);

    if (!offen) return;

    s.bloecke.forEach(b => {
        const g = b.bgs[0];
        const bs = "e" + String(g.bg._id);
        const bOffen = this.istOffen(bs, "bg");
        const block = this.el(tab, "tbody", "kom-bg-block");

        this.zeileBauen(block, g.bg, "bg", {
            name: g.bg.anzeige, zweite: g.bg.baugruppe, offen: bOffen, einzeln: true,
            klappen: g.teile.length ? () => { this.klapp[bs] = !bOffen; neu(); } : null
        });
        if (bOffen) g.teile.forEach(t => { if (t.zeigen) this.zeileBauen(block, t, "teil", {}); });
    });

    /* Ben, 16.10.: die roten Kacheln stehen immer unter den Baugruppen, die wirklich im Schweißen liegen. */
    if (offen && s.komBgs.length) {
        const ktr = this.el(this.el(tab, "tbody"), "tr", "kom-komzeile");
        const td = this.el(ktr, "td", "kom-kacheln");
        td.colSpan = this.spaltenZaehlen(this.swSpalten).sichtbar;
        s.komBgs.forEach(name => {
            this.rotKnopf(td, "◀ " + name + " befindet sich im Kommissionierlager", "In der Bestandsliste ansehen",
                () => this.bereichOeffnen("bestandsliste", { suche: kopf.anzeige }));
        });
        this.mehrRest(ktr, this.swSpalten);
    }
},

/* DLZ (R-W5): Termin Versand minus Eingelagert in Tagen, leer solange eins fehlt. */
swDlz: function (z) {

    return this.archivDlz(z.eingelagert, z.tv);
},

/* Eine Zeile. art: "ab", "bg", "teil". o: name, zweite (Spalte Benennung), offen, klappen, archivieren, einzeln. */
zeileBauen: function (parent, z, art, o) {

    const tr = this.el(parent, "tr", "kom-" + art + " " + z.css);
    tr.setAttribute("data-art", art);

    if (art === "teil") {
        this.zelle(tr, "");
        this.zelle(tr, z.zeichnungsnummer, "", z.zeichnungsnummer);
        this.zelle(tr, z.benennung, "", z.benennung);
    } else {
        this.klappZellen(tr, o.name, o.offen, o.klappen);
        this.zelle(tr, o.zweite, "", o.zweite);
    }

    this.zelle(tr, z.lk_nummer, "kom-zahl");
    this.zelle(tr, art === "ab" ? "" : this.text(z.menge_gesamt), "kom-zahl");

    if (art === "teil") {
        /* Ein Teil nimmt den Eintrag seiner Baugruppe an (R-W6): nur anzeigen. */
        this.zelle(tr, z.m, "kom-leise", z.m);
        this.zelle(tr, z.p, "kom-leise", z.p);
    } else {
        this.mitarbeiterZelle(tr, z);
        this.platzZelle(tr, z);
    }

    this.zelle(tr, this.datumText(z.eingelagert));
    this.zelle(tr, this.datumText(z.entnommen));

    if (art === "teil") {
        this.zelle(tr, this.swDatumAnzeige(z.lt), "kom-leise");
        this.zelle(tr, this.swDatumAnzeige(z.tv), "kom-leise");
    } else {
        this.datumZelle(tr, z, "liefertermin_stahlbau", "lt", "Liefertermin Stahlbau");
        this.datumZelle(tr, z, "termin_versand", "tv", "Termin Versand");
    }

    this.zelle(tr, this.swDlz(z), "kom-zahl");

    this.zelle(tr, art === "ab" ? "" : z.menge_bg, "kom-zahl kom-mehr");
    this.zelle(tr, z.index, "kom-mehr");
    ["arbeitsgang", "material", "profil", "abmasse", "bemerkung"].forEach(f => this.zelle(tr, z[f], "kom-mehr", z[f]));
    this.aktionZelle(tr, z, art, o);   /* ganz rechts wie bisher, bleibt beim Scrollen sichtbar */

    return tr;
},

/* ---------------------------------------------------------------------------
   Eintragen
   --------------------------------------------------------------------------- */

/* Datum zum Anzeigen: TT.MM.JJJJ, sonst der Text ("(verschieden)"). */
swDatumAnzeige: function (wert) {

    const t = this.text(wert);
    return this.tagNr(t) === null ? t : this.tagText(this.tagNr(t));
},

mitarbeiterZelle: function (tr, z) {

    const td = this.el(tr, "td");
    const b = this.el(td, "button", "kom-feldknopf", this.text(z.m) || "–");
    b.type = "button";
    b.title = (this.text(z.m) || "kein Mitarbeiter") + " (antippen zum Ändern)";
    b.setAttribute("aria-label", "Mitarbeiter " + this.swAnzeigename(z));
    b.onclick = () => this.mitarbeiterDialog(z);
    this.nurMitRecht(b, "kom.schweissen.bearbeiten");
},

platzZelle: function (tr, z) {

    const td = this.el(tr, "td");
    const sel = this.el(td, "select", "kom-platzwahl");
    sel.setAttribute("aria-label", "Arbeitsplatz " + this.swAnzeigename(z));

    const wert = this.text(z.p);
    const option = (w, text, aus) => { const x = this.el(sel, "option", "", text); x.value = w; x.disabled = Boolean(aus); };

    option("", "–");
    if (wert === this.swVerschieden) option("__v", this.swVerschieden, true);
    else if (wert && this.swPlatzFinden(wert, this.plaetze) === null) option("__alt", wert + " (kein Arbeitsplatz)", true);
    this.plaetze.forEach(p => option(this.text(p.name), this.text(p.name)));
    option(this.swSonstiges, this.swSonstiges);

    const aktuell = this.swPlatzFinden(wert, this.plaetze);
    sel.value = wert === this.swVerschieden ? "__v" : (aktuell !== null ? aktuell : (wert ? "__alt" : ""));
    sel.setAttribute("data-gespeichert", sel.value);
    sel.onchange = () => this.eintragen(z, "arbeitsplatz", sel.value, sel);
    this.nurMitRecht(sel, "kom.schweissen.bearbeiten");
},

/* Datum als Text (TT.MM.JJJJ, 15.10., 151026 …) und ein Kalender-Knopf. */
datumZelle: function (tr, z, feld, kurz, titel) {

    const td = this.el(tr, "td");
    const reihe = this.el(td, "span", "kom-sw-datumzelle");
    const wert = this.swDatumAnzeige(z[kurz]);

    const f = this.el(reihe, "input", "kom-eingabe");
    f.type = "text";
    f.inputMode = "numeric";
    f.autocomplete = "off";
    f.placeholder = "TT.MM.JJJJ";
    f.value = wert;
    f.setAttribute("data-gespeichert", wert);
    f.setAttribute("aria-label", titel + " " + this.swAnzeigename(z));

    const speichern = text => {
        if (this.text(text) === wert) return;
        f.classList.remove("kom-ungueltig");
        this.eintragen(z, feld, text, f);
    };
    f.onchange = () => speichern(f.value);
    f.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); f.blur(); } };
    this.nurMitRecht(f, "kom.schweissen.bearbeiten");

    /* Kalender: ein unsichtbares Datumsfeld, das der Knopf öffnet */
    const kal = this.el(reihe, "input", "kom-sw-kalender");
    kal.type = "date";
    kal.tabIndex = -1;
    const tag = this.tagNr(z[kurz]);
    if (tag !== null) kal.value = this.swTagIso(tag).slice(0, 10);
    kal.onchange = () => {
        const m = this.text(kal.value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) speichern(m[3] + "." + m[2] + "." + m[1]);
    };
    /* Eigenes Symbol statt Emoji: sieht auf jedem Gerät gleich aus. Nur mit "Weitere Spalten" sichtbar
       (Ben, 15.10.: sonst ist die Spalte zu schmal). */
    const b = window.symolo.tools.layout.create({ parent: reihe, type: "button", class: "kom-feldknopf kom-sw-kalenderknopf",
        html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" ' +
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/>' +
            '<path d="M3 10h18M8 3v4M16 3v4"/></svg>' });
    b.type = "button";
    b.title = "Datum wählen";
    b.setAttribute("aria-label", titel + " " + this.swAnzeigename(z) + ": Kalender");
    b.onclick = () => {
        try { kal.showPicker(); } catch (fehler) { kal.focus(); kal.click(); }
    };
    this.nurMitRecht(b, "kom.schweissen.bearbeiten");
},

aktionZelle: function (tr, z, art, o) {

    const td = this.el(tr, "td", "kom-aktion");
    if (art === "teil") return;

    const name = this.swAnzeigename(z);
    if (o.archivieren) {
        const b = this.knopf(td, "Archivieren", () => this.archivierenFragen(z), "klein");
        b.title = "Ganzen AB ins Archiv legen";
        b.setAttribute("aria-label", "Archivieren " + name);
        this.nurMitRecht(b, "kom.schweissen.bearbeiten");
    }
    const r = this.knopf(td, "Zurück", () => this.zurueckFragen(z), "klein");
    r.title = "Zurück in die Bestandsliste (Mitarbeiter, Arbeitsplatz und Termine gehen verloren)";
    r.setAttribute("aria-label", "Zurück " + name);
    this.nurMitRecht(r, "kom.schweissen.bearbeiten");
},

/* Ein Eintrag speichern (R-W6, R-W7). Bei einem Fehler bleibt die Meldung stehen, und das Feld zeigt
   wieder den gespeicherten Wert, damit nichts gespeichert aussieht, was es nicht ist (Prüfbericht B5). */
eintragen: async function (z, feld, text, feldEl) {

    const r = await this.sicher(() => this.swSetzen(z._id, feld, text));

    if (r === null) {
        if (feldEl && feldEl.hasAttribute && feldEl.hasAttribute("data-gespeichert")) {
            feldEl.value = feldEl.getAttribute("data-gespeichert");
        }
        return;
    }

    await this.nachladen();
    this.statusZeigen(r.alt === r.neu ? r.name + ": keine Änderung." : r.name + " " + this.swAnzeigename(r.zeile) + ": " + r.alt + " → " + r.neu);
},

/* Mehrere Mitarbeiter wählen (Häkchen); der Eintrag gilt für alles darunter. */
mitarbeiterDialog: function (z) {

    const aktuell = this.swMitarbeiterListe(z.m);
    const alle = this.namen.slice();
    aktuell.forEach(n => { if (!alle.some(x => x.toLowerCase() === n.toLowerCase())) alle.push(n); });

    this.dialogZeigen("Mitarbeiter: " + this.swAnzeigename(z), (inhalt, knoepfe) => {
        if (this.text(z.m) === this.swVerschieden) {
            this.el(inhalt, "p", "kom-leise", "Bisher verschieden. Die Auswahl gilt für alle Baugruppen.");
        }

        const liste = this.el(inhalt, "div", "kom-auswahl");
        const boxen = alle.map(n => {
            const label = this.el(liste, "label", "kom-schalter");
            const box = this.el(label, "input");
            box.type = "checkbox";
            box.value = n;
            box.checked = aktuell.some(x => x.toLowerCase() === n.toLowerCase());
            this.el(label, "span", "", n + (this.namen.some(x => x.toLowerCase() === n.toLowerCase()) ? "" : " (nicht in der Liste)"));
            return box;
        });
        if (!alle.length) {
            this.el(inhalt, "p", "kom-leise", "Noch keine Mitarbeiter in der Liste. Unten „Mitarbeiter verwalten“ wählen.");
        }

        this.knopf(knoepfe, "Übernehmen", () => {
            this.dialogSchliessen();
            this.eintragen(z, "mitarbeiter", boxen.filter(b => b.checked).map(b => b.value).join(this.swTrenner), null);
        }, "haupt");
        this.knopf(knoepfe, "Abbrechen", () => this.dialogSchliessen(), "rot");
    });
},

/* ---------------------------------------------------------------------------
   Mitarbeiter verwalten: eintragen und austragen (ausgetragene bleiben in der Datenbank)
   --------------------------------------------------------------------------- */

verwaltenDialog: async function () {

    const namen = await this.sicher(() => this.swMitarbeiterNamen());
    if (namen === null) return;
    this.namen = namen;

    this.dialogZeigen("Mitarbeiter verwalten", (inhalt, knoepfe) => {
        this.el(inhalt, "p", "kom-leise",
            "Die Namen erscheinen in der Auswahl „Mitarbeiter“. Ausgetragene Namen verschwinden aus der Liste; bereits " +
            "eingetragene Zuweisungen bleiben stehen.");

        const tab = this.el(inhalt, "table", "kom-tabelle");
        const koerper = this.el(tab, "tbody");
        if (!namen.length) this.el(inhalt, "p", "kom-leise", "Noch keine Mitarbeiter eingetragen.");

        namen.forEach(n => {
            const tr = this.el(koerper, "tr");
            this.el(tr, "td", "", n);
            const td = this.el(tr, "td", "kom-aktionen");
            const b = this.knopf(td, "Austragen", () => this.mitarbeiterAktion(() => this.swMitarbeiterWeg(n), n + " ausgetragen."), "klein");
            b.setAttribute("aria-label", n + " austragen");
        });

        const neu = this.el(inhalt, "label", "kom-feld");
        this.el(neu, "span", "kom-feldname", "Neuer Name");
        const reihe = this.el(neu, "span", "kom-suchzeile");
        const f = this.el(reihe, "input", "kom-eingabe");
        f.type = "text";
        f.maxLength = this.swMaxName;
        f.placeholder = "Vor- und Nachname";
        const fehler = this.el(inhalt, "div", "kom-feldfehler");
        const eintragen = () => this.mitarbeiterAktion(() => this.swMitarbeiterNeu(f.value), null, fehler);
        f.onkeydown = e => { if (e.key === "Enter") eintragen(); };
        this.knopf(reihe, "Eintragen", eintragen, "haupt");

        this.knopf(knoepfe, "Fertig", () => { this.dialogSchliessen(); this.nachladen(); }, "haupt");
        this.dialogFokus = f;
    });
},

/* Aktion ausführen und den Dialog mit der neuen Liste zeigen; Fehler stehen im Dialog. */
mitarbeiterAktion: async function (aufgabe, meldung, fehlerEl) {

    let name = null;
    try {
        name = await aufgabe();
    } catch (fehler) {
        if (fehlerEl) { fehlerEl.textContent = fehler.message; return; }
        this.statusZeigen(fehler.message, "fehler");
        return;
    }

    await this.verwaltenDialog();
    this.statusZeigen(meldung || (name + " eingetragen."));
},

/* ---------------------------------------------------------------------------
   Archivieren und Zurück (mit Sicherheitsfrage)
   --------------------------------------------------------------------------- */

archivierenFragen: async function (z) {

    const r = await this.sicher(() => this.swArchivierenPruefen(z._id));
    if (r === null) return;

    const name = this.text(z.ab_nr);

    this.dialogZeigen("AB archivieren", (inhalt, knoepfe) => {
        const p = this.el(inhalt, "p");
        this.el(p, "b", "", name);
        this.el(p, "span", "", " mit " + r.n + " Zeilen ins Archiv legen?");
        this.el(inhalt, "p", "kom-leise", "Er verschwindet aus dem Schweißen. Im Archiv lässt er sich ansehen und wiederherstellen.");

        this.knopf(knoepfe, "Ja, archivieren", async () => {
            this.dialogSchliessen();
            const e = await this.sicher(() => this.swArchivieren(z._id));
            if (e === null) return;
            await this.nachladen();
            this.statusZeigen(e.ab + " wurde archiviert (" + e.n + " Zeilen).");
        }, "haupt");
        const nein = this.knopf(knoepfe, "Abbrechen", () => this.dialogSchliessen(), "rot");
        this.dialogFokus = nein;   /* Sicherheitsfrage: ein versehentliches Enter archiviert nichts */
    });
},

zurueckFragen: async function (z) {

    const r = await this.sicher(() => this.swZurueckPruefen(z._id));
    if (r === null) return;

    this.dialogZeigen("Zurück in die Bestandsliste", (inhalt, knoepfe) => {
        this.el(inhalt, "p", "", this.swRueckFrage(r));
        this.el(inhalt, "p", "kom-leise", this.swRueckVerlust);

        this.knopf(knoepfe, "Ja, zurück", async () => {
            this.dialogSchliessen();
            const a = await this.sicher(() => this.swZurueck(z._id));
            if (a === null) return;
            await this.nachladen();
            this.statusZeigen(this.swRueckName(r) + " ist wieder in der Bestandsliste.");
        }, "haupt");
        const nein = this.knopf(knoepfe, "Abbrechen", () => this.dialogSchliessen(), "rot");
        this.dialogFokus = nein;
    });
},
