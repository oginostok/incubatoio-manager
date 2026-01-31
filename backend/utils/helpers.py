import pandas as pd
import locale
import calendar
from datetime import datetime
from functools import lru_cache
import os

# --- 1. FUNZIONI DI UTILITÀ ---
def pulisci_percentuale(valore):
    """Converte percentuali (str o float) in float (0.xx)."""
    if pd.isna(valore) or valore == '': return 0.0
    if isinstance(valore, (int, float)): return float(valore)
    
    valore = str(valore).replace('%', '').replace(',', '.').strip()
    try:
        return float(valore) / 100
    except:
        return 0.0

def formatta_numero(n):
    """Formatta numero con separatore migliaia (.) e decimali se != 0."""
    try:
        return "{:,}".format(int(n)).replace(",", ".")
    except:
        return str(n)

# Fixing imports for backend structure
# If running mainly from main.py, database will be in the path
try:
    from database import init_db, get_lotti, add_lotto, engine, init_trading_db_tables, init_default_trading_config, migrate_gallo_data
except ImportError:
    from backend.database import init_db, get_lotti, add_lotto, engine, init_trading_db_tables, init_default_trading_config, migrate_gallo_data
    
import sqlalchemy

# Carica dati SOLO dal database (no fallback CSV)
def carica_dati_v20():
    """Carica dati da DB (standard_curves). Non usa più dati.csv."""
    try:
        # Use read_sql_table for SQLAlchemy 2.x compatibility
        df = pd.read_sql_table("standard_curves", engine)
        if not df.empty:
            # Normalizza spazi nei nomi colonne
            df.columns = df.columns.str.replace(r'\s+', ' ', regex=True).str.strip()
            return df
        else:
            print("⚠️ Tabella standard_curves è vuota!")
            return pd.DataFrame()
    except Exception as e:
        print(f"❌ Errore lettura standard_curves dal DB: {e}")
        print("   La tabella potrebbe non esistere. Eseguire seed_database() o importare i dati manualmente.")
        return pd.DataFrame()


