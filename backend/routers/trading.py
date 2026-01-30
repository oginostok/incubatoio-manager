from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from database import (
    get_trading_config,
    add_trading_config,
    update_trading_config,
    delete_trading_config,
    get_trading_data,
    save_trading_data_bulk
)
from datetime import date

router = APIRouter(prefix="/api/trading", tags=["trading"])

# Pydantic Models
class TradingConfigCreate(BaseModel):
    tipo: str  # "acquisto" or "vendita"
    azienda: str
    prodotto: str

class TradingConfigUpdate(BaseModel):
    azienda: str
    prodotto: str

class TradingDataUpdate(BaseModel):
    updates: List[dict]  # List of {anno, settimana, azienda, prodotto, quantita}

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
            "active": c.active
        } for c in configs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/config")
def create_config(config: TradingConfigCreate):
    """Create a new trading config (azienda + prodotto)"""
    try:
        add_trading_config(config.tipo, config.azienda, config.prodotto)
        return {"status": "success", "message": "Config created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/config/{config_id}")
def update_config(config_id: int, config: TradingConfigUpdate):
    """Update an existing trading config"""
    try:
        update_trading_config(config_id, config.azienda, config.prodotto)
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
        
        # Build column headers: ["Periodo", "Azienda1_Prodotto1", "Azienda2_Prodotto2", ...]
        columns = ["Periodo"]
        column_map = {}  # Maps column name to (azienda, prodotto)
        
        for cfg in configs:
            col_name = f"{cfg.azienda}_{cfg.prodotto}"
            columns.append(col_name)
            column_map[col_name] = (cfg.azienda, cfg.prodotto)
        
        # Get all trading data
        all_data = get_trading_data(tipo)
        
        # Build data map: (anno, settimana, azienda, prodotto) -> quantita
        data_map = {}
        for row in all_data:
            key = (row.anno, row.settimana, row.azienda, row.prodotto)
            data_map[key] = row.quantita
        
        # Generate 52 weeks
        weeks = generate_52_weeks()
        
        # Build rows
        rows = []
        for year, week in weeks:
            periodo = f"{year} - {week:02d}"
            row_data = {"Periodo": periodo}
            
            # Add data for each column
            for col_name, (azienda, prodotto) in column_map.items():
                key = (year, week, azienda, prodotto)
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
    Expects: {updates: [{anno, settimana, azienda, prodotto, quantita}, ...]}
    """
    try:
        save_trading_data_bulk(tipo, payload.updates)
        return {"status": "success", "message": f"{len(payload.updates)} records updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
