"""R-P2 Rollen, W2 (ansehen ohne Anmeldung), W3 (fünf Rollen)."""

import pytest
from django.contrib.auth.models import AnonymousUser, Group, User
from django.core.exceptions import PermissionDenied
from django.http import HttpResponse
from django.test import RequestFactory

from kern.context_processors import MENUE
from kern.rollen import ADMIN, ALLE, KOMMISSIONIERUNG, STAHLBAU, hat_rolle, rolle_noetig, rollen_von

pytestmark = pytest.mark.django_db


def benutzer(name, *rollen, **extra):
    u = User.objects.create_user(name, password="geheim-passwort-123", **extra)
    for r in rollen:
        u.groups.add(Group.objects.get(name=r))
    return u


def test_R_P2_rollen_als_gruppen_angelegt():
    assert set(Group.objects.values_list("name", flat=True)) >= set(ALLE)


@pytest.mark.parametrize("url", ["/"] + [f"/{n}/" for n, _, _ in MENUE])
def test_R_P2_gast_darf_alles_ansehen(client, url):
    assert client.get(url).status_code == 200


def test_R_P2_gast_hat_keine_rolle():
    assert rollen_von(AnonymousUser()) == set()
    assert not hat_rolle(AnonymousUser(), KOMMISSIONIERUNG)


def test_R_P2_rollen_einzeln():
    u = benutzer("lager", KOMMISSIONIERUNG)
    assert rollen_von(u) == {KOMMISSIONIERUNG}
    assert hat_rolle(u, KOMMISSIONIERUNG) and not hat_rolle(u, ADMIN)


def test_R_P2_mehrere_rollen_moeglich():
    assert rollen_von(benutzer("beides", KOMMISSIONIERUNG, STAHLBAU)) == {KOMMISSIONIERUNG, STAHLBAU}


def test_R_P2_admin_darf_alles():
    assert rollen_von(benutzer("chef", ADMIN)) == set(ALLE)
    assert rollen_von(benutzer("super", is_superuser=True)) == set(ALLE)


def test_R_P2_inaktiver_benutzer_hat_keine_rolle():
    assert rollen_von(benutzer("weg", ADMIN, is_active=False)) == set()


def _aufruf(user):
    @rolle_noetig(KOMMISSIONIERUNG)
    def aendern(request):
        return HttpResponse("ok")

    req = RequestFactory().post("/aendern/")
    req.user = user
    return aendern(req)


def test_R_P2_serverpruefung_gast_muss_sich_anmelden():
    antwort = _aufruf(AnonymousUser())
    assert antwort.status_code == 302 and "/anmelden/" in antwort["Location"]


def test_R_P2_serverpruefung_ohne_rolle_verboten():
    with pytest.raises(PermissionDenied):
        _aufruf(benutzer("schweisser", STAHLBAU))


def test_R_P2_serverpruefung_mit_rolle_erlaubt():
    assert _aufruf(benutzer("lager2", KOMMISSIONIERUNG)).status_code == 200


def test_R_P2_verwaltung_nur_fuer_admin(client):
    client.force_login(benutzer("lager3", KOMMISSIONIERUNG))
    assert client.get("/verwaltung/").status_code == 302  # zurück zur Anmeldung
    client.force_login(benutzer("chef2", ADMIN))
    assert client.get("/verwaltung/").status_code == 200
    assert client.get("/verwaltung/auth/user/").status_code == 200


def test_R_P2_konto_zeigt_eigene_rollen(client):
    client.force_login(benutzer("planer", KOMMISSIONIERUNG))
    inhalt = client.get("/konto/").content.decode()
    assert "<strong>Kommissionierung</strong>" in inhalt and "Stahlbau (nicht zugeteilt)" in inhalt
    rollenteil = inhalt.split("Meine Rollen")[1]
    assert "Planung" not in rollenteil


def test_R_P2_konto_knoepfe(client):
    client.force_login(benutzer("kom", KOMMISSIONIERUNG))
    inhalt = client.get("/konto/").content.decode()
    assert "Passwort ändern" in inhalt and "Benutzer und Rollen verwalten" not in inhalt  # nur für Admin
    assert "Änderungsprotokoll" not in inhalt
    assert '<button class="knopf-haupt" type="submit">Abmelden</button>' in inhalt  # rot mit Leuchten
    client.force_login(benutzer("chef9", ADMIN))
    inhalt = client.get("/konto/").content.decode()
    assert "Benutzer und Rollen verwalten" in inhalt and "Änderungsprotokoll" not in inhalt


def test_R_P2_rollen_migration_setzt_alte_rollen_um(db):
    import importlib

    from django.apps import apps
    from django.contrib.auth.models import Group, User

    m = importlib.import_module("kern.migrations.0002_rollen_neu")
    Group.objects.filter(name__in=["Kommissionierung", "Stahlbau"]).delete()
    lager, sw, plan = (Group.objects.create(name=n) for n in ("Lager", "Schweißen", "Planung"))
    u1, u2, u3 = (User.objects.create_user(n) for n in ("a", "b", "c"))
    lager.user_set.add(u1)
    sw.user_set.add(u2)
    plan.user_set.add(u3)
    m.umsetzen(apps, None)
    assert set(Group.objects.values_list("name", flat=True)) >= {"Kommissionierung", "Stahlbau", "Admin"}
    assert not Group.objects.filter(name__in=["Lager", "Schweißen", "Planung"]).exists()
    assert set(Group.objects.get(name="Kommissionierung").user_set.all()) == {u1, u3}
    assert set(Group.objects.get(name="Stahlbau").user_set.all()) == {u2}


def test_R_P2_hilfe_seite_fuer_alle(client):
    r = client.get("/hilfe/")
    html = r.content.decode()
    assert r.status_code == 200 and "b.schumacher@fwmlebach.de" in html
    assert "Probleme und Antworten" in html and "Bei Problemen, Fragen oder Verbesserungsvorschlägen" in html


def test_R_P2_kommissionierung_ersetzt_loescht_stellt_her_stahlbau_forecast(client):
    from .hilfe import LISTE_204, importiere

    a = importiere(LISTE_204)
    client.force_login(benutzer("kom4", KOMMISSIONIERUNG))
    assert client.get(f"/bestandsliste/ab/{a.id}/bearbeiten/").status_code == 200
    assert client.get(f"/bestandsliste/ab/{a.id}/loeschen/").status_code in (200, 302)
    assert client.get("/forecast/import/").status_code == 403
    client.force_login(benutzer("sw4", STAHLBAU))
    assert client.get(f"/bestandsliste/ab/{a.id}/bearbeiten/").status_code == 403
    assert client.get("/forecast/import/").status_code == 200
