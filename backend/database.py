from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime
import os

# --- DATABASE SETUP ---
# Use absolute path to ensure database persists across server restarts
DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = "incubatoio.db"
DATABASE_URL = f"sqlite:///{os.path.join(DB_DIR, DB_NAME)}"

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
    curva_produzione = Column(String) # Production curve to use
    attivo = Column(Boolean, default=True)
    # Concurrency protection fields
    version = Column(Integer, default=1)  # Optimistic locking
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
            "Curva_Produzione": self.curva_produzione,
            "Attivo": self.attivo,
            "version": self.version,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
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

# --- PRODUCTION CACHE MODEL (as per RULES.md) ---
class ProductionCache(Base):
    __tablename__ = "production_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    anno = Column(Integer, index=True)
    settimana = Column(Integer, index=True)
    lotto_id = Column(Integer, index=True)  # FK verso lotti
    prodotto = Column(String, index=True)
    uova = Column(Integer)
    valid = Column(Boolean, default=True)
    calculated_at = Column(DateTime, default=datetime.utcnow)

# --- GENETIC CONFIG MODEL (T006 - Genetica Gallina) ---
class GeneticConfig(Base):
    __tablename__ = "genetic_config"
    
    id = Column(Integer, primary_key=True, index=True)
    genetica_gallina = Column(String)
    genetica_gallo = Column(String)  # Legacy field, kept for migration
    
    def to_dict(self):
        return {
            "id": self.id,
            "genetica_gallina": self.genetica_gallina,
            "genetica_gallo": self.genetica_gallo
        }

# --- GENETIC GALLO MODEL (T007 - Genetica Gallo) ---
class GeneticGallo(Base):
    __tablename__ = "genetic_gallo"
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String)
    
    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome
        }

# --- CYCLE SETTINGS MODEL ---
class CycleSettings(Base):
    __tablename__ = "cycle_settings"
    
    id = Column(Integer, primary_key=True, default=1)
    eta_inizio_ciclo = Column(Integer, default=24)
    eta_fine_ciclo = Column(Integer, default=64)
    
    def to_dict(self):
        return {
            "eta_inizio_ciclo": self.eta_inizio_ciclo,
            "eta_fine_ciclo": self.eta_fine_ciclo
        }

# --- CYCLE WEEKLY DATA MODEL (Dati Avanzati) ---
class CycleWeeklyData(Base):
    __tablename__ = "cycle_weekly_data"
    
    id = Column(Integer, primary_key=True, index=True)
    lotto_id = Column(Integer, index=True)  # FK verso lotti
    eta_animali = Column(Integer)  # Età in settimane (parte da 19)
    anno = Column(Integer)  # Anno settimana solare
    settimana = Column(Integer)  # Settimana solare
    galline_morte = Column(Integer, default=0)
    galli_morti = Column(Integer, default=0)
    uova_incubabili = Column(Integer, default=0)
    uova_seconda = Column(Integer, default=0)
    tipo_mangime = Column(String, default="")
    accensione_luce = Column(String, default="")  # es. "05:00"
    spegnimento_luce = Column(String, default="")  # es. "21:00"
    
    def to_dict(self):
        return {
            "id": self.id,
            "lotto_id": self.lotto_id,
            "eta_animali": self.eta_animali,
            "anno": self.anno,
            "settimana": self.settimana,
            "galline_morte": self.galline_morte,
            "galli_morti": self.galli_morti,
            "uova_incubabili": self.uova_incubabili,
            "uova_seconda": self.uova_seconda,
            "tipo_mangime": self.tipo_mangime,
            "accensione_luce": self.accensione_luce,
            "spegnimento_luce": self.spegnimento_luce
        }


# --- HELPER FUNCTIONS ---
def init_db():
    """Initializes the database tables and ensures schema updates."""
    Base.metadata.create_all(bind=engine)
    
    # Simple migration for new columns
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
        try:
             conn.execute(text("ALTER TABLE lotti ADD COLUMN curva_produzione VARCHAR"))
             conn.commit()
        except Exception:
             pass
        # Concurrency protection columns
        try:
             conn.execute(text("ALTER TABLE lotti ADD COLUMN version INTEGER DEFAULT 1"))
             conn.commit()
        except Exception:
             pass
        try:
             conn.execute(text("ALTER TABLE lotti ADD COLUMN updated_at DATETIME"))
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
            curva_produzione=data.get("Curva_Produzione"),
            attivo=data.get("Attivo", True)
        )
        db.add(new_lotto)
        db.commit()
    finally:
        db.close()

