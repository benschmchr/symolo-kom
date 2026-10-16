/* ===========================================================================
   ANSICHT: Forecast importieren (R-F1, R-F4, R-F5)
   Die Forecast-Liste ("Forecast Cockpit") hochladen; sie ersetzt den bisherigen
   Forecast ganz (der alte wird archiviert, nicht gelöscht). Dazu der Link zur
   Datei (R-F1). Lesen: 4R_forecast_lesen.js. Speichern: 4T_forecast_import.js.
   Recht: kom.edit.canimportforecast (50_benutzer.js).
   =========================================================================== */

gewaehlt: [],
laeuft: false,
inhalt: null,
aktuellEl: null,
linkEl: null,
quelleEingabe: null,
importKnopf: null,
ablage: null,

before_set_values: async function (form, { data }) {

    const parent = this.ctrlbyBind("_output").SelfElement;

    this.geruestBauen(parent);
    this.infoZeigen();
    this.knopf(this.fuss, "← Forecast", () => this.bereichOeffnen("forecast"));

    this.inhalt = this.el(this.koerper, "div", "kom-zusammen");

    if (!this.darf(this.rechte.importForecast)) {
        this.el(this.inhalt, "div", "kom-hinweis", this.rechtFehlt());
        return;
    }

    this.el(this.inhalt, "p", "kom-leise", "Die Forecast-Liste („Forecast Cockpit“) hochladen. Gelesen wird das Blatt „Auftragsübersicht“ " +
        "(sonst das erste Blatt mit den Spalten „Auftrag.-Nr“ und „Liefertermin“). Der neue Forecast ersetzt den bisherigen ganz.");

    this.aktuellEl = this.el(this.inhalt, "div", "kom-hinweis");
    this.linkEl = this.el(this.inhalt, "div");

    this.ablage = this.ablageBauen(this.inhalt, false, "Datei hierher ziehen",
        "oder auswählen · eine Forecast-Liste (.xlsx, .xlsm), bis " + this.fcMaxGroesse / (1024 * 1024) + " MB",
        liste => {
            this.gewaehlt = liste;
            this.importKnopf.disabled = liste.length === 0 || this.laeuft;
        });

    this.el(this.inhalt, "p", "kom-leise kom-klein", "Die Datei wird nur gelesen, Makros werden nie ausgeführt.");

    const zeile = this.el(this.inhalt, "div", "kom-knopfzeile");
    this.importKnopf = this.knopf(zeile, "Importieren →", () => this.importieren(), "haupt");
    this.importKnopf.disabled = true;
    this.knopf(zeile, "Abbrechen", () => this.bereichOeffnen("forecast"));

    this.quelleBauen();
    this.meldungEl = this.el(this.inhalt, "div", "kom-hinweis");

    await this.aktuellLaden();
},

/* Der Forecast, der gerade gilt: Datei, Blatt, Stand, wann importiert. */
aktuellLaden: async function () {

    const fc = await this.sicher(() => this.fcLaden());
    const quelle = await this.sicher(() => this.fcQuelleLesen());

    this.aktuellEl.replaceChildren();
    this.linkEl.replaceChildren();

    if (fc !== null && fc.f) {
        const f = fc.f;
        const teile = [f.datei, "Blatt „" + this.text(f.blatt) + "“"];
        if (this.text(f.stand)) teile.push(f.stand);
        teile.push("importiert am " + this.datumZeitText(f.zeit));
        this.aktuellEl.textContent = "Aktuell: " + teile.map(t => this.text(t)).join(" · ");
    } else if (fc !== null) {
        this.aktuellEl.textContent = "Noch kein Forecast importiert.";
    }

    /* R-F1: nur http und https werden zum Link (nie javascript: o. ä.). */
    const link = this.fcQuelleLink(quelle || "");
    if (link) {
        const p = this.el(this.linkEl, "p");
        const a = this.el(p, "a", "kom-knopf", "Forecast-Datei öffnen ↗");
        a.href = link;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        this.el(p, "span", "kom-leise kom-klein", " Datei dort herunterladen und hier auswählen.");
    }

    if (this.quelleEingabe && quelle !== null) this.quelleEingabe.value = quelle;
},

/* R-F1: Link zur Forecast-Datei hinterlegen. */
quelleBauen: function () {

    const block = this.el(this.inhalt, "div", "kom-feldblock");
    this.el(block, "strong", "", "Link zur Forecast-Datei");
    this.el(block, "label", "kom-label", "Link oder Pfad (aus SharePoint „Link kopieren“ oder der Adresszeile)");
    this.quelleEingabe = this.el(block, "input", "kom-eingabe");
    this.quelleEingabe.type = "text";
    this.quelleEingabe.placeholder = "https://firma.sharepoint.com/sites/…/Forecast.xlsm";
    this.quelleEingabe.setAttribute("aria-label", "Link zur Forecast-Datei");
    this.el(block, "span", "kom-leise kom-klein", "Ein Teilen-Link wird automatisch gekürzt (alles ab „?“ und „/:x:/r/“ fällt weg).");

    const zeile = this.el(block, "div", "kom-knopfzeile");
    this.knopf(zeile, "Link speichern", async () => {
        const gespeichert = await this.sicher(() => this.fcQuelleSpeichern(this.quelleEingabe.value));
        if (gespeichert === null) return;
        this.quelleEingabe.value = gespeichert;
        this.statusZeigen("Link gespeichert.");
        await this.aktuellLaden();
    });
},

importieren: async function () {

    if (this.laeuft || this.gewaehlt.length === 0) return;
    this.laeuft = true;
    this.importKnopf.disabled = true;
    this.meldungEl.replaceChildren();

    const datei = this.gewaehlt[0];
    this.statusZeigen("Lese die Datei …");

    const ergebnis = await this.sicher(async () => {
        const bytes = await this.dateiBytes(datei, this.fcMaxGroesse / (1024 * 1024));
        const gelesen = await this.fcLesen(bytes, datei.name);
        return this.fcSpeichern(gelesen, t => this.statusZeigen(t));
    });

    this.laeuft = false;

    if (ergebnis === null) {
        /* Der bisherige Forecast gilt weiter (4T). */
        this.meldungEl.textContent = "Der bisherige Forecast gilt weiter.";
        this.importKnopf.disabled = this.gewaehlt.length === 0;
        return;
    }

    /* R-F5 */
    const meldung = this.fcMeldung(ergebnis);
    this.meldungEl.textContent = meldung + " ";
    this.knopf(this.meldungEl, "Zum Forecast", () => this.bereichOeffnen("forecast"), "haupt");
    this.statusZeigen(meldung);
    this.ablage.leeren();
    await this.aktuellLaden();
},
