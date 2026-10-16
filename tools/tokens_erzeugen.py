"""Erzeugt kern/static/kern/design/tokens.css aus design/tokens.json (FWM-Designsystem).

Aufruf:  python tools/tokens_erzeugen.py
Update des Designsystems = design/tokens.json tauschen und dieses Skript neu laufen lassen.
Der Test tests/test_design.py prüft, dass die CSS-Datei zum JSON passt.
"""

import json
import re
from pathlib import Path

BASIS = Path(__file__).resolve().parent.parent
QUELLE = BASIS / "design" / "tokens.json"
ZIEL = BASIS / "kern" / "static" / "kern" / "design" / "tokens.css"


def _wert(v):
    # "{glow-red}" verweist auf einen anderen Token
    if isinstance(v, str):
        return re.sub(r"\{([a-z0-9-]+)\}", r"var(--\1)", v)
    return str(v)


def css_erzeugen(tokens: dict) -> str:
    themen, gemeinsam, je_thema = variablen(tokens)
    zeilen = [
        f"/* {tokens['name']} – automatisch erzeugt aus design/tokens.json "
        f"(Version {tokens['version']}) mit tools/tokens_erzeugen.py. Nicht von Hand ändern. */",
        ":root {",
        *gemeinsam,
        "}",
    ]
    # Grundwert wie im Designsystem: dark; Arbeitsseiten setzen data-theme="light"
    erstes = themen[0]
    zeilen += [f':root, [data-theme="{erstes}"] {{', *je_thema[erstes], "}"]
    for t in themen[1:]:
        zeilen += [f'[data-theme="{t}"] {{', *je_thema[t], "}"]
    return "\n".join(zeilen) + "\n"


def variablen(tokens: dict):
    """Alle CSS-Variablen als Zeilen „  --name: wert;“: (Themen, gemeinsame Zeilen, Zeilen je Thema).
    Wird auch von tools/symolo_bauen.py benutzt (Variablen innerhalb der Ansicht statt auf :root)."""
    themen = [t["id"] for t in tokens["color"]["themes"]]
    je_thema = {t: [] for t in themen}
    gemeinsam = []

    def thematisch(name, value):
        if isinstance(value, dict):
            for t in themen:
                je_thema[t].append(f"  --{name}: {_wert(value[t])};")
        else:
            gemeinsam.append(f"  --{name}: {_wert(value)};")

    for t in tokens["color"]["tokens"]:
        thematisch(t["name"], t["value"])
    for t in tokens["shadow"]["tokens"]:
        thematisch(t["name"], t["value"])
    for gruppe in ("spacing", "radius", "blur"):
        for t in tokens[gruppe]["tokens"]:
            gemeinsam.append(f"  --{t['name']}: {t['value']};")
    for name, fam in tokens["type"]["families"].items():
        gemeinsam.append(f"  --font-{name}: {fam};")
    for g in tokens["type"]["groups"]:
        for s in g["styles"]:
            n = s["name"]
            gemeinsam.append(f"  --fs-{n}: {s['fontSize']};")
            gemeinsam.append(f"  --lh-{n}: {s['lineHeight']};")
            gemeinsam.append(f"  --fw-{n}: {s['fontWeight']};")
            if "letterSpacing" in s:
                gemeinsam.append(f"  --ls-{n}: {s['letterSpacing']};")
    return themen, gemeinsam, je_thema


def main():
    tokens = json.loads(QUELLE.read_text(encoding="utf-8"))
    ZIEL.parent.mkdir(parents=True, exist_ok=True)
    ZIEL.write_text(css_erzeugen(tokens), encoding="utf-8")
    print(f"geschrieben: {ZIEL.relative_to(BASIS)}")


if __name__ == "__main__":
    main()
