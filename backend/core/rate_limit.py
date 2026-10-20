import time
from collections import defaultdict, deque
from threading import Lock


class KliznProzor:
    """Brojač neuspelih pokušaja po ključu, u memoriji procesa.

    Dovoljno za jedan uvicorn proces; sa više procesa ili servera treba deljeno skladište (Redis).
    """

    def __init__(self, max_pokusaja: int, prozor_s: int):
        self.max_pokusaja = max_pokusaja
        self.prozor_s = prozor_s
        self._pokusaji: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def _ocisti_stare(self, kljuc: str, sada: float) -> deque[float]:
        # čitanje ne pravi unos: inače svaki isproban email ostaje u memoriji zauvek
        red = self._pokusaji.get(kljuc, deque())
        while red and sada - red[0] > self.prozor_s:
            red.popleft()
        if not red:
            self._pokusaji.pop(kljuc, None)
        return red

    def preostalo_blokade(self, kljuc: str) -> int:
        """Sekunde do sledećeg dozvoljenog pokušaja, 0 ako nije blokiran."""
        with self._lock:
            sada = time.monotonic()
            red = self._ocisti_stare(kljuc, sada)
            if len(red) < self.max_pokusaja:
                return 0
            return max(1, int(self.prozor_s - (sada - red[0])))

    def zabelezi(self, kljuc: str) -> None:
        with self._lock:
            self._pokusaji[kljuc].append(time.monotonic())

    def resetuj(self, kljuc: str) -> None:
        with self._lock:
            self._pokusaji.pop(kljuc, None)
