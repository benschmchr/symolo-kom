// Import: Dateien per Ziehen & Ablegen auswählen (R-I1)
(function () {
  var ablage = document.getElementById("ablage"), feld = document.getElementById("dateien"), liste = document.getElementById("dateiliste");
  if (!ablage || !feld) return;
  function zeigen() {
    liste.innerHTML = "";
    Array.prototype.forEach.call(feld.files, function (f) {
      var li = document.createElement("li");
      li.textContent = f.name;
      liste.appendChild(li);
    });
  }
  ["dragenter", "dragover"].forEach(function (n) {
    ablage.addEventListener(n, function (e) { e.preventDefault(); ablage.classList.add("drueber"); });
  });
  ["dragleave", "drop"].forEach(function (n) {
    ablage.addEventListener(n, function (e) { e.preventDefault(); ablage.classList.remove("drueber"); });
  });
  ablage.addEventListener("drop", function (e) { feld.files = e.dataTransfer.files; zeigen(); });
  feld.addEventListener("change", zeigen);
})();
