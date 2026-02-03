"""
Settings Router - Cycle configuration endpoints
"""
from fastapi import APIRouter
from pydantic import BaseModel
from database import get_cycle_settings, update_cycle_settings, get_planning_table_setting, update_planning_table_setting

router = APIRouter(prefix="/api/settings", tags=["settings"])


class CycleSettingsUpdate(BaseModel):
    eta_inizio_ciclo: int | None = None
    eta_fine_ciclo: int | None = None


class PlanningTableSettingsUpdate(BaseModel):
    show_sex_split: bool


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


@router.get("/planning-table/{table_id}")
def get_planning_table_setting_endpoint(table_id: str):
    """Returns settings for a planning table (T010, T011, T012, T013)."""
    return get_planning_table_setting(table_id)


@router.put("/planning-table/{table_id}")
def update_planning_table_setting_endpoint(table_id: str, data: PlanningTableSettingsUpdate):
    """Updates settings for a planning table."""
    return update_planning_table_setting(table_id, data.show_sex_split)

