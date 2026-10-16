/* ===========================================================================
   ARBEITSPLÄTZE: HALLENPLAN (R-AP1 bis R-AP5)
   Nachbau von bestand/schweissen/hallenplan.py: die Einträge der Magnettafel
   (Formel AP), die Plätze mit ihren Einträgen und die drei Listen darunter,
   dazu Platz setzen, Mitarbeiter setzen, AB aufsplitten und zusammenführen.
   Platz und Mitarbeiter gehen über swSetzen (4K_sw_eingaben.js), also mit
   Vererbung an BGs und Teile.
   =========================================================================== */

/* "(verschieden)" zählt als leer. */
hpRein: function (x) {

    const t = this.text(x);
    return t === this.swVerschieden ? "" : t;
},

hpKlein: function (s) {

    return this.text(s).toLowerCase();
},

/* R-AP3 (Formel AP): je AB bzw. BG im Schweißen ein Eintrag mit Platz und Mitarbeiter.
   - zusammengefasster AB, alle BGs am selben Platz (auch keinem) -> ein Eintrag "AB…";
   - BGs an verschiedenen Plätzen -> jede BG einzeln als "AB…_BGnnn"; AB ohne BG -> der AB selbst;
   - Einzelblöcke "AB…_BGnnn" -> immer einzeln.
   Platz einer BG = eigener, sonst der des AB; Mitarbeiter ebenso; "(verschieden)" zählt als leer.
   zeilen = swLesen() (mit m und p). Ergebnis: [{ name, platz, mitarbeiter, ganz, komplett, bgs }] nach Name. */
hpEintraege: function (zeilen) {

    const abPlatz = {}, abMit = {}, nbg = {}, geteilt = {};

    zeilen.forEach(z => {
        const k = this.hpKlein(z.ab_nr);
        if (z.ebene === "AB") {
            if (!(k in abPlatz)) abPlatz[k] = this.hpRein(z.p);
            if (!(k in abMit)) abMit[k] = this.hpRein(z.m);
            if (this.istJa(z.ap_geteilt)) geteilt[k] = true;
        } else if (z.ebene === "BG") {
            nbg[k] = (nbg[k] || 0) + 1;
        }
    });

    const roh = [];
    zeilen.forEach(z => {
        const k = this.hpKlein(z.ab_nr);
        if (z.ebene === "BG" || (z.ebene === "AB" && !nbg[k])) {
            const xp = k in abPlatz ? abPlatz[k] : "", xm = k in abMit ? abMit[k] : "";
            roh.push({
                en: this.text(z.ab_nr), ed: this.text(z.anzeige), enr: this.swBgNummer(z.baugruppe), eeb: z.ebene,
                ep: this.hpRein(z.p) || xp, em: this.hpRein(z.m) || xm, xm: xm
            });
        }
    });

    const kombis = {};
    roh.forEach(r => {
        const k = this.hpKlein(r.en);
        (kombis[k] = kombis[k] || {})[this.hpKlein(r.ep)] = true;
    });

    const aus = [], gesehen = {};
    roh.forEach(r => {
        const k = this.hpKlein(r.en);
        const einz = r.ed.toLowerCase().indexOf("_bg") > -1;
        const ganz = (Object.keys(kombis[k]).length === 1 && !einz && !geteilt[k]) || r.eeb === "AB";
        const name = ganz ? r.en : (einz ? r.ed : r.en + "_BG" + r.enr);
        const mit = ganz && r.eeb !== "AB" ? r.xm : r.em;
        const schluessel = this.hpKlein(name) + "|" + this.hpKlein(r.ep);

        if (gesehen[schluessel]) return;
        gesehen[schluessel] = true;

        aus.push({ name: name, platz: r.ep, mitarbeiter: mit, ganz: ganz, komplett: k in abPlatz, bgs: nbg[k] || 0 });
    });

    return aus.sort((a, b) => (this.hpKlein(a.name) < this.hpKlein(b.name) ? -1 : (this.hpKlein(a.name) > this.hpKlein(b.name) ? 1 : 0)));
},

hpAnzeige: function (e) {

    return e.mitarbeiter ? e.name + " · " + e.mitarbeiter : e.name;
},

/* Der AB hinter dem Eintrag ("AB2515204_BG100" -> "AB2515204"). */
hpAb: function (e) {

    const i = e.name.toUpperCase().indexOf("_BG");
    return i < 0 ? e.name : e.name.slice(0, i);
},

/* R-AP2 bis R-AP4: die Plätze mit ihren Einträgen und die drei Listen unter dem Plan.
   plaetze = swPlaetzeLaden(). */
hpHallenplan: function (zeilen, plaetze) {

    const alle = this.hpEintraege(zeilen);
    const jePlatz = plaetze.map(p => ({ p: p, eintraege: [] }));
    const nicht = [], ungueltig = [], einsortiert = [];

    alle.forEach(e => {
        if (!e.platz) { nicht.push(e); return; }

        const x = jePlatz.find(j => this.hpKlein(j.p.name) === this.hpKlein(e.platz));   /* COUNTIF: exakt */
        if (!x) { ungueltig.push(e); return; }

        x.eintraege.push(e);
        einsortiert.push([e, x.p]);
    });

    return { plaetze: jePlatz, nicht: nicht, ungueltig: ungueltig, einsortiert: einsortiert, anzahl: alle.length };
},

