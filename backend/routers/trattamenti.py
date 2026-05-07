from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_trattamenti, add_trattamento, update_trattamento, delete_trattamento

router = APIRouter(prefix="/api/trattamenti", tags=["trattamenti"])


class TrattamentoCreate(BaseModel):
    lotto_id: int
    nome: str
    data_inizio: str
    data_fine: str
    note: Optional[str] = ""


class TrattamentoUpdate(BaseModel):
    nome: Optional[str] = None
    data_inizio: Optional[str] = None
    data_fine: Optional[str] = None
    note: Optional[str] = None


@router.get("")
def list_trattamenti(lotto_id: int):
    return get_trattamenti(lotto_id)


@router.post("")
def create_trattamento(body: TrattamentoCreate):
    result = add_trattamento(body.model_dump())
    return {"status": "ok", "trattamento": result}


@router.put("/{trattamento_id}")
def update(trattamento_id: int, body: TrattamentoUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    result = update_trattamento(trattamento_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Trattamento non trovato")
    return {"status": "ok", "trattamento": result}


@router.delete("/{trattamento_id}")
def delete(trattamento_id: int):
    ok = delete_trattamento(trattamento_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Trattamento non trovato")
    return {"status": "ok"}
