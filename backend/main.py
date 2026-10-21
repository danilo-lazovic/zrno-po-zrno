from fastapi import FastAPI

from core import auth
from modules.igre import router as igre
from modules.napredak import router as napredak
from modules.osoblje import router as osoblje
from modules.sadrzaj import router as sadrzaj
from modules.test import router as test

app = FastAPI(
    title="Zrno po zrno",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
)

app.include_router(auth.router)
app.include_router(sadrzaj.router)
app.include_router(osoblje.router)
app.include_router(napredak.router)
app.include_router(igre.router)
app.include_router(test.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
