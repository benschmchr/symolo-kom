/* ===========================================================================
   EINTRAGEN: Vorhanden, Vorhanden = Soll, alles ✓, Soll ändern
   (R-M1 bis R-M4, R-T1). Nachbau von bestand/views.py.
   Alles läuft über datenAendern (der einzige Schreibpfad). Danach lädt die
   Ansicht den AB neu; gerechnet wird beim Anzeigen (45_rechnen.js).

   Das Änderungsprotokoll kommt in Phase 4 dazu.
   =========================================================================== */

/* Ist der gespeicherte Wert gleich der Eingabe (Tausendstel oder null)? */
mengeGleich: function (wert, milli) {

    const leer = wert === null || wert === undefined || wert === "";
    if (leer || milli === null) return leer && milli === null;
    return this.mengeMilli(wert) === milli;
},

/* Vorhanden eines Teils setzen und R-T1 anwenden. Die letzte Eingabe gilt;
   hat jemand anderes inzwischen einen anderen Wert gespeichert, gibt es
   einen Hinweis (ohne Namen, Betriebsrat/W7). Gibt den Hinweis zurück. */
vorhandenSetzen: async function (teil, milli) {

    const neu = await this.datenAendern("teil", teil.o, frisch => {
        const [ein, fertig] = this.datenStempeln(this.mengeWert(milli), frisch.menge_gesamt,
            frisch.datum_eingelagert, frisch.datum_komplett, this.heuteText());
        return { vorhanden: this.mengeWert(milli), datum_eingelagert: ein, datum_komplett: fertig };
    }, { trotzdem: true });

    const alt = neu._vorher.vorhanden;
    if (neu._inzwischen && !this.mengeGleich(alt, milli)) {
        const altText = this.mengeGleich(alt, null) ? "leer" : this.zahlText(this.mengeMilli(alt));
        return "Achtung: " + this.text(teil.o.zeichnungsnummer) + " wurde inzwischen von jemand anderem geändert (zuletzt " +
            altText + "). Dein Wert gilt jetzt.";
    }
    return "";
},

/* R-M2: Status eines Teils antippen. Komplett -> 0, sonst Vorhanden = Soll. */
teilUmschalten: async function (teil) {

    const soll = teil.o.menge_gesamt;
    if (soll === null || soll === undefined || soll === "") return "";

    return this.vorhandenSetzen(teil, teil.w.code === 2 ? 0 : this.mengeMilli(soll));
},

/* R-M3: alles ✓ an AB oder BG. Nicht komplett -> alle Teile auf Soll
   (größere Mengen bleiben); komplett -> alle auf 0. */
allesSetzen: async function (knoten) {

    const teile = knoten.art === "ab" ? this.bestandTeile(knoten) : knoten.teile;
    const komplett = teile.length > 0 && knoten.w.status === "Komplett";

    const zuSetzen = [];
    teile.forEach(t => {
        const soll = t.o.menge_gesamt;
        const hatSoll = !(soll === null || soll === undefined || soll === "");
        const v = t.o.vorhanden;
        const leer = v === null || v === undefined || v === "";

        if (komplett) zuSetzen.push([t, 0]);
        else if (hatSoll && (leer || this.mengeMilli(v) < this.mengeMilli(soll))) zuSetzen.push([t, this.mengeMilli(soll)]);
    });

    await this.jeAcht(zuSetzen, ([t, milli]) => this.vorhandenSetzen(t, milli));
    return zuSetzen.length;
},

/* AB bearbeiten: Soll der Teile ändern. neu: [[teil, milli|null]].
   Nur geänderte Teile werden geschrieben; R-T1 läuft danach. */
sollSetzen: async function (neu) {

    const geaendert = neu.filter(([t, milli]) => !this.mengeGleich(t.o.menge_gesamt, milli));

    await this.jeAcht(geaendert, ([t, milli]) => this.datenAendern("teil", t.o, frisch => {
        const [ein, fertig] = this.datenStempeln(frisch.vorhanden, this.mengeWert(milli),
            frisch.datum_eingelagert, frisch.datum_komplett, this.heuteText());
        return { menge_gesamt: this.mengeWert(milli), menge_gesamt_text: "", datum_eingelagert: ein, datum_komplett: fertig };
    }, { ohnePruefung: true }));

    return geaendert.length;
},
