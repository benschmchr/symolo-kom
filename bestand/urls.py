from django.urls import path

from . import views

urlpatterns = [
    path("", views.liste, name="bestandsliste"),
    path("import/", views.import_start, name="bestand_import"),
    path("import/pruefen/", views.import_pruefen, name="bestand_import_pruefen"),
    path("teil/<int:teil_id>/vorhanden/", views.vorhanden, name="bestand_vorhanden"),
    path("teil/<int:teil_id>/umschalten/", views.umschalten, name="bestand_umschalten"),
    path("ab/<int:auftrag_id>/alles/", views.alles_vorhanden, name="bestand_alles"),
    path("ab/<int:auftrag_id>/bearbeiten/", views.ab_bearbeiten, name="bestand_ab_bearbeiten"),
    path("loeschen/", views.ab_loeschen_suchen, name="bestand_loeschen"),
    path("ab/<int:auftrag_id>/loeschen/", views.ab_loeschen, name="bestand_ab_loeschen"),
]
