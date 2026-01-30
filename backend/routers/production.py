from fastapi import APIRouter, Query
from typing import Optional
from services.production_service import ProductionService

router = APIRouter(
    prefix="/api/production",
    tags=["production"]
)

@router.get("/summary")
def get_weekly_summary(product: Optional[str] = Query(None, description="Filter by product name")):
    """
    Returns the weekly summary of production, purchases, and sales.
    """
    summary = ProductionService.calculate_weekly_summary(product)
    return summary
