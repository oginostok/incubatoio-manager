from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_trasferimenti, add_trasferimento, update_trasferimento, delete_trasferimento

router = APIRouter(prefix="/api/trasferimenti-incubazione", tags=["trasferimento"])


class TrasferimentoCreate(BaseModel):
    incubation_id: int
    batch_id: Optional[int] = None
    data_trasferimento: str
    n_uova_trasferite: int
    n_uova_scartate: Optional[int] = 0
    incubatrice_origine: Optional[str] = ""
    chioccia_destinazione: Optional[str] = ""
    note: Optional[str] = ""


class TrasferimentoUpdate(BaseModel):
    data_trasferimento: Optional[str] = None
    n_uova_trasferite: Optional[int] = None
    n_uova_scartate: Optional[int] = None
    incubatrice_origine: Optional[str] = None
    chioccia_destinazione: Optional[str] = None
    note: Optional[str] = None


@router.get("")
def list_trasferimenti(incubation_id: Optional[int] = None):
    return get_trasferimenti(incubation_id)


@router.post("")
def create_trasferimento(body: TrasferimentoCreate):
    result = add_trasferimento(body.model_dump())
    return {"status": "ok", "trasferimento": result}


@router.put("/{trasferimento_id}")
def update(trasferimento_id: int, body: TrasferimentoUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    result = update_trasferimento(trasferimento_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Trasferimento non trovato")
    return {"status": "ok", "trasferimento": result}


@router.delete("/{trasferimento_id}")
def delete(trasferimento_id: int):
    ok = delete_trasferimento(trasferimento_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Trasferimento non trovato")
    return {"status": "ok"}
