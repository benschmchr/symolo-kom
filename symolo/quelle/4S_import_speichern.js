/* ===========================================================================
   KOMMISSIONIERLISTEN IMPORTIEREN: VORSCHAU UND SPEICHERN (R-I8 bis R-I10)
   Nachbau von bestand/importer.py (speichern) und der Rückfrage in
   bestand/views.py (import_pruefen). Gelesen wird in 4Q_import_lesen.js.

   Ersetzen ohne Löschen (Symolo kennt kein Löschen, Entwickler 16.10.2026):
     1. der AB-Kopf wird an seinem Platz in der Liste aktualisiert,
     2. Baugruppen und Teile aus der Datei werden NEU angelegt,
     3. die bisherigen Baugruppen und Teile werden zuletzt archiviert (ausgeblendet).
   Bricht der Import mittendrin ab, steht höchstens etwas doppelt da, nichts fehlt.
   OFFEN (Symolo): Es gibt keine Transaktion und kein Anlegen mehrerer Zeilen auf
   einmal. Die archivierten alten Zeilen bleiben in der Datenbank (die IT kann sie
   später endgültig löschen). Bei jedem Anlegen holt die Datenschicht erst ein leeres
   Objekt; ein Sammel-Anlegen würde einen Import deutlich beschleunigen.
   =========================================================================== */

/* Die ABs in der Bestandsliste mit diesem Schlüssel (R-AB3, auch andere Los-Schreibweise); null = keiner. */
impVorhanden: async function (ab) {

    if (this.text(ab) === "") return null;

    const liste = await this.datenLesen("auftrag", {
        wo: { ab_schluessel: this.abSchluessel(ab), bereich: "bestand" }, aufloesen: false
    });
    return liste.length ? liste[0] : null;
},

/* Vorschau: je gelesene Datei { nr, g, alt, doppelt, imSchweissen }. Dieselbe AB-Nummer in mehreren Dateien:
   die letzte Datei gilt. */
impVorschau: async function (gelesene) {

    const letzte = {};
    gelesene.forEach((g, i) => { if (this.impAb(g)) letzte[this.abSchluessel(this.impAb(g))] = i; });

    const zeilen = [];

    for (let i = 0; i < gelesene.length; i++) {
        const g = gelesene[i];
        const ab = this.impAb(g);
        const doppelt = ab !== "" && letzte[this.abSchluessel(ab)] !== i;
        const alt = ab ? await this.impVorhanden(ab) : null;
        const imSchweissen = ab !== "" && !doppelt && await this.swHatAb(ab);   /* R-I10 */

        zeilen.push({ nr: i, g: g, alt: alt, doppelt: doppelt, imSchweissen: imSchweissen });
    }

    return zeilen;
},

/* Viele Zeilen anlegen, je 8 gleichzeitig; Ergebnis in der Reihenfolge der Liste. */
impAnlegenViele: async function (name, liste) {

    const ergebnis = new Array(liste.length);
    await this.jeAcht(liste.map((werte, i) => [werte, i]), async ([werte, i]) => { ergebnis[i] = await this.datenAnlegen(name, werte); });
    return ergebnis;
},

/* Je Teil der bisherigen Zeilen die erfassten Werte (R-I8): Vorhanden, Lagerort, Eingelagert, Komplett.
   Schlüssel = BG-Name | Zeichnungsnummer | LK-Nummer; bei doppelten Teilen gewinnt die erste Zeile (wie Excel). */
