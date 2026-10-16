/* ===========================================================================
   ARCHIV (R-X1 bis R-X3)
   Nachbau von bestand/archiv.py. Ben (16.10.2026): Archivieren statt
   Löschen. Der AB bleibt mit allen BGs und Teilen in der Datenbank stehen
   und trägt nur die Markierung "archiviert" (Tabelle auftrag):
     archiviert, archiviert_am, archiv_herkunft, archiv_status.
   Das ersetzt die Kopie in die Archivtabelle: Wiederherstellen ist die
   Markierung wieder zu entfernen (kein Zurückbauen aus flachen Zeilen).

   Archiviert werden zwei Arten von ABs:
   - aus der Bestandsliste (Herkunft "Archiviert aus Bestandsliste"): BGs und
     Teile liegen in den Tabellen baugruppe und teil;
   - aus dem Schweißen (Herkunft "Archiviert aus Schweißen", Phase 6): die
     Zeilen liegen in der Tabelle schweisszeile (archiviert = ja).
   R-X2: Das Archiv zeigt je Zeile (AB, BG, Teil) die 28 Spalten wie das
   Excel-Blatt (ArchivKopf), hier aus diesen Tabellen zusammengesetzt.

   Planungshäkchen (Phase 5): archivierte ABs stehen nicht in der Planung,
   das Häkchen bleibt aber in der Tabelle (Django löschte es mit dem AB).
   =========================================================================== */

archivHerkunftBestand: "Archiviert aus Bestandsliste",
archivHerkunftSchweissen: "Archiviert aus Schweißen",
archivOhneBg: "(ohne BG)",
archivSeite: 50,

/* R-X2 / ArchivKopf: (Spaltenname wie Excel, Feld der Zeile) */
archivKopf: [
    ["AB", "ab"],
    ["Zeichnungsnummer", "zeichnungsnummer"],
    ["Benennung", "benennung"],
    ["Menge / BG", "menge_bg"],
    ["Menge Gesamt", "menge_gesamt"],
    ["Index", "index"],
    ["LK Nummer", "lk_nummer"],
    ["Arbeitsgang", "arbeitsgang"],
    ["Material", "material"],
    ["Profil", "profil"],
    ["Abmaße", "abmasse"],
    ["Vorhanden", "vorhanden"],
    ["Bemerkung", "bemerkung"],
    ["Status", "status"],
    ["Fortschritt", "fortschritt"],
    ["Ebene", "ebene"],
    ["Baugruppe", "baugruppe"],
    ["Gelöscht am", "geloescht_am"],
    ["Eingelagert", "eingelagert"],
    ["Komplett", "komplett"],
    ["DLZ", "dlz"],
    ["Lagerort", "lagerort"],
    ["Zuweisung Mitarbeiter", "mitarbeiter"],
    ["Zuweisung Arbeitsplatz", "arbeitsplatz"],
    ["Entnommen", "entnommen"],
    ["Liefertermin Stahlbau", "liefertermin_stahlbau"],
    ["Termin Versand", "termin_versand"],
    ["Herkunft", "herkunft"]
],

/* Spalten, die als Datum bzw. Zahl angezeigt werden. */
archivDatumFelder: ["eingelagert", "komplett", "entnommen", "liefertermin_stahlbau", "termin_versand"],
archivZahlFelder: ["menge_gesamt", "vorhanden", "dlz"],

/* Kopfdaten in der AB-Zeile (R-D2, wie ImportiereBlatt): Feld der Zeile -> [Vorsatz, Feld im AB] */
archivKopfEtiketten: {
    arbeitsgang: ["Kunde: ", "kunde"],
    material: ["Haupt-AB: ", "haupt_ab"],
    profil: ["Ersteller: ", "ersteller"],
    abmasse: ["Datum: ", "datum_liste"],
    bemerkung: ["Dispoliste: ", "dispoliste"]
},

