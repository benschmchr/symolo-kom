/* ===========================================================================
   SCHWEISSEN EINTRAGEN (R-W6, R-W7)
   Nachbau von bestand/schweissen: hilfen.py (datum_aus_text), abgleich.py
   (abgleich_kern, abgleich_alle), mitarbeiter.py (setzen, Mitarbeiter-Liste,
   Plätze). Mitarbeiter, Arbeitsplatz und die zwei Termine werden an einer
   AB- oder BG-Zeile eingetragen und an alles darunter vererbt; ein Teil
   nimmt nie einen eigenen Eintrag an.

   Alles läuft über datenAendernViele (Folgeänderungen ohne Prüfung auf
   fremde Änderungen, wie bisher). Gelesen wird vor jeder Änderung frisch.
   Rechte fallen vorerst weg (Ben, 16.10.2026): jeder darf eintragen.
   =========================================================================== */

swTrenner: ", ",
swMaxName: 80,
swSonstiges: "Sonstiges",

/* Alle fünf Spalten, die der Abgleich anfasst: Feld, Anzeigename fürs Protokoll */
swEingaben: [
    ["mitarbeiter", "Zuweisung Mitarbeiter"],
    ["arbeitsplatz", "Zuweisung Arbeitsplatz"],
    ["liefertermin_stahlbau", "Liefertermin Stahlbau"],
    ["termin_versand", "Termin Versand"]
],

/* VBA Val(): führende Zahl, sonst 0. */
swVal: function (text) {

    const m = this.text(text).match(/^([0-9]+(?:\.[0-9]+)?)/);
    return m ? Number(m[1]) : 0;
},

/* BgVor: erst die Nummer, dann der Name (ohne Groß-/Kleinschreibung). */
swBgVergleich: function (a, b) {

    return (this.swVal(this.swBgNummer(a)) - this.swVal(this.swBgNummer(b))) ||
        (this.text(a).toLowerCase() < this.text(b).toLowerCase() ? -1 : (this.text(a).toLowerCase() > this.text(b).toLowerCase() ? 1 : 0));
},

/* ---------------------------------------------------------------------------
   R-W7 Datumseingabe
   --------------------------------------------------------------------------- */

swNurZiffern: function (s) {

    return s.length > 0 && s.length <= 8 && /^[0-9]+$/.test(s);
},

/* "15.10.2026", "15.10.26", "15.10", "151026", "15102026", "1510" (auch mit "/" oder "-").
   Gibt die Tageszahl zurück, null = ungültig. Jahr nur 2020 bis 2099, ungültige Tage
   (31.02.) werden abgelehnt. heute: Tageszahl (nur fürs Jahr, wenn es fehlt). */
swDatumAusText: function (text, heute) {

    const t = this.text(text).replace(/[/-]/g, ".");
    if (!t) return null;

    let d = 0, m = 0, y = 0;

    if (t.indexOf(".") > -1) {
        const p = t.split(".");
        if (p.length < 2 || p.length > 3) return null;

        const a = p[0].trim(), b = p[1].trim();
        if (!this.swNurZiffern(a) || !this.swNurZiffern(b)) return null;
        d = Number(a);
        m = Number(b);

        if (p.length === 3 && p[2].trim()) {
            if (!this.swNurZiffern(p[2].trim())) return null;
            y = Number(p[2].trim());
        }
    } else {
        if (!this.swNurZiffern(t)) return null;
        if (t.length === 4) {
            d = Number(t.slice(0, 2));
            m = Number(t.slice(2, 4));
        } else if (t.length === 6 || t.length === 8) {
            d = Number(t.slice(0, 2));
            m = Number(t.slice(2, 4));
            y = Number(t.slice(4));
        } else {
            return null;
        }
    }

    if (y === 0) y = this.tagTeile(heute === undefined ? this.tagHeute() : heute)[0];
    if (y < 100) y += 2000;
    if (y < 2020 || y > 2099 || m < 1 || m > 12 || d < 1 || d > 31) return null;

    const ms = Date.UTC(y, m - 1, d);
    const probe = new Date(ms);
    if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;

    return Math.floor(ms / 86400000);
},

/* Tageszahl -> Datum im Format von Symolo ("2026-10-16T00:00:00.0000000Z"). */
swTagIso: function (nr) {

    const [j, m, t] = this.tagTeile(nr);
    return j + "-" + String(m).padStart(2, "0") + "-" + String(t).padStart(2, "0") + "T00:00:00.0000000Z";
},

/* ---------------------------------------------------------------------------
   Mitarbeiter-Liste und Plätze
   --------------------------------------------------------------------------- */