impMerken: async function (alt) {

    const merk = { v: {}, l: {}, e: {}, f: {} };
    const bgs = await this.datenLesenIn("baugruppe", "auftrag", [alt._id], { aufloesen: false });
    const teile = await this.datenLesenIn("teil", "auftrag", [alt._id], { aufloesen: false, sortierung: ["zeile"] });
    const name = {};
    bgs.forEach(b => { name[String(b._id)] = this.text(b.name); });

    teile.slice().sort((a, b) => (this.mengeMilli(a.zeile) - this.mengeMilli(b.zeile)) || this.idVergleich(a._id, b._id)).forEach(t => {
        const bg = t._baugruppe_id === null || t._baugruppe_id === undefined || t._baugruppe_id === ""
            ? this.impOhneBg : (name[String(t._baugruppe_id)] || this.impOhneBg);
        const s = this.impTeilSchluessel(bg, { zeichnungsnummer: this.text(t.zeichnungsnummer), lk_nummer: this.text(t.lk_nummer) });

        [["v", t.vorhanden], ["l", t.lagerort], ["e", t.datum_eingelagert], ["f", t.datum_komplett]].forEach(([k, wert]) => {
            if (wert !== null && wert !== undefined && wert !== "" && !(s in merk[k])) merk[k][s] = wert;
        });
    });

    return { merk: merk, bgs: bgs, teile: teile };
},

/* Einen gelesenen AB anlegen oder ersetzen (R-I8, R-I9). heute: Datum als Text (Standard: heute).
   melden(text): Fortschritt für die Ansicht. Gibt { auftrag, ersetzt } zurück. */
impSpeichern: async function (g, abEingabe, heute, melden) {

    const ab0 = this.abForm(abEingabe || this.impAb(g));
    if (!ab0) throw new Error("Fertigungs-AB-Nummer fehlt.");

    const tag = heute || this.heuteText();
    const sage = text => { if (melden) melden(text); };
    const alt = await this.impVorhanden(ab0);

    let ab = ab0;
    let altes = { merk: { v: {}, l: {}, e: {}, f: {} }, bgs: [], teile: [] };

    if (alt) {
        if (this.abForm(alt.ab_anzeige) === this.text(alt.ab_anzeige)) ab = this.text(alt.ab_anzeige);   /* bisherige Schreibweise ist korrekt: bleibt */
        altes = await this.impMerken(alt);
    }

    const k = g.kopf;
    const kopf = {
        ab_anzeige: ab, ab_schluessel: this.abSchluessel(ab), forecast_schluessel: this.abForecastSchluessel(ab),
        haupt_ab: k.haupt_ab, kunde: k.kunde, verkaufsartikel: k.verkaufsartikel,
        ersteller: k.ersteller, datum_liste: k.datum, dispoliste: k.dispoliste,
        lagerort: "",   /* W6 = wie Excel: der Lagerort am AB geht verloren */
        quelldatei: this.text(g.datei).slice(0, 255)
    };

    sage("Schreibe den Kopf von " + ab + " …");
    let auftrag;

    if (alt) {
        auftrag = await this.datenAendern("auftrag", alt, kopf);
    } else {
        const alle = await this.datenLesen("auftrag", { wo: { bereich: "bestand" }, aufloesen: false, felder: ["reihenfolge"] });
        const hoechste = alle.reduce((m, a) => Math.max(m, this.mengeMilli(a.reihenfolge)), 0) / 1000;
        auftrag = await this.datenAnlegen("auftrag", Object.assign(kopf, {
            reihenfolge: hoechste + 1, bereich: "bestand", archiviert: false
        }));
    }

    /* Baugruppen zuerst (die Teile verweisen auf sie), dann die Teile. */
    const bgListe = [], teilListe = [];
    g.zeilen.forEach((z, i) => { (z.ebene === "BG" ? bgListe : teilListe).push([z, i + 1]); });

    const gemeinsam = (w) => ({
        zeichnungsnummer: w.zeichnungsnummer, benennung: w.benennung, menge_bg: w.menge_bg, index: w.index,
        lk_nummer: w.lk_nummer, arbeitsgang: w.arbeitsgang, material: w.material, profil: w.profil,
        abmasse: w.abmasse, bemerkung: w.bemerkung, menge_gesamt_text: w.menge_gesamt_text || "",
        menge_gesamt: w.menge_gesamt === null || w.menge_gesamt === undefined ? null : this.mengeWert(this.mengeMilli(w.menge_gesamt))
    });

    sage("Lege " + bgListe.length + " Baugruppen an …");
    const neueBgs = await this.impAnlegenViele("baugruppe", bgListe.map(([z, nr]) => Object.assign(gemeinsam(z.werte), {
        auftrag: auftrag._id, zeile: nr, name: z.bg, kurz: z.bg.split(" ")[0], lagerort: "", archiviert: false
    })));

    /* Zu jeder Teilzeile die zuletzt gelesene Baugruppe (R-D4). */
    const bgId = {};
    let letzteBg = null, nr = 0;
    g.zeilen.forEach((z, i) => {
        if (z.ebene === "BG") letzteBg = neueBgs[nr++]._id;
        else bgId[i + 1] = z.bg === this.impOhneBg ? null : letzteBg;
    });

    const m = altes.merk;
    sage("Lege " + teilListe.length + " Teile an …");

    await this.impAnlegenViele("teil", teilListe.map(([z, nr]) => {
        const w = z.werte;
        const s = this.impTeilSchluessel(z.bg, w);
        const soll = w.menge_gesamt === null || w.menge_gesamt === undefined ? null : this.mengeWert(this.mengeMilli(w.menge_gesamt));
        const vorhanden = w.vorhanden !== null && w.vorhanden !== undefined ? this.mengeWert(this.mengeMilli(w.vorhanden)) : (s in m.v ? m.v[s] : null);
        const [ein, fertig] = this.datenStempeln(vorhanden, soll, m.e[s], m.f[s], tag);   /* R-T1 / R-I9 */

        return Object.assign(gemeinsam(w), {
            auftrag: auftrag._id, baugruppe: bgId[nr], zeile: nr,
            lagerort: s in m.l ? m.l[s] : "", vorhanden: vorhanden, datum_eingelagert: ein, datum_komplett: fertig, archiviert: false
        });
    }));

    /* Zuletzt die bisherigen Zeilen ausblenden. */
    if (alt) {
        sage("Blende die bisherigen Zeilen aus …");
        await this.jeAcht(altes.teile.concat(altes.bgs).map(x => [x, altes.teile.indexOf(x) >= 0 ? "teil" : "baugruppe"]),
            ([zeile, tabelle]) => this.datenArchivieren(tabelle, zeile));
    }

    await this.protokollSchreiben(alt ? "ersetzt" : "import", ab, "", "", g.datei);
    return { auftrag: auftrag, ersetzt: Boolean(alt) };
},

