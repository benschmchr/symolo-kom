/* ===========================================================================
   ANZEIGE: Gerüst, Knöpfe, Tabellen, Statusmeldung
   Elemente nur mit window.symolo.tools.layout.create (Skill, Abschnitt 5).
   Kein document.createElement, kein querySelector, kein innerHTML-Bau.
   Referenzen auf eigene Elemente liegen am Objekt (this.koerper usw.).
   =========================================================================== */

wurzel: null,
koerper: null,
fuss: null,
dialogEl: null,
dialogFokus: null,
infoZeile: null,
statusEl: null,
statusTimer: null,

/* Ein Element bauen. text wird immer über text() geführt: nie "undefined". */
el: function (parent, type, klasse, text) {

    const o = { parent: parent, type: type || "div" };
    if (klasse) o.class = klasse;
    if (text !== undefined) o.text = this.text(text);

    return window.symolo.tools.layout.create(o);
},

/* Knopf in der Fußzeile mit kurzem Text für schmale Fenster (Handy). Die Fußzeile bleibt eine Zeile
   (Skill, Abnahme), deshalb kürzer statt umbrechen. */
fussKnopf: function (lang, kurz, klick, art) {

    const b = this.knopf(this.fuss, "", klick, art);
    this.el(b, "span", "kom-lang", lang);
    this.el(b, "span", "kom-kurz", kurz);
    b.setAttribute("aria-label", lang);
    b.title = lang;
    return b;
},

/* Ein Knopf. layout.create kann keine Events: Handler danach setzen. */
knopf: function (parent, text, klick, art) {

    const b = this.el(parent, "button", "kom-knopf" + (art ? " kom-knopf-" + art : ""), text);
    b.type = "button";
    b.onclick = () => { klick(); };
    return b;
},

/* Gerüst jeder Ansicht: Kopf (Titel, Infozeile), Körper, Fuß, Status.
   Erst das Gerüst, dann die Daten (Skill, Vertrag). */
geruestBauen: function (parent) {

    /* Die Klasse der Ansicht: jede CSS-Regel hängt daran. */
    const view = this.el(parent, "div", this.ansicht.klasse);
    this.wurzel = view;

    const kopf = this.el(view, "div", "kom-kopf");
    this.el(kopf, "h2", "kom-titel", this.ansicht.titel);
    if (this.ansicht.satz) this.el(kopf, "span", "kom-satz", this.ansicht.satz);
    this.infoZeile = this.el(kopf, "div", "kom-info");
    this.bereichsleisteBauen(view);

    this.koerper = this.el(view, "div", "kom-koerper");

    this.fuss = this.el(view, "div", "kom-fuss");
    this.el(this.fuss, "span", "kom-vermerk", "Erstellt: Ben Schumacher, 09.10.2026");

    this.statusEl = window.symolo.tools.layout.create({
        parent: view, class: "kom-status", id: this.ansicht.praefix + "Status"
    });

    return view;
},

/* Bereichsleiste wie das Hauptmenü der bisherigen App: ein Knopf je Bereich, der aktuelle ist hervorgehoben.
   Der Verbindungstest hat keine. */
bereichsleisteBauen: function (view) {

    if (!this.einstellungen.bereichsleiste || this.ansicht.name === "verbindungstest") return;

    const menue = this.el(view, "nav", "kom-menue");
    menue.setAttribute("aria-label", "Bereiche");

    this.einstellungen.bereiche.forEach(([name, titel]) => {
        const b = this.el(menue, "button", "kom-menuepunkt" + (name === this.ansicht.name ? " kom-aktiv" : ""), titel);
        b.type = "button";
        if (name === this.ansicht.name) b.setAttribute("aria-current", "page");
        b.onclick = () => this.bereichOeffnen(name);
    });
},

/* In einen anderen Bereich wechseln. optionen.suche: dort gleich nach diesem Text suchen (z. B. die AB-Nummer).
   Den Wechsel selbst macht window.KOM_BEREICH_WECHSELN (setzt die Testseite). OFFEN (Symolo): Wie öffnet Symolo
   ein anderes Formular aus einem Hook heraus? Bis das geklärt ist, steht in Symolo nur ein Hinweis. */
