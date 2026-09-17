#!/usr/bin/env python3
"""
Genera las fuentes que usa el sitio a partir de los paquetes de Fontsource.

- Fraunces: instancia parcial de la fuente variable con el eje SOFT fijado en 100
  (terminales redondeadas, como pétalos) y el tamaño óptico en 144 (display).
  Queda variable solo en peso (100–900). Pesa un tercio de la versión completa.
- Alegreya, Alegreya Sans SC y Nothing You Could Do: se copian tal cual (solo latín).

Uso:  python3 scripts/fonts.py   (requiere: pip install fonttools brotli)
"""
from pathlib import Path
import shutil
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
NM = ROOT / "node_modules"
OUT = ROOT / "src" / "assets" / "fonts"
OUT.mkdir(parents=True, exist_ok=True)

def instanciar(src: Path, dst: Path, loc: dict):
    font = TTFont(src)
    inst = instancer.instantiateVariableFont(font, loc, inplace=False, updateFontNames=False)
    inst.flavor = "woff2"
    inst.save(dst)
    print(f"{dst.name:44} {dst.stat().st_size/1024:6.1f} KB  (instancia {loc})")

def copiar(src: Path, dst: Path):
    shutil.copyfile(src, dst)
    print(f"{dst.name:44} {dst.stat().st_size/1024:6.1f} KB")

FR = NM / "@fontsource-variable/fraunces/files"
instanciar(FR / "fraunces-latin-full-normal.woff2", OUT / "fraunces-soft-wght.woff2", {"SOFT": 100, "WONK": 1, "opsz": 144})
instanciar(FR / "fraunces-latin-full-italic.woff2", OUT / "fraunces-soft-wght-italic.woff2", {"SOFT": 100, "WONK": 1, "opsz": 144})

AL = NM / "@fontsource/alegreya/files"
copiar(AL / "alegreya-latin-400-normal.woff2", OUT / "alegreya-400.woff2")
copiar(AL / "alegreya-latin-400-italic.woff2", OUT / "alegreya-400-italic.woff2")
copiar(AL / "alegreya-latin-600-normal.woff2", OUT / "alegreya-600.woff2")

SC = NM / "@fontsource/alegreya-sans-sc/files"
copiar(SC / "alegreya-sans-sc-latin-500-normal.woff2", OUT / "alegreya-sans-sc-500.woff2")

NY = NM / "@fontsource/nothing-you-could-do/files"
copiar(NY / "nothing-you-could-do-latin-400-normal.woff2", OUT / "nothing-you-could-do-400.woff2")

# Licencias junto a las fuentes
lic = OUT / "LICENSES.md"
lic.write_text(
    "# Licencias de las tipografías\n\n"
    "Todas las fuentes de esta carpeta se distribuyen bajo la SIL Open Font License 1.1.\n\n"
    "- Fraunces (Undercase Type) — https://github.com/undercasetype/Fraunces — OFL 1.1. "
    "Los archivos `fraunces-soft-*.woff2` son instancias parciales generadas con fontTools "
    "(SOFT=100, opsz=144, WONK=1; eje de peso conservado).\n"
    "- Alegreya y Alegreya Sans SC (Juan Pablo del Peral, Huerta Tipográfica) — "
    "https://github.com/huertatipografica/Alegreya — OFL 1.1.\n"
    "- Nothing You Could Do (Kimberly Geswein) — https://fonts.google.com/specimen/Nothing+You+Could+Do — OFL 1.1.\n\n"
    "Copias de la licencia: https://openfontlicense.org/open-font-license-official-text/\n",
    encoding="utf-8",
)
print("ok")
