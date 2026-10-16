/* ===========================================================================
   RECHTE
   Keine Anmeldung und keine Rollen (Ben und Entwickler, 16.10.2026). Symolo
   stellt ein einfaches Objekt bereit, das der Entwickler im Framework füllt:

       const currentRights = { "kom.edit.canimportkomlisten": true, ... }

   Format <modul>.<gruppe>.<recht>. Wir brauchen nur wenige Rechte (unten).
   Ein Recht fehlt oder ist nicht true: Die Ansicht blendet den Knopf aus und
   zeigt einen Hinweis.
   Im lokalen Nachbau (test.html) gilt alles als erlaubt; im Symolo-Fenster
   ohne das Objekt gilt nichts als erlaubt.
   Wichtig: Die Ansicht blendet nur Knöpfe aus. Geschützt ist erst, wenn Symolo
   die Schreibrechte je Tabelle prüft.
   OFFEN (Symolo): Der Entwickler legt die Rechte im Framework an und trägt
   sie ein; heißen sie anders, ändert sich nur die Liste hier.
   =========================================================================== */

rechte: {
    importKomlisten: "kom.edit.canimportkomlisten",
    importForecast: "kom.edit.canimportforecast"
},

/* Das Rechte-Objekt aus Symolo oder null. Es ist ein Wert im Framework (const), kein Eintrag in window. */
rechteObjekt: function () {

    /* eslint-disable-next-line no-undef */
    if (typeof currentRights !== "undefined" && currentRights && typeof currentRights === "object") return currentRights;

    const w = typeof window !== "undefined" ? window : null;
    return w && w.currentRights && typeof w.currentRights === "object" ? w.currentRights : null;
},

/* Darf die Person das? recht = Schlüssel aus this.rechte. */
darf: function (recht) {

    const objekt = this.rechteObjekt();
    if (objekt) return objekt[recht] === true;

    return this.datenQuelle() === "lokal";
},

/* Name für das Protokoll. OFFEN (Symolo): Woher kommt der Name der Person? Bis dahin leer. */
benutzer: function () {

    return { name: "" };
},

/* Hinweis, wenn ein Recht fehlt (für die Ansichten). */
rechtFehlt: function () {

    return "Dafür fehlt dir das Recht. Bitte wende dich an Planung oder Stahlbau.";
},
