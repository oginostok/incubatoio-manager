import pandas as pd
import streamlit as st
import locale
import calendar
from datetime import datetime

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

@st.cache_data
def carica_dati_v20():
    """Carica dati da CSV con gestione errori e pulizia colonne."""
    try:
        # Tenta di leggere CSV con encoding latin1
        df = pd.read_csv("dati.csv", sep=';', engine='python', encoding='latin1', on_bad_lines='skip')
        
        # Rinomina prima colonna se necessario (spesso è 'W' o vuota)
        if len(df.columns) > 0:
            df.rename(columns={df.columns[0]: 'W'}, inplace=True)
            
        # Pulisce nomi colonne
        df.columns = df.columns.str.replace('\n', ' ').str.strip()
        
        return df
    except Exception as e:
        return str(e)

from database import init_db, get_lotti, add_lotto

def init_session_state():
    """Inizializza lo stato dell'applicazione con dati di default se necessario."""
    
    # 0. INIT DB
    try:
        init_db()
    except Exception as e:
        print(f"DB Init Error: {e}")

    # 1. DATABASE STRUTTURE DEFAULT
    if 'allevamenti' not in st.session_state:
        st.session_state['allevamenti'] = {
            "Cortefranca": ["1", "2", "1A", "1B", "2A", "2B"],
            "Tonengo": ["1", "2", "3", "4", "5", "6"],
            "Tarantasca": ["1", "2", "1A", "1B"],
            "Villafranca": ["1", "2", "3", "4"],
            "Passirano": ["1", "2", "3"],
            "Mussano": ["1", "2", "1A", "1B"]
        }

    # 2. IMPOSTAZIONI VITA PRODUTTIVA
    if 'settings_lifecycle' not in st.session_state:
        st.session_state['settings_lifecycle'] = {'min': 25, 'max': 64}

    # 3. LOTTI (FROM DB)
    # Non salviamo più i lotti in session_state come master record. 
    # Li caricheremo "live" dalle funzioni del DB quando serve.
    # Tuttavia, per compatibilità temporanea con la visualizzazione:
    st.session_state['lotti'] = get_lotti()
    
    # SEEDING INIZIALE DEMO SOLO SE DB VUOTO
    if not st.session_state['lotti']:
        dati = carica_dati_v20()
        if not isinstance(dati, str): # Se non è errore
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
                    st.session_state['lotti'] = get_lotti()
