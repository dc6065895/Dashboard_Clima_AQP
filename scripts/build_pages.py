#!/usr/bin/env python3
"""Copy the dashboard's browser assets to the Cloudflare Pages output folder."""

from pathlib import Path
import shutil


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "dist"


def main():
    OUTPUT.mkdir(exist_ok=True)
    for name in ("index.html", "app.js", "styles.css"):
        shutil.copy2(ROOT / name, OUTPUT / name)


if __name__ == "__main__":
    main()
