from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from database import (
    get_trading_config,
    add_trading_config,
    update_trading_config,
    delete_trading_config,
    get_trading_data,
    save_trading_data_bulk,
    get_vendita_assegnazioni_for_week,
    replace_assegnazioni_for_vendita,
    find_or_create_vendita,
)
from datetime import date

router = APIRouter(prefix="/api/trading", tags=["trading"])

# Pydantic Models
class TradingConfigCreate(BaseModel):
    tipo: str  # "acquisto" or "vendita"
    azienda: str
    prodotto: str
    razza: str = ""

class TradingConfigUpdate(BaseModel):
    azienda: str
    prodotto: str
    razza: str = ""

class TradingDataUpdate(BaseModel):
    updates: List[dict]  # List of {anno, settimana, azienda, prodotto, razza, quantita}

class AssegnazioneItem(BaseModel):
    allevamento: str
    quantita: int

class AssegnazioniBulkUpdate(BaseModel):
    vendita_id: Optional[int] = None  # preferred path: UI passes the id from dettagli_vendite
    # Fallback identification when vendita_id is unknown (kept for backwards compat):
    anno: Optional[int] = None
    settimana: Optional[int] = None
    prodotto: Optional[str] = None
    azienda: Optional[str] = "Generica"
    razza: Optional[str] = ""
    items: List[AssegnazioneItem]

# Helper function to get current week
def get_current_week():
    today = date.today()
    year, week, _ = today.isocalendar()
    return year, week

# Helper function to generate 52 weeks starting from current week
def generate_52_weeks():
    current_year, current_week = get_current_week()
    weeks = []
    year = current_year
    week = current_week
    
    for _ in range(52):
        weeks.append((year, week))
        week += 1
        if week > 52:
            week = 1
            year += 1
    
    return weeks

# --- CONFIG ENDPOINTS ---

