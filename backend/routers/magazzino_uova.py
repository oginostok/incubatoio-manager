from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_egg_storage, add_egg_storage, update_egg_storage, delete_egg_storage, smaltisci_uova

router = APIRouter(
    prefix="/api/magazzino-uova",
    tags=["magazzino_uova"]
)

# Pydantic models
class EggStorageCreate(BaseModel):
    prodotto: str
    nome: str
    origine: str
    capannone: Optional[str] = ""
    numero: int
    eta: int
    arrivate_il: str
    numero_ddt: Optional[str] = ""

class SmaltimentoCreate(BaseModel):
    quantita: int

class EggStorageUpdate(BaseModel):
    prodotto: Optional[str] = None
    nome: Optional[str] = None
    origine: Optional[str] = None
    capannone: Optional[str] = None
    numero: Optional[int] = None
    eta: Optional[int] = None
    arrivate_il: Optional[str] = None
    numero_ddt: Optional[str] = None


@router.get("")
def get_all_entries():
    """Returns all egg storage entries."""
    return get_egg_storage()


@router.post("")
def create_entry(entry: EggStorageCreate):
    """Creates a new egg storage entry."""
    data = entry.model_dump()
    result = add_egg_storage(data)
    return {"status": "ok", "entry": result}


@router.put("/{entry_id}")
def update_entry(entry_id: int, entry: EggStorageUpdate):
    """Updates an existing egg storage entry."""
    updates = {k: v for k, v in entry.model_dump().items() if v is not None}
    
    if updates:
        result = update_egg_storage(entry_id, updates)
        if result:
            return {"status": "ok", "entry": result}
        raise HTTPException(status_code=404, detail="Entry not found")
    
    return {"status": "ok", "message": "No changes"}


@router.post("/{entry_id}/smaltimento")
def smaltimento_entry(entry_id: int, data: SmaltimentoCreate):
    """Registers egg disposal: deducts from numero, accumulates in smaltite."""
    result, error = smaltisci_uova(entry_id, data.quantita)
    if error == "not_found":
        raise HTTPException(status_code=404, detail="Entry not found")
    if error == "invalid_quantity":
        raise HTTPException(status_code=400, detail="La quantità deve essere maggiore di zero")
    if error == "exceeds_available":
        raise HTTPException(status_code=400, detail="Quantità superiore alle uova disponibili")
    return {"status": "ok", "entry": result}


@router.delete("/{entry_id}")
def delete_entry(entry_id: int):
    """Deletes an egg storage entry."""
    success = delete_egg_storage(entry_id)
    if success:
        return {"status": "ok", "message": "Entry deleted"}
    raise HTTPException(status_code=404, detail="Entry not found")