/* Rote Zeile (Ben, 16.10.): eine Baugruppe liegt im anderen Bereich (Schweißen oder Kommissionierlager).
   Der Knopf springt dorthin (ziel). */
rotKnopf: function (parent, text, titel, ziel) {

    const k = this.el(parent, "button", "kom-rotknopf", text);
    k.type = "button";
    k.title = titel;
    k.onclick = ziel;
    return k;
},

bereichOeffnen: function (name, optionen) {

    if (name === this.ansicht.name && !(optionen && optionen.suche)) return;

    const wechsler = window.KOM_BEREICH_WECHSELN;
    if (typeof wechsler === "function") {
        wechsler(name, optionen || {});
        return;
    }

    const b = this.einstellungen.bereiche.find(x => x[0] === name);
    this.statusZeigen("Der Wechsel nach „" + (b ? b[1] : name) + "“ ist in Symolo noch nicht angebunden.", "fehler");
},

/* Beim Wechsel mitgegebene Angaben (einmal lesen): { suche }. */
startOptionen: function () {

    const o = window.KOM_START_OPTIONEN || {};
    window.KOM_START_OPTIONEN = null;
    return o;
},

/* Zeigt, woher die Daten kommen und ob gespeichert werden darf. */
infoZeigen: function () {

    if (!this.infoZeile) return;

    const teile = ["Daten: " + this.quelleText()];
    if (!this.schreibenErlaubt()) teile.push("Speichern noch gesperrt");
    this.datenHinweise.forEach(h => teile.push(h));

    this.infoZeile.textContent = teile.join(" · ");
},

/* Meldung unten. Fehler bleiben stehen, sonst blendet sie aus. */
statusZeigen: function (meldung, art) {

    const el = this.statusEl;
    if (!el) return;

    el.textContent = this.text(meldung);
    el.classList.add("kom-zeigen");
    el.classList.toggle("kom-fehler", art === "fehler");

    clearTimeout(this.statusTimer);
    if (art !== "fehler") {
        this.statusTimer = setTimeout(() => { el.classList.remove("kom-zeigen"); }, 3000);
    }
},

/* Aufgabe ausführen; ein Fehler wird gemeldet statt die Ansicht zu töten.
   Gibt null zurück, wenn es nicht geklappt hat. */
sicher: async function (aufgabe) {

    const vorher = this.geschrieben;
    try {
        return await aufgabe();
    } catch (fehler) {
        console.warn(this.ansicht.name + ":", fehler);
        let meldung = fehler && fehler.message ? fehler.message : "Unbekannter Fehler.";
        if (this.geschrieben > vorher) meldung += " " + this.teilweiseGespeichert;
        this.statusZeigen(meldung, "fehler");
        return null;
    }
},

/* Abbruch nach einem ersten Schreibschritt (Entnehmen, Archivieren, Zurückholen …): ohne Transaktion
   kann dann etwas doppelt stehen. Neue Zeilen werden immer zuerst angelegt, Originale zuletzt ausgeblendet. */
teilweiseGespeichert: "Ein Teil davon ist schon gespeichert. Bitte „Neu laden“ und prüfen, ob etwas doppelt steht.",

/* Tabelle aus Zeilen von datenLesen.
   spalten: [{ feld, titel, art }]  art: "text" | "zahl" | "datum" | "datumzeit"
   leerText nennt den Grund, wenn nichts da ist (Skill: leere Wege).
   aktionen(zelle, zeile) baut Knöpfe je Zeile (optional). */