def update_lotto(lotto_id, data, expected_version=None):
    """Updates an existing lotto with optimistic locking.
    
    Args:
        lotto_id: ID of the lotto to update
        data: Dictionary with fields to update
        expected_version: If provided, checks version before update (optimistic locking)
    
    Returns:
        dict with 'success', 'conflict', and 'lotto' data
    """
    db = SessionLocal()
    try:
        lotto = db.query(Lotto).filter(Lotto.id == lotto_id).first()
        if not lotto:
            return {"success": False, "error": "Lotto not found"}
        
        # Optimistic locking check
        if expected_version is not None and lotto.version != expected_version:
            return {
                "success": False, 
                "conflict": True,
                "message": "Data was modified by another user. Please refresh.",
                "current_version": lotto.version
            }
        
        # Update fields
        if "Allevamento" in data: lotto.allevamento = data["Allevamento"]
        if "Capannone" in data: lotto.capannone = data["Capannone"]
        if "Razza" in data: lotto.razza = data["Razza"]
        if "Razza_Gallo" in data: lotto.razza_gallo = data["Razza_Gallo"]
        if "Prodotto" in data: lotto.prodotto = data["Prodotto"]
        if "Capi" in data: lotto.capi = data["Capi"]
        if "Anno_Start" in data: lotto.anno_start = data["Anno_Start"]
        if "Sett_Start" in data: lotto.sett_start = data["Sett_Start"]
        if "Data_Fine_Prevista" in data: lotto.data_fine_prevista = data["Data_Fine_Prevista"]
        if "Curva_Produzione" in data: lotto.curva_produzione = data["Curva_Produzione"]
        if "Attivo" in data: lotto.attivo = data["Attivo"]
        
        # Increment version and update timestamp
        lotto.version = (lotto.version or 0) + 1
        lotto.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(lotto)
        return {"success": True, "lotto": lotto.to_dict()}
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
    """Soft deletes a trading config and removes associated data."""
    db = SessionLocal()
    try:
        conf = db.query(TradingConfig).filter(TradingConfig.id == config_id).first()
        if conf:
            # Delete associated trading data to avoid orphaned records
            db.query(TradingData).filter(
                TradingData.tipo == conf.tipo,
                TradingData.azienda == conf.azienda,
                TradingData.prodotto == conf.prodotto
            ).delete()
            
            # Soft delete the config
            conf.active = False
            db.commit()
    finally:
        db.close()

# --- PRODUCTION CACHE HELPERS ---
def invalidate_cache_by_lotto(lotto_id: int):
    """Marks all cache entries for a specific lotto as invalid."""
    db = SessionLocal()
    try:
        db.query(ProductionCache).filter(
            ProductionCache.lotto_id == lotto_id
        ).update({"valid": False})
        db.commit()
    finally:
        db.close()

def invalidate_cache_by_curve(curva_nome: str):
    """Invalidates cache for all lotti using a specific curve."""
    db = SessionLocal()
    try:
        # Find all lotto IDs that use this curve
        lotti = db.query(Lotto).filter(Lotto.curva_produzione == curva_nome).all()
        lotto_ids = [l.id for l in lotti]
        
        if lotto_ids:
            db.query(ProductionCache).filter(
                ProductionCache.lotto_id.in_(lotto_ids)
            ).update({"valid": False}, synchronize_session=False)
            db.commit()
    finally:
        db.close()

def delete_cache_by_lotto(lotto_id: int):
    """Deletes all cache entries for a specific lotto."""
    db = SessionLocal()
    try:
        db.query(ProductionCache).filter(
            ProductionCache.lotto_id == lotto_id
        ).delete()
        db.commit()
    finally:
        db.close()

def get_valid_cache(product_filter: str = None):
    """Returns all valid cache entries, optionally filtered by product."""
    db = SessionLocal()
    try:
        query = db.query(ProductionCache).filter(ProductionCache.valid == True)
        if product_filter:
            query = query.filter(ProductionCache.prodotto == product_filter)
        return query.all()
    finally:
        db.close()

