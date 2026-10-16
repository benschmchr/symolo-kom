// Auf- und Zuklappen in Listen: AB-Karte (alle Zeilen darunter) und Baugruppe (ihre Teile)
// Klick auf die AB-Nummer wirkt wie der Pfeil davor (Ben, 14.10.2026)
document.addEventListener("click", function (e) {
  var k = e.target.closest("[data-klapp]");
  var ref = e.target.closest("[data-klapp-ref]");
  if (ref) k = ref.closest("tr").querySelector('[data-klapp="' + ref.getAttribute("data-klapp-ref") + '"]');
  if (!k) return;
  var offen = k.getAttribute("aria-expanded") !== "false";
  k.setAttribute("aria-expanded", offen ? "false" : "true");
  var karte = k.closest(".ab-block");
  var ziel = k.getAttribute("data-klapp");
  karte.querySelectorAll(ziel === "ab" ? "tr.unter" : 'tr[data-bg="' + ziel + '"]').forEach(function (z) {
    z.hidden = offen;
    if (!offen && ziel === "ab" && z.classList.contains("teil")) {
      var bg = karte.querySelector('[data-klapp="' + z.getAttribute("data-bg") + '"]');
      if (bg && bg.getAttribute("aria-expanded") === "false") z.hidden = true;
    }
  });
});