tabelleBauen: function (parent, spalten, zeilen, leerText, aktionen) {

    /* IDs werden nie angezeigt: interne Felder (_…) sind verboten. */
    spalten.forEach(s => {
        if (s.feld === "id" || s.feld.charAt(0) === "_") throw new Error("IDs werden nie angezeigt: " + s.feld);
    });

    if (zeilen.length === 0) {
        this.el(parent, "div", "kom-leer", leerText);
        return null;
    }

    const tab = this.el(parent, "table", "kom-tabelle");
    const kopf = this.el(this.el(tab, "thead"), "tr");
    spalten.forEach(s => this.el(kopf, "th", s.art === "zahl" ? "kom-zahl" : "", s.titel));
    if (aktionen) this.el(kopf, "th", "", "");

    const koerper = this.el(tab, "tbody");

    zeilen.forEach(z => {
        const tr = this.el(koerper, "tr");

        spalten.forEach(s => {
            const w = z[s.feld];
            let t = this.text(w);
            if (s.art === "datum") t = this.datumText(w);
            if (s.art === "datumzeit") t = this.datumZeitText(w);
            this.el(tr, "td", s.art === "zahl" ? "kom-zahl" : "", t === "" ? "–" : t);
        });

        if (aktionen) aktionen(this.el(tr, "td", "kom-aktionen"), z);
    });

    return tab;
},

/* Klapp-Knopf (▾/▸) und Name als Knopf: Einfachklick klappt. */
klappZellen: function (tr, name, offen, klappen, doppel) {

    const td1 = this.el(tr, "td", "kom-klappzelle");
    const td2 = this.el(tr, "td");
    td2.title = this.text(name);

    if (!klappen) {
        td2.textContent = this.text(name);
        return;
    }

    const pfeil = this.el(td1, "button", "kom-klapp", offen ? "▾" : "▸");
    pfeil.type = "button";
    pfeil.title = "Auf- oder zuklappen";
    pfeil.setAttribute("aria-label", this.text(name) + " auf- oder zuklappen");
    pfeil.onclick = klappen;

    const nameKnopf = this.el(td2, "button", "kom-name", name);
    nameKnopf.type = "button";
    nameKnopf.onclick = klappen;
    if (doppel) nameKnopf.ondblclick = doppel;
},

/* Fenster in der Mitte (Dialog), liegt in der Ansicht, damit das CSS greift.
   bauen(inhalt, knoepfe) füllt es. Escape oder Klick daneben schließt.
   Den Fokus bekommt das erste Eingabefeld, sonst der erste Knopf. Bei einer
   Sicherheitsfrage setzt bauen() this.dialogFokus auf "Abbrechen": ein
   versehentliches Enter bestätigt dann nichts. */
dialogZeigen: function (titel, bauen) {

    this.dialogSchliessen();

    const hinter = this.el(this.wurzel, "div", "kom-dialog-hinter");
    const box = this.el(hinter, "div", "kom-dialog");
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    this.el(box, "h3", "kom-dialog-titel", titel);
    const inhalt = this.el(box, "div", "kom-dialog-inhalt");
    const knoepfe = this.el(box, "div", "kom-dialog-knoepfe");

    hinter.onclick = e => { if (e.target === hinter) this.dialogSchliessen(); };
    hinter.onkeydown = e => { if (e.key === "Escape") this.dialogSchliessen(); };

    this.dialogEl = hinter;
    this.dialogFokus = null;
    bauen(inhalt, knoepfe);

    const erstes = this.dialogFokus || box.getElementsByTagName("input")[0] || box.getElementsByTagName("button")[0];
    this.dialogFokus = null;
    if (erstes) erstes.focus();
    return box;
},

dialogSchliessen: function () {

    if (this.dialogEl) this.dialogEl.remove();
    this.dialogEl = null;
},

/* Menü (Rechtsklick): Titel, Knöpfe untereinander, "Abbrechen" rot unten
   (Ben, 15.10.2026). eintraege: [[text, aktion, recht]]; ohne das Recht ist der Knopf aus. */
menueZeigen: function (titel, eintraege) {

    this.dialogZeigen(titel, (inhalt, knoepfe) => {
        knoepfe.classList.add("kom-dialog-spalte");
        eintraege.forEach(([text, aktion, recht]) => {
            const b = this.knopf(knoepfe, text, () => { this.dialogSchliessen(); aktion(); });
            if (recht) this.nurMitRecht(b, recht);
        });
        this.knopf(knoepfe, "Abbrechen", () => this.dialogSchliessen(), "rot");
    });
},

