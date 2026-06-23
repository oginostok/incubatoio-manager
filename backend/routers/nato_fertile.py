"""
Router per la tabella Media Nato su Fertile (T018).
Matrice editabile: righe = ALLEVAMENTO, colonne = TIPO, valore = media nato/fertile (%).
Dati di default calcolati dallo storico (DATI NATO SU FERTILE), poi modificabili a mano.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import (
    seed_nato_fertile, get_nato_fertile, update_nato_fertile,
    get_nato_sf_overrides, update_nato_sf_override,
)

router = APIRouter(prefix="/api/nato-fertile", tags=["nato-fertile"])


class CellUpdate(BaseModel):
    allevamento: str
    tipo: str
    valore: Optional[float] = None  # None/omesso => svuota la cella


class BatchOverrideUpdate(BaseModel):
    batch_id: int
    valore: Optional[float] = None  # None => ripristina default matrice


@router.get("")
def get_matrix():
    """Restituisce la matrice nato/fertile (celle + assi ordinati)."""
    seed_nato_fertile()  # seed lazy alla prima lettura
    return get_nato_fertile()


@router.put("")
def update_cell(update: CellUpdate):
    """Aggiorna una singola cella (salvataggio on-blur dal frontend)."""
    allevamento = update.allevamento.strip().upper()
    tipo = update.tipo.strip().upper()
    if not allevamento or not tipo:
        raise HTTPException(status_code=400, detail="Allevamento e tipo sono obbligatori")
    if update.valore is not None and (update.valore < 0 or update.valore > 150):
        raise HTTPException(status_code=400, detail="Il valore deve essere tra 0 e 150")
    result = update_nato_fertile(allevamento, tipo, update.valore)
    return {"success": True, "data": result}


@router.get("/batch-overrides")
def get_batch_overrides():
    """Override Nato SF per partita trasferita: { batch_id: valore }."""
    return {"data": get_nato_sf_overrides()}


@router.put("/batch-override")
def update_batch_override(update: BatchOverrideUpdate):
    """Salva (o ripristina) il Nato SF previsto di una partita trasferita."""
    if update.valore is not None and (update.valore < 0 or update.valore > 150):
        raise HTTPException(status_code=400, detail="Il valore deve essere tra 0 e 150")
    result = update_nato_sf_override(update.batch_id, update.valore)
    return {"success": True, "data": result}
