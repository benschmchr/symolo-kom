/* ===========================================================================
   ÄNDERUNGSPROTOKOLL (W7)
   Nachbau von bestand/protokoll.py: wer hat wann welche Menge, welchen
   Platz, welches Soll geändert; Archivieren, Wiederherstellen, Import.

   Betriebsrat/Datenschutz sind noch offen (Übergabe 7.3). Darum lässt sich
   das Protokoll abschalten, ohne Namen führen und zeitlich begrenzen. Die
   Einstellungen stehen in der Tabelle "einstellung" (Name/Wert).

   Geschrieben wird immer über datenAnlegen (der einzige Schreibpfad). Ein
   Fehler im Protokoll darf die eigentliche Änderung nie verhindern: er
   steht als Hinweis oben im Fenster.

   Gelöscht wird nie (Ben, 16.10.2026): "Aufbewahren" und "Leeren" blenden
   Einträge aus (archiviert). Endgültig löschen kann nur die IT in der
   Datenbank. OFFEN (Symolo): Soll das Protokoll hier eine Ausnahme sein?
   Namen entfernen geht dagegen wirklich (die Namen werden überschrieben).

   OFFEN (Symolo): Wer ist angemeldet (Name)? Bis dahin steht kein Name
   drin. Symolo selbst führt Person und Zeit in den Standardfeldern
   (iuser, idate, uuser, udate) jeder Zeile.
   =========================================================================== */

protokollArten: [
    ["menge", "Vorhanden"],
    ["lagerort", "Lagerort"],
    ["soll", "Soll"],
    ["import", "Import"],
    ["ersetzt", "Ersetzt (Import)"],
    ["archiviert", "Archiviert"],
    ["wiederhergestellt", "Wiederhergestellt"],
    ["forecast", "Forecast importiert"],
    ["entnommen", "Entnommen (Schweißen)"],
    ["zurueck", "Zurück in Bestandsliste"],
    ["schweissen", "Zuweisung Schweißen"]
],

protokollEinst: null,
protokollSeite: 100,

/* Jetzt, als UTC im Format von Symolo ("2026-10-16T13:20:33.1230000Z"). */
zeitJetzt: function () {

    return new Date().toISOString().replace("Z", "0000Z");
},

/* "2026-10-16T13:20:33.0000000Z" -> Millisekunden (UTC); null, wenn es keine Zeit ist.
   Reine Datumsangaben zählen als 0 Uhr UTC. */
zeitMs: function (wert) {

    const m = this.text(wert).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (!m) return null;

    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
},

/* Zeit in der Ortszeit des Browsers: "16.10.2026 15:20" (mitSekunden: "… 15:20:33").
   Fehlt die Uhrzeit, bleibt es beim Datum. */
zeitOrtText: function (wert, mitSekunden) {

    const ms = this.zeitMs(wert);
    if (ms === null) return this.text(wert);
    if (!/[T ]\d{2}:/.test(this.text(wert))) return this.datumText(wert);

    const d = new Date(ms);
    const z = n => String(n).padStart(2, "0");
    return z(d.getDate()) + "." + z(d.getMonth() + 1) + "." + d.getFullYear() + " " +
        z(d.getHours()) + ":" + z(d.getMinutes()) + (mitSekunden ? ":" + z(d.getSeconds()) : "");
},

/* Einstellungen laden (einmal je Fenster, neuLaden = erzwingen).
   Ohne Eintrag gilt: an, mit Namen, 90 Tage. */
protokollEinstellung: async function (neuLaden) {

    if (this.protokollEinst && !neuLaden) return this.protokollEinst;

    const zeilen = await this.datenLesen("einstellung", { aufloesen: false });
    const e = { aktiv: true, namen: true, tage: 90, zeilen: {} };
    zeilen.forEach(z => { e.zeilen[this.text(z.name)] = z; });

    const wert = n => (n in e.zeilen ? this.text(e.zeilen[n].wert) : null);
    if (wert("protokoll_aktiv") !== null) e.aktiv = wert("protokoll_aktiv") === "1";
    if (wert("protokoll_namen") !== null) e.namen = wert("protokoll_namen") === "1";
    if (wert("protokoll_tage") !== null && /^\d+$/.test(wert("protokoll_tage"))) e.tage = Number(wert("protokoll_tage"));

    this.protokollEinst = e;
    return e;
},