def save_production_cache_bulk(cache_entries: list):
    """
    Saves production cache entries.
    cache_entries: list of dicts {anno, settimana, lotto_id, prodotto, uova}
    """
    db = SessionLocal()
    try:
        for entry in cache_entries:
            # Check if exists
            existing = db.query(ProductionCache).filter(
                ProductionCache.anno == entry['anno'],
                ProductionCache.settimana == entry['settimana'],
                ProductionCache.lotto_id == entry['lotto_id']
            ).first()
            
            if existing:
                existing.uova = entry['uova']
                existing.prodotto = entry['prodotto']
                existing.valid = True
                existing.calculated_at = datetime.utcnow()
            else:
                new_entry = ProductionCache(
                    anno=entry['anno'],
                    settimana=entry['settimana'],
                    lotto_id=entry['lotto_id'],
                    prodotto=entry['prodotto'],
                    uova=entry['uova'],
                    valid=True,
                    calculated_at=datetime.utcnow()
                )
                db.add(new_entry)
        db.commit()
    finally:
        db.close()

def invalidate_all_cache():
    """Invalidates all production cache entries."""
    db = SessionLocal()
    try:
        db.query(ProductionCache).update({"valid": False})
        db.commit()
    finally:
        db.close()

# --- GENETIC CONFIG HELPERS (T006) ---
def get_genetic_config():
    """Returns all genetic config entries."""
    db = SessionLocal()
    try:
        configs = db.query(GeneticConfig).all()
        return [c.to_dict() for c in configs]
    finally:
        db.close()

def add_genetic_config(data):
    """Adds a new genetic config entry."""
    db = SessionLocal()
    try:
        new_config = GeneticConfig(
            genetica_gallina=data.get("genetica_gallina", ""),
            genetica_gallo=data.get("genetica_gallo", "")
        )
        db.add(new_config)
        db.commit()
        db.refresh(new_config)
        return new_config.to_dict()
    finally:
        db.close()

def update_genetic_config(config_id, data):
    """Updates a genetic config entry."""
    db = SessionLocal()
    try:
        config = db.query(GeneticConfig).filter(GeneticConfig.id == config_id).first()
        if config:
            if "genetica_gallina" in data:
                config.genetica_gallina = data["genetica_gallina"]
            if "genetica_gallo" in data:
                config.genetica_gallo = data["genetica_gallo"]
            db.commit()
            return config.to_dict()
        return None
    finally:
        db.close()

def delete_genetic_config(config_id):
    """Deletes a genetic config entry."""
    db = SessionLocal()
    try:
        config = db.query(GeneticConfig).filter(GeneticConfig.id == config_id).first()
        if config:
            db.delete(config)
            db.commit()
            return True
        return False
    finally:
        db.close()

# --- GENETIC GALLO HELPERS (T007) ---
def get_genetic_gallo():
    """Returns all genetic gallo entries."""
    db = SessionLocal()
    try:
        configs = db.query(GeneticGallo).all()
        return [c.to_dict() for c in configs]
    finally:
        db.close()

def add_genetic_gallo(data):
    """Adds a new genetic gallo entry."""
    db = SessionLocal()
    try:
        new_config = GeneticGallo(
            nome=data.get("nome", "")
        )
        db.add(new_config)
        db.commit()
        db.refresh(new_config)
        return new_config.to_dict()
    finally:
        db.close()

def update_genetic_gallo(config_id, data):
    """Updates a genetic gallo entry."""
    db = SessionLocal()
    try:
        config = db.query(GeneticGallo).filter(GeneticGallo.id == config_id).first()
        if config:
            if "nome" in data:
                config.nome = data["nome"]
            db.commit()
            return config.to_dict()
        return None
    finally:
        db.close()

def delete_genetic_gallo(config_id):
    """Deletes a genetic gallo entry."""
    db = SessionLocal()
    try:
        config = db.query(GeneticGallo).filter(GeneticGallo.id == config_id).first()
        if config:
            db.delete(config)
            db.commit()
            return True
        return False
    finally:
        db.close()

def migrate_gallo_data():
    """Migrates existing genetica_gallo values from GeneticConfig to GeneticGallo table."""
    db = SessionLocal()
    try:
        # Check if GeneticGallo table is empty
        existing = db.query(GeneticGallo).first()
        if existing:
            return  # Already migrated
        
        # Extract unique gallo values from old table
        old_configs = db.query(GeneticConfig).all()
        gallo_values = set()
        for config in old_configs:
            if config.genetica_gallo and config.genetica_gallo.strip():
                gallo_values.add(config.genetica_gallo.strip())
        
        # Insert into new table
        for nome in gallo_values:
            new_gallo = GeneticGallo(nome=nome)
            db.add(new_gallo)
        
        db.commit()
        print(f"Migrated {len(gallo_values)} gallo genetics to new table.")
    finally:
        db.close()

