/* ===========================================================================
   DASHBOARD-LOGIK (R-DB1 bis R-DB6)
   Nachbau von bestand/dashboard.py: sortiert wie die Excel-Formel DASH,
   filtert, zählt den Kopf und bestimmt den Klappzustand. Die Werte (Status,
   Prozent, Stand) kommen aus 45_rechnen.js und 47_bestand.js.
   Gebraucht vom Dashboard, später vom Forecast.
   =========================================================================== */

/* R-DB2: wie weit aufgeklappt wird (Knöpfe ABs, BGs, Alles) */
dashAnsichten: [["ab", "ABs"], ["bg", "BGs"], ["alles", "Alles"]],
dashStandard: "bg",
dashAlleKunden: "Alle",

/* Fortschritt nach Ben (14.10.2026): absteigend ist der Standard. */
dashSortierungen: [["ab", "Absteigend"], ["auf", "Aufsteigend"]],

/* Textvergleich wie Excel: ohne Groß-/Kleinschreibung. */
dashText: function (wert) {

    return this.text(wert).toLowerCase();
},

/* Fortschritt % wie das Excel-Format "0 %": ganze Zahl, kaufmännisch
   gerundet (0,3743 -> "37 %", 0,125 -> "13 %"). */
prozentText: function (p) {

    const x = Math.round(p * 100 * 1e9) / 1e9;
    return Math.floor(x + 0.5) + " %";
},

/* Wie Python round(): bei genau .5 zur geraden Zahl (für die Anteile im Kopf). */
rundenGerade: function (x) {

    const f = Math.floor(x);
    const d = x - f;
    if (d > 0.5) return f + 1;
    if (d < 0.5) return f;
    return f % 2 === 0 ? f : f + 1;
},

/* R-DB3: 1. Sortierschlüssel des AB (R-S7), 2. AB-Nummer, 3. AB-Zeile vor
   dem Rest, 4. Schlüssel der BG, 5. BG-Name, 6. BG-Zeile vor ihren Teilen,
   7. Schlüssel des Teils, 8. Zeichnungsnummer.
   Teile ohne BG stehen vor allen BGs (Excel: BG-Schlüssel -9).
   nachProzent: "ab" oder "auf" sortiert die ABs nach Fortschritt, ohne
   Angabe gilt die Excel-Reihenfolge.
   Ergebnis je AB: { a, gruppen: [{ bg, teile, schluessel, offen }], offen } */
dashSortieren: function (abs, nachProzent) {

    const vergleich = (x, y) => (x < y ? -1 : (x > y ? 1 : 0));
    const teileSortiert = teile => teile.slice().sort((p, q) =>
        vergleich(this.sortWert(p.w), this.sortWert(q.w)) ||
        vergleich(this.dashText(p.o.zeichnungsnummer), this.dashText(q.o.zeichnungsnummer)));

    let reihenfolge;
    if (nachProzent === "ab" || nachProzent === "auf") {
        const vorzeichen = nachProzent === "ab" ? -1 : 1;
        reihenfolge = abs.slice().sort((p, q) =>
            vergleich(vorzeichen * p.w.prozent, vorzeichen * q.w.prozent) ||
            vergleich(this.dashText(p.o.ab_anzeige), this.dashText(q.o.ab_anzeige)));
    } else {
        reihenfolge = abs.slice().sort((p, q) =>
            vergleich(this.sortWert(p.w), this.sortWert(q.w)) ||
            vergleich(this.dashText(p.o.ab_anzeige), this.dashText(q.o.ab_anzeige)));
    }

    return reihenfolge.map(a => {
        const schluessel = this.dashText(a.o.ab_schluessel);
        const d = { a: a, schluessel: schluessel, gruppen: [], offen: false };

        if (a.ohne.length) {
            d.gruppen.push({ bg: null, teile: teileSortiert(a.ohne), schluessel: schluessel + "|", offen: false });
        }

        a.bgs.slice().sort((p, q) =>
            vergleich(this.sortWert(p.w), this.sortWert(q.w)) ||
            vergleich(this.dashText(p.o.name), this.dashText(q.o.name))
        ).forEach(b => {
            d.gruppen.push({ bg: b, teile: teileSortiert(b.teile), schluessel: schluessel + "|" + this.dashText(b.o.name), offen: false });
        });

        return d;
    });
},

/* R-DB2: "Alle" + alphabetische Liste aller Kunden (ohne doppelte, ohne leere). */
dashKunden: function (abs) {

    const je = {};
    abs.forEach(a => {
        const k = this.text(a.o.kunde);
        if (k && !(k.toLowerCase() in je)) je[k.toLowerCase()] = k;
    });
    return [this.dashAlleKunden].concat(Object.keys(je).sort().map(k => je[k]));
},

/* R-DB2: AB-Suche (Teilwort in der AB-Nummer) und Kunde (Alle = alle). */
dashFiltern: function (abs, suche, kunde) {

    const q = this.dashText(suche);
    let kd = this.dashText(kunde);
    if (kd === this.dashText(this.dashAlleKunden)) kd = "";

    return abs.filter(a => this.dashText(a.o.ab_anzeige).indexOf(q) > -1 && (!kd || this.dashText(a.o.kunde) === kd));
},

/* R-DB5: Aufträge, komplett, teilweise, offen und Gesamt-% (R-S6) über alle
   ABs, unabhängig vom Filter. */
dashKopf: function (abs) {

    const teile = [];
    abs.forEach(a => this.bestandTeile(a).forEach(t => teile.push(t.w)));

    const soll = teile.reduce((s, t) => s + t.soll, 0);
    const gesamt = soll ? teile.reduce((s, t) => s + t.ist, 0) / soll : 0;
    const n = abs.length;
    const z = { ab: n };

    ["Komplett", "Teilweise", "Offen"].forEach(st => {
        const schluessel = st.toLowerCase();
        z[schluessel] = abs.filter(a => a.w.status === st).length;
        z[schluessel + "_anteil"] = n ? this.rundenGerade(z[schluessel] / n * 100) : 0;
    });

    z.gesamt = gesamt;
    z.gesamt_txt = (gesamt * 100).toFixed(1).replace(".", ",") + " %";
    return z;
},

/* R-DB4: Startzustand aus der Ansicht (ABs: alles zu; BGs: ABs auf; Alles:
   alles auf), davon abweichend, was der Benutzer bei dieser Ansicht selbst
   auf- oder zugeklappt hat (gemerkt: Schlüssel -> offen). */
dashKlappen: function (liste, ansichtWert, gemerkt) {

    const stufe = { ab: 1, bg: 2, alles: 3 }[ansichtWert] || 2;
    const wert = (schluessel, standard) => (schluessel in gemerkt ? Boolean(gemerkt[schluessel]) : standard);

    liste.forEach(d => {
        d.offen = wert(d.schluessel, stufe >= 2);
        d.gruppen.forEach(g => { g.offen = wert(g.schluessel, stufe === 3); });
    });
},
