from django.apps import AppConfig
from django.db.models import Q
from django.db.models.signals import post_migrate


def admin_rechte(sender, **kwargs):
    """Rolle Admin darf in der Verwaltung Benutzer und Rollen pflegen."""
    from django.contrib.auth.models import Group, Permission

    admin = Group.objects.filter(name="Admin").first()
    if admin:
        admin.permissions.set(
            Permission.objects.filter(
                Q(content_type__app_label="auth", content_type__model__in=["user", "group"])
                | Q(content_type__app_label="bestand", content_type__model="arbeitsplatz")
            )
        )


class KernConfig(AppConfig):
    name = "kern"
    verbose_name = "Grundfunktionen"

    def ready(self):
        from django.contrib import admin

        from .rollen import darf_verwalten

        # Verwaltung nur für die Rolle Admin, geprüft auf dem Server
        admin.site.has_permission = lambda request: request.user.is_active and darf_verwalten(request.user)
        post_migrate.connect(admin_rechte)  # nach jeder App: die Rechte der Arbeitsplätze entstehen erst mit „bestand“