/* "Anna, Bernd" -> ["Anna", "Bernd"] (ohne Doppelte, ohne "(verschieden)"). */
swMitarbeiterListe: function (text) {

    const aus = [], gesehen = {};

    this.text(text).split(",").forEach(n => {
        const name = n.split(/\s+/).filter(Boolean).join(" ");
        if (name && name !== this.swVerschieden && !gesehen[name.toLowerCase()]) {
            gesehen[name.toLowerCase()] = true;
            aus.push(name);
        }
    });

    return aus;
},

/* Alle Namen der Liste (aktive), alphabetisch. Zeilen für Eintragen und Austragen: swMitarbeiterZeilen. */
swMitarbeiterZeilen: async function () {

    return this.datenLesen("mitarbeiter", { aufloesen: false });
},

swIstAktiv: function (z) {

    return z.aktiv === null || z.aktiv === undefined || z.aktiv === "" || this.istJa(z.aktiv);
},

swMitarbeiterNamen: async function () {

    const zeilen = await this.swMitarbeiterZeilen();
    return zeilen.filter(z => this.swIstAktiv(z)).map(z => this.text(z.name))
        .sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : (a.toLowerCase() > b.toLowerCase() ? 1 : 0)));
},

/* Neuer Name. Ein ausgetragener Name kommt wieder in die Liste (gelöscht wird nie). Gibt den Namen zurück. */
swMitarbeiterNeu: async function (name) {

    const n = this.text(name.replace(/,/g, " ")).split(/\s+/).filter(Boolean).join(" ");
    if (!n) throw new Error("Bitte einen Namen eintragen.");
    if (n.length > this.swMaxName) throw new Error("Der Name ist zu lang (höchstens " + this.swMaxName + " Zeichen).");
    if (n === this.swVerschieden) throw new Error("„(verschieden)“ ist kein Name.");

    const zeilen = await this.swMitarbeiterZeilen();
    const da = zeilen.find(z => this.text(z.name).toLowerCase() === n.toLowerCase());

    if (da && this.swIstAktiv(da)) throw new Error(n + " steht schon in der Liste.");
    if (da) await this.datenAendern("mitarbeiter", da, { aktiv: true }, { ohnePruefung: true });
    else await this.datenAnlegen("mitarbeiter", { name: n, aktiv: true });

    await this.protokollSchreiben("schweissen", "", "Mitarbeiterliste", "", n);
    return n;
},

/* Name austragen: er bleibt in der Datenbank (aktiv = nein), eingetragene Zuweisungen bleiben stehen. */
swMitarbeiterWeg: async function (name) {

    const zeilen = await this.swMitarbeiterZeilen();
    const m = zeilen.find(z => this.swIstAktiv(z) && this.text(z.name).toLowerCase() === this.text(name).toLowerCase());
    if (!m) throw new Error("Dieser Name steht nicht (mehr) in der Liste.");

    await this.datenAendern("mitarbeiter", m, { aktiv: false }, { ohnePruefung: true });
    await this.protokollSchreiben("schweissen", "", "Mitarbeiterliste", this.text(m.name), "ausgetragen");
    return this.text(m.name);
},

/* R-AP1: Platzliste in der Reihenfolge der Nummer (zugleich Auswahl "Zuweisung Arbeitsplatz"). */
swPlaetzeLaden: async function () {

    const liste = await this.datenLesen("arbeitsplatz", { aufloesen: false });
    return liste.sort((a, b) => (this.mengeMilli(a.reihenfolge) - this.mengeMilli(b.reihenfolge)) || this.idVergleich(a._id, b._id));
},

/* ApGleich: ohne Leerzeichen, Bindestriche, Schrägstriche und Punkte, ohne Groß-/Kleinschreibung. */
swPlatzKern: function (text) {

    return this.text(text).replace(/[ \-/.]/g, "").toLowerCase();
},

/* "AP 05" = "AP05": der Name aus der Platzliste (R-AP1) oder null. */
swPlatzFinden: function (text, plaetze) {

    const k = this.swPlatzKern(text);
    if (!k) return null;
    if (k === this.swSonstiges.toLowerCase()) return this.swSonstiges;

    const p = plaetze.find(x => this.swPlatzKern(x.name) === k);
    return p ? this.text(p.name) : null;
},

/* Text -> Wert zum Speichern. Mitarbeiter: freier Text, mehrere mit Komma. Arbeitsplatz: aus der Liste,
   "" = entfernen. Termine: Tageszahl (R-W7), "" = entfernen (null). */