/* Felder, die BG und Teil unverändert aus der Tabelle übernehmen. */
archivUebernehmen: ["zeichnungsnummer", "benennung", "menge_bg", "index", "lk_nummer", "arbeitsgang", "material",
    "profil", "abmasse", "bemerkung", "lagerort"],

archivAusSchweissen: function (kopf) {

    return this.text(kopf.archiv_herkunft) === this.archivHerkunftSchweissen;
},

/* Zeilen wie in Excel: die AB-Zeile, jede BG und jedes Teil (R-X1, Sicherheitsfrage). */
archivZeilenZahl: function (ab) {

    return 1 + ab.bgs.length + this.bestandTeile(ab).length;
},

/* ---------------------------------------------------------------------------
   Archivieren und Wiederherstellen
   --------------------------------------------------------------------------- */

/* R-X1: AB archivieren. ab = AB aus bestandLaden. Gibt die Zeilenzahl zurück. */
abArchivieren: async function (ab) {

    const n = this.archivZeilenZahl(ab);

    await this.datenAendern("auftrag", ab.o, frisch => {
        if (this.istJa(frisch.archiviert)) throw new Error(this.text(ab.o.ab_anzeige) + " ist schon im Archiv.");
        return {
            archiviert: true,
            archiviert_am: this.zeitJetzt(),
            archiv_herkunft: this.archivHerkunftBestand,
            archiv_status: ab.w.status
        };
    });

    await this.protokollSchreiben("archiviert", ab.o.ab_anzeige, "", n + " Zeilen", "Archiv");
    return n;
},

/* R-X3 neu: AB aus dem Archiv in die Bestandsliste zurückholen. kopf = Zeile
   aus archivLaden. Einen AB aus dem Schweißen holt die Ansicht Schweißen
   zurück (Phase 6). Hat der AB inzwischen seinen Platz in der Reihenfolge
   verloren, kommt er ans Ende (wie bisher). */
archivWiederherstellen: async function (kopf) {

    const name = this.text(kopf.ab_anzeige);

    if (this.archivAusSchweissen(kopf)) {
        throw new Error(name + " wurde im Schweißen archiviert. Dorthin holt ihn die Ansicht Schweißen zurück (kommt noch).");
    }

    /* nicht archivierte ABs mit demselben Schlüssel */
    const da = await this.datenLesen("auftrag", { wo: { ab_schluessel: kopf.ab_schluessel }, aufloesen: false });
    if (da.length) {
        throw new Error(name + " steht schon wieder in der Bestandsliste (neu importiert). " +
            "Erst dort archivieren, dann wiederherstellen.");
    }

    const live = await this.datenLesen("auftrag", { wo: { bereich: "bestand" }, aufloesen: false });
    const leer = v => v === null || v === undefined || v === "";
    const milli = live.map(a => this.mengeMilli(a.reihenfolge));
    const belegt = leer(kopf.reihenfolge) || milli.indexOf(this.mengeMilli(kopf.reihenfolge)) > -1;
    const ende = (milli.length ? Math.max(...milli) / 1000 : 0) + 1;

    await this.datenAendern("auftrag", kopf, frisch => {
        if (!this.istJa(frisch.archiviert)) throw new Error(name + " ist schon nicht mehr im Archiv.");
        return {
            archiviert: false,
            archiviert_am: null,
            archiv_herkunft: "",
            archiv_status: "",
            reihenfolge: belegt ? ende : frisch.reihenfolge
        };
    });

    await this.protokollSchreiben("wiederhergestellt", name, "", "Archiv", "Bestandsliste");
},

/* ---------------------------------------------------------------------------
   Lesen
   --------------------------------------------------------------------------- */

/* Alle archivierten ABs, zuletzt archivierte zuerst. */
archivLaden: async function () {

    const liste = await this.datenLesen("auftrag", { archiv: "nur", aufloesen: false });

    liste.sort((a, b) =>
        ((this.zeitMs(b.archiviert_am) || 0) - (this.zeitMs(a.archiviert_am) || 0)) || this.idVergleich(b._id, a._id));
    return liste;
},

