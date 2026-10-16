"""Gebautes Testpaket prüfen: starten wie per Doppelklick, anmelden, Seiten mit Beispieldaten abrufen.

Aufruf:  python tools/windows_paket_pruefen.py <entpackter Paketordner> [python.exe]
Ohne zweites Argument das mitgelieferte Python (nur unter Windows).
"""

import http.cookiejar
import os
import re
import subprocess
import sys
import threading
import time
import urllib.parse
import urllib.request
from pathlib import Path


def main():
    paket = Path(sys.argv[1]).resolve()
    python = sys.argv[2] if len(sys.argv) > 2 else str(paket / "programm" / "python" / "python.exe")
    env = dict(os.environ, KOM_KEIN_BROWSER="1")
    proc = subprocess.Popen(
        [python, "-I", "-X", "utf8", str(paket / "programm" / "start.py")],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        env=env,
        text=True,
        encoding="utf-8",
    )
    adresse = []

    def mitlesen():
        for zeile in proc.stdout:
            print("  |", zeile.rstrip())
            if m := re.search(r"Adresse:\s+(\S+)", zeile):
                adresse.append(m.group(1))

    threading.Thread(target=mitlesen, daemon=True).start()
    try:
        for _ in range(600):
            if adresse or proc.poll() is not None:
                break
            time.sleep(0.2)
        if not adresse:
            raise SystemExit("App ist nicht gestartet.")
        basis = adresse[0]
        oeffner = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

        def holen(pfad, daten=None):
            for _ in range(50):
                try:
                    with oeffner.open(basis + pfad.lstrip("/"), data=daten, timeout=10) as r:
                        return r.status, r.geturl(), r.read().decode("utf-8")
                except urllib.error.URLError as e:
                    if isinstance(e, urllib.error.HTTPError):
                        raise
                    time.sleep(0.2)
            raise SystemExit(f"Keine Antwort von {basis}")

        status, _, html = holen("/anmelden/")
        token = re.search(r'name="csrfmiddlewaretoken" value="([^"]+)"', html).group(1)
        daten = urllib.parse.urlencode(
            {"csrfmiddlewaretoken": token, "username": "test", "password": "Test-Kommission-2026", "next": "/"}
        ).encode()
        status, url, html = holen("/anmelden/", daten)
        assert "/anmelden/" not in url, "Anmeldung mit dem Testkonto fehlgeschlagen"
        assert "Erstellt: Ben Schumacher, 09.10.2026" in html, "Vermerk fehlt"
        status, _, html = holen("/bestandsliste/")
        assert "2515204" in html, "Beispieldaten fehlen in der Bestandsliste"
        for pfad in ("/regal/", "/dashboard/", "/archiv/", "/protokoll/", "/verwaltung/"):
            assert holen(pfad)[0] == 200, pfad
        css = re.search(r'href="(/static/[^"]+\.css)"', html).group(1)
        assert holen(css)[0] == 200, "Stile werden nicht ausgeliefert"
        print("Testpaket in Ordnung:", basis)
    finally:
        proc.terminate()
        proc.wait(timeout=10)


if __name__ == "__main__":
    main()
