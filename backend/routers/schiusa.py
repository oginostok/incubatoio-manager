from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_schiuse, add_schiusa, update_schiusa, delete_schiusa

router = APIRouter(prefix="/api/schiusa-pulcini", tags=["schiusa"])


class SchiusaCreate(BaseModel):
    incubation_id: int
    trasferimento_id: Optional[int] = None
    batch_id: Optional[int] = None
    data_schiusa: str
    n_pulcini_nati: int
    n_pulcini_seconda_scelta: Optional[int] = 0
    n_uova_trasferite_rif: Optional[int] = 0
    n_uova_incubate: Optional[int] = 0
    destinazione: Optional[str] = ""
    note: Optional[str] = ""


class SchiusaUpdate(BaseModel):
    data_schiusa: Optional[str] = None
    n_pulcini_nati: Optional[int] = None
    n_pulcini_seconda_scelta: Optional[int] = None
    n_uova_trasferite_rif: Optional[int] = None
    destinazione: Optional[str] = None
    note: Optional[str] = None


@router.get("")
def list_schiuse(incubation_id: Optional[int] = None):
    return get_schiuse(incubation_id)


@router.post("")
def create_schiusa(body: SchiusaCreate):
    result = add_schiusa(body.model_dump())
    return {"status": "ok", "schiusa": result}


@router.put("/{schiusa_id}")
def update(schiusa_id: int, body: SchiusaUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    result = update_schiusa(schiusa_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Schiusa non trovata")
    return {"status": "ok", "schiusa": result}


@router.delete("/{schiusa_id}")
def delete(schiusa_id: int):
    ok = delete_schiusa(schiusa_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Schiusa non trovata")
    return {"status": "ok"}
