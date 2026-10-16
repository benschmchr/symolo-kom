from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("bestand", "0006_arbeitsplaetze_start")]
    operations = [migrations.AddField(model_name="auftrag", name="regal_geteilt", field=models.BooleanField(default=False))]
