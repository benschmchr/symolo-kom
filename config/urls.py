from django.contrib import admin
from django.urls import include, path

admin.site.site_header = "Bestandsliste Kommissionierung – Verwaltung"
admin.site.site_title = "Verwaltung"
admin.site.index_title = "Benutzer und Rollen"

urlpatterns = [
    path("verwaltung/", admin.site.urls),
    path("bestandsliste/", include("bestand.urls")),
    path("dashboard/", include("bestand.urls_dashboard")),
    path("forecast/", include("bestand.urls_forecast")),
    path("planung/", include("bestand.urls_planung")),
    path("statistik/", include("bestand.urls_statistik")),
    path("", include("bestand.urls_regal")),
    path("", include("bestand.urls_schweissen")),
    path("", include("bestand.urls_archiv")),
    path("", include("bestand.urls_suche")),
    path("", include("kern.urls")),
]

handler403 = "kern.views.verboten"
handler404 = "kern.views.nicht_gefunden"