# --- CYCLE SETTINGS HELPERS ---
def get_cycle_settings():
    """Returns cycle settings, creates default if not exists."""
    db = SessionLocal()
    try:
        settings = db.query(CycleSettings).first()
        if not settings:
            # Create default settings
            settings = CycleSettings(
                id=1,
                eta_inizio_ciclo=24,
                eta_fine_ciclo=64
            )
            db.add(settings)
            db.commit()
            db.refresh(settings)
        return settings.to_dict()
    finally:
        db.close()

def update_cycle_settings(data):
    """Updates cycle settings."""
    db = SessionLocal()
    try:
        settings = db.query(CycleSettings).first()
        if not settings:
            settings = CycleSettings(id=1)
            db.add(settings)
        
        if "eta_inizio_ciclo" in data:
            settings.eta_inizio_ciclo = data["eta_inizio_ciclo"]
        if "eta_fine_ciclo" in data:
            settings.eta_fine_ciclo = data["eta_fine_ciclo"]
        
        db.commit()
        db.refresh(settings)
        return settings.to_dict()
    finally:
        db.close()

# --- CYCLE WEEKLY DATA HELPERS (Dati Avanzati) ---
def get_cycle_weekly_data(lotto_id: int):
    """Returns all weekly data for a specific lotto."""
    db = SessionLocal()
    try:
        data = db.query(CycleWeeklyData).filter(
            CycleWeeklyData.lotto_id == lotto_id
        ).order_by(CycleWeeklyData.eta_animali).all()
        return [d.to_dict() for d in data]
    finally:
        db.close()

def add_cycle_weekly_data(lotto_id: int, data: dict):
    """Adds a new weekly data row for a lotto."""
    db = SessionLocal()
    try:
        new_data = CycleWeeklyData(
            lotto_id=lotto_id,
            eta_animali=data.get("eta_animali", 19),
            anno=data.get("anno", 0),
            settimana=data.get("settimana", 0),
            galline_morte=data.get("galline_morte", 0),
            galli_morti=data.get("galli_morti", 0),
            uova_incubabili=data.get("uova_incubabili", 0),
            uova_seconda=data.get("uova_seconda", 0),
            tipo_mangime=data.get("tipo_mangime", ""),
            accensione_luce=data.get("accensione_luce", ""),
            spegnimento_luce=data.get("spegnimento_luce", "")
        )
        db.add(new_data)
        db.commit()
        db.refresh(new_data)
        return new_data.to_dict()
    finally:
        db.close()

def update_cycle_weekly_data(data_id: int, data: dict):
    """Updates an existing weekly data row."""
    db = SessionLocal()
    try:
        record = db.query(CycleWeeklyData).filter(CycleWeeklyData.id == data_id).first()
        if record:
            if "eta_animali" in data:
                record.eta_animali = data["eta_animali"]
            if "anno" in data:
                record.anno = data["anno"]
            if "settimana" in data:
                record.settimana = data["settimana"]
            if "galline_morte" in data:
                record.galline_morte = data["galline_morte"]
            if "galli_morti" in data:
                record.galli_morti = data["galli_morti"]
            if "uova_incubabili" in data:
                record.uova_incubabili = data["uova_incubabili"]
            if "uova_seconda" in data:
                record.uova_seconda = data["uova_seconda"]
            if "tipo_mangime" in data:
                record.tipo_mangime = data["tipo_mangime"]
            if "accensione_luce" in data:
                record.accensione_luce = data["accensione_luce"]
            if "spegnimento_luce" in data:
                record.spegnimento_luce = data["spegnimento_luce"]
            db.commit()
            db.refresh(record)
            return record.to_dict()
        return None
    finally:
        db.close()

def delete_cycle_weekly_data(data_id: int):
    """Deletes a weekly data row."""
    db = SessionLocal()
    try:
        record = db.query(CycleWeeklyData).filter(CycleWeeklyData.id == data_id).first()
        if record:
            db.delete(record)
            db.commit()
            return True
        return False
    finally:
        db.close()

