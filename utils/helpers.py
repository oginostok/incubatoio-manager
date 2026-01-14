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
