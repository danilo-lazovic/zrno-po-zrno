"""Vreme: u bazi UTC, dani (dnevni cilj, niz dana) po Europe/Belgrade."""

from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Europe/Belgrade")

# nivo pređen bez mreže upisuje se kad stigne, ali sa vremenom kada je pređen (dan za niz i dnevni cilj)
_zadato: ContextVar[datetime | None] = ContextVar("zadato_vreme", default=None)


def sada() -> datetime:
    return _zadato.get() or datetime.now(UTC)


def danas() -> date:
    return sada().astimezone(TZ).date()


@contextmanager
def vreme_od(t: datetime) -> Iterator[None]:
    """Sve unutar bloka (sada, danas) vidi zadato vreme."""
    token = _zadato.set(t)
    try:
        yield
    finally:
        _zadato.reset(token)