swEingabePruefen: function (feld, text, plaetze) {

    const t = this.text(text);

    if (feld === "mitarbeiter") {
        if (t === this.swVerschieden) throw new Error("„(verschieden)“ kann man nicht eintragen.");
        const aus = this.swMitarbeiterListe(t).join(this.swTrenner);
        if (aus.length > 200) throw new Error("Es sind zu viele Namen gewählt (höchstens 200 Zeichen zusammen).");
        return aus;
    }

    if (feld === "arbeitsplatz") {
        if (t === "" || t === "0") return "";
        const name = this.swPlatzFinden(t, plaetze);
        if (name === null) throw new Error("„" + t + "“ ist kein Arbeitsplatz. Bitte einen aus der Liste wählen.");
        return name;
    }

    if (this.swDatumsfelder.indexOf(feld) > -1) {
        if (t === "") return null;
        const tag = this.swDatumAusText(t);
        if (tag === null) {
            throw new Error("„" + t + "“ ist kein gültiges Datum (z. B. 15.10.2026, 15.10. oder 151026; Jahr 2020 bis 2099).");
        }
        return this.swTagIso(tag);
    }

    throw new Error("Unbekanntes Feld.");
},

/* Wert fürs Protokoll: leer = "leer", Datum = TT.MM.JJJJ. */
swWertText: function (wert) {

    const t = this.text(wert);
    if (t === "") return "leer";

    const tag = this.tagNr(t);
    return tag === null ? t : this.tagText(tag);
},

swAnzeigename: function (z) {

    if (z.ebene === "AB") return this.text(z.anzeige);
    if (z.ebene === "BG") return this.text(z.anzeige) + " / " + this.text(z.baugruppe);
    return this.text(z.zeichnungsnummer);
},

/* ---------------------------------------------------------------------------
   R-W6 Vererbung (Nachbau von AbgleichKern)
   --------------------------------------------------------------------------- */

/* ebene[i] = AB/BG/Teil, ab[i] = echter AB (ABNr), w[i] = [Mitarbeiter, Arbeitsplatz, Liefertermin, Termin Versand].
   geaendert: Menge von "i|k" (an der AB-Zeile i wurde Eingabe k eben geändert).
     AB geändert   -> Wert an alle BGs und Teile des AB
     Baugruppe     -> Wert an ihre Teile; AB = gemeinsamer Wert aller BGs, sonst "(verschieden)"
     Teil geändert -> zurück auf den Wert der BG
   Einzelblöcke (BG ohne AB-Zeile) vererben nur innerhalb ihres Blocks. Ändert w an Ort und Stelle. */
swAbgleichKern: function (ebene, ab, w, geaendert) {

    const n = ebene.length;
    const hat = (i, k) => Boolean(geaendert) && geaendert.has(i + "|" + k);

    for (let i = 0; i < n; i++) {
        if (ebene[i] !== "AB") continue;
        for (let k = 0; k < 4; k++) {
            if (hat(i, k) && this.swT(w[i][k]) !== this.swVerschieden) {
                for (let j = 0; j < n; j++) {
                    if (j !== i && this.swGleich(ab[j], ab[i])) w[j][k] = w[i][k];
                }
            }
        }
    }

    for (let i = 0; i < n; i++) {
        const e = ebene[i];
        if (e !== "AB" && e !== "BG") continue;

        let j = i + 1;
        while (j < n) {
            if (ebene[j] !== "Teil" || !this.swGleich(ab[j], ab[i])) break;
            for (let k = 0; k < 4; k++) {
                if (e === "BG") w[j][k] = w[i][k];
                else if (this.swT(w[i][k]) !== this.swVerschieden) w[j][k] = w[i][k];
            }
            j++;
        }
    }

    this.swAbAbleiten(ebene, ab, w);
},

/* Zeilen in der Reihenfolge nr (nach ID bei gleicher Nummer). */
swNachNr: function (zeilen) {

    return zeilen.slice().sort((a, b) => (this.mengeMilli(a.nr) - this.mengeMilli(b.nr)) || this.idVergleich(a._id, b._id));
},

/* Was sich beim Speichern ändert: "(verschieden)" wird nie gespeichert. Gibt
   [{ zeile, werte }] zurück, nur für Zeilen mit anderen Werten. */
