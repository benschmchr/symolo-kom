# Symolo – Referenz für die Bestandsliste

Stand: 16.10.2026 · Erstellt: Ben Schumacher, 09.10.2026

Alles, was bisher über Symolo bekannt ist, an einem Ort. **Alles hier ist verbindlich** (Ben, 16.10.2026). Teil A enthält die gesammelten Informationen und Entscheidungen, Teil B die Skills des Symolo-Entwicklers im vollen Wortlaut. Die Skills liegen außerdem in `.claude/skills/symolo-barebone-framework/`, damit jede Sitzung sie automatisch lädt.

Kennzeichnung: **BEKANNT** = gesehen oder vom Entwickler belegt, **VERMUTET** = nur geschlossen, **OFFEN** = noch zu klären.

---

# Teil A: Gesammelte Informationen

## A1. Ziel

- Die Bestandsliste läuft künftig **nur noch als Fenster in Symolo**. Symolo liefert den Rahmen, die Daten und später die Benutzer.
- Die Web-App wird so umgebaut, dass sie zu Symolo und dessen Datenbank passt. **Das Einhängen in Symolo und das Anbinden der Datenbank übernimmt später ein Entwickler von Symolo.**
- Während des Umbaus testet Ben mit den vorhandenen Beispieldaten, ohne Symolo.

## A2. Bens Vorgaben (verbindlich)

1. **Nie auf Symolo, den Endpunkt oder Symolo-Datenbanken zugreifen.** Keine Anmeldung, keine Abfrage, nichts ändern.
2. Datenzugriff **nur über WebSocket**, **kein `fetch`**.
3. **IDs nie anzeigen.**
4. **Beim Anlegen nie eine ID setzen.** Symolo ignoriert sie ohnehin. Bens Punkt „Index nie eintragen“ meint die ID; die Spalte „Index“ der Teile (Zeichnungsindex) bleibt.
5. **Verknüpfungen als Namen auflösen**, zum Beispiel Gruppen statt Gruppen-ID.
6. **Lieber archivieren als löschen.** Dafür ein Feld wie „archiviert j/n“ in der Tabelle.
7. Beim Ändern **immer das komplette Objekt** senden, weil fehlende Felder gelöscht werden.
8. **Die Skills des Entwicklers beachten und nutzen** (Teil B).
9. Unklare Punkte zur Datenbankanbindung **im Code mit Kommentaren kennzeichnen**, den Code möglichst übersichtlich halten.
10. Die Anbindung für den Entwickler klar dokumentieren.
11. Code-Änderungen **nur im Repo `benschmchr/symolo-kom`**.
12. Die Zugangsdaten aus `test.html` werden nirgends übernommen oder gespeichert.

## A3. Entscheidungen vom 16.10.2026

| Frage | Entscheidung |
|---|---|
| Wo läuft die App? | Nur noch als Fenster in Symolo. Eigener Server, Teams-Reiter und Gäste ohne Anmeldung entfallen. |
| Anmeldung und Rechte | Vorerst **keine**. Alle sehen und dürfen alles. Die Stelle für Rollen ist im Code vorbereitet. |
| Löschen | **Archivieren statt Löschen**, auch bei „AB löschen“ und „AB ersetzen“ (weicht von Excel ab). |
| Aufbau | **Eine Ansicht je Bereich** (Bestandsliste, Dashboard, Regal …), jede als in sich geschlossenes Hook-Objekt. |
| Excel einlesen | Macht die App selbst. Eine Lesebibliothek (z. B. SheetJS) darf eingebunden werden; die Adresse ist OFFEN. |
| Reihenfolge | Schritt für Schritt: zuerst die Grundlage, dann die Bestandsliste, dann Bereich für Bereich. |
| Testen | Lokaler Nachbau von Symolo mit Beispieldaten, als Testseite per Doppelklick. |
| Fragen an den Entwickler | Formular je Bereich mit gemeinsamen Skripten und Excel-Bibliothek werden getestet. Die Tabellenliste (`GetAllDboTypesAvail`) ist gerade nicht möglich: Wir arbeiten mit eigenen, kommentierten Annahmen. |

## A4. Verbindung und Anmeldung (Test von außen, nur Entwickler)

Aus `test.html`. **Dieser Teil entfällt in Symolo komplett**: Den Endpunkt legt Symolo fest, und die Benutzerdaten kommen von Symolo. Wir benutzen ihn nicht.

- Skripte (BEKANNT): `https://assets.symolo.biz/libs/symolo/symolo.tools.js`, `symolo.network.js` und `symolo.authentication.js`
- Endpunkt der Testsitzung (BEKANNT, **nicht benutzen**): `wss://fwm.symolo.biz/cmd2`
- Anmeldung (BEKANNT), die Zugangsdaten sind hier absichtlich weggelassen:

```js
window.symolo.authentication.befehle.check = "GETSESSIONDATA";
window.symolo.session = new window.symolo.authentication.sessionmanager(ENDPOINT);
await window.symolo.session.login({ user: "…", pass: "…" });
console.log(await window.symolo.session.check());
// Die SID muss immer gesetzt sein (nötig, um Daten zu ändern)
window.symolo.network.websocket_globals.sid = window.symolo.session.sid;
```

## A5. Netzweg: genau eine Stelle

| Umgebung | Aufruf |
|---|---|
| Test von außen (Barebone) | `window.symolo.network.websocket.request` |
| Im Symolo-Fenster (Framework) | `window.symolo.internal.connection.websocket.request` |

In `test.html` steht dazu der Kommentar „aus network wird internal.connection, um in Symolo einzupflegen“. `request` hängt bei totem Endpunkt endlos, deshalb braucht jede Anfrage ein Zeitlimit.

## A6. Abfragen (BEKANNT aus test.html)

```js
function requestWithTimeout(endpoint, cmd, sql) {
    const ms = 10000;
    return Promise.race([
        window.symolo.network.websocket.request(endpoint, { cmd: cmd, par: [sql] }),
        new Promise((_, reject) => setTimeout(
            () => reject(new Error("Timeout nach " + Math.round(ms / 1000) + "s: " + endpoint)), ms))
    ]);
}

// dieselbe Funktion mit beliebigem par (für die dsf.dbo-Befehle)
function requestWithTimeoutWithPar(endpoint, cmd, par) { /* wie oben, aber { cmd, par } */ }

async function selectData(endpoint, cmd, sql) {
    try {
        const result = await requestWithTimeout(endpoint, cmd, sql);
        return window.symolo.tools.parser.toObject(result.data.data, result.data.schema);
    } catch (error) {
        console.warn("selectData:", error);
        return [];
    }
}

window.MYDATA = await selectData(ENDPOINT, "dsf.Database.Select",
    "select * from fwm.stamm_prozesse");   // zum Testen LIMIT 1
```

## A7. Lebenszyklus eines Eintrags (BEKANNT aus test.html)

Ein neues leeres Objekt holen, befüllen, anlegen und speichern, dann wieder holen, ändern und speichern. Löschen nur mit großer Vorsicht, lieber archivieren.

```js
// 1. Leeres Objekt holen: so ist die Struktur klar
let obj = JSON.parse((await requestWithTimeoutWithPar(ENDPOINT,
    "dsf.dbo.GetEmptyObjectJson", ["fwm.stamm_prozesse"])).data.result);

// 2. Befüllen
obj.Nummer = "123132";

// 3. Anlegen. Eine mitgegebene ID wird ignoriert.
obj = await requestWithTimeoutWithPar(ENDPOINT,
    "dsf.dbo.CreateObjectJson", ["fwm.stamm_prozesse", JSON.stringify(obj)]);

// 4. Jetzt hat das Objekt eine ID. Wieder holen (ID nötig)
obj = JSON.parse((await requestWithTimeoutWithPar(ENDPOINT,
    "dsf.dbo.GetObjectByIdJson", ["fwm.stamm_prozesse", obj.id])).data.result);

// 5. Ändern und speichern. IMMER das komplette Objekt übergeben,
//    fehlende Feldinhalte werden gelöscht.
obj.Nummer = "123";
obj = await requestWithTimeoutWithPar(ENDPOINT,
    "dsf.dbo.UpdateObjectJson", ["fwm.stamm_prozesse", JSON.stringify(obj)]);

// 6. Löschen: mit Bedacht. Die Bestandsliste löscht NIE, sie archiviert.
// DeleteObjectJson ["fwm.stamm_prozesse", JSON.stringify(obj)]
```

Auffällig (OFFEN):
- Bei den Get-Befehlen wird `JSON.parse(antwort.data.result)` gelesen, bei Create und Update die Antwort direkt benutzt. Wir nehmen an, dass auch dort das Objekt in `data.result` steht.
- Das Feld `Nummer` gibt es in `fwm.stamm_prozesse` nicht, dort heißt es `name`. Vermutlich ist es nur ein Beispiel. Ob `GetEmptyObjectJson` dieselbe Schreibweise wie `Select` liefert, ist offen.

## A8. Befehlsliste (BEKANNT, von Ben am 16.10.2026)

Die App ruft alle Befehle per WebSocket als `{ cmd, par }` auf, **nie** über die HTTP-Pfade.

| Befehl | HTTP-Pfad (nur zur Info) | Nutzt die App? |
|---|---|---|
| `dsf.Database.Select` | – | ja: Listen lesen |
| `dsf.dbo.GetAllDboTypesAvail` | GET `dsf/dbo/types/{toignore}/` | nein; nur der Entwickler (Liste der Tabellen) |
| `dsf.dbo.GetEmptyObjectJson` | GET `dsf/dbo/empty/{TypeToGet}/` | ja: leeres Objekt vor dem Anlegen |
| `dsf.dbo.GetDboSelect` | GET `dsf/dbo/getdboselect/{TypeToUse}/` | nein, Zweck OFFEN |
| `dsf.dbo.GetObjectById` | GET `dsf/dbo/id/{TypeToUse}/{strTargetId}/` | nein (wir nehmen die JSON-Fassung) |
| `dsf.dbo.GetObjectByIdJson` | GET `dsf/dbo/id/json/{TypeToUse}/{strTargetId}/` | ja: frisch holen vor dem Ändern |
| `dsf.dbo.GetDBObjectListByIDJson` | GET `dsf/dbo/list/{TypeToUse}/{idList}/` | ja: Verweise zu Namen auflösen |
| `dsf.dbo.CreateObjectJson` | POST `dsf/dbo/create/{TypeToUse}/` | ja: anlegen ohne ID |
| `dsf.dbo.UpdateObjectJson` | POST `dsf/dbo/update/{TypeToUse}/` | ja: ändern und archivieren |
| `dsf.dbo.DeleteObjectJson` | POST `dsf/dbo/delete/{TypeToUse}/` | **nein, nie** |
| `dsf.dbo.CreateObjectFromDictJson` | POST `dsf/dbo/createfromdict/{TypeToUse}/` | nein, Zweck OFFEN |
| `dsf.Database.Execute` (laut Skill: UPDATE/INSERT) | – | **nein, nie** |

