from django.conf import settings

from .rollen import rollen_von

# Hauptmenü: (URL-Name, Beschriftung, Phase, in der der Bereich gebaut wird)
MENUE = [
    ("bestandsliste", "Bestandsliste", 1),
    ("dashboard", "Dashboard", 3),
    ("regal", "Regal", 2),
    ("forecast", "Forecast", 5),
    ("planung", "Planung", 7),
    ("statistik", "Statistik", 7),
    ("schweissen", "Schweißen", 6),
    ("arbeitsplaetze", "Arbeitsplätze", 6),
    ("archiv", "Archiv", 4),
    ("hilfe", "Hilfe", 8),
]


def app(request):
    return {
        "VERMERK": settings.VERMERK,
        "APP_NAME": settings.APP_NAME,
        "MENUE": MENUE,
        "meine_rollen": sorted(rollen_von(request.user)),
    }
