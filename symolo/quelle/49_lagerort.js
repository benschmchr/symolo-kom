/* ===========================================================================
   LAGERORT UND REGAL (R-L1 bis R-L4, R-R1 bis R-R5)
   Nachbau von bestand/lagerort.py. Abweichungen von Excel wie dort:
   X1 ABs ohne Baugruppe erscheinen im Regal; X2 R3-Kurzformen werden "R3";
   X3 beim Abgleich (siehe abgleichen).
   Geschrieben wird über datenAendernViele (Folgeänderungen ohne Prüfung,
   wie bisher). Danach lädt die Ansicht den AB neu.
   =========================================================================== */

/* R-L4: gültige Plätze, Etage 6 oben … 1 unten, links L, rechts R */
regalEtagen: [6, 5, 4, 3, 2, 1],
regalPlaetze: ["L6", "R6", "L5", "R5", "L4", "R4", "L3", "R3", "L2", "R2", "L1", "R1"],
regalR3Name: "Sperrlager / Teile zum Vermessen",
regalR3Aliase: ["R3S", "R3-S", "R3V", "R3-V", "SPERRLAGER", "SPERR", "VERMESSEN"],

/* Vergleichsform: Großbuchstaben, ohne Leerzeichen. */
platzKern: function (text) {

    return this.text(text).split(/\s+/).join("").toUpperCase();
},

/* Gültiger Platz oder R3-Kurzform -> "L2", "R3"; sonst der Text groß. */
platzNorm: function (text) {

    const k = this.platzKern(text);
    if (this.regalR3Aliase.indexOf(k) > -1) return "R3";
    if (this.regalPlaetze.indexOf(k) > -1) return k;
    return this.text(text).split(/\s+/).filter(Boolean).join(" ").toUpperCase();
},

platzGueltig: function (text) {

    return this.regalPlaetze.indexOf(this.platzNorm(text)) > -1;
},

/* Was gespeichert wird: leer (bei "", "0", "-"), ein gültiger Platz
   ("l 2" -> "L2", "SPERR" -> "R3") oder der freie Text. Zu lang -> Fehler. */
platzEingabe: function (text) {

    const t = this.text(text).split(/\s+/).filter(Boolean).join(" ");
    if (t === "" || t === "0" || t === "-") return "";
    if (t.length > 40) throw new Error("Der Lagerort ist zu lang (höchstens 40 Zeichen).");
    return this.platzGueltig(t) ? this.platzNorm(t) : t;
},

/* Platz zum Vergleichen: normiert, leer bleibt leer. */
platzVon: function (o) {

    return this.text(o.lagerort) ? this.platzNorm(o.lagerort) : "";
},

/* Mehrere Knoten ändern und die Werte auch im Baum eintragen. */
knotenSetzen: async function (aufgaben) {

    await this.datenAendernViele(aufgaben.map(a => ({ name: a.name, zeile: a.knoten.o, werte: a.werte })));
    aufgaben.forEach(a => Object.assign(a.knoten.o, a.werte));
},

/* Lagerort an einem Knoten und an allen Teilen darunter (nur wo er anders ist). */
platzAufgaben: function (name, knoten, teile, p) {

    const liste = [];
    if (this.text(knoten.o.lagerort) !== p) liste.push({ name: name, knoten: knoten, werte: { lagerort: p } });
    teile.forEach(t => {
        if (this.text(t.o.lagerort) !== p) liste.push({ name: "teil", knoten: t, werte: { lagerort: p } });
    });
    return liste;
},

/* R-L2: Platz am AB -> alle BGs und alle Teile bekommen ihn; leer leert alle.
   Ein aufgesplitteter AB bleibt aufgesplittet. Gibt den Platz zurück. */
lagerortAb: async function (ab, text) {

    const p = this.platzEingabe(text);
    let aufgaben = this.platzAufgaben("auftrag", ab, ab.ohne, p);
    ab.bgs.forEach(b => { aufgaben = aufgaben.concat(this.platzAufgaben("baugruppe", b, b.teile, p)); });

    await this.knotenSetzen(aufgaben);
    return p;
},

/* R-L2: Platz an der BG -> alle Teile der BG; danach R-L3 (außer der AB ist
   aufgesplittet). imRegal: eine BG einzeln verschieben splittet den AB auf. */
lagerortBg: async function (ab, bg, text, imRegal) {

    const p = this.platzEingabe(text);

    if (imRegal && ab.bgs.length > 1 && !this.istJa(ab.o.regal_geteilt)) await this.regalTeilen(ab);

    await this.knotenSetzen(this.platzAufgaben("baugruppe", bg, bg.teile, p));

    if (!this.istJa(ab.o.regal_geteilt)) await this.abgleichen(ab);
    return p;
},

/* R-L3 (ABAbgleichen):
   - alle BGs haben denselben Platz, keine ist leer -> AB bekommt ihn;
   - ein Platz, Rest leer, AB leer oder gleich -> nichts ändern;
   - sonst (verschiedene Plätze, oder X3: ein Platz, Rest leer, AB hat einen
     anderen) -> BGs ohne Platz bekommen den bisherigen AB-Platz, der AB wird leer.
   Teile ohne BG bleiben wie in Excel unberührt. */