def seed_database():
    """Seeds the database with default data if empty."""
    
    # 0. INIT DB
    try:
        init_db()
        # Initialize trading tables
        init_trading_db_tables()
        init_default_trading_config()
        # Migrate gallo data to new table (T007)
        migrate_gallo_data()
        print("Trading tables initialized.")
    except Exception as e:
        print(f"DB Init Error: {e}")

    # 1. LOTTI (CHECK IF EMPTY)
    current_lotti = get_lotti()
    
    # SEEDING INIZIALE DEMO SOLO SE DB VUOTO
    if not current_lotti:
        print("Seeding database with default lotti...")
        dati = carica_dati_v20()
        if not dati.empty: 
            df_curve = dati
            colonne_escluse = ['W', 'Unnamed', 'SELEZIONA', 'NUM GALLINE', 'UOVA SETTIMANALI']
            colonne_razze = [c for c in df_curve.columns if not any(x in str(c) for x in colonne_escluse)]
            
            RAZZA_DEMO_DETECTED = None
            for col in colonne_razze:
                if "JA87" in col:
                    RAZZA_DEMO_DETECTED = col
                    break
            if not RAZZA_DEMO_DETECTED and len(colonne_razze) > 0:
                RAZZA_DEMO_DETECTED = colonne_razze[0]
            
            if RAZZA_DEMO_DETECTED:
                    demo_lotti = [
                    # 2025
                    {'Allevamento': 'Cortefranca', 'Capannone': '1', 'Anno_Start': 2025, 'Sett_Start': 27, 'Capi': 3600, 'Prodotto': 'Color Yeald', 'Razza': RAZZA_DEMO_DETECTED, 'Attivo': True},
                    {'Allevamento': 'Cortefranca', 'Capannone': '1', 'Anno_Start': 2025, 'Sett_Start': 27, 'Capi': 3600, 'Prodotto': 'Granpollo', 'Razza': RAZZA_DEMO_DETECTED, 'Attivo': True},
                    {'Allevamento': 'Cortefranca', 'Capannone': '2', 'Anno_Start': 2025, 'Sett_Start': 27, 'Capi': 7448, 'Prodotto': 'Ross', 'Razza': RAZZA_DEMO_DETECTED, 'Attivo': True},
                    {'Allevamento': 'Tonengo', 'Capannone': '2', 'Anno_Start': 2025, 'Sett_Start': 39, 'Capi': 3328, 'Prodotto': 'Pollo70', 'Razza': RAZZA_DEMO_DETECTED, 'Attivo': True},
                    {'Allevamento': 'Tonengo', 'Capannone': '2', 'Anno_Start': 2025, 'Sett_Start': 39, 'Capi': 3328, 'Prodotto': 'Color Yeald', 'Razza': RAZZA_DEMO_DETECTED, 'Attivo': True},
                    {'Allevamento': 'Tonengo', 'Capannone': '5', 'Anno_Start': 2025, 'Sett_Start': 39, 'Capi': 9680, 'Prodotto': 'Granpollo', 'Razza': RAZZA_DEMO_DETECTED, 'Attivo': True},
                    {'Allevamento': 'Tonengo', 'Capannone': '6', 'Anno_Start': 2025, 'Sett_Start': 39, 'Capi': 5920, 'Prodotto': 'Granpollo', 'Razza': RAZZA_DEMO_DETECTED, 'Attivo': True},
                    {'Allevamento': 'Passirano', 'Capannone': '1', 'Anno_Start': 2025, 'Sett_Start': 52, 'Capi': 6800, 'Prodotto': 'Ross', 'Razza': RAZZA_DEMO_DETECTED, 'Attivo': True},
                    {'Allevamento': 'Passirano', 'Capannone': '2', 'Anno_Start': 2025, 'Sett_Start': 52, 'Capi': 6200, 'Prodotto': 'Pollo70', 'Razza': RAZZA_DEMO_DETECTED, 'Attivo': True},
                    {'Allevamento': 'Passirano', 'Capannone': '3', 'Anno_Start': 2025, 'Sett_Start': 52, 'Capi': 8000, 'Prodotto': 'Granpollo', 'Razza': RAZZA_DEMO_DETECTED, 'Attivo': True},
                    
                    # 2026
                    {'Allevamento': 'Cortefranca', 'Capannone': '1', 'Anno_Start': 2026, 'Sett_Start': 27, 'Capi': 3500, 'Prodotto': 'Color Yeald', 'Razza': RAZZA_DEMO_DETECTED, 'Attivo': True},
                    {'Allevamento': 'Cortefranca', 'Capannone': '1', 'Anno_Start': 2026, 'Sett_Start': 27, 'Capi': 3500, 'Prodotto': 'Granpollo', 'Razza': RAZZA_DEMO_DETECTED, 'Attivo': True},
                    {'Allevamento': 'Cortefranca', 'Capannone': '2', 'Anno_Start': 2026, 'Sett_Start': 27, 'Capi': 7000, 'Prodotto': 'Ross', 'Razza': RAZZA_DEMO_DETECTED, 'Attivo': True},
                    {'Allevamento': 'Tonengo', 'Capannone': '5', 'Anno_Start': 2026, 'Sett_Start': 39, 'Capi': 9000, 'Prodotto': 'Granpollo', 'Razza': RAZZA_DEMO_DETECTED, 'Attivo': True},
                    {'Allevamento': 'Tonengo', 'Capannone': '6', 'Anno_Start': 2026, 'Sett_Start': 39, 'Capi': 6000, 'Prodotto': 'Granpollo', 'Razza': RAZZA_DEMO_DETECTED, 'Attivo': True},
                    {'Allevamento': 'Tonengo', 'Capannone': '2', 'Anno_Start': 2026, 'Sett_Start': 39, 'Capi': 3300, 'Prodotto': 'Pollo70', 'Razza': RAZZA_DEMO_DETECTED, 'Attivo': True},
                    {'Allevamento': 'Tonengo', 'Capannone': '2', 'Anno_Start': 2026, 'Sett_Start': 39, 'Capi': 3300, 'Prodotto': 'Color Yeald', 'Razza': RAZZA_DEMO_DETECTED, 'Attivo': True}
                ]
                    for l in demo_lotti:
                        add_lotto(l)
    else:
        print("Database already seeded with lotti.")
