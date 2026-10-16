from django.db import migrations

ROLLEN = ["Lager", "Schweißen", "Planung", "Admin"]


def anlegen(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    for name in ROLLEN:
        Group.objects.get_or_create(name=name)


def entfernen(apps, schema_editor):
    apps.get_model("auth", "Group").objects.filter(name__in=ROLLEN).delete()


class Migration(migrations.Migration):
    dependencies = [("auth", "0012_alter_user_first_name_max_length")]

    operations = [migrations.RunPython(anlegen, entfernen)]
