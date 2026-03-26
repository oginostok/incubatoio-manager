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
    import sqlite3
    import os
    try:
        # Use direct sqlite3 connection for Pandas 3.x compatibility
        db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'incubatoio.db')
        conn = sqlite3.connect(db_path)
        df = pd.read_sql("SELECT * FROM standard_curves", conn)
        conn.close()
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


def migrate_t003_extend_to_w75():
    """
    Migration: extend standard_curves from W64 to W75.
    Each new week = previous week value - 1 percentage point.
    Runs idempotently: does nothing if W > 64 rows already exist.
    """
    import sqlite3 as _sqlite3
    import os as _os
    TARGET_MAX_W = 75
    db_path = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), '..', 'incubatoio.db')
    try:
        conn = _sqlite3.connect(db_path)
        df = pd.read_sql("SELECT * FROM standard_curves", conn)
        df.columns = df.columns.str.replace(r'\s+', ' ', regex=True).str.strip()
        df['W'] = pd.to_numeric(df['W'], errors='coerce')
        current_max = df['W'].max()
        if pd.isna(current_max) or current_max >= TARGET_MAX_W:
            conn.close()
            print(f"T003 migration: already at W{int(current_max) if not pd.isna(current_max) else '?'}, skipping.")
            return
        curve_cols = [c for c in df.columns if c != 'W']
        last_row = df[df['W'] == current_max].iloc[0]
        # Parse current percentage values (stored as "64,71%" or "0.6471")
        current_vals = {}
        for col in curve_cols:
            val = last_row[col]
            parsed = None
            if val is not None and val != '' and not (isinstance(val, float) and pd.isna(val)):
                s = str(val).replace('%', '').replace(',', '.').strip()
                try:
                    v = float(s)
                    parsed = v * 100 if v < 2 else v
                except ValueError:
                    pass
            current_vals[col] = parsed
        new_rows = []
        for w in range(int(current_max) + 1, TARGET_MAX_W + 1):
            row = {'W': float(w)}
            for col in curve_cols:
                if current_vals[col] is None:
                    row[col] = None
                else:
                    new_val = max(0.0, current_vals[col] - 1.0)
                    row[col] = f"{new_val:.2f}%".replace('.', ',')
                    current_vals[col] = new_val
            new_rows.append(row)
        new_df = pd.DataFrame(new_rows)
        df_extended = pd.concat([df, new_df], ignore_index=True)
        df_extended.to_sql("standard_curves", conn, if_exists='replace', index=False)
        conn.commit()
        print(f"T003 migration: extended standard_curves from W{int(current_max)} to W{TARGET_MAX_W}.")
        # Also bump cycle_settings.eta_fine_ciclo if it's still at the old default (<=64)
        try:
            settings_row = conn.execute("SELECT id, eta_fine_ciclo FROM cycle_settings LIMIT 1").fetchone()
            if settings_row and settings_row[1] <= 64:
                conn.execute("UPDATE cycle_settings SET eta_fine_ciclo = ? WHERE id = ?", (TARGET_MAX_W, settings_row[0]))
                conn.commit()
                print(f"T003 migration: updated cycle_settings.eta_fine_ciclo to {TARGET_MAX_W}.")
        except Exception as ce:
            print(f"T003 migration: could not update cycle_settings: {ce}")
        conn.close()
    except Exception as e:
        print(f"T003 migration error: {e}")


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

    # Extend T003 curves to W75 if not already done
    migrate_t003_extend_to_w75()

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
                    {'Allevamento': 'Passirano', 'Capannone': '1', 'Anno_Start': 2025, 'Sett_Start': 52, 'Capi': 6800, 'Prodotto': 'Granpollo', 'Razza': RAZZA_DEMO_DETECTED, 'Attivo': True},
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