def calculate_solar_week(anno_start: int, sett_start: int, eta_animali: int):
    """
    Calculates the solar week given the start date and animal age.
    Returns (anno, settimana).
    """
    total_weeks = sett_start + eta_animali
    anno = anno_start
    settimana = total_weeks
    
    # Handle year overflow
    while settimana > 52:
        settimana -= 52
        anno += 1
    
    return anno, settimana

# --- BIRTH RATES MODEL (T008 - Tabelle di Nascita) ---
from sqlalchemy import Float

class BirthRate(Base):
    __tablename__ = "birth_rates"
    
    id = Column(Integer, primary_key=True, index=True)
    week = Column(Integer, index=True)  # 24-64
    product = Column(String, index=True)  # granpollo, pollo70, colorYeald, ross
    rate = Column(Float, default=82.00)  # Percentage value (e.g., 82.00)
    
    def to_dict(self):
        return {
            "id": self.id,
            "week": self.week,
            "product": self.product,
            "rate": self.rate
        }

# --- BIRTH RATES HELPERS (T008) ---
def get_birth_rates():
    """Returns all birth rates as a list of dictionaries."""
    db = SessionLocal()
    try:
        rates = db.query(BirthRate).order_by(BirthRate.week, BirthRate.product).all()
        return [r.to_dict() for r in rates]
    finally:
        db.close()

def get_birth_rate(week: int, product: str):
    """Returns a specific birth rate."""
    db = SessionLocal()
    try:
        rate = db.query(BirthRate).filter(
            BirthRate.week == week,
            BirthRate.product == product
        ).first()
        return rate.to_dict() if rate else None
    finally:
        db.close()

def update_birth_rate(week: int, product: str, rate: float):
    """Updates or creates a birth rate entry."""
    db = SessionLocal()
    try:
        record = db.query(BirthRate).filter(
            BirthRate.week == week,
            BirthRate.product == product
        ).first()
        
        if record:
            record.rate = rate
        else:
            record = BirthRate(week=week, product=product, rate=rate)
            db.add(record)
        
        db.commit()
        db.refresh(record)
        return record.to_dict()
    finally:
        db.close()

def seed_birth_rates():
    """Seeds default birth rates (82.00%) for all weeks (24-64) and products."""
    db = SessionLocal()
    try:
        # Check if already seeded
        existing = db.query(BirthRate).first()
        if existing:
            return  # Already seeded
        
        products = ["granpollo", "pollo70", "colorYeald", "ross"]
        for week in range(24, 65):  # 24 to 64 inclusive
            for product in products:
                rate = BirthRate(week=week, product=product, rate=82.00)
                db.add(rate)
        
        db.commit()
        print(f"Seeded birth rates: {41 * 4} entries (W24-W64 x 4 products)")
    finally:
        db.close()

# --- PURCHASE BIRTH RATES MODEL (T009 - Nascita Uova in Acquisto) ---
class PurchaseBirthRate(Base):
    __tablename__ = "purchase_birth_rates"
    
    id = Column(Integer, primary_key=True, index=True)
    product = Column(String, index=True, unique=True)  # granpollo, pollo70, colorYeald, ross
    rate = Column(Float, default=84.00)
    
    def to_dict(self):
        return {
            "id": self.id,
            "product": self.product,
            "rate": self.rate
        }

# --- PURCHASE BIRTH RATES HELPERS (T009) ---
def get_purchase_birth_rates():
    """Returns all purchase birth rates as a dict {product: rate}."""
    db = SessionLocal()
    try:
        rates = db.query(PurchaseBirthRate).all()
        return {r.product: r.rate for r in rates}
    finally:
        db.close()

def update_purchase_birth_rate(product: str, rate: float):
    """Updates or creates a purchase birth rate entry."""
    db = SessionLocal()
    try:
        record = db.query(PurchaseBirthRate).filter(
            PurchaseBirthRate.product == product
        ).first()
        
        if record:
            record.rate = rate
        else:
            record = PurchaseBirthRate(product=product, rate=rate)
            db.add(record)
        
        db.commit()
        db.refresh(record)
        return record.to_dict()
    finally:
        db.close()

