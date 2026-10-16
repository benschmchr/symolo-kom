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