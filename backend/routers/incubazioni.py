"""
Incubazioni Router - API endpoints for egg incubation management (T016)
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from database import SessionLocal, Incubation, IncubationBatch, EggStorage

router = APIRouter(prefix="/api/incubazioni", tags=["incubazioni"])


# --- Pydantic Models ---
class IncubationCreate(BaseModel):
    data_incubazione: str  # YYYY-MM-DD
    pre_incubazione_ore: Optional[int] = 0
    partenza_macchine: Optional[str] = None
    operatore: Optional[str] = None
    incubatrici: Optional[str] = None  # Comma-separated: "1,3,5"
    richiesta_granpollo: Optional[int] = 0
    richiesta_pollo70: Optional[int] = 0
    richiesta_color_yeald: Optional[int] = 0
    richiesta_ross: Optional[int] = 0


class IncubationUpdate(BaseModel):
    data_incubazione: Optional[str] = None
    pre_incubazione_ore: Optional[int] = None
    partenza_macchine: Optional[str] = None
    operatore: Optional[str] = None
    incubatrici: Optional[str] = None
    richiesta_granpollo: Optional[int] = None
    richiesta_pollo70: Optional[int] = None
    richiesta_color_yeald: Optional[int] = None
    richiesta_ross: Optional[int] = None
    stato: Optional[str] = None


class BatchCreate(BaseModel):
    egg_storage_id: int
    prodotto: str
    nome: str
    origine: str
    uova_partita: int
    eta: int
    quantita: Optional[int] = 0  # Deprecated, kept for compatibility


class BatchUpdate(BaseModel):
    uova_utilizzate: Optional[int] = None
    storico_override: Optional[float] = None


# --- Helper Functions ---
def calculate_schiusa_date(data_incubazione: str) -> str:
    """Calculate hatching date (+21 days from incubation date)"""
    try:
        incubation_date = datetime.strptime(data_incubazione, "%Y-%m-%d")
        schiusa_date = incubation_date + timedelta(days=21)
        return schiusa_date.strftime("%Y-%m-%d")
    except ValueError:
        return ""


# --- Endpoints ---
@router.get("")
def get_incubations():
    """Get all incubations"""
    db = SessionLocal()
    try:
        incubations = db.query(Incubation).order_by(Incubation.data_incubazione.desc()).all()
        result = []
        for inc in incubations:
            inc_dict = inc.to_dict()
            # Get batches for this incubation
            batches = db.query(IncubationBatch).filter(
                IncubationBatch.incubation_id == inc.id
            ).all()
            inc_dict["batches"] = [b.to_dict() for b in batches]
            
            # Calculate totals used per product
            totals = {
                "used_granpollo": 0,
                "used_pollo70": 0,
                "used_color_yeald": 0,
                "used_ross": 0
            }
            for batch in batches:
                product_key = f"used_{batch.prodotto.lower().replace(' ', '_')}"
                if product_key in totals:
                    totals[product_key] += batch.quantita
            inc_dict.update(totals)
            result.append(inc_dict)
        return result
    finally:
        db.close()


@router.get("/{incubation_id}")
def get_incubation(incubation_id: int):
    """Get single incubation by ID"""
    db = SessionLocal()
    try:
        incubation = db.query(Incubation).filter(Incubation.id == incubation_id).first()
        if not incubation:
            raise HTTPException(status_code=404, detail="Incubation not found")
        
        result = incubation.to_dict()
        batches = db.query(IncubationBatch).filter(
            IncubationBatch.incubation_id == incubation_id
        ).all()
        result["batches"] = [b.to_dict() for b in batches]
        return result
    finally:
        db.close()


class IncubationUpdate(BaseModel):
    pre_incubazione_ore: Optional[int] = None
    partenza_macchine: Optional[str] = None
    operatore: Optional[str] = None
    incubatrici: Optional[str] = None
    richiesta_granpollo: Optional[int] = None
    richiesta_pollo70: Optional[int] = None
    richiesta_color_yeald: Optional[int] = None
    richiesta_ross: Optional[int] = None


@router.put("/{incubation_id}")
def update_incubation(incubation_id: int, data: IncubationUpdate):
    """Update incubation details"""
    db = SessionLocal()
    try:
        incubation = db.query(Incubation).filter(Incubation.id == incubation_id).first()
        if not incubation:
            raise HTTPException(status_code=404, detail="Incubation not found")
        
        # Update fields if provided
        if data.pre_incubazione_ore is not None:
            incubation.pre_incubazione_ore = data.pre_incubazione_ore
        if data.partenza_macchine is not None:
            incubation.partenza_macchine = data.partenza_macchine
        if data.operatore is not None:
            incubation.operatore = data.operatore
        if data.incubatrici is not None:
            incubation.incubatrici = data.incubatrici
        if data.richiesta_granpollo is not None:
            incubation.richiesta_granpollo = data.richiesta_granpollo
        if data.richiesta_pollo70 is not None:
            incubation.richiesta_pollo70 = data.richiesta_pollo70
        if data.richiesta_color_yeald is not None:
            incubation.richiesta_color_yeald = data.richiesta_color_yeald
        if data.richiesta_ross is not None:
            incubation.richiesta_ross = data.richiesta_ross
        
        db.commit()
        db.refresh(incubation)
        
        result = incubation.to_dict()
        batches = db.query(IncubationBatch).filter(
            IncubationBatch.incubation_id == incubation_id
        ).all()
        result["batches"] = [b.to_dict() for b in batches]
        return result
    finally:
        db.close()



@router.post("")
def create_incubation(data: IncubationCreate):
    """Create new incubation"""
    db = SessionLocal()
    try:
        # Calculate schiusa date
        data_schiusa = calculate_schiusa_date(data.data_incubazione)
        
        incubation = Incubation(
            data_incubazione=data.data_incubazione,
            data_schiusa=data_schiusa,
            pre_incubazione_ore=data.pre_incubazione_ore or 0,
            partenza_macchine=data.partenza_macchine,
            operatore=data.operatore,
            incubatrici=data.incubatrici,
            richiesta_granpollo=data.richiesta_granpollo or 0,
            richiesta_pollo70=data.richiesta_pollo70 or 0,
            richiesta_color_yeald=data.richiesta_color_yeald or 0,
            richiesta_ross=data.richiesta_ross or 0,
            stato="in_corso"
        )
        db.add(incubation)
        db.commit()
        db.refresh(incubation)
        
        result = incubation.to_dict()
        result["batches"] = []
        return result
    finally:
        db.close()


@router.put("/{incubation_id}")
def update_incubation(incubation_id: int, data: IncubationUpdate):
    """Update existing incubation"""
    db = SessionLocal()
    try:
        incubation = db.query(Incubation).filter(Incubation.id == incubation_id).first()
        if not incubation:
            raise HTTPException(status_code=404, detail="Incubation not found")
        
        # Update fields if provided
        if data.data_incubazione is not None:
            incubation.data_incubazione = data.data_incubazione
            incubation.data_schiusa = calculate_schiusa_date(data.data_incubazione)
        if data.pre_incubazione_ore is not None:
            incubation.pre_incubazione_ore = data.pre_incubazione_ore
        if data.partenza_macchine is not None:
            incubation.partenza_macchine = data.partenza_macchine
        if data.operatore is not None:
            incubation.operatore = data.operatore
        if data.incubatrici is not None:
            incubation.incubatrici = data.incubatrici
        if data.richiesta_granpollo is not None:
            incubation.richiesta_granpollo = data.richiesta_granpollo
        if data.richiesta_pollo70 is not None:
            incubation.richiesta_pollo70 = data.richiesta_pollo70
        if data.richiesta_color_yeald is not None:
            incubation.richiesta_color_yeald = data.richiesta_color_yeald
        if data.richiesta_ross is not None:
            incubation.richiesta_ross = data.richiesta_ross
        if data.stato is not None:
            incubation.stato = data.stato
        
        db.commit()
        db.refresh(incubation)
        return incubation.to_dict()
    finally:
        db.close()


@router.delete("/{incubation_id}")
def delete_incubation(incubation_id: int):
    """Delete incubation and its batches"""
    db = SessionLocal()
    try:
        incubation = db.query(Incubation).filter(Incubation.id == incubation_id).first()
        if not incubation:
            raise HTTPException(status_code=404, detail="Incubation not found")
        
        # Delete associated batches
        db.query(IncubationBatch).filter(
            IncubationBatch.incubation_id == incubation_id
        ).delete()
        
        db.delete(incubation)
        db.commit()
        return {"message": "Incubation deleted successfully"}
    finally:
        db.close()


# --- Batch Endpoints ---
@router.post("/{incubation_id}/batches")
def add_batch(incubation_id: int, data: BatchCreate):
    """Add egg batch to incubation"""
    db = SessionLocal()
    try:
        # Verify incubation exists
        incubation = db.query(Incubation).filter(Incubation.id == incubation_id).first()
        if not incubation:
            raise HTTPException(status_code=404, detail="Incubation not found")
        
        batch = IncubationBatch(
            incubation_id=incubation_id,
            egg_storage_id=data.egg_storage_id,
            prodotto=data.prodotto,
            nome=data.nome,
            origine=data.origine,
            uova_partita=data.uova_partita,
            uova_utilizzate=0,
            eta=data.eta,
            storico_override=None,
            quantita=data.uova_partita  # Backwards compatibility
        )
        db.add(batch)
        db.commit()
        db.refresh(batch)
        return batch.to_dict()
    finally:
        db.close()


@router.patch("/{incubation_id}/batches/{batch_id}")
def update_batch(incubation_id: int, batch_id: int, data: BatchUpdate):
    """Update batch fields (uova_utilizzate, storico_override)"""
    db = SessionLocal()
    try:
        batch = db.query(IncubationBatch).filter(
            IncubationBatch.id == batch_id,
            IncubationBatch.incubation_id == incubation_id
        ).first()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        
        # Update uova_utilizzate with validation
        if data.uova_utilizzate is not None:
            if data.uova_utilizzate < 0:
                raise HTTPException(status_code=400, detail="Uova utilizzate cannot be negative")
            if data.uova_utilizzate > (batch.uova_partita or 0):
                raise HTTPException(status_code=400, detail="Uova utilizzate cannot exceed uova partita")
            batch.uova_utilizzate = data.uova_utilizzate
        
        # Update storico_override
        if data.storico_override is not None:
            batch.storico_override = data.storico_override
        
        db.commit()
        db.refresh(batch)
        return batch.to_dict()
    finally:
        db.close()


@router.delete("/{incubation_id}/batches/{batch_id}")
def remove_batch(incubation_id: int, batch_id: int):
    """Remove batch from incubation"""
    db = SessionLocal()
    try:
        batch = db.query(IncubationBatch).filter(
            IncubationBatch.id == batch_id,
            IncubationBatch.incubation_id == incubation_id
        ).first()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        
        db.delete(batch)
        db.commit()
        return {"message": "Batch removed successfully"}
    finally:
        db.close()


@router.get("/{incubation_id}/batches")
def get_batches(incubation_id: int):
    """Get all batches for an incubation"""
    db = SessionLocal()
    try:
        batches = db.query(IncubationBatch).filter(
            IncubationBatch.incubation_id == incubation_id
        ).all()
        return [b.to_dict() for b in batches]
    finally:
        db.close()


@router.post("/{incubation_id}/commit")
def commit_incubation(incubation_id: int):
    """Commit incubation: update egg storage with used quantities"""
    db = SessionLocal()
    try:
        # Get incubation
        incubation = db.query(Incubation).filter(Incubation.id == incubation_id).first()
        if not incubation:
            raise HTTPException(status_code=404, detail="Incubation not found")
        
        if incubation.committed:
            raise HTTPException(status_code=400, detail="Incubation already committed")
        
        # Get all batches for this incubation
        batches = db.query(IncubationBatch).filter(
            IncubationBatch.incubation_id == incubation_id
        ).all()
        
        # Update egg storage for each batch
        for batch in batches:
            if batch.uova_utilizzate and batch.uova_utilizzate > 0:
                storage = db.query(EggStorage).filter(
                    EggStorage.id == batch.egg_storage_id
                ).first()
                
                if storage:
                    new_quantity = storage.numero - batch.uova_utilizzate
                    if new_quantity <= 0:
                        # Delete the storage entry if empty
                        db.delete(storage)
                    else:
                        storage.numero = new_quantity
        
        # Mark incubation as committed
        incubation.committed = True
        db.commit()
        
        return {"success": True, "message": "Incubation committed successfully"}
    finally:
        db.close()
