from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from utils.helpers import seed_database
from routers import production, allevamenti, production_tables_router, trading, genetics, settings, birth_rates, chick_planning, webhook_router, magazzino_uova, incubazioni
import uvicorn

app = FastAPI(title="Incubatoio Manager API")

# CORS Configuration
origins = [
    "http://localhost:5173", # Vite Frontend
    "http://localhost:3000",
    "http://162.55.184.122",  # Production server
    "*"  # Allow all for webhook
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(production.router)
app.include_router(allevamenti.router)
app.include_router(production_tables_router.router)
app.include_router(trading.router)
app.include_router(genetics.router)
app.include_router(settings.router)
app.include_router(birth_rates.router)
app.include_router(chick_planning.router)
app.include_router(webhook_router.router)
app.include_router(magazzino_uova.router)
app.include_router(incubazioni.router)

@app.on_event("startup")
def startup_event():
    print("Startup: Seeding database...")
    seed_database()

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Incubatoio Manager API is running"}

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
