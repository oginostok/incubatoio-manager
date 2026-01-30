from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import sys
import os

# Import from backend package
from database import get_lotti, add_lotto, update_lotto, delete_lotto, invalidate_cache_by_lotto, delete_cache_by_lotto

router = APIRouter(
    prefix="/api/allevamenti",
    tags=["allevamenti"]
)

# Pydantic models
class LottoCreate(BaseModel):
    Allevamento: str
    Capannone: str
    Razza: str
    Razza_Gallo: Optional[str] = None
    Prodotto: str
    Capi: int
    Anno_Start: int
    Sett_Start: int
    Data_Fine_Prevista: Optional[str] = None
    Curva_Produzione: Optional[str] = None
    Attivo: bool = True

class LottoUpdate(BaseModel):
    Allevamento: Optional[str] = None
    Capannone: Optional[str] = None
    Razza: Optional[str] = None
    Razza_Gallo: Optional[str] = None
    Prodotto: Optional[str] = None
    Capi: Optional[int] = None
    Anno_Start: Optional[int] = None
    Sett_Start: Optional[int] = None
    Data_Fine_Prevista: Optional[str] = None
    Curva_Produzione: Optional[str] = None
    Attivo: Optional[bool] = None

@router.get("/lotti")
def get_all_lotti():
    """Returns all lotti from database."""
    return get_lotti()

@router.post("/lotti")
def create_lotto(lotto: LottoCreate):
    """Creates a new lotto."""
    add_lotto(lotto.model_dump())
    return {"status": "ok", "message": "Lotto created"}

@router.put("/lotti/{lotto_id}")
def update_lotto_endpoint(lotto_id: int, lotto: LottoUpdate):
    """Updates an existing lotto."""
    # Filter out None values
    updates = {k: v for k, v in lotto.model_dump().items() if v is not None}
    if updates:
        update_lotto(lotto_id, updates)
        # Invalidate cache for this lotto (as per RULES.md)
        invalidate_cache_by_lotto(lotto_id)
    return {"status": "ok", "message": "Lotto updated"}

@router.delete("/lotti/{lotto_id}")
def delete_lotto_endpoint(lotto_id: int):
    """Deletes a lotto."""
    # Delete cache for this lotto (as per RULES.md)
    delete_cache_by_lotto(lotto_id)
    delete_lotto(lotto_id)
    return {"status": "ok", "message": "Lotto deleted"}

@router.get("/lotti/search/{codice}")
def search_lotto_by_code(codice: str):
    """
    Searches for a lotto by ID or user code.
    Accepts formats like: "1", "1TON2025JA87", etc.
    Extracts the numeric ID from the beginning of the code.
    """
    import re
    
    # Extract numeric ID from the beginning of the code
    # Examples: "1" -> 1, "1TON2025JA87" -> 1, "12PAS2025JA57K" -> 12
    match = re.match(r'^(\d+)', codice.strip())
    
    if not match:
        raise HTTPException(status_code=400, detail="Codice non valido. Deve iniziare con un numero.")
    
    lotto_id = int(match.group(1))
    
    # Search in all lotti
    all_lotti = get_lotti()
    
    for lotto in all_lotti:
        if lotto.get("id") == lotto_id:
            return {
                "found": True,
                "lotto": lotto,
                "user_id": f"{lotto_id}{(lotto.get('Allevamento', 'XXX')[:3]).upper()}{lotto.get('Anno_Start', '')}{(lotto.get('Razza', 'N/A').split(' ')[0])}"
            }
    
    raise HTTPException(status_code=404, detail=f"Lotto con ID {lotto_id} non trovato.")

# Farm structure constant (matching Streamlit)
FARM_STRUCTURE = {
    "Cortefranca": [1, 2],
    "Mussano": [1],
    "Passirano": [1, 2, 3],
    "Tarantasca": [1],
    "Tonengo": [1, 2, 3, 4, 5, 6],
    "Villafranca": [1, 2, 3, 4]
}

@router.get("/farms")
def get_farm_structure():
    """Returns the farm structure with shed numbers."""
    return FARM_STRUCTURE

# --- CYCLE WEEKLY DATA ENDPOINTS (Dati Avanzati) ---
from database import (
    get_cycle_weekly_data, 
    add_cycle_weekly_data, 
    update_cycle_weekly_data, 
    delete_cycle_weekly_data,
    calculate_solar_week
)

