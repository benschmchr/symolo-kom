import pytest


@pytest.fixture(autouse=True)
def _schneller_hasher(settings):
    """Nur im Testlauf: schneller Passwort-Hasher (Tests legen viele Benutzer an). Der Server nutzt weiter die Django-Standards."""
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
