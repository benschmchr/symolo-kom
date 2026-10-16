"""Gemeinsame Hilfen für die Tests."""

from datetime import date
from pathlib import Path

from django.contrib.auth.models import Group, User

DATEN = Path(__file__).resolve().parent / "daten"
LISTE_204 = DATEN / "Kommissionierliste_AB2515204.xlsx"
LISTE_624 = DATEN / "Kommissionierliste_AB2616624.xlsx"
LISTE_048 = DATEN / "Kommissionierung_Stahlbau_AB_AB2616048.xlsx"
LISTE_LOS = DATEN / "Kommissionierung_Stahlbau_AB_AB2616200_Los_1.xlsx"
HEUTE = date(2026, 10, 14)


def benutzer(name, *rollen, **extra):
    u = User.objects.create_user(name, password="geheim-passwort-123", **extra)
    for r in rollen:
        u.groups.add(Group.objects.get(name=r))
    return u


def importiere(pfad, heute=HEUTE, **kw):
    from bestand import importer

    if isinstance(pfad, bytes):  # selbst gebaute Datei (tests/test_import.py)
        g = importer.lesen(pfad, "test.xlsx")
    else:
        g = importer.lesen(Path(pfad).read_bytes(), Path(pfad).name)
    return importer.speichern(g, heute=heute, **kw)[0]