OFFEN: Steht `par` in der Reihenfolge des Pfads (z. B. `[Typ, id]`)? Kommt die `idList` als Text mit Kommas oder als Liste? Wir nehmen Text mit Kommas an.

## A9. Bekannte Daten

Tabelle `fwm.stamm_prozesse` (BEKANNT), Ergebnis von `select * from fwm.stamm_prozesse` in einer Testsitzung:

| name | iuser | idate | uuser | udate | id | standard_gruppe_id_gruppe |
|---|---|---|---|---|---|---|
| Oberflächenbeschichtung | 1 | 2026-01-05T13:19:33.0000000Z | null | 2026-05-11T16:41:29.0000000Z | 6 | 3 |
| Montage | 1 | 2026-01-05T13:19:37.0000000Z | null | 2026-05-11T16:41:35.0000000Z | 7 | 3 |
| Qualitätssicherung | 5 | 2026-01-13T14:17:10.0000000Z | 5 | 2026-09-18T12:15:00.0000000Z | 9 | 5 |
| Indexänderung | 5 | 2026-02-21T07:20:11.0000000Z | null | null | 11 | null |
| Sonstiges | 5 | 2026-02-21T07:20:53.0000000Z | null | null | 13 | null |

- Standardfelder (BEKANNT): `id`, `iuser`/`idate` (angelegt von/am), `uuser`/`udate` (geändert von/am). Das Zeitformat ist `…T13:19:33.0000000Z`, was VERMUTET auf SQL Server hindeutet.
- `standard_gruppe_id_gruppe` ist eine Verknüpfung (BEKANNT). Dass die Gruppen in `fwm.standard_gruppe` liegen, ist nur aus dem Spaltennamen geschlossen (VERMUTET). Möglich ist auch das Muster `<feld>_id_<zieltabelle>`. Tabelle und Spalte des Gruppennamens sind OFFEN.
- Alle Tabellen der Bestandsliste (`fwm.kom_…`) sind **unser Vorschlag** (VERMUTET). In Symolo gibt es sie noch nicht.

## A10. Wie die Bestandsliste das umsetzt (Repo symolo-kom)

| Ort | Inhalt |
|---|---|
| `symolo/quelle/10_einstellungen.js` | Datenquelle, Endpunkt, Zeitlimit, Schreibsperre für Symolo |
| `symolo/quelle/20_tabellen.js` | **einzige Stelle** mit Tabellen- und Spaltennamen (der Entwickler trägt die echten ein) |
| `symolo/quelle/40_daten.js` | Datenschicht: lesen, auflösen, anlegen, ändern, archivieren; ein einziger Schreibpfad; kein Löschen |
| `symolo/quelle/45_rechnen.js` | Status, Prozent, Fortschritt (wie die Excel-Formeln; Prüffall 9.1 in JS) |
| `symolo/quelle/47_bestand.js` | ABs mit Baugruppen und Teilen laden, Suche, Filter, Sortierung |
| `symolo/quelle/50_benutzer.js` | Platzhalter für Benutzer und Rollen (vorerst ohne) |
| `symolo/ansichten/<bereich>/` | eine Ansicht je Bereich |
| `symolo/fertig/<bereich>.js` | fertiges Hook-Objekt zum Einfügen in Symolo (gebaut mit `tools/symolo_bauen.py`) |
| `symolo/lokal/` | Nachbau von `window.symolo` mit Beispieldaten, nur zum Testen |
| `symolo/test.html` | Testseite, per Doppelklick öffnen |
| `docs/Symolo_Anbindung.md` | Anleitung für den Entwickler |

Im Code steht **OFFEN (Symolo)** an jeder ungeklärten Stelle und **VERMUTET** an jeder Annahme.

## A11. Offene Punkte

| Punkt | Annahme bis zur Klärung |
|---|---|
| Endpunkt im Fenster | `internal.connection` setzt ihn selbst |
| Tabellen, Felder, Feldtypen | Vorschlag `fwm.kom_…`, Felder wie in der bisherigen App |
| Muster der Verknüpfungsfelder, Gruppentabelle | `<feld>_id_<ziel>`, `fwm.standard_gruppe` |
| Archiv-Feld (Name, Typ) | `archiviert`, ja/nein |
| Rückgabe von Create, Update und List | JSON-Text in `data.result` |
| Fehlerformat von Symolo | unbekannt; wir zeigen die Meldung an |
| Reihenfolge von `par`, Form der `idList` | wie der Pfad; Text mit Kommas |
| Schreibweise der Felder (Get gegenüber Select) | egal, die App liest tolerant |
| SQL-Sprache, `where`/`order by`/`in`, Zeilengrenze | einfache Abfragen ohne `limit` und `join` |
| Länge einer Abfrage | `in (…)` in Stücken zu 500 IDs |
| Mengen als Zahl oder als Text (`21.000`) | beides wird gelesen; Text, der keine Zahl ist, zählt 0 |
| Gleichzeitiges Ändern | `udate` vor dem Speichern vergleichen |
| Benutzer, Rollen, Rechte | vorerst keine |
| Schrift, Farben, Fenstergröße, Handy | FWM-Variablen innerhalb der Ansicht, Thema light |
| Gemeinsame Skripte je Formular, Excel-Bibliothek und deren Adresse | in Klärung (Ben testet); bis dahin jede Ansicht in sich geschlossen |
| Geplante Aufgaben (Morgenmail), Sicherung, Testumgebung | bei Symolo |

---

# Teil B: Skills des Symolo-Entwicklers (Wortlaut)

Quelle: `opencode-barebone-skill-v1.zip`, Ordner `symolo-barebone-framework`. Unverändert übernommen.


## B: `SKILL.md`

````markdown
---
name: Symolo View: Barebone zu Framework
description: Eine eigenständige HTML-View in ein Symolo-Framework-Formular überführen. Enthält den Hook-Vertrag (form_on_load / before_set_values / onUnload), das Barebone-Gerüst zum Testen ohne Framework, die CSS-Scoping-Regel, die this-Regel, die API-Grenzen von layout.create und injector.css, den Netzweg-Umschalter und eine Liste gemessener Fallen. Für jede neue Planungs-, Auswertungs- oder Masken-Seite, die als Hook-Objekt laufen soll.
---

# Barebone-View → Symolo-Framework

Eine View wird **zuerst standalone gebaut und getestet**, dann 1:1 als
Hook-Objekt ins Formular gehängt. Der Code ist in beiden Fällen
derselbe. Das ist der ganze Punkt: es gibt keine „Übersetzungsphase“,
weil es keine zwei Programme gibt.

Dieses Dokument ist vollständig. Du brauchst keine bestehende Seite als
Vorlage.

---

## 1. Wann dieser Weg gilt

- Eine neue Seite soll als **Formular-View** in Symolo laufen (View mit
  Kopfleiste, Datenraster, Liste, Palette, Drag & Drop …).
- Eine bestehende standalone HTML-Datei soll in ein Formular wandern.
- Ein Formular soll eine zweite, eigenständige View bekommen.

Gilt **nicht** für: reine Datenabfrage ohne UI, Skripte ohne View, oder
wenn das Ziel ein Plugin/Service statt einer Formular-View ist.

---

## 2. Der Vertrag

Das Framework erzeugt ein Objekt mit drei Hook-Methoden. Es ruft sie
selbst — **du rufst sie nie selbst auf**.

```js
form_on_load:      function (FORM)                 { … },  // 1× beim Laden
before_set_values: async function (form, { data })  { … },  // 1× vor den Werten
onUnload:          function (FORM, {})              { … },  // 1× beim Verlassen
```

| Hook | Aufgabe | Regeln |
|---|---|---|
| `form_on_load` | CSS einspielen | **Nur** CSS. Kein DOM, keine Daten. |
| `before_set_values` | View bauen, Daten holen, rendern | Alles andere. |
| `onUnload` | aufräumen | **Genau die** CSS-ID entfernen, die `form_on_load` gesetzt hat. |

**Der einzige Unterschied zwischen den beiden Sprachen:**

```js
// standalone                        // Framework
document.getElementById("_output")  this.ctrlbyBind("_output").SelfElement
document.getElementById("maschinen")  weiterhin document.getElementById(…)
```

`ctrlbyBind` ist der einzige Container, den du vom Formular bekommst.
Jedes erzeugte Element hängt daran. Reihenfolge: erst aufbauen, dann
laden, dann rendern.

---

## 3. CSS: die Scoping-Regel

**Eine Klasse um die ganze View. Jede Regel hat sie als Voraussetzung.**

```js
form_on_load: function () {
    window.symolo.tools.injector.css(`
