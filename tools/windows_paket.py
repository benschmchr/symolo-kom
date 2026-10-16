"""Windows-Testpaket bauen: App + portables Python in einer ZIP-Datei, Start per Doppelklick.

Aufruf (Linux oder Windows, mit installierten requirements.txt):
    python tools/windows_paket.py            -> dist/Bestandsliste-Test.zip

Das Python für Windows kommt als offizielles NuGet-Paket „python“ (Python Software Foundation,
signierte python.exe, keine Installation nötig). Die Bibliotheken aus requirements.txt sind reines
Python und werden für Windows (win_amd64) geladen. Ohne Testbibliotheken.
"""

import hashlib
import io
import os
import shutil
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path

PYTHON_VERSION = "3.12.10"
PYTHON_URL = f"https://api.nuget.org/v3-flatcontainer/python/{PYTHON_VERSION}/python.{PYTHON_VERSION}.nupkg"
PYTHON_SHA256 = "0eb85c2dfccccf1b17352de4c397f69194035b7d37149eacc16f1147d93de3b8"
# Django braucht unter Windows die Zeitzonen-Daten als Paket (Linux hat sie im System)
ZUSATZ = ["tzdata==2025.2"]

WURZEL = Path(__file__).resolve().parent.parent
NAME = "Bestandsliste-Test"
DIST = WURZEL / "dist"
BAU = DIST / NAME
# Teile der App, die das Paket braucht; tests/daten nur für die Beispiel-Kommissionierlisten
APP_TEILE = ["config", "kern", "bestand", "manage.py"]
# Teile von Python, die die App nicht braucht (macht das Paket kleiner)
PYTHON_WEG = [
    "Lib/test",
    "Lib/idlelib",
    "Lib/tkinter",
    "Lib/turtledemo",
    "Lib/ensurepip",
    "tcl",
    "include",
    "libs",
    "Scripts",
    "Lib/venv",
    "Lib/lib2to3",
    "Lib/pydoc_data",
    "Lib/msilib",
    "Lib/site-packages",
    "DLLs/python.cat",
]
# Übersetzungen: nur Deutsch und Englisch behalten (Django liefert über 100 Sprachen mit)
SPRACHEN_BEHALTEN = {"de", "en"}


def python_holen(ziel: Path):
    cache = DIST / f"python.{PYTHON_VERSION}.nupkg"
    if not cache.exists():
        print("Lade Python", PYTHON_VERSION)
        with urllib.request.urlopen(PYTHON_URL) as r:
            cache.write_bytes(r.read())
    daten = cache.read_bytes()
    if hashlib.sha256(daten).hexdigest() != PYTHON_SHA256:
        cache.unlink()
        raise SystemExit("Prüfsumme des Python-Pakets stimmt nicht.")
    with zipfile.ZipFile(io.BytesIO(daten)) as z:
        for info in z.infolist():
            if not info.filename.startswith("tools/") or info.is_dir():
                continue
            rel = info.filename[len("tools/") :]
            if any(rel == w or rel.startswith(w + "/") for w in PYTHON_WEG):
                continue
            pfad = ziel / rel
            pfad.parent.mkdir(parents=True, exist_ok=True)
            pfad.write_bytes(z.read(info))


def anforderungen() -> list:
    """requirements.txt ohne den Testteil."""
    zeilen = []
    for zeile in (WURZEL / "requirements.txt").read_text(encoding="utf-8").splitlines():
        if zeile.strip().startswith("# nur für Tests"):
            break
        zeile = zeile.split("#")[0].strip()
        if zeile:
            zeilen.append(zeile)
    return zeilen + ZUSATZ


def bibliotheken(ziel: Path):
    subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            "--quiet",
            "--no-compile",
            "--target",
            str(ziel),
            "--platform",
            "win_amd64",
            "--python-version",
            "3.12",
            "--implementation",
            "cp",
            "--only-binary=:all:",
            *anforderungen(),
        ],
        check=True,
    )


def uebersetzungen_kuerzen(site: Path):
    for locale in (site / "django").rglob("locale"):
        for sprache in locale.iterdir():
            if sprache.is_dir() and sprache.name.split("_")[0] not in SPRACHEN_BEHALTEN:
                shutil.rmtree(sprache)


def app_kopieren(ziel: Path):
    weg = shutil.ignore_patterns("__pycache__", "*.pyc")
    for teil in APP_TEILE:
        quelle = WURZEL / teil
        if quelle.is_dir():
            shutil.copytree(quelle, ziel / teil, ignore=weg)
        else:
            shutil.copy2(quelle, ziel / teil)
    (ziel / "tests" / "daten").mkdir(parents=True)
    for datei in (WURZEL / "tests" / "daten").glob("*.xlsx"):
        shutil.copy2(datei, ziel / "tests" / "daten" / datei.name)


def statische_dateien(app: Path):
    """CSS, Schrift, Logo einmal beim Bauen sammeln (wie collectstatic auf dem Server)."""
    env = dict(os.environ, KOM_SECRET_KEY="nur-zum-bauen", DJANGO_SETTINGS_MODULE="config.settings")
    env.pop("KOM_DEBUG", None)
    subprocess.run(
        [sys.executable, "manage.py", "collectstatic", "--noinput", "--verbosity", "0"], cwd=app, env=env, check=True
    )


def windows_text(quelle: Path, ziel: Path):
    """Start-Dateien und LIESMICH mit Windows-Zeilenenden."""
    text = quelle.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\n", "\r\n")
    ziel.write_bytes(text.encode("utf-8"))


def main():
    DIST.mkdir(exist_ok=True)
    if BAU.exists():
        shutil.rmtree(BAU)
    programm = BAU / "programm"
    python_holen(programm / "python")
    bibliotheken(programm / "python" / "Lib" / "site-packages")
    uebersetzungen_kuerzen(programm / "python" / "Lib" / "site-packages")
    app_kopieren(programm / "app")
    statische_dateien(programm / "app")
    shutil.copy2(WURZEL / "windows" / "start.py", programm / "start.py")
    for name in ("App starten.bat", "Neu anfangen.bat", "LIESMICH.txt"):
        windows_text(WURZEL / "windows" / name, BAU / name)

    zip_pfad = DIST / f"{NAME}.zip"
    zip_pfad.unlink(missing_ok=True)
    with zipfile.ZipFile(zip_pfad, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for pfad in sorted(BAU.rglob("*")):
            if pfad.is_file():
                z.write(pfad, Path(NAME) / pfad.relative_to(BAU))
    print(f"Fertig: {zip_pfad} ({zip_pfad.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
