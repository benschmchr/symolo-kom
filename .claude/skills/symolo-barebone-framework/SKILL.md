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