abgleichen: async function (ab) {

    const belegt = ab.bgs.filter(b => this.text(b.o.lagerort)).map(b => this.platzVon(b.o));
    const leere = ab.bgs.filter(b => !this.text(b.o.lagerort));
    if (belegt.length === 0) return false;

    const erster = belegt[0];
    const verschieden = belegt.some(p => p !== erster);
    const alt = this.platzVon(ab.o);

    if (!verschieden && leere.length === 0) {
        if (alt === erster) return false;
        await this.knotenSetzen([{ name: "auftrag", knoten: ab, werte: { lagerort: erster } }]);
        return true;
    }
    if (!verschieden && (alt === "" || alt === erster)) return false;
    if (!alt) return false;

    const abPlatz = this.text(ab.o.lagerort);
    let aufgaben = [];
    leere.forEach(b => { aufgaben = aufgaben.concat(this.platzAufgaben("baugruppe", b, b.teile, abPlatz)); });
    aufgaben.push({ name: "auftrag", knoten: ab, werte: { lagerort: "" } });
    await this.knotenSetzen(aufgaben);
    return true;
},

/* Regal: AB in seine Baugruppen aufsplitten (mindestens zwei, Ben 15.10.).
   Jede BG ohne eigenen Platz bekommt den bisherigen AB-Platz ausdrücklich. */
regalTeilen: async function (ab) {

    if (ab.bgs.length < 2) throw new Error("Dieser AB hat keine Baugruppen zum Aufsplitten (mindestens zwei nötig).");

    const p = this.platzVon(ab.o);
    let aufgaben = [];
    if (p) {
        ab.bgs.forEach(b => {
            if (!this.text(b.o.lagerort)) aufgaben = aufgaben.concat(this.platzAufgaben("baugruppe", b, b.teile, p));
        });
    }
    aufgaben.push({ name: "auftrag", knoten: ab, werte: { regal_geteilt: true } });
    await this.knotenSetzen(aufgaben);
},

/* Liegen alle Baugruppen (mindestens zwei) am selben Platz? (Rückfrage im Regal) */
alleBgsGleich: function (ab) {

    const plaetze = new Set(ab.bgs.map(b => this.platzVon(b.o)));
    return ab.bgs.length > 1 && plaetze.size === 1;
},

/* Regal: der ganze AB kommt dorthin, wo die gewählte Baugruppe liegt
   (leer = nicht einsortiert), als ein Eintrag. */
regalZusammenfuehren: async function (ab, bg) {

    let p = this.platzVon(bg.o);
    if (!p) p = this.istJa(ab.o.regal_geteilt) || !this.text(ab.o.lagerort) ? "" : this.platzVon(ab.o);

    await this.lagerortAb(ab, p);
    await this.knotenSetzen([{ name: "auftrag", knoten: ab, werte: { regal_geteilt: false } }]);
    return p;
},

/* Regal (R-R1 bis R-R4): Einträge je Platz und die Listen darunter.
   Je AB: Platz einer BG = eigener Platz, sonst der des AB. Alle BGs am selben
   Platz und keine ohne -> ein Eintrag "AB…" mit AB-Status, sonst je BG und
   Platz ein Eintrag "AB…_BGnnn". X1: AB ohne BG steht mit eigenem Platz da. */
regalEintraege: function (abs) {

    const einsortiert = [], nicht = [];
    const eintrag = (name, platz, w, ab, bg) => ({ name: name, platz: platz, w: w, ab: ab, bg: bg || null });

    abs.forEach(a => {
        const abPlatz = this.platzVon(a.o);
        const name = this.text(a.o.ab_anzeige);
        const geteilt = this.istJa(a.o.regal_geteilt) && a.bgs.length > 0;

        if (a.bgs.length === 0) {
            (abPlatz ? einsortiert : nicht).push(eintrag(name, abPlatz, a.w, a));
            return;
        }

        const jeBg = a.bgs.map(b => [b, this.platzVon(b.o) || (geteilt ? "" : abPlatz)]);
        const mit = new Set(jeBg.filter(([, p]) => p).map(([, p]) => p));
        const ohne = jeBg.filter(([, p]) => !p);

        if (mit.size === 0 && !geteilt) {
            nicht.push(eintrag(name, "", a.w, a));
            return;
        }
        if (mit.size === 1 && ohne.length === 0 && !geteilt) {
            einsortiert.push(eintrag(name, [...mit][0], a.w, a));
            return;
        }

        const gesehen = new Set();
        jeBg.forEach(([b, p]) => {
            const bgName = name + "_BG" + this.text(b.o.kurz);
            if (p && !gesehen.has(bgName + "|" + p)) {
                gesehen.add(bgName + "|" + p);
                einsortiert.push(eintrag(bgName, p, b.w, a, b));
            } else if (!p) {
                nicht.push(eintrag(bgName, "", b.w, a, b));
            }
        });
    });

    const sortiert = l => l.slice().sort((x, y) => {
        const a = x.name.toLowerCase(), b = y.name.toLowerCase();
        return a < b ? -1 : (a > b ? 1 : (x.platz < y.platz ? -1 : (x.platz > y.platz ? 1 : 0)));
    });
    const eins = sortiert(einsortiert);
    const faecher = {};
    this.regalPlaetze.forEach(p => { faecher[p] = eins.filter(e => e.platz === p); });

    return {
        faecher: faecher,
        einsortiert: eins,
        nicht: sortiert(nicht),
        ungueltig: eins.filter(e => this.regalPlaetze.indexOf(e.platz) < 0)
    };
},
