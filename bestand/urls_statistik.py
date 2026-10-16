from django.urls import path

from . import views_statistik

urlpatterns = [path("", views_statistik.statistik_seite, name="statistik")]
