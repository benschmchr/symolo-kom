/* ===========================================================================
   RECHNEN: Status, Prozent, Fortschritt (R-S1 bis R-S7)
   Nachbau von bestand/rechnen.py (dort die Excel-Formeln). Nichts davon
   wird gespeichert, alles wird beim Anzeigen berechnet.

   Mengen werden in Tausendsteln als ganze Zahl gerechnet (21 -> 21000),
   damit 0,06 + 0,02 genau 0,08 bleibt (Mengen haben 3 Nachkommastellen).
   =========================================================================== */

/* Menge -> Tausendstel. Leer oder Text zählt 0 (Excel-Funktion N).
   OFFEN (Symolo): Kommen Zahlen als Zahl oder als Text ("21.000")?
   Wir verstehen beides; Text, der keine Zahl ist, zählt 0. */
mengeMilli: function (wert) {

    if (typeof wert === "number") return Number.isFinite(wert) ? Math.round(wert * 1000) : 0;
    if (typeof wert !== "string") return 0;

    const t = wert.trim();
    if (!/^-?\d+([.,]\d+)?$/.test(t)) return 0;

    return Math.round(Number(t.replace(",", ".")) * 1000);
},

/* Tausendstel -> Text wie Excel (deutsch): 21000 -> "21", 60 -> "0,06". */
zahlText: function (milli) {

    const minus = milli < 0 ? "-" : "";
    const m = Math.abs(milli);
    const ganz = Math.floor(m / 1000);
    const rest = m % 1000;

    if (rest === 0) return minus + ganz;
    return minus + ganz + "," + String(rest).padStart(3, "0").replace(/0+$/, "");
},

/* Soll wie in der Liste: Zahl, sonst der Text aus der Kommissionierliste. */
sollText: function (o) {

    const w = o.menge_gesamt;
    if (w === null || w === undefined || w === "") return this.text(o.menge_gesamt_text);
    return this.zahlText(this.mengeMilli(w));
},

/* Werte eines Teils (R-S1, R-S3, R-S5).
   code: 0 offen, 1 teilweise, 2 komplett */
teilWerte: function (vorhanden, soll, eingelagert, komplett) {

    const v = this.mengeMilli(vorhanden);
    const s = this.mengeMilli(soll);
    const code = v <= 0 ? 0 : (v >= s ? 2 : 1);

    let prozent = 0;
    if (code === 2) prozent = 1;
    if (code === 1) prozent = Math.min(0.99, Math.max(0.01, v / s));

    let fortschritt = this.zahlText(v) + " / " + this.zahlText(s);
    if (v > s) fortschritt += "  (+" + this.zahlText(v - s) + " zu viel)";

    return {
        status: ["Offen", "Teilweise", "Komplett"][code],
        prozent: prozent,
        fortschritt: fortschritt,
        code: code,
        ist: Math.min(Math.max(v, 0), s),
        soll: s,
        eingelagert: this.text(eingelagert),
        komplett: this.text(komplett),
        istTeil: true
    };
},

/* Werte einer BG oder eines AB direkt aus allen Teilen darunter
   (R-S2, R-S4, R-S5, R-T2). Ohne Teile ist der Status "-". */
sammelWerte: function (teile) {

    const anz = teile.length;
    const summe = teile.reduce((a, t) => a + t.code, 0);
    const anzKomplett = teile.filter(t => t.code === 2).length;

    let status = "Teilweise";
    if (anz === 0) status = "-";
    else if (summe === 2 * anz) status = "Komplett";
    else if (summe === 0) status = "Offen";

    let prozent = 0;
    if (status === "Komplett") prozent = 1;
    if (status === "Teilweise") {
        const soll = teile.reduce((a, t) => a + t.soll, 0);
        const roh = soll ? teile.reduce((a, t) => a + t.ist, 0) / soll : 0;
        prozent = Math.min(0.99, Math.max(0.01, roh));
    }

    /* Datum: frühestes Eingelagert, spätestes Komplett (nur wenn komplett).
       ISO-Text lässt sich direkt vergleichen. */
    const ein = teile.map(t => t.eingelagert).filter(Boolean).sort();
    const fertig = teile.map(t => t.komplett).filter(Boolean).sort();

    return {
        status: status,
        prozent: prozent,
        fortschritt: anzKomplett + " von " + anz,
        code: null,
        anzTeile: anz,
        anzKomplett: anzKomplett,
        eingelagert: ein.length ? ein[0] : "",
        komplett: fertig.length && status === "Komplett" ? fertig[fertig.length - 1] : "",
        istTeil: false
    };
},

/* R-S7 Sortierschlüssel: Komplett 0, Teilweise 2, sonst 4, minus Prozent. */
sortWert: function (w) {

    const basis = w.status === "Komplett" ? 0 : (w.status === "Teilweise" ? 2 : 4);
    return basis - w.prozent;
},

/* R-W1: "» entnehmen" nur bei AB/BG mit Status Komplett, nie bei Teilen. */
entnehmenMoeglich: function (w) {

    return !w.istTeil && w.status === "Komplett";
},

/* CSS-Klasse für die Statusfarbe. */
statusKlasse: function (w) {

    return { Komplett: "kom-komplett", Teilweise: "kom-teilweise", Offen: "kom-offen" }[w.status] || "kom-leer-status";
},
