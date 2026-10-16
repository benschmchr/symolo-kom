from django.urls import path

from . import views_schweissen as v

urlpatterns = [
    path("schweissen/", v.liste, name="schweissen"),
    path("schweissen/zeile/<int:zeile_id>/eintragen/", v.eintragen, name="sw_eintragen"),
    path("schweissen/zeile/<int:zeile_id>/archivieren/", v.archivieren, name="sw_archivieren"),
    path("schweissen/zeile/<int:zeile_id>/zurueck/", v.zurueck, name="sw_zurueck"),
    path("bestandsliste/ab/<int:auftrag_id>/entnehmen/", v.entnehmen, name="sw_entnehmen_ab"),
    path("bestandsliste/ab/<int:auftrag_id>/bg/<int:bg_id>/entnehmen/", v.entnehmen, name="sw_entnehmen_bg"),
    path("arbeitsplaetze/", v.arbeitsplaetze, name="arbeitsplaetze"),
    path("arbeitsplaetze/platz/", v.platz_setzen, name="ap_platz"),
    path("arbeitsplaetze/mitarbeiter/", v.ap_mitarbeiter, name="ap_mitarbeiter"),
    path("arbeitsplaetze/teilen/", v.ap_teilen, name="ap_teilen"),
    path("arbeitsplaetze/zusammenfuehren/", v.ap_zusammen, name="ap_zusammen"),
    path("schweissen/mitarbeiter/", v.mitarbeiter_verwalten, name="sw_mitarbeiter"),
]
