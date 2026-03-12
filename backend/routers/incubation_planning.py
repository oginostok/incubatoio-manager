"""
Router for Incubation Planning API (T017 - Piano Incubazione Settimanale)
Provides weekly egg production totals by breed and manages dynamic
"Conto Incubazione" columns plus per-row Zona Faraone data.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import date
from database import (
    get_incubation_planning_conti,
    add_incubation_planning_conto,
    rename_incubation_planning_conto,
    delete_incubation_planning_conto,
    get_incubation_planning_data,
    update_incubation_planning_data,
    ensure_incubation_planning_conto_default,
)
from services.production_service import ProductionService

router = APIRouter(prefix="/api/incubation-planning", tags=["incubation-planning"])

MAX_INCUBABILE = 387200


class ContoCreate(BaseModel):
    nome: str


class ContoRename(BaseModel):
    nome: str


class PlanningDataUpdate(BaseModel):
    anno: int
    settimana: int
    conto_id: Optional[int] = None  # None = zona faraone
    quantita: int


def get_current_week():
    today = date.today()
    year, week, _ = today.isocalendar()
    return year, week


def normalize_year_week(year: int, week: int):
    while week > 52:
        week -= 52
        year += 1
    while week < 1:
        week += 52
        year -= 1
    return year, week


def generate_weeks(num_weeks: int):
    current_year, current_week = get_current_week()
    weeks = []
    year, week = current_year, current_week
    for _ in range(num_weeks):
        weeks.append((year, week))
        week += 1
        if week > 52:
            week = 1
            year += 1
    return weeks


def get_breed_totals_by_week(product: str) -> dict:
    """Returns {(anno, settimana): total_netto} for a given product."""
    summary = ProductionService.calculate_weekly_summary(product)
    return {(row["anno"], row["settimana"]): row["totale_netto"] for row in summary}


@router.get("/data")
def get_planning_data(
    num_weeks: int = Query(default=52, ge=1, le=104),
):
    """Returns T017 table data: weekly rows with breed totals + planning columns."""
    # All data loading is wrapped in try/except so rows are ALWAYS generated
    # even if DB tables don't exist yet or production service fails.
    try:
        ensure_incubation_planning_conto_default()
    except Exception as e:
        print(f"[T017] ensure_default failed: {e}")

    try:
        granpollo_map = get_breed_totals_by_week("Granpollo")
    except Exception:
        granpollo_map = {}
    try:
        pollo70_map = get_breed_totals_by_week("Pollo70")
    except Exception:
        pollo70_map = {}
    try:
        coloryeald_map = get_breed_totals_by_week("Color Yeald")
    except Exception:
        coloryeald_map = {}
    try:
        ross_map = get_breed_totals_by_week("Ross")
    except Exception:
        ross_map = {}

    try:
        conti = get_incubation_planning_conti()
    except Exception:
        conti = []

    try:
        planning_data = get_incubation_planning_data()
    except Exception:
        planning_data = {}

    # Build rows for current week + num_weeks
    weeks = generate_weeks(num_weeks)
    rows = []
    for anno, settimana in weeks:
        granpollo = granpollo_map.get((anno, settimana), 0)
        pollo70 = pollo70_map.get((anno, settimana), 0)
        coloryeald = coloryeald_map.get((anno, settimana), 0)
        ross = ross_map.get((anno, settimana), 0)

        conto_values = {}
        for c in conti:
            conto_values[c["id"]] = planning_data.get((anno, settimana, c["id"]), 0)

        zona_faraone = planning_data.get((anno, settimana, None), 0)

        somma_incubato = granpollo + pollo70 + coloryeald + ross + \
            sum(conto_values.values()) + zona_faraone

        posti_restanti = MAX_INCUBABILE - somma_incubato
        occupazione = (somma_incubato / MAX_INCUBABILE * 100) if MAX_INCUBABILE > 0 else 0

        rows.append({
            "anno": anno,
            "settimana": settimana,
            "settimana_label": f"{anno}/{settimana:02d}",
            "granpollo": granpollo,
            "pollo70": pollo70,
            "coloryeald": coloryeald,
            "ross": ross,
            "conto_values": conto_values,
            "zona_faraone": zona_faraone,
            "somma_incubato": somma_incubato,
            "posti_restanti": posti_restanti,
            "occupazione": round(occupazione, 1),
        })

    return {
        "conti": conti,
        "rows": rows,
        "max_incubabile": MAX_INCUBABILE,
    }


@router.get("/conti")
def list_conti():
    ensure_incubation_planning_conto_default()
    return get_incubation_planning_conti()


@router.post("/conti")
def create_conto(body: ContoCreate):
    if not body.nome.strip():
        raise HTTPException(status_code=400, detail="Nome non può essere vuoto")
    return add_incubation_planning_conto(body.nome.strip())


@router.put("/conti/{conto_id}")
def update_conto(conto_id: int, body: ContoRename):
    if not body.nome.strip():
        raise HTTPException(status_code=400, detail="Nome non può essere vuoto")
    result = rename_incubation_planning_conto(conto_id, body.nome.strip())
    if not result:
        raise HTTPException(status_code=404, detail="Conto non trovato")
    return result


@router.delete("/conti/{conto_id}")
def remove_conto(conto_id: int):
    success = delete_incubation_planning_conto(conto_id)
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Impossibile eliminare: deve esistere almeno un conto incubazione"
        )
    return {"ok": True}


@router.put("/data")
def save_planning_data(body: PlanningDataUpdate):
    return update_incubation_planning_data(
        anno=body.anno,
        settimana=body.settimana,
        conto_id=body.conto_id,
        quantita=body.quantita,
    )