def seed_purchase_birth_rates():
    """Seeds default purchase birth rates (84.00%) for all products."""
    db = SessionLocal()
    try:
        existing = db.query(PurchaseBirthRate).first()
        if existing:
            return
        
        products = ["granpollo", "pollo70", "colorYeald", "ross"]
        for product in products:
            rate = PurchaseBirthRate(product=product, rate=84.00)
            db.add(rate)
        
        db.commit()
        print(f"Seeded purchase birth rates: 4 entries")
    finally:
        db.close()

# --- CHICK PLANNING MODEL (T010 - Pianificazione Nascite) ---
class ChickPlanning(Base):
    __tablename__ = "chick_planning"
    
    id = Column(Integer, primary_key=True, index=True)
    anno = Column(Integer, index=True)
    settimana = Column(Integer, index=True)
    product = Column(String, index=True)  # granpollo, pollo70, colorYeald, ross
    richiesta_guidi = Column(Integer, default=80000)
    altri_clienti = Column(Integer, default=3000)
    
    def to_dict(self):
        return {
            "id": self.id,
            "anno": self.anno,
            "settimana": self.settimana,
            "product": self.product,
            "richiesta_guidi": self.richiesta_guidi,
            "altri_clienti": self.altri_clienti
        }

# --- CHICK PLANNING HELPERS (T010) ---
def get_chick_planning(product: str):
    """Returns all chick planning data for a product as a dict {(anno, settimana): {richiesta_guidi, altri_clienti}}."""
    db = SessionLocal()
    try:
        records = db.query(ChickPlanning).filter(ChickPlanning.product == product).all()
        return {(r.anno, r.settimana): {"richiesta_guidi": r.richiesta_guidi, "altri_clienti": r.altri_clienti} for r in records}
    finally:
        db.close()

def update_chick_planning(anno: int, settimana: int, product: str, richiesta_guidi: int = None, altri_clienti: int = None):
    """Updates or creates a chick planning entry."""
    db = SessionLocal()
    try:
        record = db.query(ChickPlanning).filter(
            ChickPlanning.anno == anno,
            ChickPlanning.settimana == settimana,
            ChickPlanning.product == product
        ).first()
        
        if record:
            if richiesta_guidi is not None:
                record.richiesta_guidi = richiesta_guidi
            if altri_clienti is not None:
                record.altri_clienti = altri_clienti
        else:
            record = ChickPlanning(
                anno=anno,
                settimana=settimana,
                product=product,
                richiesta_guidi=richiesta_guidi if richiesta_guidi is not None else 80000,
                altri_clienti=altri_clienti if altri_clienti is not None else 3000
            )
            db.add(record)
        
        db.commit()
        db.refresh(record)
        return record.to_dict()
    finally:
        db.close()

def get_chick_planning_value(anno: int, settimana: int, product: str):
    """Gets a single chick planning record, creating defaults if not exists."""
    db = SessionLocal()
    try:
        record = db.query(ChickPlanning).filter(
            ChickPlanning.anno == anno,
            ChickPlanning.settimana == settimana,
            ChickPlanning.product == product
        ).first()
        
        if record:
            return record.to_dict()
        return {"richiesta_guidi": 80000, "altri_clienti": 3000}
    finally:
        db.close()

# --- ROSS CLIENT CONFIG MODEL (T013 - Clienti Dinamici) ---
class RossClientConfig(Base):
    __tablename__ = "ross_client_config"
    
    id = Column(Integer, primary_key=True, index=True)
    nome_cliente = Column(String)
    sex_type = Column(String)  # 'maschi', 'femmine', 'entrambi'
    active = Column(Boolean, default=True)
    
    def to_dict(self):
        return {
            "id": self.id,
            "nome_cliente": self.nome_cliente,
            "sex_type": self.sex_type,
            "active": self.active
        }

class RossClientData(Base):
    __tablename__ = "ross_client_data"
    
    id = Column(Integer, primary_key=True, index=True)
    anno = Column(Integer, index=True)
    settimana = Column(Integer, index=True)
    cliente_id = Column(Integer, index=True)  # FK verso RossClientConfig
    quantita = Column(Integer, default=0)
    
    def to_dict(self):
        return {
            "id": self.id,
            "anno": self.anno,
            "settimana": self.settimana,
            "cliente_id": self.cliente_id,
            "quantita": self.quantita
        }

# --- ROSS CLIENT HELPERS ---
def get_ross_clients():
    """Returns all active Ross clients."""
    db = SessionLocal()
    try:
        clients = db.query(RossClientConfig).filter(RossClientConfig.active == True).all()
        return [c.to_dict() for c in clients]
    finally:
        db.close()

