"""Start des Windows-Testpakets: Datenbank anlegen, Testkonto und Beispieldaten, App im Browser öffnen.

Läuft mit dem mitgelieferten Python (programm/python) und nur auf diesem PC (127.0.0.1),
nicht im Netzwerk. Gebaut von tools/windows_paket.py. Nur zum Testen, nicht für den Server.
"""

import os
import secrets
import socket
import sys
import threading
import time
import webbrowser
from pathlib import Path

PROGRAMM = Path(__file__).resolve().parent  # <Paket>/programm
PAKET = PROGRAMM.parent
APP = PROGRAMM / "app"
DATEN = PAKET / "daten"

TEST_BENUTZER = "test"
TEST_PASSWORT = "Test-Kommission-2026"
HOST = "127.0.0.1"


def umgebung():
    """Einstellungen wie auf dem Server, aber nur lokal; Schlüssel einmal je Paket erzeugen."""
    DATEN.mkdir(exist_ok=True)
    schluessel = DATEN / "schluessel.txt"
    if not schluessel.exists():
        schluessel.write_text(secrets.token_urlsafe(50), encoding="utf-8")
    os.environ["KOM_SECRET_KEY"] = schluessel.read_text(encoding="utf-8").strip()
    os.environ["KOM_DATENBANK"] = str(DATEN / "bestand.sqlite3")
    os.environ["KOM_HOSTS"] = "127.0.0.1,localhost"
    os.environ.pop("KOM_DEBUG", None)
    os.environ.pop("KOM_HTTPS", None)
    os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"
    sys.path.insert(0, str(APP))


def einrichten():
    """Datenbank auf Stand bringen; beim ersten Start Testkonto und Beispiel-Kommissionierlisten."""
    import django
    from django.core.management import call_command

    django.setup()
    print("Datenbank wird vorbereitet ...")
    call_command("migrate", verbosity=0)

    from django.contrib.auth.models import Group, User

    from kern import rollen

    if not User.objects.filter(username=TEST_BENUTZER).exists():
        u = User.objects.create_user(
            TEST_BENUTZER, password=TEST_PASSWORT, first_name="Test", is_staff=True, is_superuser=True
        )
        u.groups.set(Group.objects.filter(name__in=rollen.ALLE))

    marke = DATEN / "beispieldaten_geladen.txt"
    if not marke.exists():
        from django.test.utils import override_settings

        print("Beispiel-Kommissionierlisten werden geladen ...")
        try:
            with override_settings(DEBUG=True):  # der Befehl ist sonst für den Server gesperrt
                call_command("beispieldaten")
            marke.write_text("ja", encoding="utf-8")
        except Exception as fehler:  # App startet trotzdem, nur ohne Beispiele
            print(f"Beispieldaten konnten nicht geladen werden: {fehler}")


def freier_port(von=8000, bis=8050):
    for port in range(von, bis):
        with socket.socket() as s:
            try:
                s.bind((HOST, port))
                return port
            except OSError:
                continue
    raise SystemExit("Kein freier Port zwischen 8000 und 8050 gefunden.")


def browser_oeffnen(adresse, port):
    for _ in range(100):
        try:
            with socket.create_connection((HOST, port), timeout=0.2):
                break
        except OSError:
            time.sleep(0.1)
    webbrowser.open(adresse)


def main():
    sys.stdout.reconfigure(line_buffering=True)
    umgebung()
    einrichten()
    port = freier_port()
    adresse = f"http://{HOST}:{port}/"
    print()
    print("=" * 64)
    print(" Bestandsliste Kommissionierung - Testpaket")
    print(f" Adresse:     {adresse}")
    print(f" Anmeldung:   Benutzer {TEST_BENUTZER}  /  Passwort {TEST_PASSWORT}")
    print(" Dieses Fenster offen lassen, solange Sie testen.")
    print(" Beenden: dieses Fenster schliessen.")
    print("=" * 64)
    print()
    if os.environ.get("KOM_KEIN_BROWSER") != "1":
        threading.Thread(target=browser_oeffnen, args=(adresse, port), daemon=True).start()

    from waitress import serve

    from config.wsgi import application

    serve(application, host=HOST, port=port, threads=8, _quiet=True)


if __name__ == "__main__":
    main()
