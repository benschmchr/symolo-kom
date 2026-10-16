/* ===========================================================================
   ANSICHT: Regal (R-R1 bis R-R5)
   Fächer L1–L6 und R1–R6 (R3 = Sperrlager), darunter "Nicht einsortiert",
   "Sonstiges" (kein Regalfach) und die Liste "Einsortiert".
   Eintrag antippen: Platz wählen. Am PC auch ziehen und auf ein Fach oder
   "Nicht einsortiert" ablegen. Rechtsklick auf einen AB: aufsplitten;
   auf eine Baugruppe: AB zusammenführen (Ben, 14./15.10.2026).
   Die Einträge berechnet regalEintraege (49_lagerort.js).

   OFFEN (Symolo): "In der Bestandsliste anzeigen" (Sprung in die andere
   Ansicht) gibt es erst, wenn klar ist, wie Symolo zwischen Formularen
   wechselt.
   =========================================================================== */

abs: [],
ziehen: null,
regalEl: null,

before_set_values: async function (form, { data }) {

    const parent = this.ctrlbyBind("_output").SelfElement;

    /* Erst das Gerüst, dann die Daten (Skill, Vertrag). */
    this.geruestBauen(parent);
    this.el(this.koerper, "p", "kom-leise",
        "Grün = komplett, gelb = teilweise, weiß = offen. Eintrag antippen, um den Platz zu ändern; am PC auch auf ein anderes " +
        "Fach oder nach „Nicht einsortiert“ ziehen. Rechtsklick auf einen AB: aufsplitten; Rechtsklick auf eine Baugruppe: " +
        "AB zusammenführen. Der Platz gilt dann für den ganzen AB bzw. die Baugruppe in der Bestandsliste.");
    this.regalEl = this.el(this.koerper, "div", "kom-regal-inhalt");
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
   Zeichnen
   --------------------------------------------------------------------------- */

zeichnen: function () {

    this.infoZeigen();
    const r = this.regalEintraege(this.abs);
    const inhalt = this.el(null, "div");

    const regal = this.el(inhalt, "div", "kom-regal");
    this.el(regal, "div");
    this.el(regal, "div", "kom-seite", "Links (L)");
    this.el(regal, "div", "kom-seite", "Rechts (R)");

    this.regalEtagen.forEach(n => {
        this.el(regal, "div", "kom-etage", String(n));
        ["L", "R"].forEach(seite => {
            const platz = seite + n;
            const fach = this.el(regal, "div", "kom-fach" + (platz === "R3" ? " kom-sperr" : ""));
            this.el(fach, "span", "kom-platz", platz + (platz === "R3" ? " · " + this.regalR3Name : ""));
            this.ablage(fach, platz);
            r.faecher[platz].forEach(e => this.eintragBauen(fach, e, false));
        });
    });

    const listen = this.el(inhalt, "div", "kom-listen");

    const nicht = this.liste(listen, "Nicht einsortiert", r.nicht.length);
    this.ablage(nicht.karte, "");
    if (r.nicht.length) r.nicht.forEach(e => this.eintragBauen(nicht.eintraege, e, false));
    else this.el(nicht.eintraege, "p", "kom-leise", "Alles einsortiert");

    const sonst = this.liste(listen, "Sonstiges", r.ungueltig.length);
    if (r.ungueltig.length) r.ungueltig.forEach(e => this.eintragBauen(sonst.eintraege, e, true));
    else this.el(sonst.eintraege, "p", "kom-leise", "keine");

    const eins = this.liste(listen, "Einsortiert", r.einsortiert.length);
    if (r.einsortiert.length) {
        const auf = this.el(eins.eintraege, "details");
        this.el(auf, "summary", "", "Liste „Name · Platz“ anzeigen");
        const ul = this.el(auf, "ul", "kom-einsortiert");
        r.einsortiert.forEach(e => {
            const li = this.el(ul, "li");
            this.el(li, "span", "kom-punkt " + this.statusKlasse(e.w));
            this.el(li, "span", "", e.name + " · " + e.platz);
        });
    } else {
        this.el(eins.eintraege, "p", "kom-leise", "keine");
    }

    this.regalEl.replaceChildren(inhalt);
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

    const x = this.el(parent, "span", "kom-eintrag " + this.statusKlasse(e.w), e.name);
    if (mitPlatz) this.el(x, "span", "kom-eintrag-platz", " · " + e.platz);

    x.tabIndex = 0;
    x.setAttribute("role", "button");
    x.title = e.name + ": " + e.w.status;
    x.draggable = true;

    x.onclick = () => this.platzDialog(e);
    x.onkeydown = k => { if (k.key === "Enter" || k.key === " ") { k.preventDefault(); this.platzDialog(e); } };
    x.oncontextmenu = k => { k.preventDefault(); this.eintragMenue(e); };
    x.ondragstart = k => { this.ziehen = e; k.dataTransfer.setData("text/plain", e.name); };
    x.ondragend = () => { this.ziehen = null; };
},

/* Fach oder Liste als Ziel zum Ablegen. */
ablage: function (el, platz) {

    el.ondragover = k => { if (this.ziehen) { k.preventDefault(); el.classList.add("kom-ziel"); } };
    el.ondragleave = () => el.classList.remove("kom-ziel");
    el.ondrop = k => {
        k.preventDefault();
        el.classList.remove("kom-ziel");
        const e = this.ziehen;
        this.ziehen = null;
        if (e && e.platz !== platz) this.platzSetzen(e, platz);
    };
},

/* ---------------------------------------------------------------------------
   Ändern
   --------------------------------------------------------------------------- */

/* Platz wählen wie im Regal; freier Text nur mit Bestätigung (R-L4).
   Knöpfe: "Kein Platz" und "Abbrechen" (rot) (Ben, 15.10.2026). */
platzDialog: function (e) {

    this.dialogZeigen("Platz ändern: " + e.name, (inhalt, knoepfe) => {
        this.el(inhalt, "p", "kom-leise", e.platz ? "Bisher: " + e.platz : "Bisher: nicht einsortiert");

        const raster = this.el(inhalt, "div", "kom-platzraster");
        this.el(raster, "span", "kom-seite", "Links");
        this.el(raster, "span", "kom-seite", "Rechts");
        this.regalEtagen.forEach(n => ["L", "R"].forEach(seite => {
            const p = seite + n;
            const b = this.knopf(raster, p + (p === "R3" ? " · Sperrlager" : ""), () => { this.dialogSchliessen(); this.platzSetzen(e, p); },
                p === e.platz ? "gewaehlt" : "");
            b.disabled = p === e.platz;
        }));

        const frei = this.el(inhalt, "label", "kom-feld");
        this.el(frei, "span", "kom-feldname", "Anderer Platz (kein Regalfach)");
        const zeile = this.el(frei, "span", "kom-suchzeile");
        const f = this.el(zeile, "input", "kom-eingabe");
        f.maxLength = 40;
        f.placeholder = "z. B. Kiste 4";
        const eintragen = () => {
            const text = this.text(f.value);
            if (!text) return;
            let p;
            try { p = this.platzEingabe(text); } catch (fehler) { this.statusZeigen(fehler.message, "fehler"); return; }
            if (p && !this.platzGueltig(p) && !window.confirm("„" + p + "“ ist kein Regalplatz (L1–L6, R1–R6). Trotzdem eintragen? " +
                "Er steht dann im Regal unter „Sonstiges“.")) return;
            this.dialogSchliessen();
            this.platzSetzen(e, p);
        };
        f.onkeydown = k => { if (k.key === "Enter") eintragen(); };
        this.knopf(zeile, "Eintragen", eintragen);

        this.knopf(knoepfe, "Kein Platz", () => { this.dialogSchliessen(); this.platzSetzen(e, ""); });
        this.knopf(knoepfe, "Abbrechen", () => this.dialogSchliessen(), "rot");
    });
},

/* Rechtsklick: AB aufsplitten (ab zwei Baugruppen) oder zusammenführen. */
eintragMenue: function (e) {

    if (e.bg) {
        this.menueZeigen(e.name, [["AB zusammenführen", () => this.zusammen(e.ab, e.bg)]]);
        return;
    }
    if (e.ab.bgs.length < 2) {
        this.statusZeigen(e.name + " hat keine Baugruppen zum Aufsplitten (mindestens zwei nötig).");
        return;
    }
    this.menueZeigen(e.name, [["AB in Baugruppen aufsplitten", () => this.aendern(e.ab, async () => {
        await this.regalTeilen(e.ab);
        return e.name + " ist in Baugruppen aufgesplittet.";
    })]]);
},

/* Eine Baugruppe einzeln verschieben splittet den AB. Liegen danach alle
   Baugruppen am selben Platz, wird gefragt (nie automatisch zusammenführen). */
platzSetzen: function (e, platz) {

    this.aendern(e.ab, async () => {
        const p = e.bg ? await this.lagerortBg(e.ab, e.bg, platz, true) : await this.lagerortAb(e.ab, platz);
        if (e.bg && this.istJa(e.ab.o.regal_geteilt) && this.alleBgsGleich(e.ab) && window.confirm("AB ist zusammengeführt.")) {
            await this.regalZusammenfuehren(e.ab, e.bg);
        }
        return e.name + ": " + (p ? "Platz " + p : "kein Platz mehr") + ".";
    });
},

zusammen: function (ab, bg) {

    this.aendern(ab, async () => {
        const p = await this.regalZusammenfuehren(ab, bg);
        return this.text(ab.o.ab_anzeige) + " ist zusammengeführt" + (p ? " (Platz " + p + ")." : " (nicht einsortiert).");
    });
},

/* Aufgabe ausführen, den AB neu laden, das Regal neu zeichnen. */
aendern: async function (ab, aufgabe) {

    const meldung = await this.sicher(aufgabe);
    const neu = await this.sicher(() => this.bestandLaden([ab.o._id]));
    const i = this.abs.indexOf(ab);
    if (neu && i > -1) {
        if (neu.length) this.abs[i] = neu[0];
        else this.abs.splice(i, 1);
    }
    this.zeichnen();
    if (meldung) this.statusZeigen(meldung);
},
