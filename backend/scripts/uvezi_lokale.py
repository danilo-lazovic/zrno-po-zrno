"""Preuzima lokale iz Kafeterija Portala (isto što i dugme Admin → Lokali → Preuzmi iz portala).

    python scripts/uvezi_lokale.py [--dry-run]

Treba PORTAL_URL i PORTAL_KLJUC u .env (ključ kp_... admin naloga, Administracija → Ključ za Claude).
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.db import SessionLocal  # noqa: E402
from modules.osoblje import portal  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    try:
        lokali = portal.preuzmi()
    except portal.GreskaPortala as e:
        sys.exit(str(e))
    with SessionLocal() as db:
        rez = portal.uskladi(db, lokali)
        db.rollback() if args.dry_run else db.commit()
    print(f"{'[dry-run] ' if args.dry_run else ''}Lokala u portalu: {rez.ukupno}. "
          f"Novih: {rez.novih}, izmenjenih: {rez.izmenjenih}, zatvorenih: {rez.zatvorenih}.")


if __name__ == "__main__":
    main()
