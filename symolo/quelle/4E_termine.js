/* ===========================================================================
   TERMINE: Datum als Tageszahl, Kalenderwochen, Monate
   Forecast, Planung und Statistik rechnen mit Tagen. Ein Datum aus Symolo
   ("2026-10-16T00:00:00.0000000Z") wird zur ganzen Zahl "Tage seit
   01.01.1970" (nur das Datum, keine Uhrzeit, keine Zeitzone). Damit sind
   Unterschiede in Tagen einfache Subtraktion.
   =========================================================================== */

monatsNamen: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
tagesNamen: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],

/* Datum -> Tageszahl; null, wenn es kein Datum ist (auch "(verschieden)" und leer). */
tagNr: function (wert) {

    const m = this.text(wert).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;

    return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000);
},

/* Heute (Ortszeit) als Tageszahl. */
tagHeute: function () {

    return this.tagNr(this.heuteText());
},

/* Zeitpunkt (UTC, mit Uhrzeit) -> Tageszahl des Tages in der Ortszeit des Browsers
   (Python: timezone.localtime(...).date()). Ohne Uhrzeit zählt das Datum. */
tagOrt: function (wert) {

    const t = this.text(wert);
    if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:/.test(t)) return this.tagNr(t);

    const ms = this.zeitMs(t);
    if (ms === null) return null;

    const d = new Date(ms);
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
},

/* [Jahr, Monat 1-12, Tag] */
tagTeile: function (nr) {

    const d = new Date(nr * 86400000);
    return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
},

/* "16.10.2026" */
tagText: function (nr) {

    if (nr === null || nr === undefined) return "";

    const [j, m, t] = this.tagTeile(nr);
    return String(t).padStart(2, "0") + "." + String(m).padStart(2, "0") + "." + j;
},

/* "16.10." */
tagKurz: function (nr) {

    const [, m, t] = this.tagTeile(nr);
    return t + "." + m + ".";
},

/* 0 = Montag bis 6 = Sonntag (der 01.01.1970 war ein Donnerstag). */
tagWochentag: function (nr) {

    return ((nr + 3) % 7 + 7) % 7;
},

tagMontag: function (nr) {

    return nr - this.tagWochentag(nr);
},

/* Kalenderwoche nach ISO 8601: [Jahr, Woche] (Python: date.isocalendar). */
tagKw: function (nr) {

    const donnerstag = nr - this.tagWochentag(nr) + 3;
    const jahr = this.tagTeile(donnerstag)[0];
    const jan1 = Math.floor(Date.UTC(jahr, 0, 1) / 86400000);

    return [jahr, Math.floor((donnerstag - jan1) / 7) + 1];
},

/* Die letzten n Kalenderwochen bis einschließlich der aktuellen, älteste zuerst. */
letzteKws: function (heute, n) {

    const montag = this.tagMontag(heute);
    const liste = [];

    for (let i = n - 1; i >= 0; i--) liste.push(this.tagKw(montag - 7 * i));
    return liste;
},

/* Die letzten n Monate bis einschließlich des aktuellen, ältester zuerst: [[Jahr, Monat]] */
letzteMonate: function (heute, n) {

    let [j, m] = this.tagTeile(heute);
    const liste = [];

    for (let i = 0; i < n; i++) {
        liste.push([j, m]);
        m--;
        if (m === 0) { j--; m = 12; }
    }

    return liste.reverse();
},

/* Zahl mit einer Nachkommastelle und Komma wie Python f"{x:.1f}": bei genau
   .25 und .75 rundet Python zur geraden Stelle, toFixed nach oben. */
zahlEins: function (x) {

    let s = x.toFixed(1);

    if (Number.isInteger(x * 4) && !Number.isInteger(x * 2)) {
        const n = Math.floor(Math.abs(x) * 10);
        const gerade = n % 2 === 0 ? n : n + 1;
        s = (x < 0 ? "-" : "") + (gerade / 10).toFixed(1);
    }

    return s.replace(".", ",");
},
