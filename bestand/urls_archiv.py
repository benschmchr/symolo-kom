from django.urls import path

from . import views_archiv as v

urlpatterns = [
    path("archiv/", v.liste, name="archiv"),
    path("archiv/<int:vorgang_id>/", v.ab, name="archiv_ab"),
    path("archiv/<int:vorgang_id>/wiederherstellen/", v.wiederherstellen, name="archiv_wiederherstellen"),
    path("protokoll/", v.protokoll_liste, name="protokoll"),
    path("protokoll/einstellen/", v.protokoll_einstellen, name="protokoll_einstellen"),
    path("protokoll/leeren/", v.protokoll_leeren, name="protokoll_leeren"),
]
