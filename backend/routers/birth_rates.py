"""
Router for Birth Rates API (T008 - Tabelle di Nascita, T009 - Nascita Uova in Acquisto)
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import (
    get_birth_rates, update_birth_rate, seed_birth_rates,
    get_purchase_birth_rates, update_purchase_birth_rate, seed_purchase_birth_rates
)

router = APIRouter(prefix="/api/birth-rates", tags=["birth-rates"])


class BirthRateUpdate(BaseModel):
    week: int
    product: str
    rate: float


class PurchaseBirthRateUpdate(BaseModel):
    product: str
    rate: float


@router.get("")
def get_all_birth_rates():
    """Get all birth rates (T008 data)."""
    # Ensure data is seeded before returning
    seed_birth_rates()
    
    rates = get_birth_rates()
    
    # Transform to a more usable format for frontend: {week: {product: rate}}
    result = {}
    for r in rates:
        week = r["week"]
        if week not in result:
            result[week] = {}
        result[week][r["product"]] = r["rate"]
    
    return {"data": result}


@router.put("")
def update_rate(update: BirthRateUpdate):
    """Update a single birth rate value."""
    if update.week < 24 or update.week > 64:
        raise HTTPException(status_code=400, detail="Week must be between 24 and 64")
    
    valid_products = ["granpollo", "pollo70", "colorYeald", "ross"]
    if update.product not in valid_products:
        raise HTTPException(status_code=400, detail=f"Product must be one of: {valid_products}")
    
    if update.rate < 0 or update.rate > 100:
        raise HTTPException(status_code=400, detail="Rate must be between 0 and 100")
    
    result = update_birth_rate(update.week, update.product, update.rate)
    return {"success": True, "data": result}


# --- T009 - Nascita Uova in Acquisto ---
@router.get("/purchase")
def get_all_purchase_birth_rates():
    """Get all purchase birth rates (T009 data)."""
    seed_purchase_birth_rates()
    rates = get_purchase_birth_rates()
    return {"data": rates}


@router.put("/purchase")
def update_purchase_rate(update: PurchaseBirthRateUpdate):
    """Update a single purchase birth rate value."""
    valid_products = ["granpollo", "pollo70", "colorYeald", "ross"]
    if update.product not in valid_products:
        raise HTTPException(status_code=400, detail=f"Product must be one of: {valid_products}")
    
    if update.rate < 0 or update.rate > 100:
        raise HTTPException(status_code=400, detail="Rate must be between 0 and 100")
    
    result = update_purchase_birth_rate(update.product, update.rate)
    return {"success": True, "data": result}