/* Einstellungen speichern. tage: 0 bis 3650 (0 = unbegrenzt). */
protokollEinstellen: async function (aktiv, namen, tage) {

    const e = await this.protokollEinstellung(true);
    const paare = [
        ["protokoll_aktiv", aktiv ? "1" : "0"],
        ["protokoll_namen", namen ? "1" : "0"],
        ["protokoll_tage", String(tage)]
    ];

    for (const [name, wert] of paare) {
        const zeile = e.zeilen[name];
        if (zeile) await this.datenAendern("einstellung", zeile, { wert: wert });
        else await this.datenAnlegen("einstellung", { name: name, wert: wert });
    }

    this.protokollEinst = null;
    return this.protokollEinstellung(true);
},

/* Einen Eintrag schreiben, wenn das Protokoll an ist. Namen nur, wenn
   eingeschaltet. Gibt true zurück, wenn geschrieben wurde. */
protokollSchreiben: async function (art, ab, objekt, alt, neu) {

    const kurz = (t, n) => this.text(t).slice(0, n);

    try {
        const e = await this.protokollEinstellung();
        if (!e.aktiv) return false;

        await this.datenAnlegen("aenderung", {
            zeit: this.zeitJetzt(),
            art: art,
            ab: kurz(ab, 80),
            objekt: kurz(objekt, 400),
            alt: kurz(alt, 200),
            neu: kurz(neu, 200),
            benutzer_name: e.namen ? kurz(this.benutzer().name, 150) : "",
            archiviert: false
        });
        return true;
    } catch (fehler) {
        console.warn("Protokoll:", fehler);
        const hinweis = "Protokoll konnte nicht geschrieben werden";
        if (this.datenHinweise.indexOf(hinweis) < 0) this.datenHinweise.push(hinweis);
        if (this.infoZeigen) this.infoZeigen();
        return false;
    }
},

/* Alle sichtbaren Einträge, neueste zuerst. */
protokollLesen: async function () {

    const liste = await this.datenLesen("aenderung", { aufloesen: false });
    liste.sort((a, b) => ((this.zeitMs(b.zeit) || 0) - (this.zeitMs(a.zeit) || 0)) || this.idVergleich(b._id, a._id));
    return liste;
},

/* Teil im Protokoll: "Teil SK1990-977452.002.0 (BG 100)". Der Teil-Knoten
   kennt AB-Name und BG-Kurzname (47_bestand.js). */
protokollTeil: function (t) {

    const bg = t.bgKurz === undefined ? "" : " (BG " + t.bgKurz + ")";
    return "Teil " + (this.text(t.o.zeichnungsnummer) || "(ohne Nr.)") + bg;
},

/* Menge fürs Protokoll: Zahl wie in der Liste, leer = "leer". */
protokollMenge: function (wert) {

    return this.mengeGleich(wert, null) ? "leer" : this.zahlText(this.mengeMilli(wert));
},

/* Suche (AB oder Zeile, ohne Groß-/Kleinschreibung), Art und Person. */
protokollFiltern: function (liste, suche, art, wer) {

    const q = this.text(suche).toLowerCase();

    return liste.filter(z =>
        (!q || this.text(z.ab).toLowerCase().indexOf(q) > -1 || this.text(z.objekt).toLowerCase().indexOf(q) > -1) &&
        (!art || this.text(z.art) === art) &&
        (!wer || this.text(z.benutzer_name) === wer));
},

/* Namen aller Personen im Protokoll, alphabetisch. */
protokollNamen: function (liste) {

    const je = {};
    liste.forEach(z => { if (this.text(z.benutzer_name)) je[this.text(z.benutzer_name)] = true; });
    return Object.keys(je).sort();
},

/* Alte Einträge ausblenden (älter als tage; 0 = nichts tun). Gibt die Zahl zurück. */
protokollAufraeumen: async function (liste, tage) {

    if (!tage) return 0;

    const grenze = Date.now() - tage * 86400000;
    const alt = liste.filter(z => (this.zeitMs(z.zeit) || 0) < grenze);

    await this.jeAcht(alt, z => this.datenAendern("aenderung", z, { archiviert: true }, { ohnePruefung: true }));
    return alt.length;
},

/* Alle sichtbaren Einträge ausblenden. */
protokollLeeren: async function (liste) {

    await this.jeAcht(liste, z => this.datenAendern("aenderung", z, { archiviert: true }, { ohnePruefung: true }));
    return liste.length;
},

/* Namen aus allen Einträgen entfernen (wenn "Namen speichern" ausgeschaltet
   wird), auch aus den ausgeblendeten. Gibt die Zahl zurück. */
protokollNamenEntfernen: async function () {

    const alle = await this.datenLesen("aenderung", { archiv: "alle", aufloesen: false });
    const mit = alle.filter(z => this.text(z.benutzer_name));

    await this.jeAcht(mit, z => this.datenAendern("aenderung", z, { benutzer_name: "" }, { ohnePruefung: true }));
    return mit.length;
},
