from django.urls import path

from . import views_regal

urlpatterns = [
    path("regal/", views_regal.regal, name="regal"),
    path("regal/platz/", views_regal.platz_setzen, name="regal_platz"),
    path("regal/teilen/", views_regal.ab_teilen, name="regal_teilen"),
    path("regal/zusammenfuehren/", views_regal.ab_zusammenfuehren, name="regal_zusammen"),
]