class WeeklyDataCreate(BaseModel):
    eta_animali: int
    galline_morte: Optional[int] = 0
    galli_morti: Optional[int] = 0
    uova_incubabili: Optional[int] = 0
    uova_seconda: Optional[int] = 0
    tipo_mangime: Optional[str] = ""
    accensione_luce: Optional[str] = ""
    spegnimento_luce: Optional[str] = ""

class WeeklyDataUpdate(BaseModel):
    galline_morte: Optional[int] = None
    galli_morti: Optional[int] = None
    uova_incubabili: Optional[int] = None
    uova_seconda: Optional[int] = None
    tipo_mangime: Optional[str] = None
    accensione_luce: Optional[str] = None
    spegnimento_luce: Optional[str] = None

@router.get("/lotti/{lotto_id}/weekly-data")
def get_lotto_weekly_data(lotto_id: int):
    """Returns all weekly data for a specific lotto."""
    # Get lotto info first
    all_lotti = get_lotti()
    lotto = next((l for l in all_lotti if l.get("id") == lotto_id), None)
    
    if not lotto:
        raise HTTPException(status_code=404, detail="Lotto non trovato")
    
    data = get_cycle_weekly_data(lotto_id)
    return {
        "lotto_id": lotto_id,
        "anno_start": lotto.get("Anno_Start"),
        "sett_start": lotto.get("Sett_Start"),
        "data": data
    }

@router.post("/lotti/{lotto_id}/weekly-data")
def create_lotto_weekly_data(lotto_id: int, data: WeeklyDataCreate):
    """Creates a new weekly data row for a lotto."""
    # Get lotto info for solar week calculation
    all_lotti = get_lotti()
    lotto = next((l for l in all_lotti if l.get("id") == lotto_id), None)
    
    if not lotto:
        raise HTTPException(status_code=404, detail="Lotto non trovato")
    
    # Calculate solar week
    anno, settimana = calculate_solar_week(
        lotto.get("Anno_Start", 2026),
        lotto.get("Sett_Start", 1),
        data.eta_animali
    )
    
    new_data = add_cycle_weekly_data(lotto_id, {
        "eta_animali": data.eta_animali,
        "anno": anno,
        "settimana": settimana,
        "galline_morte": data.galline_morte,
        "galli_morti": data.galli_morti,
        "uova_incubabili": data.uova_incubabili,
        "uova_seconda": data.uova_seconda,
        "tipo_mangime": data.tipo_mangime,
        "accensione_luce": data.accensione_luce,
        "spegnimento_luce": data.spegnimento_luce
    })
    
    return {"status": "ok", "data": new_data}

@router.put("/lotti/{lotto_id}/weekly-data/{data_id}")
def update_lotto_weekly_data(lotto_id: int, data_id: int, data: WeeklyDataUpdate):
    """Updates an existing weekly data row."""
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if updates:
        result = update_cycle_weekly_data(data_id, updates)
        if result:
            return {"status": "ok", "data": result}
    
    raise HTTPException(status_code=404, detail="Dati non trovati")

@router.delete("/lotti/{lotto_id}/weekly-data/{data_id}")
def delete_lotto_weekly_data(lotto_id: int, data_id: int):
    """Deletes a weekly data row."""
    success = delete_cycle_weekly_data(data_id)
    if success:
        return {"status": "ok", "message": "Dati eliminati"}
    raise HTTPException(status_code=404, detail="Dati non trovati")

# --- PRODUCTION CACHE ENDPOINT ---
from database import SessionLocal, ProductionCache

@router.get("/lotti/{lotto_id}/production")
def get_lotto_production(lotto_id: int):
    """Returns production cache data for a specific lotto."""
    db = SessionLocal()
    try:
        # Get all valid cache entries for this lotto
        data = db.query(ProductionCache).filter(
            ProductionCache.lotto_id == lotto_id,
            ProductionCache.valid == True
        ).order_by(ProductionCache.anno, ProductionCache.settimana).all()
        
        return {
            "lotto_id": lotto_id,
            "production": [
                {
                    "anno": d.anno,
                    "settimana": d.settimana,
                    "uova": d.uova,
                    "prodotto": d.prodotto
                }
                for d in data
            ]
        }
    finally:
        db.close()
