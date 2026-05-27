"""
Manual Production Adjustments Router.

Righe manuali inserite dentro al "Dettaglio Vendite" di T002. Ogni riga
incrementa la produzione (e quindi il totale netto) di una settimana
specifica. Tipico utilizzo: integrazione di uova provenienti da fonti
non tracciate dalla curva genetica.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List

from database import SessionLocal, ManualProductionAdjustment

router = APIRouter(prefix="/api/production/manual-adjustments", tags=["manual_adjustments"])


class AdjustmentCreate(BaseModel):
    anno: int
    settimana: int
    prodotto: Optional[str] = ""
    descrizione: Optional[str] = ""
    quantita: int


class AdjustmentUpdate(BaseModel):
    prodotto: Optional[str] = None
    descrizione: Optional[str] = None
    quantita: Optional[int] = None


@router.get("")
def list_adjustments(
    anno: Optional[int] = Query(None),
    settimana: Optional[int] = Query(None),
    prodotto: Optional[str] = Query(None),
) -> List[dict]:
    db = SessionLocal()
    try:
        q = db.query(ManualProductionAdjustment)
        if anno is not None:
            q = q.filter(ManualProductionAdjustment.anno == anno)
        if settimana is not None:
            q = q.filter(ManualProductionAdjustment.settimana == settimana)
        if prodotto:
            q = q.filter(
                (ManualProductionAdjustment.prodotto == prodotto)
                | (ManualProductionAdjustment.prodotto == "")
                | (ManualProductionAdjustment.prodotto.is_(None))
            )
        return [a.to_dict() for a in q.all()]
    finally:
        db.close()


@router.post("")
def create_adjustment(data: AdjustmentCreate):
    if data.quantita == 0:
        raise HTTPException(status_code=400, detail="quantita deve essere diversa da 0")
    db = SessionLocal()
    try:
        row = ManualProductionAdjustment(
            anno=data.anno,
            settimana=data.settimana,
            prodotto=data.prodotto or "",
            descrizione=data.descrizione or "",
            quantita=data.quantita,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row.to_dict()
    finally:
        db.close()


@router.patch("/{adjustment_id}")
def update_adjustment(adjustment_id: int, data: AdjustmentUpdate):
    db = SessionLocal()
    try:
        row = db.query(ManualProductionAdjustment).filter(
            ManualProductionAdjustment.id == adjustment_id
        ).first()
        if not row:
            raise HTTPException(status_code=404, detail="Adjustment not found")

        if data.prodotto is not None:
            row.prodotto = data.prodotto
        if data.descrizione is not None:
            row.descrizione = data.descrizione
        if data.quantita is not None:
            if data.quantita == 0:
                raise HTTPException(status_code=400, detail="quantita deve essere diversa da 0")
            row.quantita = data.quantita

        db.commit()
        db.refresh(row)
        return row.to_dict()
    finally:
        db.close()


@router.delete("/{adjustment_id}")
def delete_adjustment(adjustment_id: int):
    db = SessionLocal()
    try:
        row = db.query(ManualProductionAdjustment).filter(
            ManualProductionAdjustment.id == adjustment_id
        ).first()
        if not row:
            raise HTTPException(status_code=404, detail="Adjustment not found")
        db.delete(row)
        db.commit()
        return {"message": "Adjustment deleted successfully"}
    finally:
        db.close()
