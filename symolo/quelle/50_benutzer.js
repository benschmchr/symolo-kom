/* ===========================================================================
   BENUTZER UND ROLLEN
   Vorerst OHNE Anmeldung und Rechte (Ben, 16.10.2026): Alle sehen und
   dürfen alles. Diese Stelle ist nur vorbereitet, damit Rollen später
   ohne Umbau dazukommen.

   OFFEN (Symolo), für später: Woher bekommt die Ansicht Name und Gruppen
   der angemeldeten Person (Sitzungsdaten, Formulardaten, ein Befehl)?
   Geplante Rollen: Gast (nur ansehen), Kommissionierung, Stahlbau, Admin.
   Wichtig: Die Ansicht blendet nur Knöpfe aus. Geschützt ist erst, wenn
   Symolo die Schreibrechte je Tabelle prüft.
   =========================================================================== */

benutzer: function () {

    return { name: "", rollen: ["Kommissionierung", "Stahlbau", "Admin"] };
},

/* Darf die Person das? Vorerst immer ja. */
darf: function (rolle) {

    return this.benutzer().rollen.indexOf(rolle) >= 0 || this.benutzer().rollen.indexOf("Admin") >= 0;
},
