"""
Settings Router - Cycle configuration endpoints
"""
from fastapi import APIRouter
from pydantic import BaseModel
from database import get_cycle_settings, update_cycle_settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


class CycleSettingsUpdate(BaseModel):
    eta_inizio_ciclo: int | None = None
    eta_fine_ciclo: int | None = None


@router.get("/cycle")
def get_cycle_settings_endpoint():
    """Returns the current cycle settings."""
    return get_cycle_settings()


@router.put("/cycle")
def update_cycle_settings_endpoint(data: CycleSettingsUpdate):
    """Updates cycle settings."""
    update_data = {}
    if data.eta_inizio_ciclo is not None:
        update_data["eta_inizio_ciclo"] = data.eta_inizio_ciclo
    if data.eta_fine_ciclo is not None:
        update_data["eta_fine_ciclo"] = data.eta_fine_ciclo
    
    return update_cycle_settings(update_data)
