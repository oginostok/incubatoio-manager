from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
import json

from database import get_db, SchedaSettimanaleRecord

router = APIRouter(prefix="/api/allevamenti/scheda", tags=["scheda_settimanale"])


class SchedaSaveRequest(BaseModel):
    allevamento: str
    capannone: str
    anno: int
    settimana: int
    lotto_id: Optional[int] = None
    galline_presenti: Optional[int] = 0
    galli_presenti: Optional[int] = 0
    galli_box: Optional[int] = 0
    righe: List[Any] = []
    trattamenti: List[Any] = []
    peso_galline: Optional[float] = None
    peso_galline_atteso: Optional[float] = None
    peso_galli: Optional[float] = None
    peso_galli_atteso: Optional[float] = None
    note: Optional[str] = ""


@router.post("")
def save_scheda(data: SchedaSaveRequest, db: Session = Depends(get_db)):
    record = db.query(SchedaSettimanaleRecord).filter(
        SchedaSettimanaleRecord.allevamento == data.allevamento,
        SchedaSettimanaleRecord.capannone == data.capannone,
        SchedaSettimanaleRecord.anno == data.anno,
        SchedaSettimanaleRecord.settimana == data.settimana,
    ).first()

    fields = {
        "lotto_id": data.lotto_id,
        "galline_presenti": data.galline_presenti or 0,
        "galli_presenti": data.galli_presenti or 0,
        "galli_box": data.galli_box or 0,
        "righe_json": json.dumps(data.righe),
        "trattamenti_json": json.dumps(data.trattamenti),
        "peso_galline": data.peso_galline,
        "peso_galline_atteso": data.peso_galline_atteso,
        "peso_galli": data.peso_galli,
        "peso_galli_atteso": data.peso_galli_atteso,
        "note": data.note or "",
        "updated_at": datetime.utcnow(),
    }

    if record:
        for k, v in fields.items():
            setattr(record, k, v)
    else:
        record = SchedaSettimanaleRecord(
            allevamento=data.allevamento,
            capannone=data.capannone,
            anno=data.anno,
            settimana=data.settimana,
            **fields,
        )
        db.add(record)

    db.commit()
    db.refresh(record)
    return record.to_dict()


@router.get("")
def get_scheda(
    allevamento: str,
    capannone: str,
    anno: int,
    settimana: int,
    db: Session = Depends(get_db),
):
    record = db.query(SchedaSettimanaleRecord).filter(
        SchedaSettimanaleRecord.allevamento == allevamento,
        SchedaSettimanaleRecord.capannone == capannone,
        SchedaSettimanaleRecord.anno == anno,
        SchedaSettimanaleRecord.settimana == settimana,
    ).first()

    if not record:
        return None

    return record.to_dict()