/* ---------------------------------------------------------------------------
   Ändern
   --------------------------------------------------------------------------- */

/* Die AB-Zeile ("AB…") bzw. BG-Zeile ("AB…_BGnnn") hinter einem Eintrag des Hallenplans. */
hpZiel: function (zeilen, eintrag) {

    const p = eintrag.toUpperCase().indexOf("_BG");
    const abNr = p >= 0 ? eintrag.slice(0, p) : eintrag;
    const bgNr = p >= 0 ? eintrag.slice(p + 3) : "";

    for (const z of this.swNachNr(zeilen)) {
        if (!this.swGleich(z.ab_nr, abNr)) continue;
        if (!bgNr && z.ebene === "AB") return z;
        if (bgNr && z.ebene === "BG" && this.swGleich(this.swBgNummer(z.baugruppe), bgNr)) return z;
    }

    throw new Error(eintrag + " wurde im Bereich Schweißen nicht gefunden.");
},

/* R-AP5 (ApSetzen): Arbeitsplatz eines AB bzw. einer BG im Schweißen eintragen; die Vererbung gibt ihn an
   BGs und Teile weiter. Gibt die Meldung zurück. */
hpPlatzSetzen: async function (eintrag, platz) {

    const zeilen = await this.swLesen();
    const ziel = this.hpZiel(zeilen, eintrag);
    const r = await this.swSetzen(ziel._id, "arbeitsplatz", platz);

    return eintrag + ": " + (r.neu !== "leer" ? "Arbeitsplatz " + r.neu : "kein Arbeitsplatz mehr") + ".";
},

/* Rechtsklick im Hallenplan: Mitarbeiter eines Eintrags ändern (Auswahl aus der Liste). */
hpMitarbeiterSetzen: async function (eintrag, wert) {

    const zeilen = await this.swLesen();
    const ziel = this.hpZiel(zeilen, eintrag);
    const r = await this.swSetzen(ziel._id, "mitarbeiter", wert);

    return eintrag + ": " + (r.neu !== "leer" ? "Mitarbeiter " + r.neu : "kein Mitarbeiter mehr") + ".";
},

/* Die AB-Zeile zu einem Eintrag; nur vorhanden, wenn der ganze AB im Schweißen liegt. */
hpAbZeile: function (zeilen, eintrag) {

    const ziel = this.hpZiel(zeilen, eintrag);
    const ab = this.swNachNr(zeilen).find(z => z.ebene === "AB" && this.text(z.ab_schluessel) === this.text(ziel.ab_schluessel));

    if (!ab || this.text(ziel.anzeige) !== this.text(ab.anzeige)) {
        throw new Error("Aufsplitten und Zusammenführen geht nur, wenn alle Baugruppen des AB im Schweißen liegen. " +
            "Dieser AB ist noch zwischen Bestandsliste und Schweißen aufgeteilt.");
    }

    return ab;
},

/* Hallenplan: der AB wird in seine Baugruppen aufgesplittet (je BG ein Eintrag, alle am bisherigen Platz). */
hpTeilen: async function (eintrag) {

    const zeilen = await this.swLesen();
    const ab = this.hpAbZeile(zeilen, eintrag);

    const nBg = zeilen.filter(z => this.text(z.ab_schluessel) === this.text(ab.ab_schluessel) && z.ebene === "BG").length;
    if (nBg < 2) throw new Error("Dieser AB hat keine Baugruppen zum Aufsplitten (mindestens zwei nötig).");   /* Ben, 15.10. */

    await this.datenAendern("schweisszeile", ab, { ap_geteilt: true }, { ohnePruefung: true });
    await this.protokollSchreiben("schweissen", ab.ab_nr, "Arbeitsplätze", "AB", "Baugruppen einzeln");

    return eintrag + " ist in Baugruppen aufgesplittet.";
},

/* Hallenplan, Rechtsklick auf eine Baugruppe: der ganze AB kommt dorthin, wo diese Baugruppe liegt. */
hpZusammenfuehren: async function (eintrag) {

    const zeilen = await this.swLesen();
    const ab = this.hpAbZeile(zeilen, eintrag);
    const bg = this.hpZiel(zeilen, eintrag);
    const e = this.hpEintraege(zeilen).find(x => this.hpKlein(x.name) === this.hpKlein(eintrag));
    const platz = e ? e.platz : "";

    if (bg.ebene !== "BG") throw new Error("Dieser Eintrag ist schon der ganze AB.");

    await this.datenAendern("schweisszeile", ab, { ap_geteilt: false }, { ohnePruefung: true });
    await this.swSetzen(ab._id, "arbeitsplatz", platz);
    await this.protokollSchreiben("schweissen", ab.ab_nr, "Arbeitsplätze", "Baugruppen einzeln",
        "AB zusammen (" + (platz || "kein Platz") + ")");

    return this.text(ab.ab_nr) + " ist zusammengeführt" + (platz ? " (" + platz + ")" : " (nicht einsortiert)") + ".";
},
