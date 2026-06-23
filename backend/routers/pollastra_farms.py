"""
Router per gli allevamenti pollastra configurabili.
Permette di aggiungere/rinominare/eliminare allevamenti e impostare il numero di capannoni.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import (
    seed_pollastra_farms, get_pollastra_farms,
    add_pollastra_farm, update_pollastra_farm, delete_pollastra_farm,
)

router = APIRouter(prefix="/api/pollastra-farms", tags=["pollastra-farms"])


class FarmCreate(BaseModel):
    nome: str
    n_capannoni: int = 1


class FarmUpdate(BaseModel):
    nome: Optional[str] = None
    n_capannoni: Optional[int] = None


@router.get("")
def list_farms():
    """Allevamenti pollastra + struttura {nome: [1..n]} pronta per il frontend."""
    seed_pollastra_farms()
    farms = get_pollastra_farms()
    structure = {f["nome"]: list(range(1, (f["n_capannoni"] or 1) + 1)) for f in farms}
    return {"farms": farms, "structure": structure}


@router.post("")
def create_farm(data: FarmCreate):
    nome = data.nome.strip()
    if not nome:
        raise HTTPException(status_code=400, detail="Il nome dell'allevamento è obbligatorio")
    result = add_pollastra_farm(nome, data.n_capannoni)
    if result is None:
        raise HTTPException(status_code=400, detail=f"L'allevamento '{nome}' esiste già")
    return {"success": True, "data": result}


@router.put("/{farm_id}")
def edit_farm(farm_id: int, data: FarmUpdate):
    result = update_pollastra_farm(farm_id, data.nome, data.n_capannoni)
    if result is None:
        raise HTTPException(status_code=404, detail="Allevamento non trovato")
    return {"success": True, "data": result}


@router.delete("/{farm_id}")
def remove_farm(farm_id: int):
    if not delete_pollastra_farm(farm_id):
        raise HTTPException(status_code=404, detail="Allevamento non trovato")
    return {"success": True}
