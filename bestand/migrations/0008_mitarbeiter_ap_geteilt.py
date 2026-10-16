from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("bestand", "0007_regal_geteilt")]
    operations = [
        migrations.AddField(model_name="schweisszeile", name="ap_geteilt", field=models.BooleanField(default=False)),
        migrations.CreateModel(
            name="Mitarbeiter",
            fields=[("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                    ("name", models.CharField(max_length=80, unique=True))],
            options={"verbose_name": "Mitarbeiter", "verbose_name_plural": "Mitarbeiter", "ordering": ["name"]},
        ),
    ]
