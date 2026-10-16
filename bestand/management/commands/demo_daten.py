"""Demo-Daten anlegen oder wieder entfernen (siehe bestand/demo.py). Vorher die Datenbank sichern."""

from django.core.management.base import BaseCommand

from bestand import demo


class Command(BaseCommand):
    help = "Erfundene Demo-ABs (Nummern 2515901 bis 2616999) zusätzlich zu den vorhandenen Daten anlegen; mit --entfernen wieder löschen."

    def add_arguments(self, parser):
        parser.add_argument("--entfernen", action="store_true", help="Genau diese Demo-Daten wieder löschen.")

    def handle(self, *args, **opts):
        if opts["entfernen"]:
            z = demo.entfernen()
            self.stdout.write(
                f"Demo-Daten entfernt: {z['bestandsliste']} ABs aus der Bestandsliste, {z['schweissen']} aus dem "
                f"Schweißen, {z['archiv']} aus dem Archiv, {z['protokoll']} Protokoll-Einträge, "
                f"{z['forecast']} Forecast-Zeilen."
            )
            return
        z = demo.anlegen()
        self.stdout.write(
            f"Demo-Daten angelegt: {z['aktiv']} aktuelle ABs, {z['archiviert']} archivierte, {z['geloescht']} gelöschte, "
            f"{z['forecast']} Forecast-Zeilen, {z['geplant']} Planungs-Häkchen; {z['uebersprungen']} schon vorhanden."
        )
