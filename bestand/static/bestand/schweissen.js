// Schweißen: Mitarbeiter, Arbeitsplatz und Termine eintragen (R-W6, R-W7). Der Server vererbt an BGs und Teile und
// liefert alle Werte zurück; hier werden sie nur eingetragen. Termine: Kurzformen wie 15.10. oder 151026 gehen
// (der Server prüft), dazu ein Kalender-Knopf.
(function () {
  var TOKEN = window.FWM.csrf();

  function meldung(text, fehler) {
    var m = document.getElementById("meldung");
    if (!m) return;
    m.textContent = text;
    m.classList.toggle("fehler", !!fehler);
    m.hidden = false;
    clearTimeout(m._t);
    m._t = setTimeout(function () { m.hidden = true; }, fehler ? 8000 : 5000);
  }

  function eintragen(antwort, geaendert) {
    Object.keys(antwort.zeilen).forEach(function (id) {
      var w = antwort.zeilen[id];
      document.querySelectorAll('[data-sw-id="' + id + '"]').forEach(function (f) {
        var feld = f.getAttribute("data-sw-feld");
        var wert = w[feld];
        if (wert === undefined) return;
        if (f.tagName === "DETAILS") {              // Mitarbeiter: Mehrfachauswahl
          mitarbeiterZeigen(f, wert);
        } else if (f.tagName === "SELECT") {
          Array.prototype.forEach.call(f.querySelectorAll("option[disabled]"), function (o) { o.remove(); });
          if (wert === "(verschieden)") {
            var o = document.createElement("option");
            o.value = "__v"; o.textContent = wert; o.disabled = true;
            f.insertBefore(o, f.children[1] || null);
            f.value = "__v";
          } else {
            f.value = wert;
          }
          f.setAttribute("data-wert", f.value);
        } else if (f.tagName === "INPUT") {
          if (f === geaendert || f !== document.activeElement) f.value = wert;
          f.classList.remove("ungueltig");
          f.removeAttribute("title");
        } else {
          f.textContent = wert;
        }
      });
    });
    if (antwort.meldung) meldung(antwort.meldung);
  }

  // Mitarbeiter-Auswahl (mehrere möglich): Anzeige und Häkchen auf den gespeicherten Wert stellen
  function mitarbeiterZeigen(d, wert) {
    var gewaehlt = wert === "(verschieden)" ? [] : wert.split(",").map(function (n) { return n.trim().toLowerCase(); }).filter(Boolean);
    d.setAttribute("data-wert", wert);
    var sum = d.querySelector("summary");
    sum.textContent = wert || "–";
    sum.title = wert;
    d.classList.remove("speichert", "ungueltig");
    Array.prototype.forEach.call(d.querySelectorAll('input[type="checkbox"]'), function (c) {
      c.checked = gewaehlt.indexOf(c.value.toLowerCase()) >= 0;
    });
  }

  function wertVon(f) {
    if (f.tagName !== "DETAILS") return f.value;
    return Array.prototype.filter.call(f.querySelectorAll('input[type="checkbox"]'), function (c) { return c.checked; })
      .map(function (c) { return c.value; }).join(", ");
  }

  function senden(f) {
    f.classList.add("speichert");
    return fetch(f.getAttribute("data-url"), {
      method: "POST", credentials: "same-origin",
      body: new URLSearchParams({ feld: f.getAttribute("data-sw-feld"), wert: wertVon(f) }),
      headers: { "X-CSRFToken": TOKEN, "X-Requested-With": "fetch" }
    }).then(function (r) {
      if (r.redirected || r.status === 403) throw new Error("Bitte anmelden (Rolle Stahlbau), um etwas einzutragen.");
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.fehler || "Speichern ging nicht.");
        eintragen(j, f);
      });
    }).catch(function (err) {
      f.classList.add("ungueltig");
      f.title = err.message;
      if (f.tagName === "DETAILS") mitarbeiterZeigen(f, f.getAttribute("data-wert") || "");
      meldung(err.message, true);
    }).finally(function () { f.classList.remove("speichert"); });
  }

  document.addEventListener("change", function (e) {
    var f = e.target;
    if (f.matches && f.matches(".sw-eingabe")) { senden(f); return; }
    var d = f.closest && f.closest("details.mehrfach");
    if (d) senden(d);
  });

  // Mehrfachauswahl: Liste liegt über der Tabelle (die Karten schneiden sonst ab); außerhalb tippen schließt
  document.addEventListener("toggle", function (e) {
    var d = e.target;
    if (!d.matches || !d.matches("details.mehrfach")) return;
    var liste = d.querySelector(".mehrfach-liste");
    if (d.open) {
      document.querySelectorAll("details.mehrfach[open]").forEach(function (o) { if (o !== d) o.open = false; });
      var r = d.getBoundingClientRect();
      liste.style.top = Math.min(r.bottom, window.innerHeight - 120) + "px";
      liste.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 248)) + "px";
    }
  }, true);
  document.addEventListener("click", function (e) {
    document.querySelectorAll("details.mehrfach[open]").forEach(function (o) { if (!o.contains(e.target)) o.open = false; });
  });
  window.addEventListener("scroll", function () {
    document.querySelectorAll("details.mehrfach[open]").forEach(function (o) { o.open = false; });
  }, { passive: true });

  // „Mitarbeiter verwalten“: Namen eintragen und austragen (Fenster in der Mitte)
  var knopfVerwalten = document.getElementById("mitarbeiter-verwalten");
  if (knopfVerwalten) {
    var namen = JSON.parse(document.getElementById("mitarbeiter-daten").textContent);
    var geaendert = false;
    var verwalten = function () {
      var box = document.createElement("div");
      box.className = "frage-box";
      var h = document.createElement("h2");
      h.textContent = "Mitarbeiter verwalten";
      var liste = document.createElement("ul");
      liste.className = "mitarbeiter-verwaltung";
      var fehler = document.createElement("p");
      fehler.className = "fehlertext";
      fehler.setAttribute("role", "alert");
      var zeichnen = function () {
        liste.replaceChildren();
        if (!namen.length) {
          var leer = document.createElement("li");
          leer.className = "leise";
          leer.textContent = "Noch keine Mitarbeiter eingetragen.";
          liste.append(leer);
        }
        namen.forEach(function (n) {
          var li = document.createElement("li");
          var t = document.createElement("span");
          t.textContent = n;
          var weg = document.createElement("button");
          weg.type = "button";
          weg.className = "knopf knopf-klein";
          weg.textContent = "Austragen";
          weg.setAttribute("aria-label", n + " austragen");
          weg.addEventListener("click", function () { aktion("weg", n); });
          li.append(t, weg);
          liste.append(li);
        });
      };
      var aktion = function (art, name) {
        fehler.textContent = "";
        return fetch(knopfVerwalten.getAttribute("data-url") || "/schweissen/mitarbeiter/", {
          method: "POST", credentials: "same-origin", body: new URLSearchParams({ aktion: art, name: name }),
          headers: { "X-CSRFToken": TOKEN, "X-Requested-With": "fetch" }
        }).then(function (r) {
          if (r.redirected || r.status === 403) throw new Error("Bitte anmelden (Rolle Stahlbau).");
          return r.json().then(function (j) {
            if (!r.ok) throw new Error(j.fehler || "Speichern ging nicht.");
            namen = j.namen;
            geaendert = true;
            zeichnen();
          });
        }).catch(function (err) { fehler.textContent = err.message; });
      };
      var form = document.createElement("form");
      form.className = "mitarbeiter-neu";
      var eingabe = document.createElement("input");
      eingabe.type = "text";
      eingabe.maxLength = 80;
      eingabe.autocomplete = "off";
      eingabe.placeholder = "Name eintragen";
      eingabe.setAttribute("aria-label", "Neuer Name");
      var plus = document.createElement("button");
      plus.type = "submit";
      plus.className = "knopf-haupt";
      plus.textContent = "Eintragen";
      form.append(eingabe, plus);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!eingabe.value.trim()) return;
        aktion("neu", eingabe.value).then(function () { if (!fehler.textContent) eingabe.value = ""; eingabe.focus(); });
      });
      var zeile = document.createElement("div");
      zeile.className = "knopfzeile";
      var fertig = document.createElement("button");
      fertig.type = "button";
      fertig.className = "knopf";
      fertig.textContent = "Fertig";
      fertig.setAttribute("data-schliessen", "");
      zeile.append(fertig);
      zeichnen();
      box.append(h, liste, form, fehler, zeile);
      var d = FWM.zeigen(box);
      eingabe.focus();
      d.addEventListener("close", function () { if (geaendert) location.reload(); }, { once: true });
    };
    knopfVerwalten.addEventListener("click", verwalten);
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.matches && e.target.matches("input.sw-eingabe")) { e.preventDefault(); e.target.blur(); }
  });

  // Kalender-Knopf neben den Termin-Feldern
  document.querySelectorAll("input.sw-datum").forEach(function (f) {
    var k = document.createElement("button");
    k.type = "button"; k.className = "sw-kalender"; k.textContent = "📅";
    k.setAttribute("aria-label", "Datum wählen");
    var d = document.createElement("input");
    d.type = "date"; d.className = "sw-kalender-eingabe"; d.tabIndex = -1; d.setAttribute("aria-hidden", "true");
    d.addEventListener("change", function () {
      if (!d.value) return;
      var t = d.value.split("-");
      f.value = t[2] + "." + t[1] + "." + t[0];
      f.dispatchEvent(new Event("change", { bubbles: true }));
    });
    k.addEventListener("click", function () { if (d.showPicker) d.showPicker(); else d.focus(); });
    f.insertAdjacentElement("afterend", k);
    k.insertAdjacentElement("afterend", d);
  });

  // Filter Mitarbeiter, Arbeitsplatz und Sortieren: sofort anwenden (Ben, 14.10.)
  document.addEventListener("change", function (e) {
    if (e.target.matches && e.target.matches("select[data-sortieren]")) e.target.form.submit();
  });

  // Weitere Spalten: je Gerät merken
  var mehr = document.getElementById("mehr-spalten");
  var karten = document.getElementById("karten");
  if (mehr && karten) {
    try { mehr.checked = localStorage.getItem("schweissen-mehr") === "1"; } catch (x) { /* ohne Speicher */ }
    karten.classList.toggle("alle-spalten", mehr.checked);
    mehr.addEventListener("change", function () {
      karten.classList.toggle("alle-spalten", mehr.checked);
      try { localStorage.setItem("schweissen-mehr", mehr.checked ? "1" : "0"); } catch (x) { /* ohne Speicher */ }
    });
  }
})();
