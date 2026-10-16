"""Sicherheit (Übergabe 7.2): Passwörter gehasht, Abmelden nur per POST, Schlüssel Pflicht auf dem Server."""

import os
import subprocess
import sys
from pathlib import Path

import pytest
from django.conf import settings
from django.contrib.auth.models import User

pytestmark = pytest.mark.django_db


def test_sicherheit_passwort_gehasht(settings):
    from django.conf import global_settings

    # echte Standard-Hasher, nicht der schnelle aus conftest.py
    settings.PASSWORD_HASHERS = global_settings.PASSWORD_HASHERS
    u = User.objects.create_user("x", password="geheim-passwort-123")
    assert u.password.startswith(("pbkdf2_", "argon2", "scrypt")) and "geheim" not in u.password


def test_sicherheit_anmelden_und_abmelden(client):
    User.objects.create_user("lager", password="geheim-passwort-123")
    antwort = client.post("/anmelden/", {"username": "lager", "password": "geheim-passwort-123"})
    assert antwort.status_code == 302
    assert client.get("/abmelden/").status_code == 405  # nur per Knopf (POST)
    assert client.post("/abmelden/").status_code == 302


def test_sicherheit_falsches_passwort(client):
    User.objects.create_user("lager", password="geheim-passwort-123")
    antwort = client.post("/anmelden/", {"username": "lager", "password": "falsch"})
    assert antwort.status_code == 200 and "stimmt nicht" in antwort.content.decode()


def test_sicherheit_grundeinstellungen():
    assert "django.middleware.csrf.CsrfViewMiddleware" in settings.MIDDLEWARE
    assert settings.X_FRAME_OPTIONS == "DENY"
    assert settings.SESSION_COOKIE_HTTPONLY


def test_sicherheit_ohne_schluessel_startet_server_nicht():
    env = {k: v for k, v in os.environ.items() if not k.startswith("KOM_")}
    env["DJANGO_SETTINGS_MODULE"] = "config.settings"
    r = subprocess.run(
        [sys.executable, "-c", "import django; django.setup()"],
        env=env,
        cwd=Path(__file__).resolve().parent.parent,
        capture_output=True,
        text=True,
    )
    assert r.returncode != 0 and "KOM_SECRET_KEY" in r.stderr


def test_sicherheit_excel_dateien_mit_defusedxml_gelesen():
    # Übergabe 7.2: hochgeladene Excel-Dateien nur lesen; XML wird gegen Angriffe abgesichert eingelesen
    from openpyxl.xml import DEFUSEDXML

    assert DEFUSEDXML


def _manage(args, tmp_path, **env_extra):
    env = {k: v for k, v in os.environ.items() if not k.startswith("KOM_")}
    env.update(KOM_DEBUG="1", **env_extra)
    return subprocess.run(
        [sys.executable, "manage.py", *args],
        env=env,
        cwd=Path(__file__).resolve().parent.parent,
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_R_DB1_start_ohne_datenbank_angabe_bricht_ab_und_legt_nichts_an(tmp_path):
    wurzel = Path(__file__).resolve().parent.parent
    vorher = (wurzel / "db.sqlite3").exists()
    r = _manage(["runserver", "--noreload", "127.0.0.1:0"], tmp_path)
    assert r.returncode != 0 and "KOM_DATENBANK fehlt" in r.stderr
    assert (wurzel / "db.sqlite3").exists() == vorher  # keine stille leere Datenbank


def test_R_DB1_runserver_mit_fehlendem_pfad_bricht_ab(tmp_path):
    ziel = tmp_path / "gibt_es_nicht.sqlite3"
    r = _manage(["runserver", "--noreload", "127.0.0.1:0"], tmp_path, KOM_DATENBANK=str(ziel))
    assert r.returncode != 0 and "gibt es nicht" in r.stderr and not ziel.exists()


def test_R_DB1_befehle_ohne_datenbank_laufen_weiter(tmp_path):
    assert _manage(["check"], tmp_path).returncode == 0


def test_R_DB2_sicherung_kopiert_mit_datum_und_behaelt_14(tmp_path):
    import sqlite3
    from datetime import date, timedelta

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
    from sicherung import sichern

    db = tmp_path / "bestand.sqlite3"
    c = sqlite3.connect(db)
    c.execute("create table t (x)")
    c.execute("insert into t values (42)")
    c.commit()
    c.close()
    start = date(2026, 10, 1)
    for i in range(16):
        datei = sichern(db, heute=start + timedelta(days=i))
    kopien = sorted((tmp_path / "sicherung").glob("bestand_*.sqlite3"))
    assert len(kopien) == 14 and kopien[-1] == datei and kopien[0].name == "bestand_2026-10-03.sqlite3"
    assert sqlite3.connect(datei).execute("select x from t").fetchone() == (42,)
    assert db.exists()  # Original unverändert


def test_R_V1_seiten_werden_komprimiert_geliefert(client):
    """R-V1: Die Bestandsliste kommt komprimiert an (viel kleiner), das CSRF-Kennzeichen bleibt enthalten."""
    import gzip

    from kern.rollen import KOMMISSIONIERUNG
    from tests.hilfe import LISTE_204, benutzer, importiere

    importiere(LISTE_204)
    client.force_login(benutzer("lager", KOMMISSIONIERUNG))
    roh = client.get("/bestandsliste/")
    zip_ = client.get("/bestandsliste/", HTTP_ACCEPT_ENCODING="gzip")
    assert roh.status_code == zip_.status_code == 200
    assert zip_["Content-Encoding"] == "gzip"
    assert "Accept-Encoding" in zip_["Vary"]
    assert len(zip_.content) < len(roh.content) / 3
    assert gzip.decompress(zip_.content).count(b"csrfmiddlewaretoken") == roh.content.count(b"csrfmiddlewaretoken")
