"""Rollen (R-P2, Entscheidungen W2 und W3, neu geordnet am 15.10.2026).

Gast            = nicht angemeldet, im Firmennetz: alles ansehen, suchen, filtern (W2 = Ja)
Kommissionierung = Vorhanden eintragen, Lagerort setzen, ABs importieren, ersetzen, löschen und archivieren,
                  Archiv wiederherstellen, Häkchen in der Planung
Stahlbau        = Mitarbeiter ändern, Arbeitsplätze und Termine im Schweißen eintragen, Hallenplan bearbeiten,
                  ABs aus der Bestandsliste übernehmen und zurückholen, Forecast importieren, Häkchen in der Planung
Admin           = alles, dazu Benutzer und Rollen, Einstellungen, Änderungsprotokoll

Die frühere Rolle „Planung“ entfällt (migrations/0002_rollen_neu.py).
Jede Rolle ist eine Django-Gruppe (angelegt in migrations/0001_rollen.py).
Geprüft wird immer auf dem Server (rolle_noetig), nie nur im Browser.
"""

from functools import wraps

from django.contrib.auth.views import redirect_to_login
from django.core.exceptions import PermissionDenied

KOMMISSIONIERUNG = "Kommissionierung"
STAHLBAU = "Stahlbau"
ADMIN = "Admin"
ALLE = (KOMMISSIONIERUNG, STAHLBAU, ADMIN)

BESCHREIBUNG = {
    KOMMISSIONIERUNG: "Vorhanden eintragen, Lagerort setzen, ABs importieren, ersetzen, löschen und archivieren, Archiv wiederherstellen",
    STAHLBAU: "Mitarbeiter ändern, Arbeitsplätze und Termine eintragen, Hallenplan bearbeiten, ABs übernehmen und zurückholen, Forecast",
    ADMIN: "Benutzer und Rollen, Einstellungen (darf alles)",
}


def rollen_von(user) -> set:
    """Rollen eines Benutzers; Gäste haben keine."""
    if not getattr(user, "is_authenticated", False) or not user.is_active:
        return set()
    if user.is_superuser:
        return set(ALLE)
    namen = set(user.groups.values_list("name", flat=True)) & set(ALLE)
    if ADMIN in namen:
        return set(ALLE)
    return namen


def hat_rolle(user, *rollen) -> bool:
    """True, wenn der Benutzer mindestens eine der Rollen hat."""
    return bool(rollen_von(user) & set(rollen))


def darf_verwalten(user) -> bool:
    return hat_rolle(user, ADMIN)


def rolle_noetig(*rollen):
    """Für Ansichten, die etwas ändern: Gast → Anmeldung, angemeldet ohne Rolle → 403."""

    def deko(view):
        @wraps(view)
        def innen(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return redirect_to_login(request.get_full_path())
            if not hat_rolle(request.user, *rollen):
                raise PermissionDenied("Dafür fehlt die Rolle: " + " oder ".join(rollen))
            return view(request, *args, **kwargs)

        innen.rollen = rollen
        return innen

    return deko
