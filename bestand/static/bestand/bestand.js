// Bestandsliste: Mengen sofort speichern (R-M1), „Vorhanden = Soll“ (R-M2), „alles ✓“ (R-M3), Lagerort (R-L1, R-L2),
// Filter (R-A3: Suche und Auswahl setzen sich gegenseitig zurück), weitere Spalten.
// Der Server rechnet alles; hier werden nur die gelieferten Werte in PC- und Handy-Ansicht eingetragen.
(function () {
  var TOKEN = window.FWM.csrf();
  var STATUSKLASSEN = ["komplett", "teilweise", "offen", "leer"];

  function meldung(text, fehler) {
    var m = document.getElementById("meldung");
    if (!m) return;
    m.textContent = text;
    m.classList.toggle("fehler", !!fehler);
    m.hidden = false;
    clearTimeout(m._t);
    m._t = setTimeout(function () { m.hidden = true; }, fehler ? 8000 : 6000);
  }

  function senden(url, daten) {
    var body = new URLSearchParams(daten || {});
    return fetch(url, {
      method: "POST", body: body, credentials: "same-origin",
      headers: { "X-CSRFToken": TOKEN, "X-Requested-With": "fetch" }
    }).then(function (r) {
      if (r.redirected || r.status === 403) throw new Error("Bitte anmelden (Rolle Kommissionierung), um Mengen einzutragen.");
      return r.json().then(function (j) {
        if (!r.ok) {
          var fehler = new Error(j.fehler || j.frage || "Speichern ging nicht.");
          fehler.frage = j.frage;   // freier Lagerort: Rückfrage (R-L4)
          throw fehler;
        }
        return j;
      });
    });
  }

  function felder(el) {   // nur die Felder, die zu genau dieser Zeile gehören (nicht zu Zeilen darin)
    return Array.prototype.filter.call(el.querySelectorAll("[data-feld]"), function (f) {
      return f.closest("[data-zeile]") === el;
    });
  }

  function eintragen(antwort, geaendert) {
    Object.keys(antwort.zeilen).forEach(function (k) {
      var w = antwort.zeilen[k];
      document.querySelectorAll('[data-zeile="' + k + '"]').forEach(function (el) {
        if (el.hasAttribute("data-statusfarbe")) {
          STATUSKLASSEN.forEach(function (c) { el.classList.remove(c); });
          el.classList.add(w.css);
        }
        felder(el).forEach(function (f) {
          var art = f.getAttribute("data-feld");
          if (art === "status") {
            f.textContent = w.status;
            STATUSKLASSEN.forEach(function (c) { f.classList.remove(c); });
            f.classList.add(w.css);
          } else if (art === "balken") {
            STATUSKLASSEN.forEach(function (c) { f.classList.remove(c); });
            f.classList.add(w.css);
            f.firstElementChild.style.width = w.prozent + "%";
            f.setAttribute("aria-label", w.fortschritt);
          } else if (art === "entnehmen") {
            f.hidden = !w.entnehmen;
          } else if (art === "vorhanden") {
            if (f.tagName === "INPUT") {
              f.setAttribute("data-version", w.version);
              if (f === geaendert || f !== document.activeElement) f.value = w.vorhanden;
              f.classList.remove("ungueltig");
              f.removeAttribute("title");
            } else {
              f.textContent = w.vorhanden;
            }
          } else if (art === "lagerort") {
            if (f.tagName === "SELECT") platzZeigen(f, w.lagerort);
            else f.textContent = w.lagerort || "–";
          } else if (art in w) {
            f.textContent = w[art];
          }
        });
      });
    });
    Object.keys(antwort.zaehler || {}).forEach(function (k) {
      document.querySelectorAll('[data-zaehler="' + k + '"]').forEach(function (z) { z.textContent = antwort.zaehler[k]; });
    });
    if (antwort.hinweis) meldung(antwort.hinweis, true);
  }

  // Lagerort-Auswahl auf den gespeicherten Wert stellen (freier Text bekommt eine eigene Zeile)
  function platzZeigen(sel, wert) {
    sel.setAttribute("data-wert", wert);
    Array.prototype.forEach.call(sel.querySelectorAll(":scope > option"), function (o) {
      if (o.value !== "" && o.value !== "__frei__") o.remove();          // alter freier Text
    });
    if (wert && !sel.querySelector('optgroup option[value="' + CSS.escape(wert) + '"]')) {
      var o = document.createElement("option");
      o.value = wert;
      o.textContent = wert + " (kein Regalplatz)";
      sel.insertBefore(o, sel.querySelector('option[value="__frei__"]'));
    }
    sel.value = wert;
  }

  // R-L2: Platz an AB oder BG wählen → gilt für alles darunter; freier Text nur mit Bestätigung (R-L4)
  function platzSenden(sel, wert, frei) {
    var d = { platz: wert };
    d[sel.getAttribute("data-art")] = sel.getAttribute("data-id");
    if (frei) d.frei = "1";
    sel.classList.add("speichert");
    return senden(sel.getAttribute("data-platz-url"), d)
      .then(function (a) { eintragen(a); meldung(a.meldung); })
      .catch(function (err) {
        sel.value = sel.getAttribute("data-wert");
        if (err.frage && !frei) {
          return FWM.frage(err.frage).then(function (ja) { if (ja) return platzSenden(sel, wert, true); });
        }
        meldung(err.message, true);
      })
      .finally(function () { sel.classList.remove("speichert"); });
  }
  document.addEventListener("change", function (e) {
    var sel = e.target;
    if (!sel.matches || !sel.matches("select.platz-wahl")) return;
    var wert = sel.value;
    if (wert === "__frei__") {
      sel.value = sel.getAttribute("data-wert");
      FWM.eingabe("Anderer Platz (kein Regalfach), z. B. „Kiste 4“:", "").then(function (text) {
        if (text && text.trim()) platzSenden(sel, text.trim(), false);
      });
      return;
    }
    platzSenden(sel, wert.trim(), false);
  });

  // Menge eintragen: speichern, sobald das Feld verlassen oder Enter gedrückt wird
  document.addEventListener("change", function (e) {
    var f = e.target;
    if (!f.matches || !f.matches('input[data-feld="vorhanden"]')) return;
    f.classList.add("speichert");
    senden(f.getAttribute("data-url"), { wert: f.value, version: f.getAttribute("data-version") })
      .then(function (a) { eintragen(a, f); })
      .catch(function (err) { f.classList.add("ungueltig"); f.title = err.message; meldung(err.message, true); })
      .finally(function () { f.classList.remove("speichert"); });
  });
  // Doppelklick auf „Vorhanden“: Soll eintragen, noch einmal: 0 (Ben, 14.10.)
  document.addEventListener("dblclick", function (e) {
    var f = e.target;
    if (!f.matches || !f.matches('input[data-feld="vorhanden"][data-soll]')) return;
    var soll = f.getAttribute("data-soll");
    if (soll === "") return;
    f.value = f.value.trim() === soll ? "0" : soll;
    f.dispatchEvent(new Event("change", { bubbles: true }));
  });
  // Doppelklick auf einen AB- oder BG-Namen: nur diesen AB anzeigen (Ben, 14.10.)
  document.addEventListener("dblclick", function (e) {
    var k = e.target.closest && e.target.closest(".ab-klapp");
    var block = k && k.closest(".ab-block");
    if (!block) return;
    var sort = document.getElementById("sortf");
    location.href = form_basis() + "?ab=" + block.id.replace("ab-", "") + (sort ? "&sort=" + encodeURIComponent(sort.value) : "");
  });
  function form_basis() { return document.getElementById("filter").getAttribute("action"); }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.matches && e.target.matches('input[data-feld="vorhanden"]')) {
      e.preventDefault();
      e.target.blur();
    }
  });

  document.addEventListener("click", function (e) {
    // R-M2: Status eines Teils antippen
    var u = e.target.closest("[data-umschalten]");
    if (u) {
      senden(u.getAttribute("data-umschalten")).then(function (a) { eintragen(a); })
        .catch(function (err) { meldung(err.message, true); });
      return;
    }
    // R-M3: alles ✓ an AB oder BG, mit Rückfrage
    var b = e.target.closest("[data-alles]");
    if (b) {
      var ref = b.getAttribute("data-zeile-ref");
      var st = document.querySelector('[data-zeile="' + ref + '"]');
      var komplett = st && felder(st).some(function (f) {
        return f.getAttribute("data-feld") === "status" && f.textContent.trim() === "Komplett";
      });
      var name = b.getAttribute("data-name");
      var frage = komplett
        ? name + " ist komplett.\n\nAlle Mengen darunter auf 0 setzen (Status Offen)?"
        : "Alle Teile von " + name + " auf Soll setzen?\n(Teile mit größerer Menge behalten ihre Menge.)";
      var daten = b.hasAttribute("data-bg") ? { bg: b.getAttribute("data-bg") } : {};
      FWM.frage(frage).then(function (ja) {
        if (!ja) return;
        return senden(b.getAttribute("data-alles"), daten).then(function (a) { eintragen(a); })
          .catch(function (err) { meldung(err.message, true); });
      });
    }
  });

  // R-A3: Auswahl ändern → Suche leeren und anwenden; Suche abschicken → Auswahl zurücksetzen
  var form = document.getElementById("filter");
  if (form) {
    form.addEventListener("change", function (e) {
      if (e.target.hasAttribute("data-sortieren")) { form.submit(); return; }     // Sortierung behält die Suche
      if (!e.target.hasAttribute("data-filter")) return;
      form.q.value = "";
      form.submit();
    });
    form.addEventListener("submit", function () {
      if (form.q.value.trim()) form.status.value = "alle";
    });
  }

  // Weitere Spalten (Menge / BG, Index, Arbeitsgang, Material, Profil, Abmaße, Bemerkung): je Gerät merken
  var mehr = document.getElementById("mehr-spalten");
  var karten = document.getElementById("karten");
  if (mehr && karten) {
    try { mehr.checked = localStorage.getItem("bestand-mehr") === "1"; } catch (x) { /* ohne Speicher */ }
    karten.classList.toggle("alle-spalten", mehr.checked);
    mehr.addEventListener("change", function () {
      karten.classList.toggle("alle-spalten", mehr.checked);
      try { localStorage.setItem("bestand-mehr", mehr.checked ? "1" : "0"); } catch (x) { /* ohne Speicher */ }
    });
  }
})();

