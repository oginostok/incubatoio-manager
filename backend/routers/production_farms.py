"""
Router per gli allevamenti accasamenti configurabili.
Permette di aggiungere/rinominare/eliminare allevamenti e impostare il numero di capannoni,
esattamente come per gli allevamenti pollastra.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import (
    seed_production_farms, get_production_farms,
    add_production_farm, update_production_farm, delete_production_farm,
)

router = APIRouter(prefix="/api/production-farms", tags=["production-farms"])


class FarmCreate(BaseModel):
    nome: str
    n_capannoni: int = 1


class FarmUpdate(BaseModel):
    nome: Optional[str] = None
    n_capannoni: Optional[int] = None


@router.get("")
def list_farms():
    """Allevamenti accasamenti + struttura {nome: [1..n]} pronta per il frontend."""
    seed_production_farms()
    farms = get_production_farms()
    structure = {f["nome"]: list(range(1, (f["n_capannoni"] or 1) + 1)) for f in farms}
    return {"farms": farms, "structure": structure}


@router.post("")
def create_farm(data: FarmCreate):
    nome = data.nome.strip()
    if not nome:
        raise HTTPException(status_code=400, detail="Il nome dell'allevamento è obbligatorio")
    result = add_production_farm(nome, data.n_capannoni)
    if result is None:
        raise HTTPException(status_code=400, detail=f"L'allevamento '{nome}' esiste già")
    return {"success": True, "data": result}


@router.put("/{farm_id}")
def edit_farm(farm_id: int, data: FarmUpdate):
    result = update_production_farm(farm_id, data.nome, data.n_capannoni)
    if result is None:
        raise HTTPException(status_code=404, detail="Allevamento non trovato")
    return {"success": True, "data": result}


@router.delete("/{farm_id}")
def remove_farm(farm_id: int):
    result = delete_production_farm(farm_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Eliminazione non riuscita"))
    return {"success": True}
