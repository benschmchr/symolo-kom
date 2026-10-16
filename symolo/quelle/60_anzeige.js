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
    this.infoZeile = this.el(kopf, "div", "kom-info");

    this.koerper = this.el(view, "div", "kom-koerper");

    this.fuss = this.el(view, "div", "kom-fuss");
    this.el(this.fuss, "span", "kom-vermerk", "Erstellt: Ben Schumacher, 09.10.2026");

    this.statusEl = window.symolo.tools.layout.create({
        parent: view, class: "kom-status", id: this.ansicht.praefix + "Status"
    });

    return view;
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

    try {
        return await aufgabe();
    } catch (fehler) {
        console.warn(this.ansicht.name + ":", fehler);
        this.statusZeigen(fehler && fehler.message ? fehler.message : "Unbekannter Fehler.", "fehler");
        return null;
    }
},

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
   (Ben, 15.10.2026). eintraege: [[text, aktion]] */
menueZeigen: function (titel, eintraege) {

    this.dialogZeigen(titel, (inhalt, knoepfe) => {
        knoepfe.classList.add("kom-dialog-spalte");
        eintraege.forEach(([text, aktion]) => this.knopf(knoepfe, text, () => { this.dialogSchliessen(); aktion(); }));
        this.knopf(knoepfe, "Abbrechen", () => this.dialogSchliessen(), "rot");
    });
},