// Rechtsklick auf einen AB (oder eine seiner Zeilen) → Menü in der Mitte: Bearbeiten oder Löschen (Rolle Admin).
// Am Handy öffnet der Knopf „AB-Menü“ dasselbe Menü.
(function () {
  function menue(quelle) {
    var nr = quelle.getAttribute("data-ab-menue");
    var box = document.createElement("div");
    box.className = "frage-box ab-menue";
    var h = document.createElement("h2");
    h.textContent = "AB " + nr;
    var zeile = document.createElement("div");
    zeile.className = "knopfzeile";
    var bearbeiten = document.createElement("a");
    bearbeiten.className = "knopf-haupt";
    bearbeiten.href = quelle.getAttribute("data-bearbeiten");
    bearbeiten.textContent = "Bearbeiten";
    var loeschen = document.createElement("a");
    loeschen.className = "knopf-gefahr";
    loeschen.href = quelle.getAttribute("data-loeschen");
    loeschen.textContent = "Löschen";
    loeschen.setAttribute("data-dialog", "");
    var zu = document.createElement("button");
    zu.type = "button";
    zu.className = "knopf";
    zu.textContent = "Abbrechen";
    zu.setAttribute("data-schliessen", "");
    zeile.append(bearbeiten, loeschen, zu);
    box.append(h, zeile);
    FWM.zeigen(box);
  }
  document.addEventListener("contextmenu", function (e) {
    var q = e.target.closest && e.target.closest("[data-ab-menue]");
    if (!q || e.target.closest("input, select, textarea")) return;
    e.preventDefault();
    menue(q);
  });
  document.addEventListener("click", function (e) {
    var k = e.target.closest && e.target.closest("[data-ab-menue-knopf]");
    if (k) menue(k.closest("[data-ab-menue]"));
  });
})();
