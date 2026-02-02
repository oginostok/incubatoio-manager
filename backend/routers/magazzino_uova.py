from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_egg_storage, add_egg_storage, update_egg_storage, delete_egg_storage

router = APIRouter(
    prefix="/api/magazzino-uova",
    tags=["magazzino_uova"]
)

# Pydantic models
class EggStorageCreate(BaseModel):
    prodotto: str
    nome: str
    origine: str
    numero: int
    eta: int
    arrivate_il: str

class EggStorageUpdate(BaseModel):
    prodotto: Optional[str] = None
    nome: Optional[str] = None
    origine: Optional[str] = None
    numero: Optional[int] = None
    eta: Optional[int] = None
    arrivate_il: Optional[str] = None


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


@router.delete("/{entry_id}")
def delete_entry(entry_id: int):
    """Deletes an egg storage entry."""
    success = delete_egg_storage(entry_id)
    if success:
        return {"status": "ok", "message": "Entry deleted"}
    raise HTTPException(status_code=404, detail="Entry not found")