swAenderungen: function (zeilen, w) {

    const aus = [];

    zeilen.forEach((z, i) => {
        const werte = {};

        this.swFelder.forEach((f, k) => {
            const datum = this.swDatumsfelder.indexOf(f) > -1;
            let v = w[i][k];

            if (v === this.swVerschieden) v = datum ? null : "";
            if ((v === null || v === undefined || v === "") && !datum) v = "";
            if ((v === "" || v === undefined) && datum) v = null;

            const alt = z[f];
            const gleich = datum
                ? (v === null ? this.swT(alt) === "" : this.swT(alt) === this.swT(v))
                : this.text(alt) === this.text(v);

            if (!gleich) werte[f] = v;
        });

        if (Object.keys(werte).length) aus.push({ zeile: z, werte: werte });
    });

    return aus;
},

/* Alle Zeilen im Schweißen angleichen (SwAbgleich). zeilen = swLesen(); geaendert wie oben, aber mit
   Zeilen-IDs: [[_id, k]]. Gibt die nötigen Änderungen zurück (noch nicht geschrieben). */
swAbgleichBerechnen: function (zeilen, geaendert) {

    const liste = this.swNachNr(zeilen);
    const w = this.swWerte(liste);

    /* gespeicherter Stand wie in Excel ("verschieden") */
    this.swAbAbleiten(liste.map(z => z.ebene), liste.map(z => z.ab_nr), w);

    const index = {};
    liste.forEach((z, i) => { index[String(z._id)] = i; });
    const menge = new Set();
    (geaendert || []).forEach(([id, k]) => { if (String(id) in index) menge.add(index[String(id)] + "|" + k); });

    this.swAbgleichKern(liste.map(z => z.ebene), liste.map(z => z.ab_nr), w, menge);

    return this.swAenderungen(liste, w);
},

/* Änderungen schreiben (je acht gleichzeitig). */
swAenderungenSchreiben: async function (aenderungen) {

    await this.datenAendernViele(aenderungen.map(a => ({ name: "schweisszeile", zeile: a.zeile, werte: a.werte })));
},

/* Alle Zeilen angleichen und die Änderungen speichern. */
swAbgleichen: async function (geaendert) {

    const zeilen = await this.swLesen();
    await this.swAenderungenSchreiben(this.swAbgleichBerechnen(zeilen, geaendert));
},

/* ---------------------------------------------------------------------------
   R-W6 Eintragen
   --------------------------------------------------------------------------- */

/* Eintrag an einer AB- oder BG-Zeile; wird an alles darunter vererbt. Ein Teil nimmt keinen Eintrag an.
   zeilen = frisch gelesen (swLesen). Gibt { zeile, alt, neu, aenderungen } zurück (noch nicht geschrieben). */
swSetzenBerechnen: function (zeilen, zeileId, feld, text, plaetze) {

    const k = this.swFelder.indexOf(feld);
    if (k < 0) throw new Error("Unbekanntes Feld.");

    const z = zeilen.find(x => String(x._id) === String(zeileId));
    if (!z) throw new Error("Diese Zeile gibt es nicht (mehr) im Bereich Schweißen.");
    if (z.ebene === "Teil") {
        throw new Error("Einzelteile übernehmen den Eintrag ihrer Baugruppe. Bitte bei der Baugruppe oder beim AB eintragen.");
    }

    const wert = this.swEingabePruefen(feld, text, plaetze);

    const liste = this.swNachNr(zeilen);
    const ebene = liste.map(x => x.ebene), ab = liste.map(x => x.ab_nr);
    const w = this.swWerte(liste);
    this.swAbAbleiten(ebene, ab, w);

    const i = liste.findIndex(x => String(x._id) === String(z._id));
    const alt = w[i][k];
    w[i][k] = wert;

    this.swAbgleichKern(ebene, ab, w, z.ebene === "AB" ? new Set([i + "|" + k]) : new Set());

    return { zeile: z, alt: this.swWertText(alt), neu: this.swWertText(wert), aenderungen: this.swAenderungen(liste, w) };
},

/* Speichern ohne Rechtekontrolle (vorerst keine Rechte). Gibt { zeile, alt, neu, name } zurück und schreibt
   ins Protokoll, wenn sich etwas geändert hat. */
swSetzen: async function (zeileId, feld, text) {

    const [zeilen, plaetze] = await Promise.all([this.swLesen(), this.swPlaetzeLaden()]);
    const r = this.swSetzenBerechnen(zeilen, zeileId, feld, text, plaetze);

    await this.swAenderungenSchreiben(r.aenderungen);

    const name = this.swEingaben.find(e => e[0] === feld)[1];
    if (r.alt !== r.neu) {
        await this.protokollSchreiben("schweissen", r.zeile.ab_nr, name + ": " + this.swAnzeigename(r.zeile), r.alt, r.neu);
    }

    return { zeile: r.zeile, alt: r.alt, neu: r.neu, name: name };
},
