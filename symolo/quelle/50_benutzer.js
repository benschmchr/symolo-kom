/* ===========================================================================
   BENUTZER UND RECHTE
   Rechte nach Herrn Herzog (16.10.2026): ein einfaches Objekt currentRights,
   Namen <modul>.<gruppe>.<recht>, sparsam. Ansehen darf jeder. Fehlt ein
   Recht, ist der Knopf aus. Nur diese Stelle prüft Rechte.

   OFFEN (Symolo): Woher bekommt die Ansicht currentRights und den Namen der
   angemeldeten Person? VERMUTET: als window.currentRights.
   Ohne currentRights gilt: im lokalen Nachbau alle Rechte an, in Symolo keins.
   Wichtig: Die Ansicht schaltet nur Knöpfe aus. Geschützt ist erst, wenn
   Symolo die Schreibrechte je Tabelle selbst prüft.
   =========================================================================== */

/* Die Rechte der App. Rechts steht, was ohne das Recht aus ist. */
rechteListe: {
    "kom.bestand.bearbeiten": "Vorhanden, Soll, Lagerort, Regal, Entnehmen, Archivieren, Wiederherstellen",
    "kom.schweissen.bearbeiten": "Mitarbeiter, Arbeitsplatz, Termine, Archivieren, Zurück",
    "kom.planung.bearbeiten": "Häkchen in der Planung",
    "kom.import.excel": "Kommissionierliste und Forecast einlesen (kommt mit Phase 7)",
    "kom.protokoll.verwalten": "Protokoll ansehen, Einstellungen, leeren"
},

benutzer: function () {

    return { name: "" };
},

rechte: function () {

    const r = window.currentRights;
    if (r && typeof r === "object") return r;
    if (this.datenQuelle() === "lokal") {
        const alle = {};
        for (const name in this.rechteListe) alle[name] = true;
        return alle;
    }
    return {};
},

/* Darf die Person das? recht = Name aus rechteListe. */
darf: function (recht) {

    return this.rechte()[recht] === true;
},

/* Knopf oder Feld aus, wenn das Recht fehlt. Gibt das Element zurück. */
nurMitRecht: function (el, recht) {

    if (!this.darf(recht)) {
        el.disabled = true;
        el.title = "Dafür fehlt das Recht.";
    }
    return el;
},