/* R-X3: Treffer im Kopf eines AB (AB, Kunde, Verkaufsartikel), Teilwort, ohne Groß-/Kleinschreibung. */
archivKopfTreffer: function (kopf, suche) {

    const q = this.text(suche).toLowerCase();
    if (!q) return true;

    return ["ab_anzeige", "kunde", "verkaufsartikel"].some(f => this.text(kopf[f]).toLowerCase().indexOf(q) > -1);
},

/* R-X3: Treffer in einer Zeile (Zeichnungsnummer, Benennung, LK, Lagerort, Baugruppe). */
archivZeileTreffer: function (zeile, suche) {

    const q = this.text(suche).toLowerCase();
    return Boolean(q) && ["zeichnungsnummer", "benennung", "lk_nummer", "lagerort", "baugruppe"]
        .some(f => this.text(zeile[f]).toLowerCase().indexOf(q) > -1);
},

/* DLZ (R-W5): Termin Versand minus Eingelagert in Tagen; leer, solange eins fehlt. */
archivDlz: function (eingelagert, versand) {

    const a = this.zeitMs(eingelagert), b = this.zeitMs(versand);
    if (a === null || b === null) return "";
    return Math.round((b - a) / 86400000);
},

archivLeereZeile: function () {

    const z = {};
    this.archivKopf.forEach(([, feld]) => { z[feld] = ""; });
    return z;
},

/* Die 28 Spalten für einen AB aus der Bestandsliste (Teile ohne BG vorn, wie in Excel).
   Zahlen stehen als Text da, wie sie in der Bestandsliste angezeigt wurden. */
archivZeilenAusBestand: function (ab, kopf) {

    const gemeinsam = { geloescht_am: this.text(kopf.archiviert_am), herkunft: this.text(kopf.archiv_herkunft) };
    const mitWerten = (z, w) => Object.assign(z, {
        status: w.status, fortschritt: w.fortschritt, eingelagert: this.text(w.eingelagert), komplett: this.text(w.komplett)
    });
    const uebernehmen = (z, o) => this.archivUebernehmen.forEach(f => { z[f] = this.text(o[f]); });

    const zeilen = [];

    const abZeile = Object.assign(this.archivLeereZeile(), gemeinsam, {
        ab: this.text(ab.o.ab_anzeige),
        ebene: "AB",
        zeichnungsnummer: this.text(ab.o.ab_anzeige),
        benennung: this.text(ab.o.verkaufsartikel),
        lagerort: this.text(ab.o.lagerort)
    });
    for (const feld in this.archivKopfEtiketten) {
        const [vorsatz, quelle] = this.archivKopfEtiketten[feld];
        const wert = this.text(ab.o[quelle]);
        abZeile[feld] = wert ? vorsatz + wert : "";
    }
    zeilen.push(mitWerten(abZeile, ab.w));

    const teilZeile = (t, bgName) => {
        const z = Object.assign(this.archivLeereZeile(), gemeinsam, {
            ab: this.text(ab.o.ab_anzeige),
            ebene: "Teil",
            baugruppe: bgName,
            menge_gesamt: this.sollText(t.o),
            vorhanden: this.mengeGleich(t.o.vorhanden, null) ? "" : this.zahlText(this.mengeMilli(t.o.vorhanden))
        });
        uebernehmen(z, t.o);
        return mitWerten(z, t.w);
    };

    ab.ohne.forEach(t => zeilen.push(teilZeile(t, this.archivOhneBg)));

    ab.bgs.forEach(b => {
        const z = Object.assign(this.archivLeereZeile(), gemeinsam, {
            ab: this.text(ab.o.ab_anzeige),
            ebene: "BG",
            baugruppe: this.text(b.o.name),
            menge_gesamt: this.sollText(b.o)
        });
        uebernehmen(z, b.o);
        zeilen.push(mitWerten(z, b.w));
        b.teile.forEach(t => zeilen.push(teilZeile(t, this.text(b.o.name))));
    });

    return zeilen;
},

