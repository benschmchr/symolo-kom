"""Beispieldaten für Vorschau und Tests: die Kommissionierlisten aus tests/daten importieren,
die Mengen aus dem Prüffall 9.1 eintragen und einen erfundenen Beispiel-Forecast laden (Termine ab heute,
damit Rot, Gelb und Weiß zu sehen sind). Nur für Entwicklung und Vorführung, nicht auf dem Server."""

import io
from datetime import timedelta
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from bestand import forecast, importer
from bestand.models import Auftrag, Teil

DATEN = Path(settings.BASE_DIR) / "tests" / "daten"
DATEIEN = [
    "Kommissionierliste_AB2515204.xlsx",
    "Kommissionierliste_AB2616624.xlsx",
    "Kommissionierung_Stahlbau_AB_AB2616048.xlsx",
    "Kommissionierung_Stahlbau_AB_AB2616200_Los_1.xlsx",
]
BG200 = {"SK1990-977452.001.0": 10, "SK1990-977452.004.0": 42, "SK1145-977452.005.0": 50}


class Command(BaseCommand):
    help = "Beispiel-Kommissionierlisten importieren und Mengen wie im Prüffall 9.1 eintragen (nur Entwicklung)."

    def handle(self, *args, **opts):
        if not settings.DEBUG:
            raise CommandError("Nur mit KOM_DEBUG=1 (Entwicklung).")
        for name in DATEIEN:
            g = importer.lesen((DATEN / name).read_bytes(), name)
            a, ersetzt = importer.speichern(g)
            self.stdout.write(f"{a.ab_anzeige}: {'ersetzt' if ersetzt else 'neu'}")
        a = Auftrag.objects.get(ab_schluessel="AB2515204")
        for t in Teil.objects.filter(auftrag=a).select_related("baugruppe"):
            if t.baugruppe.kurz == "100":
                t.vorhanden = t.menge_gesamt
            elif t.baugruppe.kurz == "200" and t.zeichnungsnummer in BG200:
                t.vorhanden = Decimal(BG200[t.zeichnungsnummer])
            else:
                continue
            t.datum_eingelagert, t.datum_komplett = importer.daten_stempeln(
                t.vorhanden, t.menge_gesamt, None, None, importer_heute()
            )
            t.save()
        for t in Teil.objects.filter(auftrag__ab_schluessel="AB2616624"):
            t.vorhanden = t.menge_gesamt
            t.datum_eingelagert, t.datum_komplett = importer.daten_stempeln(
                t.vorhanden, t.menge_gesamt, None, None, importer_heute()
            )
            t.save()
        self.schweissen_beispiel()
        erg = forecast.speichern(forecast.lesen(beispiel_forecast(importer_heute()), BEISPIEL_FORECAST))
        self.stdout.write(erg.meldung)
        self.stdout.write(self.style.SUCCESS("Beispieldaten geladen."))

    def schweissen_beispiel(self):
        """AB2616624 (komplett) liegt im Schweißen, BG 100 von AB2515204 als Einzelblock; dazu Mitarbeiter, Plätze, Termine."""

        from bestand import schweissen
        from bestand.models import Schweisszeile

        if Schweisszeile.objects.exists():
            return
        heute = importer_heute()
        b = Auftrag.objects.get(ab_schluessel="AB2616624", bereich="bestand")
        schweissen.entnehmen(b.id, None, heute)
        a = Auftrag.objects.get(ab_schluessel="AB2515204", bereich="bestand")
        schweissen.entnehmen(a.id, a.baugruppen.get(kurz="100").id, heute)
        ab = Schweisszeile.objects.get(ebene="AB", ab_schluessel="AB2616624")
        schweissen.setzen(ab.id, "mitarbeiter", "Paskal")
        schweissen.setzen(ab.id, "arbeitsplatz", "AP02")
        schweissen.setzen(ab.id, "termin_versand", (heute + timedelta(days=9)).strftime("%d.%m.%Y"))
        bg = Schweisszeile.objects.get(ebene="BG", ab_schluessel="AB2515204")
        schweissen.setzen(bg.id, "mitarbeiter", "Tim")
        schweissen.setzen(bg.id, "arbeitsplatz", "SFM")
        self.stdout.write("Schweißen: AB2616624 und AB2515204_BG100 als Beispiel.")


def importer_heute():
    from django.utils import timezone

    return timezone.localdate()


BEISPIEL_FORECAST = "Beispiel-Forecast (Testdaten).xlsx"


def beispiel_forecast(heute) -> bytes:
    """Kleine Forecast-Liste im Aufbau der „Auftragsübersicht“ (Kopf Zeile 10, „Stand:“ in I3), Termine ab heute.
    Erfunden: AB2515204 in 10 Tagen (rot), AB2616048 in 22 Tagen (gelb), AB2616200 in 45 Tagen (weiß; die schon
    gelieferte Position in 2 Tagen zählt nicht), AB2616624 ist komplett und liegt im Schweißen: er bleibt mit Status „Schweißen“ stehen (W11)."""
    import openpyxl

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Auftragsübersicht"
    ws["C1"] = "Forecast Cockpit Auftragsabwicklung (Beispiel, erfundene Termine)"
    ws["I3"] = f"Stand: {heute:%d.%m.%Y}"
    ws.append([])
    for _ in range(6):
        ws.append([])
    ws.append(
        [
            "Filterhilfe",
            "Auftrag-ID",
            "Auftrag.-Nr",
            "Hauptauftrag",
            "Kunde",
            "Bezeichnung",
            "Best.-M.",
            "Ampel",
            "Liefertermin",
        ]
    )
    t = lambda tage: heute + timedelta(days=tage)
    for z in [
        ["FA", "AB2515204|1", "AB2515204", "AB2515202-01", "Beispielkunde A", "HALTER ANZEIGEGERAET", 21, "Rot", t(10)],
        ["FA", "AB2616048|1", "AB2616048", "AB2515037-01", "Beispielkunde B", "GEHAEUSE, VOLLST.", 6, "Gelb", t(22)],
        [
            "FA",
            "AB2616200|1",
            "AB2616200",
            "AB2616199-01",
            "Beispielkunde C",
            "BATTERIERAHMEN",
            15,
            "bereits geliefert",
            t(2),
        ],
        ["FA", "AB2616200|2", "AB2616200", "AB2616199-01", "Beispielkunde C", "BATTERIERAHMEN", 15, None, t(45)],
        ["HA=FA", "AB2616624|1", "AB2616624", "AB2616624-01", "Beispielkunde D", "ABDECKUNG", 6, "Gelb", t(5)],
        [
            "FA",
            "AB2699001|1",
            "AB2699001",
            "AB2699001-01",
            "Beispielkunde E",
            "NOCH NICHT IN DER BESTANDSLISTE",
            2,
            None,
            t(12),
        ],
        ["FA", "AB2699002|1", "AB2699002", "AB2699002-01", "Beispielkunde E", "OHNE TERMIN", 1, None, None],
    ]:
        ws.append(z)
    for c in ws["I"][10:]:
        c.number_format = "DD.MM.YYYY"
    aus = io.BytesIO()
    wb.save(aus)
    return aus.getvalue()
