/* ===========================================================================
   ANSICHT: Forecast-Daten (R-F11)
   Die importierte Forecast-Liste mit allen Spalten. Vorn zwei Spalten für den
   Abgleich: AB ohne Los und der Termin, der zählt. Suche über alle Spalten,
   250 Zeilen je Seite. Laden: 4T_forecast_import.js.
   Recht: kom.edit.canimportforecast (50_benutzer.js).
   =========================================================================== */

fd: null,
alle: [],
treffer: [],
suche: "",
seite: 0,
inhalt: null,
tabelleEl: null,
zaehlerEl: null,
seitenEl: null,
sucheEl: null,

before_set_values: async function (form, { data }) {

    const parent = this.ctrlbyBind("_output").SelfElement;

    this.geruestBauen(parent);
    this.infoZeigen();
    this.knopf(this.fuss, "← Forecast", () => this.bereichOeffnen("forecast"));

    this.inhalt = this.el(this.koerper, "div");

    if (!this.darf(this.rechte.importForecast)) {
        this.el(this.inhalt, "div", "kom-hinweis", this.rechtFehlt());
        return;
    }

    this.knopf(this.fuss, "Forecast importieren", () => this.bereichOeffnen("forecast_import"));
    this.infoEl = this.el(this.inhalt, "p", "kom-leise");

    const zeile = this.el(this.inhalt, "div", "kom-suchzeile");
    this.sucheEl = this.el(zeile, "input", "kom-eingabe");
    this.sucheEl.type = "search";
    this.sucheEl.placeholder = "AB, Kunde, Bezeichnung …";
    this.sucheEl.setAttribute("aria-label", "Suche");
    this.sucheEl.onkeydown = e => { if (e.key === "Enter") this.suchen(); };
    this.knopf(zeile, "Suchen", () => this.suchen(), "haupt");
    this.knopf(zeile, "Alles anzeigen", () => { this.sucheEl.value = ""; this.suchen(); });

    this.zaehlerEl = this.el(this.inhalt, "p", "kom-klein");
    this.tabelleEl = this.el(this.inhalt, "div");
    this.seitenEl = this.el(this.inhalt, "div", "kom-seiten");

    await this.laden();
},

laden: async function () {

    this.statusZeigen("Lade …");

    const daten = await this.sicher(async () => {
        const fc = await this.fcLaden();
        return { f: fc.f, d: await this.fcDatenLaden(fc.f) };
    });

    if (daten === null) return;

    this.fd = daten;
    this.alle = daten.d.zeilen;

    this.infoEl.replaceChildren();
    if (!daten.f) {
        this.infoEl.textContent = "Noch kein Forecast importiert.";
    } else {
        const f = daten.f;
        this.infoEl.textContent = "Die importierte Forecast-Liste mit allen Spalten: " + this.text(f.datei) + " · Blatt „" + this.text(f.blatt) + "“" +
            (this.text(f.stand) ? " · " + this.text(f.stand) : "") + " · importiert am " + this.datumZeitText(f.zeit) +
            ". Die beiden grauen Spalten vorn sind für den Abgleich: AB ohne Los und der Termin, der zählt " +
            "(leer bei „bereits geliefert“ oder ohne Liefertermin).";
    }

    this.statusZeigen(this.alle.length + " Zeilen geladen.");
    this.suchen();
},

suchen: function () {

    this.suche = this.text(this.sucheEl.value).trim();
    this.seite = 0;
    this.treffer = this.fcDatenFiltern(this.alle, this.suche);
    this.zeichnen();
},

zeichnen: function () {

    this.tabelleEl.replaceChildren();
    this.seitenEl.replaceChildren();
    this.zaehlerEl.textContent = "Zeilen: " + this.alle.length + (this.suche ? " · Treffer: " + this.treffer.length : "");

    if (!this.fd || !this.fd.f) return;

    if (this.treffer.length === 0) {
        this.el(this.tabelleEl, "div", "kom-leer", this.suche ? "Kein Treffer für „" + this.suche + "“." : "Der Forecast hat keine Zeilen.");
        return;
    }

    const jeSeite = this.fcDatenJeSeite;
    const seiten = Math.ceil(this.treffer.length / jeSeite);
    const von = this.seite * jeSeite;
    const sicht = this.treffer.slice(von, von + jeSeite);

    const rahmen = this.el(this.tabelleEl, "div", "kom-rahmen");
    const tab = this.el(rahmen, "table", "kom-tabelle");
    const kopf = this.el(this.el(tab, "thead"), "tr");
    this.el(kopf, "th", "kom-abgleich", "AB_Abgleich");
    this.el(kopf, "th", "kom-abgleich", "Termin_Abgleich");
    this.fd.d.kopf.forEach(k => this.el(kopf, "th", "", k));

    const koerper = this.el(tab, "tbody");
    sicht.forEach(z => {
        const tr = this.el(koerper, "tr");
        this.el(tr, "td", "kom-abgleich", z.schluessel);
        this.el(tr, "td", "kom-abgleich", z.termin ? this.datumText(z.termin) : "");
        z.werte.forEach(w => this.el(tr, "td", "", w));
    });

    if (seiten > 1) {
        const zurueck = this.knopf(this.seitenEl, "← Zurück", () => { this.seite--; this.zeichnen(); });
        zurueck.disabled = this.seite === 0;
        this.el(this.seitenEl, "span", "kom-klein", "Seite " + (this.seite + 1) + " von " + seiten);
        const weiter = this.knopf(this.seitenEl, "Weiter →", () => { this.seite++; this.zeichnen(); });
        weiter.disabled = this.seite >= seiten - 1;
    }
},