/* R-I9: Meldung nach dem Import. */
impMeldung: function (neu, ersetzt) {

    const n = neu + ersetzt;
    if (!n) return "Es wurde nichts importiert.";

    let text = n === 1 ? "1 Arbeitsauftrag importiert." : n + " Arbeitsaufträge importiert.";
    if (ersetzt) text += " Davon ersetzt: " + ersetzt + ".";
    return text;
},

/* Die Entscheidungen der Vorschau ausführen. zeilen: aus impVorschau; wahl: je Zeile
   { ab: eingetragene AB-Nummer (wenn sie in der Datei fehlte), ersetzen: true/false, schweissen: true/false }.
   Dieselbe Regel wie bestand/views.py: Nein heißt überspringen. Gibt { neu, ersetzt, zuletzt, meldung } zurück. */
impAusfuehren: async function (zeilen, wahl, heute, melden) {

    let neu = 0, ersetzt = 0, zuletzt = null;

    for (const z of zeilen) {
        if (z.doppelt) continue;

        const w = (wahl && wahl[z.nr]) || {};
        const gelesenAb = this.impAb(z.g);
        const ab = gelesenAb || this.abForm(w.ab || "");   /* R-I4: fehlt er in der Datei, hat ihn die Person eingetragen */
        if (!ab) continue;

        const imSw = z.imSchweissen || (!gelesenAb && await this.swHatAb(ab));
        if (imSw && w.schweissen !== true) continue;                    /* R-I10: Nein = überspringen */

        const da = gelesenAb ? z.alt : await this.impVorhanden(ab);
        if (da && w.ersetzen !== true) continue;                        /* R-I8: Nein = überspringen */

        const erg = await this.impSpeichern(z.g, ab, heute, melden);
        if (erg.ersetzt) ersetzt++; else neu++;
        zuletzt = erg.auftrag;
    }

    return { neu: neu, ersetzt: ersetzt, zuletzt: zuletzt, meldung: this.impMeldung(neu, ersetzt) };
},
