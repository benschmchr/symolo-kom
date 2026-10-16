/* ===========================================================================
   EINSTELLUNGEN
   Was der Symolo-Entwickler beim Einbinden anpasst, steht hier und in
   20_tabellen.js. Sonst muss im Code nichts geändert werden.

   Kennzeichnung in allen Dateien:
     OFFEN (Symolo)    = noch nicht geklärt, der Entwickler prüft/trägt ein
     VERMUTET          = aus Beispielen geschlossen, nicht bestätigt
   =========================================================================== */
einstellungen: {

    /* Woher die Daten kommen:
         "automatisch" = im Symolo-Fenster Symolo, sonst lokaler Nachbau
         "lokal"       = immer der Nachbau mit Beispieldaten
         "symolo-test" = NUR für den Entwickler: Test von außen über
                         window.symolo.network (wie test.html, mit eigener
                         Anmeldung VOR dem Laden der Ansicht). Nie in der
                         fertigen App benutzen. */
    quelle: "automatisch",

    /* OFFEN (Symolo): Muss im Fenster ein Endpunkt übergeben werden, oder
       setzt internal.connection ihn selbst? In test.html stand
       "wss://…/cmd2". Hier eintragen, falls nötig. */
    endpunktSymolo: "",

    /* Nur für den lokalen Nachbau, erreicht nichts außerhalb des Browsers. */
    endpunktLokal: "lokal://beispieldaten",

    /* Jede Anfrage bricht nach dieser Zeit ab. Ohne Grenze hängt
       websocket.request bei totem Endpunkt endlos (Skill, API-Grenzen). */
    timeoutMs: 15000,

    /* SCHREIBSPERRE in Symolo: Erst auf true setzen, wenn alle Namen in
       20_tabellen.js geprüft sind. Bis dahin liest die App nur.
       Im lokalen Nachbau wird immer geschrieben. */
    schreibenErlaubtInSymolo: false
},
