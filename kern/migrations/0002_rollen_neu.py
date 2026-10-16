"""Rollen neu (Ben, 15.10.2026): Lager → Kommissionierung, Schweißen → Stahlbau, Planung entfällt.

Benutzer der Rolle Planung bekommen Kommissionierung (sie importierten ABs und archivierten).
"""

from django.db import migrations


def umsetzen(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    for alt, neu in (("Lager", "Kommissionierung"), ("Schweißen", "Stahlbau")):
        a = Group.objects.filter(name=alt).first()
        n = Group.objects.filter(name=neu).first()
        if a and not n:
            a.name = neu
            a.save()
        elif a and n:
            n.user_set.add(*a.user_set.all())
            a.delete()
        elif not n:
            Group.objects.create(name=neu)
    kom = Group.objects.get(name="Kommissionierung")
    planung = Group.objects.filter(name="Planung").first()
    if planung:
        kom.user_set.add(*planung.user_set.all())
        planung.delete()


def zurueck(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    for neu, alt in (("Kommissionierung", "Lager"), ("Stahlbau", "Schweißen")):
        Group.objects.filter(name=neu).update(name=alt)
    Group.objects.get_or_create(name="Planung")


class Migration(migrations.Migration):
    dependencies = [("kern", "0001_rollen")]

    operations = [migrations.RunPython(umsetzen, zurueck)]
