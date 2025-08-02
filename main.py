from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

app.mount("/app", StaticFiles(directory="app"), name="app")
@app.get("/")
def root():
    return RedirectResponse(url="/app/index.html", status_code=301)