@router.get("/config/{tipo}")
def get_config(tipo: str):
    """Get all active trading configurations for tipo (acquisto/vendita)"""
    try:
        configs = get_trading_config(tipo)
        return [{
            "id": c.id,
            "tipo": c.tipo,
            "azienda": c.azienda,
            "prodotto": c.prodotto,
            "razza": c.razza,
            "active": c.active
        } for c in configs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/config")
def create_config(config: TradingConfigCreate):
    """Create a new trading config (azienda + prodotto + razza)"""
    try:
        add_trading_config(config.tipo, config.azienda, config.prodotto, config.razza)
        return {"status": "success", "message": "Config created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/config/{config_id}")
def update_config(config_id: int, config: TradingConfigUpdate):
    """Update an existing trading config"""
    try:
        update_trading_config(config_id, config.azienda, config.prodotto, config.razza)
        return {"status": "success", "message": "Config updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/config/{config_id}")
def remove_config(config_id: int):
    """Soft delete a trading config"""
    try:
        delete_trading_config(config_id)
        return {"status": "success", "message": "Config deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- DATA ENDPOINTS ---

@router.get("/data/{tipo}")
def get_data(tipo: str):
    """
    Get trading data table for tipo (acquisto/vendita).
    Returns a table with 52 weeks starting from current week.
    Format: {columns: [...], data: [...]}
    """
    try:
        # Get configs
        configs = get_trading_config(tipo)
        
        # Build column headers: ["Periodo", "Azienda1_Prodotto1_Razza1", "Azienda2..."]
        columns = ["Periodo"]
        column_map = {}  # Maps column name to (azienda, prodotto, razza)
        
        for cfg in configs:
            col_name = f"{cfg.azienda}_{cfg.prodotto}_{cfg.razza}"
            columns.append(col_name)
            column_map[col_name] = (cfg.azienda, cfg.prodotto, cfg.razza)
        
        # Get all trading data
        all_data = get_trading_data(tipo)
        
        # Build data map: (anno, settimana, azienda, prodotto, razza) -> quantita
        data_map = {}
        for row in all_data:
            key = (row.anno, row.settimana, row.azienda, row.prodotto, row.razza)
            data_map[key] = row.quantita
        
        # Generate 52 weeks
        weeks = generate_52_weeks()
        
        # Build rows
        rows = []
        for year, week in weeks:
            periodo = f"{year} - {week:02d}"
            row_data = {"Periodo": periodo}
            
            # Add data for each column
            for col_name, (azienda, prodotto, razza) in column_map.items():
                key = (year, week, azienda, prodotto, razza)
                quantity = data_map.get(key, 0)
                row_data[col_name] = quantity
            
            rows.append(row_data)
        
        return {
            "columns": columns,
            "data": rows
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/data/{tipo}")
def update_data(tipo: str, payload: TradingDataUpdate):
    """
    Bulk update trading data.
    Expects: {updates: [{anno, settimana, azienda, prodotto, razza, quantita}, ...]}
    """
    # Reject negative quantities — they were being abused to mark sales in the
    # purchases sheet, which broke per-shed accounting downstream.
    for upd in payload.updates:
        if (upd.get("quantita") or 0) < 0:
            raise HTTPException(
                status_code=400,
                detail="Non sono ammessi valori negativi. Se sono vendite, compilare la tabella sottostante."
            )
    try:
        save_trading_data_bulk(tipo, payload.updates)
        return {"status": "success", "message": f"{len(payload.updates)} records updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- VENDITA → ALLEVAMENTO ASSIGNMENTS ---

@router.get("/vendite/assegnazioni")
def list_assegnazioni(anno: int, settimana: int, prodotto: Optional[str] = None):
    """Returns all sale-shed assignments for the given week, optionally filtered by product."""
    try:
        return get_vendita_assegnazioni_for_week(anno, settimana, prodotto)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/vendite/assegnazioni")
def update_assegnazioni(payload: AssegnazioniBulkUpdate):
    """Replaces (in-toto) the shed allocations for a vendita row.
    Preferred: pass vendita_id (UI already has it from /production/summary).
    Fallback: identify by (anno, settimana, prodotto, azienda, razza) — used
    only by legacy callers; does NOT create new vendita rows anymore (creating
    them silently led to ghost rows that broke the round-trip)."""
    for it in payload.items:
        if it.quantita < 0:
            raise HTTPException(status_code=400, detail="Le quantità delle assegnazioni non possono essere negative.")

    vendita_id = payload.vendita_id
    if vendita_id is None:
        # Fallback lookup. All four key fields are required to disambiguate.
        if not (payload.anno and payload.settimana and payload.prodotto):
            raise HTTPException(status_code=400, detail="Manca vendita_id (oppure anno/settimana/prodotto per ricerca).")
        vendita_id = find_or_create_vendita(
            anno=payload.anno,
            settimana=payload.settimana,
            prodotto=payload.prodotto,
            azienda=payload.azienda or "Generica",
            razza=payload.razza or "",
        )
    try:
        replace_assegnazioni_for_vendita(vendita_id, [it.model_dump() for it in payload.items])
        return {"status": "success", "vendita_id": vendita_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/vendite/assegnazioni/cleanup-ghosts")
def cleanup_ghost_assegnazioni():
    """One-off cleanup: ghost trading_data rows (quantita=0, tipo='vendita')
    were created by an older version of PUT /vendite/assegnazioni when the
    razza key didn't match. Re-points orphan VenditaAssegnazione rows from
    the ghost row onto the real T005 row with same (anno, sett, prodotto,
    azienda) and deletes the ghosts. Safe to run repeatedly."""
    from database import SessionLocal, TradingData, VenditaAssegnazione
    db = SessionLocal()
    try:
        ghosts = (
            db.query(TradingData)
              .filter(TradingData.tipo == "vendita", TradingData.quantita == 0)
              .all()
        )
        moved = 0
        deleted = 0
        for g in ghosts:
            real = (
                db.query(TradingData)
                  .filter(
                      TradingData.tipo == "vendita",
                      TradingData.anno == g.anno,
                      TradingData.settimana == g.settimana,
                      TradingData.prodotto == g.prodotto,
                      TradingData.azienda == g.azienda,
                      TradingData.quantita > 0,
                      TradingData.id != g.id,
                  )
                  .first()
            )
            if real:
                upd = (
                    db.query(VenditaAssegnazione)
                      .filter(VenditaAssegnazione.vendita_id == g.id)
                      .update({"vendita_id": real.id})
                )
                moved += upd
            else:
                db.query(VenditaAssegnazione).filter(VenditaAssegnazione.vendita_id == g.id).delete()
            db.delete(g)
            deleted += 1
        db.commit()
        return {"status": "ok", "ghosts_deleted": deleted, "assegnazioni_moved": moved}
    finally:
        db.close()
