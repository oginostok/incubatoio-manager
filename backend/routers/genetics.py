"""
Genetics Router - API endpoints for T006 (Genetica Gallina) and T007 (Genetica Gallo)
"""
from fastapi import APIRouter
from database import (
    get_genetic_config,
    add_genetic_config,
    update_genetic_config,
    delete_genetic_config,
    get_genetic_gallo,
    add_genetic_gallo,
    update_genetic_gallo,
    delete_genetic_gallo
)

router = APIRouter(prefix="/api", tags=["genetics"])

# --- T006: Genetica Gallina ---
@router.get("/genetics")
def list_genetics():
    """Get all genetic gallina entries (T006)."""
    return get_genetic_config()

@router.post("/genetics")
def create_genetic(data: dict):
    """Create a new genetic gallina entry."""
    return add_genetic_config(data)

@router.put("/genetics/{config_id}")
def update_genetic(config_id: int, data: dict):
    """Update a genetic gallina entry (on cell blur)."""
    result = update_genetic_config(config_id, data)
    if result:
        return result
    return {"error": "Not found"}

@router.delete("/genetics/{config_id}")
def delete_genetic(config_id: int):
    """Delete a genetic gallina entry."""
    if delete_genetic_config(config_id):
        return {"success": True}
    return {"error": "Not found"}

# --- T007: Genetica Gallo ---
@router.get("/genetics-gallo")
def list_genetics_gallo():
    """Get all genetic gallo entries (T007)."""
    return get_genetic_gallo()

@router.post("/genetics-gallo")
def create_genetic_gallo(data: dict):
    """Create a new genetic gallo entry."""
    return add_genetic_gallo(data)

@router.put("/genetics-gallo/{config_id}")
def update_genetic_gallo_endpoint(config_id: int, data: dict):
    """Update a genetic gallo entry (on cell blur)."""
    result = update_genetic_gallo(config_id, data)
    if result:
        return result
    return {"error": "Not found"}

@router.delete("/genetics-gallo/{config_id}")
def delete_genetic_gallo_endpoint(config_id: int):
    """Delete a genetic gallo entry."""
    if delete_genetic_gallo(config_id):
        return {"success": True}
    return {"error": "Not found"}

