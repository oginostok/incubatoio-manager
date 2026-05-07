from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_pesi, add_peso, update_peso, delete_peso

router = APIRouter(prefix="/api/pesi", tags=["pesi"])


class PesoCreate(BaseModel):
    lotto_id: int
    settimana: int
    anno: int
    peso_medio_g: float
    n_capi: Optional[int] = 0
    note: Optional[str] = ""


class PesoUpdate(BaseModel):
    settimana: Optional[int] = None
    anno: Optional[int] = None
    peso_medio_g: Optional[float] = None
    n_capi: Optional[int] = None
    note: Optional[str] = None


@router.get("")
def list_pesi(lotto_id: int):
    return get_pesi(lotto_id)


@router.post("")
def create_peso(body: PesoCreate):
    result = add_peso(body.model_dump())
    return {"status": "ok", "peso": result}


@router.put("/{peso_id}")
def update(peso_id: int, body: PesoUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    result = update_peso(peso_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Peso non trovato")
    return {"status": "ok", "peso": result}


@router.delete("/{peso_id}")
def delete(peso_id: int):
    ok = delete_peso(peso_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Peso non trovato")
    return {"status": "ok"}