/* Die 28 Spalten für einen AB aus dem Schweißen (Zeilen der Tabelle schweisszeile, nach nr). */
archivZeilenAusSchweissen: function (zeilen, kopf) {

    const felder = ["zeichnungsnummer", "benennung", "menge_bg", "menge_gesamt", "index", "lk_nummer", "arbeitsgang",
        "material", "profil", "abmasse", "vorhanden", "bemerkung", "status", "fortschritt", "ebene", "baugruppe",
        "eingelagert", "komplett", "lagerort", "mitarbeiter", "arbeitsplatz", "entnommen", "liefertermin_stahlbau",
        "termin_versand"];

    return zeilen.slice().sort((a, b) => (this.mengeMilli(a.nr) - this.mengeMilli(b.nr)) || this.idVergleich(a._id, b._id))
        .map(s => {
            const z = this.archivLeereZeile();
            felder.forEach(f => { z[f] = this.text(s[f]); });
            z.ab = this.text(s.ab_nr);
            z.geloescht_am = this.text(kopf.archiviert_am);
            z.herkunft = this.text(kopf.archiv_herkunft);
            z.dlz = this.archivDlz(s.eingelagert, s.termin_versand);
            return z;
        });
},

/* Zeilen eines archivierten AB (28 Spalten). kopf = Zeile aus archivLaden. */
archivZeilenLaden: async function (kopf) {

    if (this.archivAusSchweissen(kopf)) {
        const sz = await this.datenLesen("schweisszeile", {
            wo: { ab_schluessel: kopf.ab_schluessel }, archiv: "nur", aufloesen: false, sortierung: ["nr"]
        });
        return this.archivZeilenAusSchweissen(sz, kopf);
    }

    const baum = await this.bestandLaden([kopf._id], { archiv: "nur" });
    return baum.length ? this.archivZeilenAusBestand(baum[0], baum[0].o) : [];
},

/* Zeilen aller archivierten ABs für die Suche in den Zeilen (R-X3). Lädt BGs,
   Teile und Schweißzeilen in Stücken. Ergebnis: { AB-ID als Text: Zeilen }.
   OFFEN (Symolo): Das lädt alle Zeilen des Archivs. Gibt es eine Suche mit
   "like" oder einen Befehl dafür, wäre das nicht nötig. */
archivZeilenAlle: async function (koepfe) {

    const ergebnis = {};
    const bestand = koepfe.filter(k => !this.archivAusSchweissen(k));
    const schweissen = koepfe.filter(k => this.archivAusSchweissen(k));

    if (bestand.length) {
        const baum = await this.bestandLaden(bestand.map(k => k._id), { archiv: "nur" });
        baum.forEach(ab => { ergebnis[String(ab.o._id)] = this.archivZeilenAusBestand(ab, ab.o); });
    }

    if (schweissen.length) {
        const sz = await this.datenLesenIn("schweisszeile", "ab_schluessel", schweissen.map(k => k.ab_schluessel),
            { archiv: "nur" });
        schweissen.forEach(k => {
            ergebnis[String(k._id)] = this.archivZeilenAusSchweissen(
                sz.filter(s => this.text(s.ab_schluessel) === this.text(k.ab_schluessel)), k);
        });
    }

    koepfe.forEach(k => { if (!ergebnis[String(k._id)]) ergebnis[String(k._id)] = []; });
    return ergebnis;
},

/* Text einer Zelle im Archiv: Gelöscht am mit Uhrzeit, andere Daten ohne. */
archivWert: function (zeile, feld) {

    const w = zeile[feld];
    if (feld === "geloescht_am") return this.zeitOrtText(w);
    if (this.archivDatumFelder.indexOf(feld) > -1) return this.datumText(w);
    return this.text(w);
},