def add_ross_client(nome_cliente: str, sex_type: str):
    """Adds a new Ross client."""
    db = SessionLocal()
    try:
        new_client = RossClientConfig(
            nome_cliente=nome_cliente,
            sex_type=sex_type,
            active=True
        )
        db.add(new_client)
        db.commit()
        db.refresh(new_client)
        return new_client.to_dict()
    finally:
        db.close()

def delete_ross_client(client_id: int):
    """Soft deletes a Ross client and removes associated data."""
    db = SessionLocal()
    try:
        client = db.query(RossClientConfig).filter(RossClientConfig.id == client_id).first()
        if client:
            # Delete associated data
            db.query(RossClientData).filter(RossClientData.cliente_id == client_id).delete()
            # Soft delete the config
            client.active = False
            db.commit()
            return True
        return False
    finally:
        db.close()

def get_ross_client_data():
    """Returns all Ross client data as a dict {(anno, settimana, cliente_id): quantita}."""
    db = SessionLocal()
    try:
        records = db.query(RossClientData).all()
        return {(r.anno, r.settimana, r.cliente_id): r.quantita for r in records}
    finally:
        db.close()

def update_ross_client_data(anno: int, settimana: int, cliente_id: int, quantita: int):
    """Updates or creates a Ross client data entry."""
    db = SessionLocal()
    try:
        record = db.query(RossClientData).filter(
            RossClientData.anno == anno,
            RossClientData.settimana == settimana,
            RossClientData.cliente_id == cliente_id
        ).first()
        
        if record:
            record.quantita = quantita
        else:
            record = RossClientData(
                anno=anno,
                settimana=settimana,
                cliente_id=cliente_id,
                quantita=quantita
            )
            db.add(record)
        
        db.commit()
        db.refresh(record)
        return record.to_dict()
    finally:
        db.close()

# --- COLOR YEALD CLIENT CONFIG MODEL (T012 - Clienti Dinamici) ---
class ColorYealdClientConfig(Base):
    __tablename__ = "coloryeald_client_config"
    
    id = Column(Integer, primary_key=True, index=True)
    nome_cliente = Column(String)
    sex_type = Column(String)  # 'maschi', 'femmine', 'entrambi'
    active = Column(Boolean, default=True)
    
    def to_dict(self):
        return {
            "id": self.id,
            "nome_cliente": self.nome_cliente,
            "sex_type": self.sex_type,
            "active": self.active
        }

class ColorYealdClientData(Base):
    __tablename__ = "coloryeald_client_data"
    
    id = Column(Integer, primary_key=True, index=True)
    anno = Column(Integer, index=True)
    settimana = Column(Integer, index=True)
    cliente_id = Column(Integer, index=True)
    quantita = Column(Integer, default=0)
    
    def to_dict(self):
        return {
            "id": self.id,
            "anno": self.anno,
            "settimana": self.settimana,
            "cliente_id": self.cliente_id,
            "quantita": self.quantita
        }

# --- COLOR YEALD CLIENT HELPERS ---
def get_coloryeald_clients():
    """Returns all active ColorYeald clients."""
    db = SessionLocal()
    try:
        clients = db.query(ColorYealdClientConfig).filter(ColorYealdClientConfig.active == True).all()
        return [c.to_dict() for c in clients]
    finally:
        db.close()

def add_coloryeald_client(nome_cliente: str, sex_type: str):
    """Adds a new ColorYeald client."""
    db = SessionLocal()
    try:
        new_client = ColorYealdClientConfig(
            nome_cliente=nome_cliente,
            sex_type=sex_type,
            active=True
        )
        db.add(new_client)
        db.commit()
        db.refresh(new_client)
        return new_client.to_dict()
    finally:
        db.close()

def delete_coloryeald_client(client_id: int):
    """Soft deletes a ColorYeald client and removes associated data."""
    db = SessionLocal()
    try:
        client = db.query(ColorYealdClientConfig).filter(ColorYealdClientConfig.id == client_id).first()
        if client:
            db.query(ColorYealdClientData).filter(ColorYealdClientData.cliente_id == client_id).delete()
            client.active = False
            db.commit()
            return True
        return False
    finally:
        db.close()

