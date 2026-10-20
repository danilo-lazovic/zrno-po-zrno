"""Vreme: u bazi UTC, dani (dnevni cilj, niz dana) po Europe/Belgrade."""

from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Europe/Belgrade")


def sada() -> datetime:
    return datetime.now(UTC)


def danas() -> date:
    return sada().astimezone(TZ).date()
