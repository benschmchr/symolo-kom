// Dashboard: Filter sofort anwenden (R-DB2) und Auf-/Zuklappen je Benutzer merken (R-DB4).
// Das Klappen selbst macht klappen.js (PC) bzw. <details> (Handy); hier wird nur der neue Zustand gespeichert.
(function () {
  var TOKEN = window.FWM.csrf();

  function merken(liste, schluessel, offen) {
    if (!liste || !schluessel) return;
    fetch(liste.getAttribute("data-url"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": TOKEN },
      body: JSON.stringify({ ansicht: liste.getAttribute("data-ansicht"), schluessel: schluessel, offen: offen }),
      credentials: "same-origin"
    }).catch(function () { /* nur Komfort: ohne Speichern weiterarbeiten */ });
  }

  // PC: Pfeil oder Name (AB-Nummer, Baugruppe) angeklickt; klappen.js hat aria-expanded schon umgestellt
  document.addEventListener("click", function (e) {
    var liste = e.target.closest("#dash-karten");
    if (!liste) return;
    var k = e.target.closest("[data-klapp]");
    var ref = e.target.closest("[data-klapp-ref]");
    if (ref) k = ref.closest("tr").querySelector('[data-klapp="' + ref.getAttribute("data-klapp-ref") + '"]');
    if (!k) return;
    setTimeout(function () {
      merken(liste, k.getAttribute("data-zustand"), k.getAttribute("aria-expanded") !== "false");
    }, 0);
  });

  // Handy: eine Karte oder Baugruppe auf-/zugetippt (nur echte Klicks, nicht das Öffnen beim Laden)
  document.addEventListener("click", function (e) {
    var s = e.target.closest(".dash-handy summary");
    if (!s) return;
    var d = s.parentElement;
    setTimeout(function () { merken(d.closest(".dash-handy"), d.getAttribute("data-zustand"), d.open); }, 0);
  });

  // Ansicht und Kunde: sofort anwenden
  var form = document.getElementById("dash-filter");
  if (form) {
    form.addEventListener("change", function (e) {
      if (e.target.hasAttribute("data-filter")) form.submit();
    });
  }
})();
