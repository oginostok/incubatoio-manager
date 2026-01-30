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
# --- MODELS ---
class Lotto(Base):
    __tablename__ = "lotti"
    
    id = Column(Integer, primary_key=True, index=True)
    allevamento = Column(String, index=True)
    capannone = Column(String)
    razza = Column(String)
    razza_gallo = Column(String) # NEW FIELD
    prodotto = Column(String)
    capi = Column(Integer)
    anno_start = Column(Integer)
    sett_start = Column(Integer)
    data_fine_prevista = Column(String)
    attivo = Column(Boolean, default=True)

    def to_dict(self):
        """Converts model instance to dictionary for Streamlit compatibility."""
        return {
            "id": self.id,
            "Allevamento": self.allevamento,
            "Capannone": self.capannone,
            "Razza": self.razza, # Genetica Gallina
            "Razza_Gallo": self.razza_gallo, # Genetica Gallo
            "Prodotto": self.prodotto,
            "Capi": self.capi,
            "Anno_Start": self.anno_start,
            "Sett_Start": self.sett_start,
            "Data_Fine_Prevista": self.data_fine_prevista,
            "Attivo": self.attivo
        }


# --- NEW MODELS FOR TRADING (Acquisto/Vendita Uova) ---
class TradingConfig(Base):
    __tablename__ = "trading_config"
    
    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String) # 'acquisto' or 'vendita'
    azienda = Column(String)
    prodotto = Column(String)
    active = Column(Boolean, default=True)

class TradingData(Base):
    __tablename__ = "trading_data"
    
    id = Column(Integer, primary_key=True, index=True)
    anno = Column(Integer)
    settimana = Column(Integer)
    tipo = Column(String) # 'acquisto' or 'vendita'
    azienda = Column(String)
    prodotto = Column(String)
    quantita = Column(Integer, default=0)

# --- HELPER FUNCTIONS ---
def init_db():
    """Initializes the database tables and ensures schema updates."""
    Base.metadata.create_all(bind=engine)
    
    # Simple migration for new column 'razza_gallo'
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE lotti ADD COLUMN razza_gallo VARCHAR"))
            conn.commit()
        except Exception:
            pass
        try:
             conn.execute(text("ALTER TABLE lotti ADD COLUMN data_fine_prevista VARCHAR"))
             conn.commit()
        except Exception:
             pass

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
            razza_gallo=data.get("Razza_Gallo"),
            prodotto=data.get("Prodotto"),
            capi=data.get("Capi"),
            anno_start=data.get("Anno_Start"),
            sett_start=data.get("Sett_Start"),
            data_fine_prevista=data.get("Data_Fine_Prevista"),
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
            if "Razza_Gallo" in data: lotto.razza_gallo = data["Razza_Gallo"]
            if "Prodotto" in data: lotto.prodotto = data["Prodotto"]
            if "Capi" in data: lotto.capi = data["Capi"]
            if "Anno_Start" in data: lotto.anno_start = data["Anno_Start"]
            if "Sett_Start" in data: lotto.sett_start = data["Sett_Start"]
            if "Data_Fine_Prevista" in data: lotto.data_fine_prevista = data["Data_Fine_Prevista"]
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

# --- TRADING HELPERS ---
def get_trading_config(tipo):
    db = SessionLocal()
    try:
        return db.query(TradingConfig).filter(TradingConfig.tipo == tipo, TradingConfig.active == True).all()
    finally:
        db.close()

def add_trading_config(tipo, azienda, prodotto):
    db = SessionLocal()
    try:
        # Check if exists
        exists = db.query(TradingConfig).filter(
            TradingConfig.tipo == tipo, 
            TradingConfig.azienda == azienda, 
            TradingConfig.prodotto == prodotto
        ).first()
        
        if not exists:
            new_conf = TradingConfig(tipo=tipo, azienda=azienda, prodotto=prodotto, active=True)
            db.add(new_conf)
            db.commit()
    finally:
        db.close()

def get_trading_data(tipo):
    db = SessionLocal()
    try:
        # Returns raw list of objs
        return db.query(TradingData).filter(TradingData.tipo == tipo).all()
    finally:
        db.close()

def save_trading_data_bulk(tipo, updates_list):
    """
    updates_list: list of dicts {anno, settimana, azienda, prodotto, quantita}
    """
    db = SessionLocal()
    try:
        for item in updates_list:
            # Check if record exists
            record = db.query(TradingData).filter(
                TradingData.tipo == tipo,
                TradingData.anno == item['anno'],
                TradingData.settimana == item['settimana'],
                TradingData.azienda == item['azienda'],
                TradingData.prodotto == item['prodotto']
            ).first()
            
            if record:
                record.quantita = item['quantita']
            else:
                new_rec = TradingData(
                    tipo=tipo,
                    anno=item['anno'],
                    settimana=item['settimana'],
                    azienda=item['azienda'],
                    prodotto=item['prodotto'],
                    quantita=item['quantita']
                )
                db.add(new_rec)
        db.commit()
    finally:
        db.close()


def init_trading_db_tables():
    # Helper to ensure tables exist if not using alembic
    Base.metadata.create_all(bind=engine)

def init_default_trading_config():
    """Seeds default columns if none exist."""
    db = SessionLocal()
    try:
        # Check if we have any config. If valid config exists, we skip seeding to avoid duplicates or re-adding deleted ones
        # Or specifically check for these defaults.
        # Let's check for 'acquisto' specific defaults.
        defaults = [
            ("acquisto", "Boyè", "Pollo70"),
            ("acquisto", "Amadori", "GranPollo"),
            ("acquisto", "Fileni", "GranPollo"),
            ("acquisto", "Estero", "Color Yeald")
        ]
        
        for tipo, az, prod in defaults:
            exists = db.query(TradingConfig).filter(
                TradingConfig.tipo == tipo,
                TradingConfig.azienda == az,
                TradingConfig.prodotto == prod
            ).first()
            if not exists:
                new_c = TradingConfig(tipo=tipo, azienda=az, prodotto=prod, active=True)
                db.add(new_c)
        db.commit()
    finally:
        db.close()

def update_trading_config(config_id, new_azienda, new_prodotto):
    """Updates the name of a trading column config."""
    db = SessionLocal()
    try:
        conf = db.query(TradingConfig).filter(TradingConfig.id == config_id).first()
        if conf:
            # We also need to update the DATA associated with this column? 
            # Actually, the data is stored by (azienda, prodotto).
            # If we rename the config, we effectively ORPHAN the old data unless we migrate it too.
            # So we MUST update TradingData records that match the OLD (azienda, prodotto).
            
            old_az = conf.azienda
            old_prod = conf.prodotto
            
            conf.azienda = new_azienda
            conf.prodotto = new_prodotto
            
            # Migrate Data
            # Note: This might be heavy if lots of data, but typically it's small.
            data_rows = db.query(TradingData).filter(
                TradingData.tipo == conf.tipo,
                TradingData.azienda == old_az,
                TradingData.prodotto == old_prod
            ).all()
            
            for row in data_rows:
                row.azienda = new_azienda
                row.prodotto = new_prodotto
            
            db.commit()
    finally:
        db.close()

def delete_trading_config(config_id):
    """Soft deletes a trading config."""
    db = SessionLocal()
    try:
        conf = db.query(TradingConfig).filter(TradingConfig.id == config_id).first()
        if conf:
            conf.active = False
            db.commit()
    finally:
        db.close()