.az .az-view     { display:flex; flex-direction:column; height:100%; overflow:hidden; }
.az .az-card     { border:1px solid #d1d5db; border-radius:5px; }
.az .az-empty    { font-size:11px; color:#9ca3af; }
    `, "AZCSS");
}
```

Verboten, weil es das restliche Formular umformatiert:

```css
* { … }            html { … }          body { … }
button { … }       table { … }        .card { … }        /* globale Klasse! */
.az-group { … }    /* typ: Klasse ohne Wrapper → global */
.az .table th { … }   /* erlaubt — Wrapper ist da */
```

Prüfbar in einem Rutsch (siehe `references/pruefung.md`).

### Drei Fallen, die jeweils die ganze View getötet haben

**1. Ein Backtickpaar im CSS-Kommentar beendet den Template-String.**

```css
/* FEHLER: der String endet hier */
.az .az-group { margin: 0; }  /* passt zur Gruppe */
```

Ein Backtick in **irgendeinem** Kommentar — auch in der Mitte, auch
„unauffällig“ — schließt den String. Der Rest der Datei wird zu CSS
parse-Fehler, die View bleibt leer. Wenn eine View tot ist und kein
Konsolenfehler erscheint: zuerst nach Backticks im CSS-Block suchen.

**2. `body`, Schrift und Seitenhintergrund gehören dem Framework.**

Steht in `form_on_load`, zerlegt es jedes andere Formular. Abstand und
Hintergrund kommen über die View-Klasse selbst
(`.az { padding: …; background: … }`).

**3. Nimm eine CSS-ID pro View, und nimm sie in `onUnload` zurück.**

`injector.css(css, id)` ist idempotent: ein zweiter Aufruf mit gleicher
ID ändert nichts. Ohne `rmcss` bleibt das CSS beim nächsten Öffnen des
Formulars liegen.

---

## 4. `this`, nicht der Objektname

Im Framework **ist** der Hook eine Methode des Objekts. Also lautet
jede Selbstreferenz `this` — im Barebone genauso.

```js
before_set_values: async function (form, { data }) {

    this.machines = [];                       // Zustand am Objekt
    this.renderBoard();                       // Methode aufrufen
    btn.onclick = this.reload.bind(this);     // Handler binden
    btn.onclick = () => this.reload();        // oder Pfeil
},
```

**Drei Stellen, an denen `this` nicht funktioniert:**

```js
/* FALSCH: this ist hier das window-Objekt, nicht das Hook-Objekt */
this.machines.forEach(function (m) { this.render(m); });

/* RICHTIG: Pfeil erbt this aus der umgebenden Methode */
this.machines.forEach(m => this.render(m));

/* FALSCH: als Handler übergeben verliert this den Empfänger */
addEventListener("beforeunload", this.onUnload);

/* RICHTIG */
addEventListener("beforeunload", this.onUnload.bind(this));
```

`this` wirkt **nur** in Pfeilfunktionen. `forEach`/`map`/`find`/
`filter` mit `function(){}` brauchen entweder Pfeile oder Werte aus dem
Umlauf.

Zustand gehört ans Objekt, nicht in eine Schließung: nur dann überlebt
er einen Neuaufbau des Rasters.

---

## 5. API-Grenzen

Geprüft gegen `symolo.tools.js` / `symolo.network.js`.

### `window.symolo.tools.layout.create`

```js
window.symolo.tools.layout.create({
    parent: eltenElement,
    type:   "div",        // optionales Tag
    class:  "az-card",
    id:     "azKarten",
    text:   "Beschriftung",
    html:   "<b>…</b>",
    style:  { background: "#fff" }   // oder "a:b;c:d"
});
```

| Grenze | Folge |
|---|---|
| **Unbekannte Keys werden still ignoriert.** | Ein Tippfehler `clas:` wird zu gar keinem Fehler, das Element verliert nur seine Klasse. |
| **Keine Events, keine Attribute.** | `draggable`, `title`, `data-*`, `aria-*` **danach** am Element setzen. |
| `text` escapet `<` und `&`. | Für echtes Markup `html` nehmen. |
| Attribute, die React-artig wirken, gibt es nicht. | Nicht `onclick` im Objekt erwarten. |

`layout.create` ist der **einzige** erlaubte Elementbau. Kein
`document.createElement`, kein `innerHTML`-Bau per Schleife — sonst
verliert die View beim Framework-Einbau ihre Bindung.

### `window.symolo.tools.injector`

```js
window.symolo.tools.injector.css(css, "EIGENEID");   // idempotent
window.symolo.tools.injector.rmcss("EIGENEID");      // <style> dann <link>
```

### `window.symolo.network.websocket.request` hängt bei totem Endpunkt

Es **rejectet nicht** und **wirft nicht** — es hängt endlos. Jede
Anfrage braucht einen Timeout:

```js
requestWithTimeout: function (endpoint, cmd, sql, timeoutMs) {

    const ms = timeoutMs || this.config.timeoutMs;

    return Promise.race([
        window.symolo.network.websocket.request(endpoint, { cmd: cmd, par: [sql] }),
        new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error("Timeout nach " + Math.round(ms / 1000) + "s: " + endpoint));
            }, ms);
        })
    ]);
},
```

### Lesen

```js
selectData: async function (endpoint, cmd, sql) {
    try {
        const result = await this.requestWithTimeout(endpoint, cmd, sql);

        return window.symolo.tools.parser.toObject(
            result.data.data,
            result.data.schema
        );
    } catch (error) {
        console.warn("selectData:", error);
        this.showStatus("Daten konnten nicht geladen werden.");
        return [];
    }
},
```

`toObject` liefert eine Liste von Objekten mit den **Spaltennamen aus der
Abfrage** als Schlüssel. Die Schreibweise ist fremd und nicht
vorhersehbar → **immer tolerant lesen**, nie `row.spalte`:

```js
field: function (row, name) {
    if (Object.prototype.hasOwnProperty.call(row, name)) return row[name];
    const wanted = name.toLowerCase();
    for (const key in row) {
        if (key.toLowerCase() === wanted) return row[key];
    }
    return undefined;
},

fieldAny: function (row, names) {
    for (let i = 0; i < names.length; i++) {
        const w = this.field(row, names[i]);
        if (w !== undefined && w !== null && w !== "") return w;
    }
    return undefined;
},
```

Warum: eine abweichende Schreibweise liefert `undefined`, die Liste
bleibt **leer ohne jede Fehlermeldung**. Das ist der teuerste Fehler
dieser View-Art.

`null` ist nicht `""`. Ohne eigenen Schritt erscheint in einer
Überschrift der Text `undefined`.

---

## 6. Die eine Stelle, die beim Umzug umgestellt wird

Im Barebone steht:

```js
window.symolo.network.websocket.request
```

Im Framework:

```js
window.symolo.internal.connection.websocket.request
```

**Genau eine Stelle**, nämlich die eine Zeile in `requestWithTimeout`.
Nirgends sonst. `window.symolo.internal.*` existiert im Barebone nicht —
deshalb ist es genau diese eine Zeile, die man beim Testen nicht
verifizieren kann und die man beim Umziehen mit dem Auge prüfen muss.

---

## 7. Das Barebone-Gerüst

Eine Datei, die eine Hook-Datei ohne Framework lauffähig macht. Vier
Polyfills, mehr nicht:

```html
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>View — Barebone</title>

<!-- NUR STANDALONE — geht NICHT ins Framework.
     body und Schrift gehören dort dem Framework. -->
<style>
body { margin:0; background:#f5f6f8; font-family:Arial, sans-serif; color:#1f2937; }
</style>
<!-- ==== ENDE NUR STANDALONE ==== -->
</head>
<body>

<!-- POLYFILL 1 — im Framework: this.ctrlbyBind("_output").SelfElement -->
<div id="_output"></div>

<!-- POLYFILL 2 — im Framework global vorhanden, dort weglassen -->
<script src="https://assets.symolo.biz/libs/symolo/symolo.tools.js"></script>
<script src="https://assets.symolo.biz/libs/symolo/symolo.network.js"></script>

<script>
/* POLYFILL 3 — im Framework erzeugt das Framework dieses Objekt. */
const functionWrapper = {

/* … hier steht 1:1 der Hook-Inhalt, den später das Framework bekommt … */

};

/* POLYFILL 4 — im Framework NICHT übernehmen, die Hooks laufen selbst. */
functionWrapper.form_on_load();
functionWrapper.before_set_values();
window.addEventListener("beforeunload", functionWrapper.onUnload.bind(functionWrapper));
</script>
</body>
</html>
```

**Der entscheidende Punkt:** Der Hook-Inhalt wird für Barebone und
Framework **einmal** geschrieben. Es gibt keine Übersetzungsphase und
damit keine zwei Programme, die auseinanderlaufen können.

Was die Polyfills ersetzen:

| Polyfill | Im Framework |
|---|---|
| `<div id="_output">` | `this.ctrlbyBind("_output").SelfElement` |
| die zwei `<script src>` | global vom Framework geladen |
| `const functionWrapper = { … }` | erzeugt das Framework |
| die drei Aufrufe am Ende | ruft das Framework selbst |

---

## 8. Lesen und Schreiben trennen

Die wichtigste inhaltliche Entscheidung, und sie ist fachlich, nicht
technisch:

**Eine View, die noch nicht speichern darf, speichert nicht.**

Erlaubt und richtig:

```js
applyDrop: function (maschine, event) {
    /* … Modell ändern, neu zeichnen … */
    this.showStatus("… Noch nicht gespeichert.");
}
```

Falsch:

```js
applyDrop: function (maschine, event) {
    /* … Modell ändern … */
    this.persistDirty();      /* SQL-Abfrage erfunden */
}
```

Eine Schreibabfrage zu erfinden, die es nicht gibt, ist schlimmer als
keine: der erste Klick schreibt in eine falsche Tabelle, und es fällt
erst Wochen später auf.

**Wenn doch geschrieben wird, braucht es drei Dinge:**

1. **Entfernen heißt `Benutzer = 0`, kein `DELETE`.** Die Zeile bleibt,
   die Historie bleibt lesbar.
2. **Ein einziger Schreibpfad.** Jede Mutation, die gespeichert werden
   soll, muss durch dieselbe Funktion. Ein Mutationstyp, der
   speichert, und einer, der es vergisst, ist ein Datenverlust mit
   Verzögerung.
3. **Ein Dialog vor dem ersten Überschreiben**, mit Quelle, Ziel,
   Anzahl der betroffenen Zeilen und Zahl derer, die überschrieben
   werden. Kein Dialog ist schneller — und im ersten Lauf ist er der
   einzige Unterschied zwischen Planung und Desaster.

---

## 9. Fallen mit Messwert

Alle aus echten Views. Ausführlich mit Testbefehl in
`references/fallen.md`.

| # | Falle | Symptom |
|---|---|---|
| 1 | Backtick im CSS-Kommentar | View komplett tot, kein Konsolenfehler |
| 2 | Komma zwischen zwei Objekteigenschaften vergessen | `SyntaxError` — die ganze Datei stirbt |
| 3 | Bedingung, die **vor** dem Laden geprüft wird | Feld fehlt ersatzlos, z. B. Suchfeld |
| 4 | `document.querySelector` im Code | trifft das falsche Element im Framework |
| 5 | `box-sizing:border-box` vergessen | 1px Drift pro Zeile, ohne Meldung |
| 6 | `align-items:flex-start` an der Spaltenbox entfernt | klebender Kopf stirbt nach einer Bildschirmhöhe |
| 7 | Pane auf `width:0` | misst 1px, Kinder ragen über das Panel |
| 8 | Handler an einem Kind, das neu gebaut wird | Handler verschwindet beim ersten Filterklick |
| 9 | CSS-Regel mit gleichem Gewicht, falsche Reihenfolge | Zustand wird still überschrieben |
| 10 | Frühreturn vor dem Neuzeichnen | Element bleibt als Geist stehen |
| 11 | `dragend` nach `drop` vergessen | Rückzug legt den Auftrag zurück |
| 12 | Index aus einer anderen Liste übernommen | Position, die es nicht gibt |

---

## 10. Ablauf

1. **Gerüst anlegen.** Leeres Barebone mit den vier Polyfills + eine
   leere View-Klasse. Läuft es, ist die Kette steht.
2. **CSS-Block in `form_on_load`**, Wrapper-Klasse vergeben, `rmcss` in
   `onUnload`.
3. **Layout in `before_set_values`** aufbauen — **nur** die Elemente,
   noch ohne Daten. Container, Zeilen und Leisten anlegen, jede ID
   notieren.
4. **Zustand ans Objekt.** `this.maschinen = []` usw. Nicht in eine
   Schließung.
5. **Lesen.** `selectData` mit Timeout. Erst wenn die Daten da sind:
   `normalize…()` schreiben, tolerant über `field`/`fieldAny`.
6. **Rendern.** Aus dem Zustand, nicht aus den Daten. Das DOM ist eine
   Abbildung des Zustands und wird nach jeder Änderung neu gebaut.
7. **Verhalten.** Drag, Filter, Klick. Nach **jeder** Mutation: Modell
   ändern, alle betroffenen Ansichten neu zeichnen, Zähler aktualisieren.
8. **Leere Wege.** Jeder Filter, der nichts findet, nennt den Grund und
   bietet das Zurücksetzen an.
9. **Messen.** Prüfliste aus `references/pruefung.md`, Punkt für Punkt
   — nicht am Bild, sondern an Zahlen.
10. **Umziehen.** Eine Zeile (`network` → `internal.connection`),
    Polyfills streichen, `form_on_load`/`before_set_values`/`onUnload`
    als Objektschlüssel übernehmen.

---

## 11. Abnahmekriterien

Eine View ist fertig, wenn **alles** davon gemessen wurde:

- [ ] 0 Konsolenfehler nach dem Laden
- [ ] **jede** CSS-Regel beginnt mit der Wrapper-Klasse — maschinell geprüft
- [ ] 0 Vorkommen des Objektnamens im Code außer an den Aufrufstellen
- [ ] 0 `document.querySelector` im Hook-Code
- [ ] 0 Backticks im CSS-Block außer den öffnenden/schließenden
- [ ] Zeilenhöhen zweier nebeneinanderliegender Spalten stimmen auf **0px**
- [ ] klebende Kopfzeile nach dem Scrollen noch auf 0px Bildschirmhöhe
- [ ] Fußleiste bleibt **eine** Zeile
- [ ] jeder Filter mit leerem Ergebnis nennt den Grund
- [ ] jeder Drag-Pfad getestet: gültiges Ziel, ungültiges Ziel, Abbruch
- [ ] `onUnload` räumt **genau** die CSS-ID ab, die `form_on_load` gesetzt hat
- [ ] keine Zeile behauptet `undefined`

Die Messbefehle stehen in `references/pruefung.md`.

---

## 12. Weitere Dateien

- `references/vertrag.md` — vollständiges, lauffähiges Hook-Gerüst mit
  allen drei Hooks und einem Beispiel-Zugriffspfad.
- `references/api-grenzen.md` — `layout.create`, `injector`,
  `parser`, Netzweg, alle geprüften Grenzfälle.
- `references/fallen.md` — die zwölf Fallen mit Fehlerbild, Ursache,
  Messwert und Korrektur.
- `references/pruefung.md` — Messbefehle für jede Abnahmezeile.
````

## B: `references/vertrag.md`

````markdown
# Der Vertrag im Volltext

Vollständiges Hook-Objekt. Alles lauffähig, nichts als Platzhalter.

---

## 1. Reihenfolge der drei Hooks

```
Formular wird geöffnet
        │
        ├─ form_on_load(FORM) ─────────► CSS einspielen. Kein DOM, keine Daten.
        │
        ├─ before_set_values(form, {data}) ──► View bauen, Daten holen, rendern
        │
   View wird benutzt
        │
        └─ onUnload(FORM, {}) ─────────► dieselbe CSS-ID wieder entfernen
```

`form_on_load` darf **kein DOM anfassen**. Zu dem Zeitpunkt existiert
das Formular, aber der View-Container ist noch nicht übergeben. Wer dort
`document.getElementById` aufruft, bekommt `null`.

`before_set_values` ist `async` und wird **nicht** auf sein Ergebnis
gewartet — es läuft neben der weiteren Wert-Übernahme. Deshalb: erst
das Gerüst aufbauen, dann die Daten holen. Wer zuerst die Daten holt und
dann baut, hat zwischenzeitlich eine leere View.

---

## 2. Gerüst

```js
const functionWrapper = {

/* ===========================================================================
   1. KONFIGURATION
   Alles, was beim Anpassen angefasst wird, steht hier oben.
   =========================================================================== */
config: {

    query: {

        sachen: {
            endpoint: "ws://…/cmd2",
            cmd:      "dsf.Database.Select",
            sql:      `select id, name from stamm.sachen`
        },

        /* Aufträge: absichtlich KEIN SQL.
           Geratene Spaltennamen erzeugen leere Zeilen statt eines
           Fehlers, und eine leere Liste sieht aus wie "es gibt keine". */
        /* auftraege: { endpoint: …, cmd: …, sql: … }, */
    },

    timeoutMs: 15000,

    layout: {
        machineColumnWidth: 180,
        rowHeight:           44
    }
},


/* ===========================================================================
   2. ZUSTAND
   Gehört ans Objekt, nicht in eine Schließung. Nur dann überlebt er
   einen Neuaufbau des Rasters.
   =========================================================================== */
sachen: [],
sachenSuche: "",
statusTimer: null,


/* ===========================================================================
   3. BAUEN
   =========================================================================== */
before_set_values: async function (form, { data }) {

    const parent = this.ctrlbyBind("_output").SelfElement;

    /* 3a. Erst das Gerüst. Ohne Daten, damit die View sofort steht. */
    this.buildView(parent);

    /* 3b. Dann die Daten. */
    await this.loadData();
},


/* ===========================================================================
   4. VIEW AUFBAUEN
   Nur Struktur. Jede ID wird hier vergeben und hier notiert — nicht
   später per querySelector gesucht.
   =========================================================================== */
buildView: function (parent) {

    /* Die View-Klasse. Jede CSS-Regel muss daran hängen. */
    const view = window.symolo.tools.layout.create({ parent: parent, class: "sv" });

    const head = window.symolo.tools.layout.create({ parent: view, class: "sv-head" });

    window.symolo.tools.layout.create({
        parent: head, type: "h2", class: "sv-title", text: "Sachen"
    });

    window.symolo.tools.layout.create({ parent: head, class: "sv-count", id: "svCount" });

    window.symolo.tools.layout.create({ parent: view, class: "sv-body", id: "svBody" });

    const foot = window.symolo.tools.layout.create({ parent: view, class: "sv-foot" });

    const btnReload = window.symolo.tools.layout.create({
        parent: foot, type: "button", class: "sv-btn", text: "Neu laden"
    });

    /* layout.create kann keine Events — danach am Element.
       Pfeil statt bind(), weil bind() hier nur umständlich ist. */
    btnReload.onclick = () => { this.loadData(); };

    window.symolo.tools.layout.create({
        parent: view, class: "sv-status", id: "status"
    });

    return view;
},


/* ===========================================================================
   5. LADEN UND RENDERN
   =========================================================================== */
loadData: async function () {

    const q = this.config.query;

    this.showStatus("Lade …");

    /* Toleranz: bricht eine Abfrage aus, steht das Gerüst trotzdem. */
    const rows = await this.selectData(q.sachen.endpoint, q.sachen.cmd, q.sachen.sql);

    this.sachen = this.normalizeSachen(rows);

    this.renderBody();
    this.updateCount();

    this.showStatus(this.sachen.length + " geladen.");
},

normalizeSachen: function (rows) {

    /* NULL ist nicht "": ohne diesen Schritt stünde in einer
       Überschrift der Text "undefined". */
    const text = value => {
        const t = value == null ? "" : String(value).trim();
        return t === "undefined" || t === "null" ? "" : t;
    };

    const liste = rows.map(row => {
        return {
            id:   Number(this.fieldAny(row, ["id", "ID"])),
            name: text(this.fieldAny(row, ["name", "Name", "bezeichnung"]))
        };
    });

    /* Die Reihenfolge der Datenbank ist keine Ordnung, auf der sich
       jemand verlassen würde. */
    liste.sort((a, b) => a.name.localeCompare(b.name, "de-DE", { numeric: true }));

    return liste;
},

renderBody: function () {

    const koerper = document.getElementById("svBody");
    if (!koerper) return;

    koerper.replaceChildren();

    if (this.sachen.length === 0) {
        window.symolo.tools.layout.create({
            parent: koerper, class: "sv-empty", text: "Keine Daten geladen."
        });
        return;
    }

    this.sachen.forEach(sache => {
        window.symolo.tools.layout.create({
            parent: koerper, class: "sv-card", text: sache.name
        });
    });
},

updateCount: function () {
    this.setText("svCount", this.sachen.length + " Einträge");
},


/* ===========================================================================
   6. HILFSMETHODEN
   =========================================================================== */
field: function (row, name) {

    if (Object.prototype.hasOwnProperty.call(row, name)) return row[name];

    const wanted = name.toLowerCase();

    for (const key in row) {
        if (key.toLowerCase() === wanted) return row[key];
    }

    return undefined;
},

fieldAny: function (row, names) {

    for (let i = 0; i < names.length; i++) {
        const value = this.field(row, names[i]);
        if (value !== undefined && value !== null && value !== "") return value;
    }

    return undefined;
},

setText: function (id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
},

showStatus: function (message) {

    const el = document.getElementById("status");
    if (!el) return;

    el.textContent = message;
    el.classList.add("show");

    clearTimeout(this.statusTimer);

    /* Pfeil, damit this das Hook-Objekt bleibt. */
    this.statusTimer = setTimeout(() => {
        el.classList.remove("show");
    }, 2200);
},

requestWithTimeout: function (endpoint, cmd, sql, timeoutMs) {

    const ms = timeoutMs || this.config.timeoutMs;

    return Promise.race([
        window.symolo.network.websocket.request(endpoint, { cmd: cmd, par: [sql] }),
        new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(
                    "Timeout nach " + Math.round(ms / 1000) + "s: " + endpoint
                ));
            }, ms);
        })
    ]);
},

selectData: async function (endpoint, cmd, sql) {

    try {
        const result = await this.requestWithTimeout(endpoint, cmd, sql);

        return window.symolo.tools.parser.toObject(
            result.data.data,
            result.data.schema
        );
    } catch (error) {
        console.warn("selectData:", error);
        this.showStatus("Daten konnten nicht geladen werden.");
        return [];
    }
},


/* ===========================================================================
   HOOK 1 — CSS
   Nur CSS. Und nur scoped.
   =========================================================================== */
form_on_load: function () {

    window.symolo.tools.injector.css(`

/* ---------------------------------------------------------------------------
   SCOPE: die View-Klasse .sv ist VORAUSSETZUNG jeder Regel.

   Kein * {}, kein html {}, kein body {}, kein nacktes button {} / table {}.
   Eine Klassen-Regel ohne Wrapper waere global und wuerde ausserhalb
   der View greifen.
   --------------------------------------------------------------------------- */

.sv { display:flex; flex-direction:column; height:100%; overflow:hidden; }

.sv .sv-head { flex:0 0 auto; display:flex; align-items:center; gap:12px;
                padding:10px 12px; background:#fff;
                border-bottom:1px solid #d1d5db; }

.sv .sv-title { margin:0; font-size:18px; font-weight:700; white-space:nowrap; }
.sv .sv-count { margin-left:auto; font-size:11px; color:#6b7280;
                font-variant-numeric:tabular-nums; }

.sv .sv-body { flex:1 1 auto; min-height:0; display:flex; overflow:auto;
                background:#fff; }

.sv .sv-card  { border:1px solid #d1d5db; border-radius:5px;
                padding:6px 10px; margin:4px; font-size:13px; }

.sv .sv-empty { font-size:11px; color:#9ca3af; padding:8px 10px; }

/* Die Fusszeile bleibt EINE Zeile. Umbruch macht aus 29px sofort 83px.
   Deshalb nichts Vergleichbares hinein und white-space:nowrap. */
.sv .sv-foot { flex:0 0 auto; display:flex; align-items:center; gap:8px;
                padding:8px 12px; background:#fff;
                border-top:1px solid #d1d5db; white-space:nowrap; }

.sv .sv-btn   { border:0; border-radius:5px; padding:7px 12px; cursor:pointer;
                background:#374151; color:#fff; font-size:13px; font-family:inherit; }
.sv .sv-btn:hover { background:#4b5563; }
.sv .sv-btn:focus-visible { outline:2px solid #2563eb; outline-offset:2px; }

/* Der Status blendet ein und aus — die EINZIGE erlaubte Transition. */
.sv .sv-status { position:fixed; bottom:12px; left:50%; transform:translateX(-50%);
                 padding:7px 12px; border-radius:6px; background:#111827;
                 color:#fff; font-size:11px; opacity:0; pointer-events:none;
                 transition:opacity .2s; z-index:20; }
.sv .sv-status.show { opacity:.95; }

/* box-sizing dort, wo gerechnet wird. Fehlt es, driftet jede Zeile
   um die Breite des Rahmens. */
.sv .sv-head, .sv .sv-foot, .sv .sv-card, .sv .sv-body,
.sv .sv-count, .sv .sv-btn { box-sizing:border-box; }

    `, "SVCSS");
},


/* ===========================================================================
   HOOK 3 — AUFRÄUMEN
   Genau die ID, die form_on_load gesetzt hat.
   =========================================================================== */
onUnload: function () {
    window.symolo.tools.injector.rmcss("SVCSS");
}

};
```

---

## 3. Wie es im Formular aussieht

Im Framework steht genau dieser Inhalt ohne den `const functionWrapper = {`
und ohne die vier Polyfills:

```js
/* Formular → View */
{
    form_on_load:      function (FORM)                { … },
    before_set_values: async function (form, { data }) { … },
    onUnload:          function (FORM, {})             { … }
}
```

Die Zugriffspfade ändern sich an **genau zwei** Stellen:

| Im Barebone | Im Framework |
|---|---|
| `document.getElementById("_output")` | `this.ctrlbyBind("_output").SelfElement` |
| `window.symolo.network.websocket.request` | `window.symolo.internal.connection.websocket.request` |

Sonst nichts. `getElementById` für die eigenen Elemente bleibt
`getElementById` — die IDs sind eindeutig, solange die View die einzige
mit diesem Präfix ist.

---

## 4. Eine View ins Framework einhängen

1. Aus dem Barebone den **Inhalt** des Hook-Objekts herausnehmen.
2. `document.getElementById("_output")` → `this.ctrlbyBind("_output").SelfElement`
3. `window.symolo.network.websocket` → `window.symolo.internal.connection.websocket`
4. Objekt-Schlüssel setzen: `form_on_load`, `before_set_values`, `onUnload`.
5. Die vier Polyfills streichen. Sie gehören **nicht** ins Framework.
6. `layout.create`-Aufrufe bleiben unverändert.

**Der `<style>`-Block „NUR STANDALONE“ wird nicht mitkopiert.** Er
gehört nicht frameworkfähig und steht in der Barebone-Datei im `<head>`,
nicht im CSS von `form_on_load`.

---

## 5. Wie eine View am Framework hängt

```html
<form id="planung">
  <!-- Feld mit Bindung "_output" — der Container der View -->
</form>
```

Das Framework übergibt in `before_set_values` das Form-Objekt und
`{ data }`. Braucht die View Werte aus dem Formular, kommen sie aus
`data` — nicht aus dem DOM lesen. Das DOM kann zu diesem Zeitpunkt noch
unvollständig gefüllt sein.

---

## 6. Wenn eine zweite View ins selbe Formular kommt

Jede View bekommt:

- **eine eigene Wrapper-Klasse** (`.az`, `.sv`, …) — nie eine gemeinsame
- **eine eigene CSS-ID** (`AZCSS`, `SVCSS`) und ein passendes `rmcss`
- **ein eigenes Präfix für Klassen und IDs**, damit `getElementById`
  und `querySelector` eindeutig bleiben
- **eigenen Zustand** am Objekt

Wichtig: die IDs sind **nicht** über den Wrapper geschützt. Zwei Views
mit `id="status"` im selben Formular brechen `getElementById` — der
erste Treffer gewinnt. Präfixieren ist Pflicht, nicht Geschmack.
````

## B: `references/api-grenzen.md`

````markdown
# API-Grenzen

Alles gegen `symolo.tools.js` / `symolo.network.js` geprüft. Wo etwas
nur beobachtet und nicht belegt ist, steht das dabei.

---

## `window.symolo.tools.layout.create`

Der einzige erlaubte Elementbau in einer View.

### Signatur

```js
window.symolo.tools.layout.create({
    parent: elternElement,   // Pflicht
    type:   "div",           // optionales Tag, sonst div
    class:  "sv-card",       // Klassenname ohne Punkt
    id:     "svKarten",      // ohne #
    text:   "Beschriftung",  // Inhalt
    html:   "<b>x</b>",      // Markup
    style:  { background: "#fff" }   // Objekt oder "a:b;c:d"
});
```

### Was es kann

| Schlüssel | Verhalten |
|---|---|
| `parent` | Element, an das gehängt wird. Fehlt es, hängt nichts. |
| `type` | Tag-Name. `undefined` → `div`. |
| `class` | Wird gesetzt, **kein** automatisches Präfix. |
| `id` | Wird gesetzt. |
| `text` | Setzt `innerText`. **Escapet `<` und `&`.** |
| `html` | Setzt `innerHTML`. |
| `style` | Objekt oder `"a:b;c:d"`-String. |

### Was es nicht kann

**Unbekannte Schlüssel werden still ignoriert.**

```js
window.symolo.tools.layout.create({ parent: el, clas: "sv-card" });
// → kein Fehler, kein Element mit Klasse. Tippfehler ist unsichtbar.
```

Deshalb: nach dem Bau immer prüfen, ob die Klasse wirklich sitzt. Ein
Element ohne Klasse sieht aus wie ein CSS-Fehler.

**Keine Events.**

```js
const el = window.symolo.tools.layout.create({ parent: box, type: "button" });
el.onclick = () => { … };                              // danach
el.setAttribute("draggable", "true");                  // danach
el.setAttribute("aria-expanded", "false");             // danach
el.dataset.orderId = nr;                                // danach
```

`draggable`, `title`, `data-*`, `aria-*`, `role`, `tabindex` — alles
danach.

**Kein `style` als CSS-Text mit Selektor.** Nur die genannten
Eigenschaften.

### Warum `layout.create` und nicht `document.createElement`

Nicht Bequemlichkeit, sondern Bindung: die View hängt im Framework
unter `ctrlbyBind("_output").SelfElement`. Ein selbstgebautes Element
gehört zum Dokument, nicht zum Formular, und überlebt den Neuaufbau des
Formulars nicht.

---

## `window.symolo.tools.injector`

### `css(text, id)`

```js
window.symolo.tools.injector.css(`
.az .az-card { border:1px solid #d1d5db; }
`, "AZCSS");
```

- **Idempotent.** Ein zweiter Aufruf mit gleicher ID ändert nichts.
  Deshalb ist der Aufruf in `form_on_load` gefahrlos mehrfach.
- Legt ein `<style>` an.
- **Ein Backtickpaar im Text beendet den Template-String**, auch in
  einem Kommentar. Das ist der teuerste Fehler der ganzen View: Der
  Rest des CSS wird nie eingefügt, die View bleibt leer, und es steht
  **kein** Fehler in der Konsole. Siehe `fallen.md`, Falle 1.

### `rmcss(id)`

```js
window.symolo.tools.injector.rmcss("AZCSS");
```

- Sucht zuerst `<style>`, dann `<link>`.
- Muss in `onUnload` stehen, sonst bleibt das CSS beim nächsten Öffnen
  des Formulars liegen und sammelt sich über mehrere Views an.

---

## `window.symolo.tools.parser.toObject`

```js
const rows = window.symolo.tools.parser.toObject(
    result.data.data,
    result.data.schema
);
```

- Liefert eine **Liste von Objekten**.
- Schlüssel sind die **Spaltennamen aus der Abfrage**, unverändert.

```sql
select '4711020' as 'order'      →   [{ order: "4711020" }]
select id, ressource from …       →   [{ id: 3, ressource: "K31" }]
```

### Konsequenz: nie `row.spalte`

```js
row.ressource     // undefined, wenn die DB "Ressource" liefert
```

Der Fehler ist **lautlos**: keine Exception, die Liste ist leer, die
View sieht funktionsfähig aus. Deshalb `field` / `fieldAny`:

```js
field: function (row, name) {

    if (Object.prototype.hasOwnProperty.call(row, name)) return row[name];

    const wanted = name.toLowerCase();

    for (const key in row) {
        if (key.toLowerCase() === wanted) return row[key];
    }

    return undefined;
},

fieldAny: function (row, names) {

    for (let i = 0; i < names.length; i++) {
        const value = this.field(row, names[i]);
        if (value !== undefined && value !== null && value !== "") return value;
    }

    return undefined;
},
```

Und: **`null` ist nicht `""`.**

```js
name: this.fieldAny(row, ["ressource"]) ?? ""      // sicher
name: this.fieldAny(row, ["ressource"])            // kann null sein
```

Ohne den Schritt steht in einer Gruppenüberschrift der Text
`undefined`.

---

## Netzweg

### Zwei Pfade

| Umgebung | Aufruf |
|---|---|
| Barebone | `window.symolo.network.websocket.request` |
| Framework | `window.symolo.internal.connection.websocket.request` |

**Genau eine Stelle im ganzen Code wird umgestellt:** die eine Zeile in
`requestWithTimeout`. `internal.*` existiert im Barebone nicht, also
kann diese Zeile im Standalone nicht verifiziert werden.

### Aufrufform

```js
window.symolo.network.websocket.request(endpoint, {
    cmd: "dsf.Database.Select",
    par: [sql]        // Array, auch bei einem einzelnen SQL
});
```

### `request` hängt bei totem Endpunkt

Es **rejectet nicht**, **wirft nicht** und hat keinen eigenen Timeout.
Ein nicht erreichbarer Endpunkt lässt den Aufruf für immer stehen — die
View bleibt im Ladezustand, ohne Fehlermeldung.

Deshalb **immer** über einen Race:

```js
requestWithTimeout: function (endpoint, cmd, sql, timeoutMs) {

    const ms = timeoutMs || this.config.timeoutMs;

    return Promise.race([
        window.symolo.network.websocket.request(endpoint, { cmd: cmd, par: [sql] }),
        new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error("Timeout nach " + Math.round(ms / 1000) + "s: " + endpoint));
            }, ms);
        })
    ]);
},
```

### Befehle

| `cmd` | Wirkung |
|---|---|
| `dsf.Database.Select` | SELECT |
| `dsf.Database.Execute` | UPDATE / INSERT |

Nur ankommen lassen, was es im Barebone auch gab. Eine
Schreibabfrage zu erfinden ist schlimmer als keine — siehe
`SKILL.md` Abschnitt 8.

---

## Noch vorhanden, aber nicht geprüft im Einsatz

| Aufruf | Anmerkung |
|---|---|
| `window.symolo.tools.layout.setStyle` | im Barebone verfügbar, im Gerüst nicht benutzt |
| `window.symolo.network.httpGetAsync` | im Barebone verfügbar |
| `window.symolo.network.websocket.send` | im Barebone verfügbar |

Wenn eine View sie braucht: im Barebone einmal gegen die Lib prüfen,
nicht annehmen.

---

## Browser, nicht Framework

Frei benutzbar und erlaubt:

| API | Einsatz |
|---|---|
| `localStorage` | Zustände, die wiederkommen sollen (Pane-Zustand) |
| `fetch` | nur wo erlaubt, sonst der Websocket |
| `setTimeout` / `clearTimeout` | Statusanzeige, Entprellen |
| `DataTransfer` | Drag & Drop |
| `getComputedStyle` | nur zum Messen im Test |
| `requestAnimationFrame` | frei |

**Verboten:** Framework-eigene Pfade raten. `window.symolo.internal.*`
gibt es im Barebone nicht; wenn eine View es braucht, ist das ein
Hinweis, dass sie ein Feature des Frameworks benutzt und nicht in der
View liegen sollte.
````

## B: `references/fallen.md`

````markdown
# Fallen

Zwölf Fehler, die in echten Views passiert sind. Jeder mit Fehlerbild,
Ursache, Messwert und Korrektur.

Der Grund, warum sie hier stehen statt in den Code: **die meisten haben
kein Fehlerbild.** Die View sieht funktionsfähig aus und ist es nicht.

---

## 1. Ein Backtick im CSS-Kommentar

**Fehlerbild:** Die View ist komplett leer. Kein Konsolenfehler.

**Ursache:**

```js
window.symolo.tools.injector.css(`
.az .az-group { margin:0; }   /* passt zur Gruppe */
`, "AZCSS");
```

Der String endet am Backtick **im Kommentar**. Alles danach ist CSS-
Parse-Fehler, alles nach dem Sprung wird nie ausgeführt.

**Messwert:** 0 von 0 Elementen gerendert, Konsole leer.

**Korrektur:** Nie ein Backtick in den CSS-Text. Auch nicht „zur
Markierung“. Der Schaden ist doppelt: der erste Abschnitt wird
unvollständig eingefügt, und der Code danach ist tot.

**Prüfung:** Backticks im CSS-Block zählen. Erwartet genau zwei pro
Template-String.

---

## 2. Komma zwischen zwei Objekteigenschaften vergessen

**Fehlerbild:** `SyntaxError: Unexpected identifier '…'`, die ganze Datei
stirbt.

**Ursache:**

```js
query: {
    maschinen: { … }        /* ← Komma fehlt */

    /* orders: { … }, */     /* ein Kommentar ist keine Eigenschaft */
    orders: { … }
}
```

Der Kommentar sah harmlos aus — vorher war die Stelle genau ein
auskommentierter Block, das war gültig. Sobald dort echter Code steht,
fehlt das Komma.

**Messwert:** Syntaxfehler in Zeile X, `functionWrapper` nicht definiert.

**Korrektur:** Nach jeder neuen `config`-Eigenschaft das Komma prüfen.

---

## 3. Bedingung, die vor dem Laden geprüft wird

**Fehlerbild:** Ein Element fehlt ersatzlos. Kein Fehler.

**Ursache:**

```js
buildOrders: function (parent) {
    /* NUR wenn mehr als ein Auftrag da ist */
    if (this.orders.length > 1) {
        this.buildSearchField(…);
    }
}
```

`buildOrders()` läuft im Hook **vor** `loadData()`. `this.orders` war
dort immer leer, die Bedingung nie wahr, das Suchfeld wurde **nie**
gebaut.

**Messwert:** `hatSuchfeld: false`.

**Korrektur:** Bedingungen über Daten **niemals** beim Bauen prüfen.
Entweder unbedingt bauen oder zur Render-Zeit entscheiden.

---

## 4. `document.querySelector` im Code

**Fehlerbild:** Im Standalone alles korrekt. Im Framework greift die
Query ins ganze Dokument und trifft das **falsche** Element.

**Ursache:**

```js
renderOrders: function () {
    const liste = document.querySelector(".az-orders-list");
```

Die Query weiß nichts von diesem Hook-Objekt. Sobald das Framework die
View einhängt, ist der erste Treffer im Dokument nicht die eigene Liste.

**Messwert:** `document.querySelector` im Hook-Code: 2 Treffer, davon
0 gewollt.

**Korrektur:** Beim Bauen die Referenz am Objekt ablegen.

```js
this.orderListEl = window.symolo.tools.layout.create({ … });

renderOrders: function () {
    const liste = this.orderListEl;
```

Ausnahme: `getElementById` für die eigenen Elemente ist in Ordnung, so
fern jedes Element ein **eigenes Präfix** hat. Zwei Views mit `id="status"`
im selben Formular brechen das — der erste Treffer gewinnt.

---

## 5. `box-sizing:border-box` vergessen

**Fehlerbild:** Die Spalten passen nicht mehr zusammen. Keine Meldung.

**Ursache:** Eine Zeile mit Rahmen und fester Breite ist 1px breiter
als eine ohne. Bei 44 Maschinen sind das 44px Versatz, und die Tage
passen nicht mehr zu den Namen.

**Messwert:** 1px Drift pro Zeile, 44px in der Spalte.

**Korrektur:** Eine Sammelregel am Anfang des CSS, mit der man das
`box-sizing` pflegt:

```css
.az .view-head, .az .view-foot, .az .machine, .az .lane-row,
.az .az-card, .az .az-empty { box-sizing:border-box; }
```

Jede neue Box kommt **in diese Liste**, nicht in eine eigene Regel.

---

## 6. `align-items:flex-start` an der Spaltenbox entfernt

**Fehlerbild:** Die klebende Kopfzeile ist nach knapp einer
Bildschirmhöhe weggescrollt.

**Ursache:** Ohne `align-items:flex-start` strecken sich die Spalten auf
die Höhe des Sichtfensters statt auf die Höhe ihres Inhalts. Der
sticky Kopf verliert seinen Rahmen.

**Messwert:** Spaltenbox 549px bei 4088px Inhalt.

**Korrektur:**

```css
.az .columns     { display:flex; align-items:flex-start; }
```

---

## 7. Einklappbares Panel auf `width:0`

**Fehlerbild:** Das Panel misst 1px, der Griff ist abgeschnitten, der
Panel-Kopf steht ohne Rahmen über dem Brett.

**Ursache:** Bei `width:0` behalten die Kinder ihre Inhaltsbreite und
ragen über das Panel hinaus.

**Korrektur:** Kein Zustand ist 0px.

```css
.az .panel            { width:34px; min-width:34px; overflow:hidden; }
.az .panel.is-open    { width:300px; }
```

Und für den Körper im geschlossenen Zustand:

```css
.az .panel:not(.is-open) .body { width:0; flex-basis:0; padding:0; overflow:hidden; }
```

`flex-basis:0` ist Pflicht — sonst hält der Körper seine Inhaltsbreite.

---

## 8. Handler an einem Kind, das neu gebaut wird

**Fehlerbild:** Nach dem ersten Filterklick oder der ersten Suche
funktioniert ein Drag nicht mehr.

**Ursache:**

```js
buildOrderCard: function (parent, order) {
    const el = …;
    el.ondragover = …;      /* hängt an EINEM Element */
}
```

`renderOrders()` baut alle Karten neu. Die neuen Karten haben keine
Handler.

**Messwert:** Der Handler ist nach einem Rebuild weg, ohne Fehlermeldung.

**Korrektur:** Handler an ein Element hängen, das **nicht** neu gebaut
wird — an den Rahmen, nicht an die Liste und nicht an die Karten.

```js
box.ondragover = …;   /* box wird einmal gebaut */
```

Bonusregel: Der Rahmen liegt **außerhalb** des scrollenden Bereichs. Ein
Drop-Ziel, das beim Scrollen wegzieht, taugt nichts.

---

## 9. Zwei CSS-Regeln mit gleichem Gewicht, falsche Reihenfolge

**Fehlerbild:** Ein Zustand wird still überschrieben.

**Ursache:**

```css
.az .az-order.is-dragging  { opacity:.25; }
.az .az-order.is-assigned  { opacity:.55; }   /* gewinnt */
```

Beide haben dieselbe Spezifität. Die **spätere** Regel gewinnt. Eine
vergebene Karte behält beim Ziehen ihre Trübung — man bekommt kein
Feedback, dass man sie gerade nimmt.

**Messwert:** `opacity: 0.55` statt `0.25`, bei gesetzten Klassen
beider Zustände.

**Korrektur:** Zustandsregeln in eine Reihenfolge bringen, und wenn es
zwei sind, die stärkere **zuletzt** schreiben. Im Zweifel messen statt
lesen.

---

## 10. Frühreturn vor dem Neuzeichnen

**Fehlerbild:** Ein Element bleibt stehen, das weg sollte.

**Ursache:**

```js
removeFromLane: function (maschine, nr) {

    const pos = belegung.indexOf(nr);
    if (pos < 0) return;          /* ← hier ist das Ding schon weg */

    belegung.splice(pos, 1);
    this.renderBoard();            /* wird nie erreicht */
}
```

Der Auftrag war beim `dragstart` schon aus dem Modell genommen. Der
Aufruf findet ihn nicht mehr, bricht ab, und **das Brett wird nie neu
gezeichnet** — der Chip bleibt als Geist auf der Maschine stehen, die
Liste zählt weiter, die Karte bleibt als vergeben markiert.

**Messwert:** In drei Ansichten war der Auftrag an drei verschiedenen
Orten — und in keinem richtig.

**Korrektur:** Das Modell ist die Wahrheit, das DOM ist eine Abbildung.
Ein Pfad, der nur „aufräumt“, muss **immer** neu zeichnen, egal ob er
etwas entfernt hat oder nicht.

---

## 11. `dragend` nach `drop` vergessen

**Fehlerbild:** Ein Auftrag, der herausgezogen wurde, landet wieder
zurück auf der Maschine.

**Ursache:** `ondragend` feuert **nach** `ondrop`. Steht dort eine
Abbruchbehandlung, die den Auftrag zurücklegt, und `drop` hat den
Zustand nicht markiert, gilt jeder Drop als Abbruch.

**Messwert:** Herausgezogener Auftrag stand wieder an alter Stelle.

**Korrektur:** `drop` setzt ein Zeichen, das `dragend` auswertet.

```js
/* drop */
this.dragSource = null;          /* bewusst vor dem Zuruecklegen */

/* dragend */
if (this.dragSource) {           /* nur wenn wirklich abgebrochen */
    this.restore(this.dragSource);
    this.dragSource = null;
}
```

Umgekehrt gilt: `dragstart` nimmt den Auftrag aus dem Modell, damit die
Vorschau ihn nicht doppelt zählt. **Dann muss der Abbruchpfad ihn
zurücklegen.** Sonst ist er beim Loslassen außerhalb einfach weg — nicht
in der Lane, nicht in der Liste markiert, nirgends.

---

## 12. Index aus einer anderen Liste übernommen

**Fehlerbild:** Der Auftrag landet an einer Position, die es nicht gibt.

**Ursache:** Der Index stammt aus der Vorschau der Lane A, abgelegt wird
in Lane B. B kann eine andere Länge haben.

```js
/* falsch: Index aus A, auch wenn in B gedroppt wird */
const index = this.dragPreviewIndex;
```

**Messwert:** Index 2 aus einer 3-Karten-Lane, abgelegt in einer
1-Karten-Lane.

**Korrektur:** Die Vorschau muss zum Ziel gehören, sonst wird sie
verworfen.

```js
const gehoertZurLane = this.dragPreviewLane
    && this.dragPreviewLane.getAttribute("data-machine") === String(machine.id);

const index = gehoertZurLane && this.dragPreviewIndex !== null
    ? this.dragPreviewIndex
    : (this.lanes.get(machine.id) || []).length;
```

Anschließend immer klemmen:

```js
const pos = Math.max(0, Math.min(index, ziel.length));
```

`splice` mit `-1` löscht ausgerechnet den **letzten** Eintrag.

---

## Nicht in dieser Liste, aber gleich verwandt

**Zwei Zähler, ein Element.** Zwei Zahlen mit verschiedenen Bedeutungen
(`x von y vergeben` aus dem Modell, `n Treffer` aus der Suche) gehören
in **zwei** Elemente. Sonst gewinnt die zuletzt schreibende, und beim
Tippen steht kurz die falsche Zahl an der Stelle der anderen.

**`persistDirty()` fehlt in einem Pfad.** Jede Mutation, die gespeichert
werden soll, muss durch dieselbe Funktion. Ein Mutationstyp, der
speichert, und einer, der es vergisst, ist Datenverlust mit Verzögerung.

**Ein leerer Filter ohne Grund.** „Keine Treffer“ bei zwei Filtern ist
mehrdeutig. Alle wirksamen Einschränkungen benennen und das Zurücksetzen
anbieten.
````

## B: `references/pruefung.md`

````markdown
# Prüfung

Jede Abnahmezeile aus `SKILL.md` Abschnitt 11 hat hier einen Befehl.

Grundsatz: **nicht am Bild prüfen, sondern messen.** Das Bild zeigt
Absicht, die Messung zeigt Wirklichkeit. Fast jede Falle in
`fallen.md` ist auf einem Screenshot nicht zu sehen.

Die Befehle laufen im Browser auf dem geöffneten Barebone-Tab. Der
Objektname ist der, den das Barebone-Gerüst verwendet — im Framework
existiert er nicht, dann tritt an seine Stelle der Name, den das
Framework verwendet.

---

## 0. Grundgerüst

```js
(async () => {
    for (let i = 0; i < 60; i++) {
        if (typeof functionWrapper !== "undefined" && document.querySelector(".az")) break;
        await new Promise(r => setTimeout(r, 500));
    }
    if (typeof functionWrapper === "undefined") return { nichtGeladen: true };
    return { ok: true };
})()
```

Danach jeder weitere Befehl. **Nach jeder Änderung neu laden**, sonst
misst man den alten Stand.

---

## 1. Null Konsolenfehler

```js
/* Separat lesen, nicht im Evaluate. */
```

Nach dem Laden die Konsole öffnen und `level: "error"` filtern. Eine
leere Konsole ist der Normalfall — **außer** bei Falle 1 (Backtick im
CSS), wo die Konsole leer ist und die View trotzdem tot ist. Deshalb
zusätzlich Ziffer 2 messen.

---

## 2. View überhaupt gebaut

```js
(() => {
    const sheet = document.getElementById("AZCSS").sheet;
    return {
        regeln:      sheet.cssRules.length,
        wrapper:     document.querySelectorAll(".az").length,
        viewKinder:  document.querySelector(".az").children.length
    };
})()
```

**`regeln: 0`** bei leerer View → Falle 1 (Backtick im CSS).

---

## 3. Jede CSS-Regel hat die Wrapper-Klasse als Voraussetzung

Der wichtigste Test des ganzen Dokuments. Ein globaler Selektor
versteckt sich sonst im Framework.

```js
(() => {
    const sheet = document.getElementById("AZCSS").sheet;
    const schlecht = [];

    [...sheet.cssRules].forEach(r => {
        if (!r.selectorText) return;

        r.selectorText.split(",").forEach(selektor => {
            const t = selektor.trim();
            if (!t) return;

            /* Der ERSTE Teil muss exakt die Wrapper-Klasse sein.
               Nicht "enthält .az" — sonst zählt auch ein Selektor,
               der sie nur irgendwo als Nachfahr hat. */
            const erster = t.split(/\s+|>/)[0];

            if (erster !== ".az") schlecht.push(t);
        });
    });

    return { regeln: sheet.cssRules.length, ohneWrapper: schlecht };
})()
```

**Erwartet: `ohneWrapper: []`.**

Findet die Datei eine ID-Schriftart, steht sie hier:
`<style id="AZCSS">` — bei einer anderen View anders. Nicht raten,
sondern `document.styleSheets` nehmen und den Knoten über
`ownerNode.id` prüfen.

---

## 4. Objektname nur an den Aufrufstellen

```js
(() => {
    const s = [...document.scripts].find(x => !x.src).textContent;

    return s.split(String.fromCharCode(10))
        .map((z, i) => z.indexOf("functionWrapper") > -1
            ? { z: i + 1, t: z.trim() }
            : null)
        .filter(Boolean);
})()
```

**Erwartet: genau vier Stellen** — die Objektdefinition und die drei
Aufrufe im Barebone-Gerüst. Im Framework sind es nur noch die
Definition; die Aufrufe entfallen.

Zusätzlich zählen:

```js
(s.match(/this\./g) || []).length
```

---

## 5. Kein `document.querySelector` im Hook-Code

```js
(() => {
    const s = [...document.scripts].find(x => !x.src).textContent;

    return s.split(String.fromCharCode(10)).map((z, i) =>
        z.indexOf("document.querySelector") > -1
            ? { z: i + 1, istKommentar: z.trim().indexOf("*") === 0, t: z.trim() }
            : null
    ).filter(Boolean);
})()
```

**Erwartet: nur Zeilen mit `istKommentar: true`.**

Ein Treffer mit `istKommentar: false` ist Falle 4.

---

## 6. Backtick-Bilanz im CSS-Block

```js
(() => {
    const s = [...document.scripts].find(x => !x.src).textContent;

    const start = s.indexOf("injector.css(`");
    const ende  = s.indexOf("`,", start);

    const block = s.substring(start, ende);
    const anzahl = block.split(String.fromCharCode(96)).length - 1;

    /* Jedes Vorkommen von injector.css(` eröffnet einen Block */
    const bloecke = (s.match(/injector\.css\(`/g) || []).length;

    return { bloecke, backticks: anzahl, korrekt: anzahl === bloecke * 2 };
})()
```

**Erwartet: `korrekt: true`.**

---

## 7. Spalten passen auf 0px zusammen

Bei zwei Spalten, die zeilenweise zusammenpassen müssen (Maschine links,
Inhalt rechts). **Ohne die Klassen zu kennen** — sonst prüft der Test
eine Klassenliste, die mit der View mitwandert, und der Test stimmt,
wenn die View falsch ist.

```js
(() => {
    /* In jeder Spalte die Zeilen finden, ohne sie zu benennen.
       Das erste Kind ist die Kopfzeile, der Rest ist der Container —
       darunter liegen die Zeilen. */
    function zeilenDer(spalte) {
        const kinder = [...spalte.children].slice(1);
        if (kinder.length === 1) return [...kinder[0].children];
        return kinder;
    }

    const namen  = zeilenDer(document.querySelector(".az-names"));
    const rechts = zeilenDer(document.querySelector(".az-lanes"));

    let versatz = 0, schlimmste = "";
    const n = Math.min(namen.length, rechts.length);

    for (let i = 0; i < n; i++) {
        const a = namen[i].getBoundingClientRect().top;
        const b = rechts[i].getBoundingClientRect().top;
        const d = Math.abs(a - b);
        if (d > versatz) { versatz = d; schlimmste = namen[i].className; }
    }

    return {
        namen:  namen.length,
        rechts: rechts.length,
        gleichViel: namen.length === rechts.length,
        maxVersatz: Math.round(versatz * 100) / 100,
        ok: versatz < 0.5,
        schlimmste
    };
})()
```

**Erwartet: `gleichViel: true`, `maxVersatz: 0`, `ok: true`.**

- `gleichViel: false` → eine Zwischenüberschrift fehlt in einer der
  beiden Spalten, und **jede** Zeile darunter gehört zur falschen
  Zeile darüber. Ohne Fehlermeldung.
- `maxVersatz: 1` → Falle 5 (`box-sizing`).
- Referenz: 62 Zeilen je Spalte bei 44 Maschinen, 0px.

---

## 8. Klebende Kopfzeile

```js
(() => {
    const kopf = document.querySelector(".az-column-head");
    const box  = document.querySelector(".az-board-scroll");

    const vorher = kopf.getBoundingClientRect().top;
    box.scrollTop = 600;
    const nachher = kopf.getBoundingClientRect().top;

    return {
        vorher: Math.round(vorher),
        nachher: Math.round(nachher),
        klebt: Math.abs(nachher - vorher) < 1
    };
})()
```

**Erwartet: `klebt: true`.**
Falsch → Falle 6 (`align-items:flex-start`).

---

## 9. Fußzeile bleibt eine Zeile

```js
(() => {
    const f = document.querySelector(".az-view-foot");

    /* Die View darf ohne Fußzeile gebaut sein. */
    if (!f) return { fusszeile: "keine", ok: true };

    const r = f.getBoundingClientRect();
    const tops = [...f.children].map(k => Math.round(k.getBoundingClientRect().top));

    return {
        fusszeile: "vorhanden",
        hoehe: Math.round(r.height),
        einzeilig: Math.round(r.height) <= 35,
        kinderUebereinander: new Set(tops).size > 1
    };
})()
```

**Erwartet bei vorhandener Fußzeile: `einzellig: true`,
`kinderUebereinander: false`.**

Gemessene Referenz: 29px bei einer Zeile, 83px bei zweien. Der Sprung
kommt von `flex-wrap: wrap` plus einem Kind, das zu breit wird.

**Gegenprobe auf tote Regeln:** eine Klasse, die im `box-sizing`-Register
steht, aber nie gebaut wird, ist irreführend — sie behauptet ein
Element, das es nicht gibt.

```js
(() => {
    const s = [...document.scripts].find(x => !x.src).textContent;
    const view = document.querySelector(".az");

    /* Alle Klassen aus dem view, die im CSS geregelt sind */
    return [...view.querySelectorAll("[class]")]
        .map(e => e.className)
        .filter(c => !document.querySelector("." + c.split(" ")[0])) ;
})()
```

Der umgekehrte Fall ist der teurere: eine CSS-Klasse, die es im DOM
nie gibt. Für den box-sizing-Register heißt das: Eintrag ohne Element.

---

## 10. Filter mit leerem Ergebnis

```js
(() => {
    /* In ein Filterfeld tippen, das nichts findet. */
    const s = document.querySelector(".az-search");
    s.value = "gibtesnicht";
    s.oninput({ target: s });

    const leer = document.querySelector(".az-empty");

    return {
      text: leer ? leer.textContent : null,
      nenntGrund: !!leer && leer.textContent.length > 8
    };
})()
```

**Erwartet: `nenntGrund: true`.** Bei zwei Filtern muss der Text **alle**
wirksamen Einschränkungen nennen, nicht nur die letzte.

Danach zurücksetzen und prüfen, dass die Liste wieder da ist.

---

## 11. Drag-Pfade

Alle drei Wege prüfen. Die zwei ersten sind die, die man übersieht.

### 11a. Gültiges Ziel

```js
(() => {
    const fw = functionWrapper;
    const lane = document.querySelector(".az-lane");

    const dt = new DataTransfer();
    document.querySelector(".az-order").ondragstart({ dataTransfer: dt });

    /* Zeiger über die Lane, knapp rechts von der Mitte */
    const box = lane.getBoundingClientRect();
    lane.ondragover({ preventDefault(){}, dataTransfer: dt, clientX: box.left + 20 });

    const vorschau = fw.dragPreviewIndex;

    lane.ondrop({ preventDefault(){}, dataTransfer: dt });

    return {
        vorschauIndex: vorschau,
        karten: document.querySelectorAll(".az-lane-chip").length,
        reste: document.querySelectorAll(".az-lane-marker").length,
        isOver: document.querySelectorAll(".az-lane.is-over").length
    };
})()
```

**Erwartet: `reste: 0`, `isOver: 0`** nach dem Drop. Bleibt eine Marke
stehen, wird der nächste Drop auf einer Position landen, die es nicht
mehr gibt.

### 11b. Ungültiges Ziel

```js
(() => {
    const box = document.querySelector(".az-orders");
    const dt = new DataTransfer();

    /* Karte AUS der Liste auf die Liste — darf nichts tun */
    const vorher = document.querySelectorAll(".az-lane-chip").length;
    document.querySelector(".az-order").ondragstart({ dataTransfer: dt });
    box.ondrop({ preventDefault(){}, dataTransfer: dt });

    return {
        vorher,
        nachher: document.querySelectorAll(".az-lane-chip").length,
        unveraendert: vorher === document.querySelectorAll(".az-lane-chip").length
    };
})()
```

### 11c. Abbruch

```js
(() => {
    const fw = functionWrapper;
    const chip = document.querySelector(".az-lane-chip");

    const vorher = document.querySelectorAll(".az-lane-chip").length;

    /* Ziehen, aber loslassen ohne Drop */
    const dt = new DataTransfer();
    chip.ondragstart({ dataTransfer: dt });
    chip.ondragend();

    return {
        vorher,
        nachher: document.querySelectorAll(".az-lane-chip").length,
        gerettet: vorher === document.querySelectorAll(".az-lane-chip").length,
        dragSource: fw.dragSource || fw.dragLaneChip
    };
})()
```

**Erwartet: `gerettet: true`, `dragSource: null`.**
`gerettet: false` → Falle 11. Der Auftrag ist beim Loslassen außerhalb
weg — nicht in der Lane, nicht in der Liste markiert, nirgends.

### 11d. Fremde Datei

```js
(() => {
    const lane = document.querySelector(".az-lane");
    const vorher = document.querySelectorAll(".az-lane-marker").length;

    /* ondragover feuert auch, wenn eine Datei über die Lane zieht */
    lane.ondragover({ preventDefault(){}, dataTransfer: new DataTransfer(), clientX: 10 });

    return {
        vorher,
        nachher: document.querySelectorAll(".az-lane-marker").length,
        keineVorschau: vorher === document.querySelectorAll(".az-lane-marker").length
    };
})()
```

---

## 12. CSS-ID wird abgebaut — und zwar dieselbe

Der Fehler ist nicht „kein `rmcss`“, sondern **`rmcss` mit einer anderen
ID**. Dann bleibt das CSS liegen und der Fehler ist unsichtbar.

```js
(() => {
    const s = [...document.scripts].find(x => !x.src).textContent;

    /* Zeichenklasse bewusst [^"')]+ statt [A-Z0-9_]+:
       ein Name darf Bindestriche haben, sonst meldet der Test bei
       falscher ID nur "null" statt des falschen Namens. */
    const gesetzt  = s.match(/injector\.css\(`[\s\S]*?`,\s*"?([^"')]+)"?\)/);
    const entfernt = s.match(/injector\.rmcss\("?([^"')]+)"?\)/);

    return {
        gesetzt:   gesetzt   ? gesetzt[1].trim()   : null,
        entfernt:  entfernt  ? entfernt[1].trim()  : null,
        vorhanden: !!gesetzt && !!entfernt,
        gleich:    !!gesetzt && !!entfernt && gesetzt[1].trim() === entfernt[1].trim()
    };
})()
```

**Erwartet: `vorhanden: true`, `gleich: true`.**

Gegengeprüft an einer echten View: `AZCSS` / `AZCSS` → `gleich: true`.
Mit absichtlich falscher ID → `gleich: false`, und `entfernt` nennt den
falschen Namen statt `null`.

Gibt es mehrere Views im selben Formular, muss die ID pro View
verschieden sein. Gegenprobe:

```js
/* alle injector.css-Aufrufe der Seite */
const s = [...document.scripts].find(x => !x.src).textContent;
(s.match(/injector\.css\(`[\s\S]*?`,\s*"?([A-Z0-9_]+)"?\)/g) || [])
    .map(m => m.match(/`,\s*"?([A-Z0-9_]+)"?\)/)[1])
```

Jede ID darf **einmal** vorkommen. `injector.css` ist idempotent —
zwei Views mit derselben ID liefern stillschweigend nur das CSS der
zweiten.

---

## 13. Kein `undefined` irgendwo im Text

```js
(() => {
    const sus = [];

    document.querySelectorAll(".az *").forEach(el => {
        if (el.children.length === 0 && /undefined|NaN|\[object/.test(el.textContent)) {
            sus.push({ klasse: el.className, text: el.textContent.trim() });
        }
    });

    return { treffer: sus };
})()
```

**Erwartet: `treffer: []`.**
Ein Treffer ist fast immer `null` statt `""` aus der Datenbank.

---

## 14. Zustand am Objekt, nicht im DOM

```js
(() => {
    const fw = functionWrapper;

    /* Absicht: das DOM wird aus dem Zustand gebaut, nicht aus den
       Rohdaten. Ein Filter, der den Zustand nicht kennt, kann das
       DOM nicht filtern. */
    return {
        zustandsfelder: Object.keys(fw).filter(k =>
            Array.isArray(fw[k]) || fw[k] instanceof Map || fw[k] instanceof Set
        )
    };
})()
```

Kein Array und kein Set sollte leer bleiben, wenn die View etwas anzeigt.

---

## 15. Ein Auftrag, eine Maschine

Bei jeder 1:1-Zuordnung, die über mehrere Behälter läuft:

```js
(() => {
    const fw = functionWrapper;
    const doppelt = [];

    fw.lanes.forEach((belegung, id) => {
        belegung.forEach(nr => {
            if (belegung.indexOf(nr) !== belegung.lastIndexOf(nr)) {
                doppelt.push(nr + " doppelt in " + id);
            }
        });
    });

    /* Und: steht er wirklich in genau einer Lane? */
    const anzahlJe = {};
    fw.lanes.forEach(belegung => {
        belegung.forEach(nr => { anzahlJe[nr] = (anzahlJe[nr] || 0) + 1; });
    });

    return {
        doppeltImArray: doppelt,
        falsch Verteilt: Object.keys(anzahlJe).filter(nr => anzahlJe[nr] !== 1)
    };
})()
```

**Erwartet: beide Listen leer.**

Ein Testfehler, der hier gern auftritt: `lanes.set(id, …)` im Test setzt
eine Nummer, die schon woanders steht. Das verletzt die Regel direkt im
Testaufbau, nicht im Code.

---

## Abschluss: der eine Blick

Und trotzdem am Ende **einmal das Bild ansehen.** Nummern finden keine
Fehler wie „die Kopfzeile ist 2px zu tief“ oder „zwei gestrichelte
Rechtecke konkurrieren“. Die findet man nur mit Augen — aber erst,
wenn die Zahlen stimmen.
````

Erstellt: Ben Schumacher, 09.10.2026
