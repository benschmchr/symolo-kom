// Planungs-Häkchen: speichert sofort, gleicht gleiche ABs auf der Seite ab (PC- und Handy-Ansicht).
(function () {
  var TOKEN = window.FWM.csrf();
  var url = "/planung/haken/";

  document.addEventListener("change", function (e) {
    var kasten = e.target.closest("input[data-plan]");
    if (!kasten) return;
    var schluessel = kasten.getAttribute("data-plan");
    var an = kasten.checked;
    function gleichsetzen(wert) {
      document.querySelectorAll("input[data-plan]").forEach(function (k) {
        if (k.getAttribute("data-plan") === schluessel) k.checked = wert;
      });
    }
    gleichsetzen(an);
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": TOKEN },
      body: JSON.stringify({ schluessel: schluessel, an: an }),
      credentials: "same-origin"
    }).then(function (r) {
      if (!r.ok) throw new Error("fehler");
      // Auf der Seite „Planung“ verschwindet ein abgehakter AB sofort
      if (!an && document.querySelector("[data-planung-seite]")) window.location.reload();
    }).catch(function () {
      gleichsetzen(!an);
      window.alert("Das Häkchen konnte nicht gespeichert werden. Bitte anmelden bzw. die Seite neu laden.");
    });
  });
})();
