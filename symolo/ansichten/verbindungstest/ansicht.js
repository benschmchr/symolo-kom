/* ===========================================================================
   ANSICHT: Verbindungstest
   Die einzige bekannte Tabelle (fwm.stamm_prozesse aus test.html) mit
   aufgelöstem Gruppennamen, ohne IDs. Prüft den ganzen Weg der
   Datenschicht: lesen, Verweis auflösen, anlegen (ohne ID), ändern
   (komplettes Objekt). Für den Entwickler die erste Ansicht zum Einbinden.
   =========================================================================== */

prozesse: [],

before_set_values: async function (form, { data }) {

    const parent = this.ctrlbyBind("_output").SelfElement;

    /* Erst das Gerüst, dann die Daten (Skill, Vertrag). */
    this.geruestBauen(parent);
    this.knopf(this.fuss, "Neu laden", () => this.laden());
    this.knopf(this.fuss, "Beispiel anlegen", () => this.beispielAnlegen(), "haupt");

    await this.laden();
},

laden: async function () {

    this.datenHinweise = [];
    this.statusZeigen("Lade …");

    const liste = await this.sicher(() => this.datenLesen("prozess", { sortierung: ["name"] }));

    if (liste !== null) {
        this.prozesse = liste;
        this.statusZeigen(liste.length + " Einträge geladen.");
    }

    this.zeichnen();
},

/* Aus dem Zustand zeichnen, nie aus den Rohdaten (Skill, Ablauf 6). */
zeichnen: function () {

    this.koerper.replaceChildren();
    this.infoZeigen();

    this.tabelleBauen(
        this.koerper,
        [
            { feld: "name", titel: "Name" },
            { feld: "gruppe", titel: "Gruppe" },
            { feld: "angelegt_am", titel: "Angelegt", art: "datum" },
            { feld: "geaendert_am", titel: "Geändert", art: "datum" }
        ],
        this.prozesse,
        "Keine Einträge. Entweder ist die Tabelle leer oder sie konnte nicht gelesen werden (siehe Meldung unten).",
        (zelle, zeile) => {
            this.knopf(zelle, "Ändern", () => this.aendern(zeile));
        }
    );
},

beispielAnlegen: async function () {

    const jetzt = new Date();
    const name = "Testeintrag " + String(jetzt.getHours()).padStart(2, "0") + ":" +
        String(jetzt.getMinutes()).padStart(2, "0") + ":" + String(jetzt.getSeconds()).padStart(2, "0");

    /* Keine ID, keine Gruppe: nur der Name. */
    const neu = await this.sicher(() => this.datenAnlegen("prozess", { name: name }));

    if (neu) {
        await this.laden();
        this.statusZeigen("„" + name + "“ angelegt.");
    }
},

aendern: async function (zeile) {

    const neuerName = zeile.name.endsWith(" (geändert)") ? zeile.name.slice(0, -11) : zeile.name + " (geändert)";

    /* Vor dem Überschreiben fragen (Skill, Abschnitt 8). */
    if (!window.confirm("„" + zeile.name + "“ umbenennen in „" + neuerName + "“?")) return;

    const neu = await this.sicher(() => this.datenAendern("prozess", zeile, { name: neuerName }));

    if (neu) {
        await this.laden();
        this.statusZeigen("Gespeichert.");
    }
},
