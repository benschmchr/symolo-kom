from django.db import migrations

# R-AP1 (Reihenfolge = Nummer) und R-AP2 (Lage und Farbe wie die Tafel): Name, Farbe, Spalte, Zeile, Breite, Höhe
START = [
    ("Trumpf", "grau", 1, 1, 2, 1), ("AP05", "blau", 3, 1, 2, 1), ("AP04", "gruen", 5, 1, 2, 1),
    ("AP03", "grau", 7, 1, 2, 1), ("AP02", "gelb", 7, 2, 2, 1), ("AP01", "gelb", 7, 3, 2, 1),
    ("Schweißplatz", "rosa", 7, 4, 2, 1), ("Laser/WIG-Kabine", "grau", 7, 5, 2, 1),
    ("Laser-Kabine", "lila", 7, 6, 2, 1), ("AP06", "lila", 2, 3, 2, 1), ("IPG Laser-Kabine", "orange", 2, 4, 2, 1),
    ("Q.S.", "grau", 1, 2, 1, 4), ("Schleifen / Finish", "gruen", 1, 6, 2, 1),
    ("Dojo Training Raum", "grau", 3, 6, 2, 1), ("SFM", "grau", 5, 6, 2, 1),
]


def anlegen(apps, schema_editor):
    Arbeitsplatz = apps.get_model("bestand", "Arbeitsplatz")
    for nr, (name, farbe, spalte, zeile, breite, hoehe) in enumerate(START, start=1):
        Arbeitsplatz.objects.get_or_create(name=name, defaults=dict(
            reihenfolge=nr, farbe=farbe, spalte=spalte, zeile=zeile, breite=breite, hoehe=hoehe))


class Migration(migrations.Migration):
    dependencies = [("bestand", "0005_schweissen")]
    operations = [migrations.RunPython(anlegen, migrations.RunPython.noop)]
