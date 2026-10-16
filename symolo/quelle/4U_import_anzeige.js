/* ===========================================================================
   ANZEIGE FÜR DIE IMPORTE: Ablage für Dateien, Auswahlfragen, Größe
   Gemeinsam für "Kommissionierlisten importieren" und "Forecast importieren".
   Die Datei selbst liest die Ansicht mit file.arrayBuffer() (kein fetch).
   =========================================================================== */

impMaxDateien: 30,

/* 1,5 MB, 230 KB */
groesseText: function (bytes) {

    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1).replace(".", ",") + " MB";
    return Math.max(1, Math.round(bytes / 1024)) + " KB";
},

/* Ablage zum Hineinziehen oder Auswählen. aenderung(liste) kommt bei jeder neuen Auswahl.
   Ohne mehrere gilt nur die erste Datei. Gibt { ablage, leeren } zurück. */
ablageBauen: function (parent, mehrere, titel, hinweis, aenderung) {

    const ablage = this.el(parent, "div", "kom-ablage");
    this.el(ablage, "strong", "", titel);
    this.el(ablage, "span", "kom-leise kom-klein", hinweis);

    const eingabe = this.el(ablage, "input", "kom-datei");
    eingabe.type = "file";
    eingabe.multiple = mehrere;
    eingabe.accept = ".xlsx,.xlsm";
    eingabe.setAttribute("aria-label", titel);

    const liste = this.el(ablage, "ul", "kom-dateiliste");

    const setzen = dateien => {
        let gewaehlt = Array.from(dateien || []);
        if (!mehrere) gewaehlt = gewaehlt.slice(0, 1);

        liste.replaceChildren();
        gewaehlt.forEach(f => this.el(liste, "li", "", f.name + " (" + this.groesseText(f.size) + ")"));
        aenderung(gewaehlt);
    };

    eingabe.onchange = () => setzen(eingabe.files);
    ablage.ondragover = e => { e.preventDefault(); ablage.classList.add("kom-ueber"); };
    ablage.ondragleave = () => { ablage.classList.remove("kom-ueber"); };
    ablage.ondrop = e => {
        e.preventDefault();
        ablage.classList.remove("kom-ueber");
        setzen(e.dataTransfer ? e.dataTransfer.files : []);
    };

    return { ablage: ablage, leeren: () => { eingabe.value = ""; setzen([]); } };
},

/* Auswahlfrage mit Knöpfen zum Ankreuzen. eintraege: [[wert, text, angekreuzt]]; wechsel(wert) bei Änderung. */
wahlBauen: function (parent, name, eintraege, wechsel) {

    const box = this.el(parent, "div", "kom-frage");

    eintraege.forEach(([wert, text, an]) => {
        const l = this.el(box, "label", "kom-wahl");
        const r = this.el(l, "input");
        r.type = "radio";
        r.name = name;
        r.checked = Boolean(an);
        r.onchange = () => { if (r.checked) wechsel(wert); };
        this.el(l, "span", "", text);
    });

    return box;
},

/* Datei als Bytes lesen; ist sie zu groß, wird sie gar nicht erst geladen (R-I1). */
dateiBytes: async function (datei, groesstMb) {

    if (datei.size > groesstMb * 1024 * 1024) throw new Error("Die Datei ist größer als " + groesstMb + " MB.");
    return new Uint8Array(await datei.arrayBuffer());
},
