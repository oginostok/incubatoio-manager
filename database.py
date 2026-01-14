from sqlalchemy import create_engine, Column, Integer, String, Boolean
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# --- DATABASE SETUP ---
DB_NAME = "incubatoio.db"
# Use absolute path or relative to current working directory
DATABASE_URL = f"sqlite:///{DB_NAME}"

Base = declarative_base()
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- MODELS ---
class Lotto(Base):
    __tablename__ = "lotti"
    
    id = Column(Integer, primary_key=True, index=True)
    allevamento = Column(String, index=True)
    capannone = Column(String)
    razza = Column(String)
    prodotto = Column(String)
    capi = Column(Integer)
    anno_start = Column(Integer)
    sett_start = Column(Integer)
    attivo = Column(Boolean, default=True)

    def to_dict(self):
        """Converts model instance to dictionary for Streamlit compatibility."""
        return {
            "id": self.id,
            "Allevamento": self.allevamento,
            "Capannone": self.capannone,
            "Razza": self.razza,
            "Prodotto": self.prodotto,
            "Capi": self.capi,
            "Anno_Start": self.anno_start,
            "Sett_Start": self.sett_start,
            "Attivo": self.attivo
        }

# --- HELPER FUNCTIONS ---
def init_db():
    """Initializes the database tables."""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_lotti():
    """Returns all lotti as a list of dictionaries."""
    db = SessionLocal()
    try:
        lotti = db.query(Lotto).all()
        return [l.to_dict() for l in lotti]
    finally:
        db.close()

def add_lotto(data):
    """Adds a new lotto to the database. `data` is a dict."""
    db = SessionLocal()
    try:
        new_lotto = Lotto(
            allevamento=data.get("Allevamento"),
            capannone=data.get("Capannone"),
            razza=data.get("Razza"),
            prodotto=data.get("Prodotto"),
            capi=data.get("Capi"),
            anno_start=data.get("Anno_Start"),
            sett_start=data.get("Sett_Start"),
            attivo=data.get("Attivo", True)
        )
        db.add(new_lotto)
        db.commit()
    finally:
        db.close()

def update_lotto(lotto_id, data):
    """Updates an existing lotto."""
    db = SessionLocal()
    try:
        lotto = db.query(Lotto).filter(Lotto.id == lotto_id).first()
        if lotto:
            if "Allevamento" in data: lotto.allevamento = data["Allevamento"]
            if "Capannone" in data: lotto.capannone = data["Capannone"]
            if "Razza" in data: lotto.razza = data["Razza"]
            if "Prodotto" in data: lotto.prodotto = data["Prodotto"]
            if "Capi" in data: lotto.capi = data["Capi"]
            if "Anno_Start" in data: lotto.anno_start = data["Anno_Start"]
            if "Sett_Start" in data: lotto.sett_start = data["Sett_Start"]
            if "Attivo" in data: lotto.attivo = data["Attivo"]
            db.commit()
    finally:
        db.close()

def delete_lotto(lotto_id):
    """Deletes a lotto."""
    db = SessionLocal()
    try:
        lotto = db.query(Lotto).filter(Lotto.id == lotto_id).first()
        if lotto:
            db.delete(lotto)
            db.commit()
    finally:
        db.close()

def sync_lotti_from_editor(edited_rows, deleted_rows, added_rows):
    """
    Syncs changes from Streamlit data_editor to DB.
    Note: 'edited_rows' in Streamlit returns {index: {col: val}}.
    But if we pass a list of dicts to data_editor, we might not get IDs easily unless they are hidden columns.
    For this implementation, we will assume we pass a DataFrame containing 'id'.
    """
    db = SessionLocal()
    try:
        # Handle edits
        # edited_rows structure: {row_index: {col_name: new_value}}
        # But we need to know the ID corresponding to row_index.
        # This function signature might be too complex for simple usage.
        # We will handle the logic in the view using direct add_lotto/update_lotto calls where possible.
        pass
    finally:
        db.close()