def get_coloryeald_client_data():
    """Returns all ColorYeald client data as a dict {(anno, settimana, cliente_id): quantita}."""
    db = SessionLocal()
    try:
        records = db.query(ColorYealdClientData).all()
        return {(r.anno, r.settimana, r.cliente_id): r.quantita for r in records}
    finally:
        db.close()

def update_coloryeald_client_data(anno: int, settimana: int, cliente_id: int, quantita: int):
    """Updates or creates a ColorYeald client data entry."""
    db = SessionLocal()
    try:
        record = db.query(ColorYealdClientData).filter(
            ColorYealdClientData.anno == anno,
            ColorYealdClientData.settimana == settimana,
            ColorYealdClientData.cliente_id == cliente_id
        ).first()
        
        if record:
            record.quantita = quantita
        else:
            record = ColorYealdClientData(
                anno=anno,
                settimana=settimana,
                cliente_id=cliente_id,
                quantita=quantita
            )
            db.add(record)
        
        db.commit()
        db.refresh(record)
        return record.to_dict()
    finally:
        db.close()

# --- POLLO70 CLIENT CONFIG MODEL (T011 - Clienti Dinamici) ---
class Pollo70ClientConfig(Base):
    __tablename__ = "pollo70_client_config"
    
    id = Column(Integer, primary_key=True, index=True)
    nome_cliente = Column(String)
    sex_type = Column(String)  # 'maschi', 'femmine', 'entrambi'
    active = Column(Boolean, default=True)
    
    def to_dict(self):
        return {
            "id": self.id,
            "nome_cliente": self.nome_cliente,
            "sex_type": self.sex_type,
            "active": self.active
        }

class Pollo70ClientData(Base):
    __tablename__ = "pollo70_client_data"
    
    id = Column(Integer, primary_key=True, index=True)
    anno = Column(Integer, index=True)
    settimana = Column(Integer, index=True)
    cliente_id = Column(Integer, index=True)
    quantita = Column(Integer, default=0)
    
    def to_dict(self):
        return {
            "id": self.id,
            "anno": self.anno,
            "settimana": self.settimana,
            "cliente_id": self.cliente_id,
            "quantita": self.quantita
        }

# --- POLLO70 CLIENT HELPERS ---
def get_pollo70_clients():
    """Returns all active Pollo70 clients."""
    db = SessionLocal()
    try:
        clients = db.query(Pollo70ClientConfig).filter(Pollo70ClientConfig.active == True).all()
        return [c.to_dict() for c in clients]
    finally:
        db.close()

def add_pollo70_client(nome_cliente: str, sex_type: str):
    """Adds a new Pollo70 client."""
    db = SessionLocal()
    try:
        new_client = Pollo70ClientConfig(
            nome_cliente=nome_cliente,
            sex_type=sex_type,
            active=True
        )
        db.add(new_client)
        db.commit()
        db.refresh(new_client)
        return new_client.to_dict()
    finally:
        db.close()

def delete_pollo70_client(client_id: int):
    """Soft deletes a Pollo70 client and removes associated data."""
    db = SessionLocal()
    try:
        client = db.query(Pollo70ClientConfig).filter(Pollo70ClientConfig.id == client_id).first()
        if client:
            db.query(Pollo70ClientData).filter(Pollo70ClientData.cliente_id == client_id).delete()
            client.active = False
            db.commit()
            return True
        return False
    finally:
        db.close()

def get_pollo70_client_data():
    """Returns all Pollo70 client data as a dict {(anno, settimana, cliente_id): quantita}."""
    db = SessionLocal()
    try:
        records = db.query(Pollo70ClientData).all()
        return {(r.anno, r.settimana, r.cliente_id): r.quantita for r in records}
    finally:
        db.close()

def update_pollo70_client_data(anno: int, settimana: int, cliente_id: int, quantita: int):
    """Updates or creates a Pollo70 client data entry."""
    db = SessionLocal()
    try:
        record = db.query(Pollo70ClientData).filter(
            Pollo70ClientData.anno == anno,
            Pollo70ClientData.settimana == settimana,
            Pollo70ClientData.cliente_id == cliente_id
        ).first()
        
        if record:
            record.quantita = quantita
        else:
            record = Pollo70ClientData(
                anno=anno,
                settimana=settimana,
                cliente_id=cliente_id,
                quantita=quantita
            )
            db.add(record)
        
        db.commit()
        db.refresh(record)
        return record.to_dict()
    finally:
        db.close()
