import streamlit as st
import pandas as pd
import numpy as np
import altair as alt

# --- CONFIGURAZIONE PAGINA ---
st.set_page_config(page_title="Incubatoio Manager Pro", layout="wide")
st.title("🏭 Gestionale Produzione Incubatoio")

# --- 1. FUNZIONI DI UTILITÀ ---
def pulisci_percentuale(valore):
    if pd.isna(valore) or valore == '': return 0.0
    if isinstance(valore, (int, float)): return float(valore)
    valore = str(valore).replace('%', '').replace(',', '.').strip()
    try: return float(valore) / 100
    except: return 0.0

def formatta_numero(n):
    try: return "{:,}".format(int(n)).replace(",", ".")
    except: return str(n)

@st.cache_data
def carica_dati_v20():
    try:
        df = pd.read_csv("dati.csv", sep=';', engine='python', encoding='latin1', on_bad_lines='skip')
        if len(df.columns) > 0:
            df.rename(columns={df.columns[0]: 'W'}, inplace=True)
        df.columns = df.columns.str.replace('\n', ' ').str.strip()
        return df
    except Exception as e:
        return str(e)

# --- 2. DATABASE STRUTTURE ---
DB_ALLEVAMENTI_DEFAULT = {
    "Cortefranca": ["1", "2", "1A", "1B", "2A", "2B"],
    "Tonengo": ["1", "2", "3", "4", "5", "6"],
    "Tarantasca": ["1", "2", "1A", "1B"],
    "Villafranca": ["1", "2", "3", "4"],
    "Passirano": ["1", "2", "3"],
    "Mussano": ["1", "2", "1A", "1B"]
}

# --- 3. CARICAMENTO DATI ---
dati = carica_dati_v20()
if isinstance(dati, str):
    st.error(f"Errore CSV: {dati}")
    st.stop()
else:
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

# --- 4. INIZIALIZZAZIONE MEMORIA ---
if 'allevamenti' not in st.session_state:
    st.session_state['allevamenti'] = DB_ALLEVAMENTI_DEFAULT.copy()

# Impostazioni di default (vita produttiva)
if 'settings_lifecycle' not in st.session_state:
    st.session_state['settings_lifecycle'] = {'min': 25, 'max': 64}

if 'lotti' not in st.session_state or not st.session_state['lotti']:
    if RAZZA_DEMO_DETECTED:
        st.session_state['lotti'] = [
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
    else:
        st.session_state['lotti'] = []

# --- 5. SIDEBAR ---
with st.sidebar:
    st.header("⚙️ Strutture")
    with st.expander("➕ Nuovo Allevamento"):
        nuovo_all = st.text_input("Nome")
        if st.button("Crea"):
            if nuovo_all and nuovo_all not in st.session_state['allevamenti']:
                st.session_state['allevamenti'][nuovo_all] = []
                st.success("OK")
                st.rerun()

# --- 6. MAIN ---
tab1, tab2, tab3 = st.tabs(["📝 Gestione Lotti", "📈 Previsioni Produzione", "⚙️ Impostazioni"])

with tab1:
    st.subheader("Inserimento Accasamento (Pulcini)")
    with st.form("form_lotto", clear_on_submit=False):
        c1, c2, c3, c4 = st.columns(4)
        with c1:
            sel_all = st.selectbox("Allevamento", list(st.session_state['allevamenti'].keys()))
            caps = st.session_state['allevamenti'][sel_all]
            sel_cap = st.selectbox("Capannone", caps if caps else ["-"])
        with c2:
            idx_def = 0
            if RAZZA_DEMO_DETECTED in colonne_razze:
                idx_def = colonne_razze.index(RAZZA_DEMO_DETECTED)
            sel_razza = st.selectbox("Genetica", colonne_razze, index=idx_def)
            LISTA_PRODOTTI = ["Granpollo", "Pollo70", "Color Yeald", "Ross"]
            sel_prod = st.selectbox("Prodotto", LISTA_PRODOTTI)
        with c3:
            num_capi = st.number_input("Capi", value=10000, step=500)
        with c4:
            anno_start = st.number_input("Anno Acc.", value=2025)
            sett_start = st.number_input("Settimana Acc.", 1, 52, 27)

        if st.form_submit_button("Aggiungi", type="primary"):
            st.session_state['lotti'].append({
                "Allevamento": sel_all, "Capannone": sel_cap,
                "Razza": sel_razza, "Prodotto": sel_prod,
                "Capi": num_capi, "Anno_Start": anno_start,
                "Sett_Start": sett_start, "Attivo": True
            })
            if 'editor_lotti' in st.session_state: del st.session_state['editor_lotti']
            st.success("Aggiunto!")
            st.rerun()

    st.divider()
    st.subheader("📋 Lotti Attivi")
    if st.session_state['lotti']:
        df_lotti = pd.DataFrame(st.session_state['lotti'])
        column_config = {
            "Allevamento": st.column_config.SelectboxColumn("All.", options=list(st.session_state['allevamenti'].keys()), required=True),
            "Razza": st.column_config.SelectboxColumn("Genetica", options=colonne_razze, required=True),
            "Prodotto": st.column_config.SelectboxColumn("Prod.", options=LISTA_PRODOTTI, required=True),
            "Capi": st.column_config.NumberColumn("Capi", step=100),
            "Anno_Start": st.column_config.NumberColumn("Anno", format="%d"),
            "Sett_Start": st.column_config.NumberColumn("Sett."),
            "Attivo": st.column_config.CheckboxColumn("On")
        }
        edited_df = st.data_editor(
            df_lotti, column_config=column_config, num_rows="dynamic", use_container_width=True, hide_index=True, key="editor_lotti"
        )
        st.session_state['lotti'] = edited_df.to_dict('records')
    else:
        st.info("Nessun lotto.")

with tab2:
    st.subheader("📈 Analisi Produzione")
    
    # Recuperiamo le impostazioni di vita produttiva
    LIMITE_MIN_ETA = st.session_state['settings_lifecycle']['min']
    LIMITE_MAX_ETA = st.session_state['settings_lifecycle']['max']
    
    st.caption(f"ℹ️ Calcolo basato su carriera produttiva: da **{LIMITE_MIN_ETA}** a **{LIMITE_MAX_ETA}** settimane di vita.")

    lotti_attivi = [l for l in st.session_state['lotti'] if l.get('Attivo', True)]
    
    if not lotti_attivi:
        st.warning("Nessun lotto attivo.")
    else:
        lista_dati = []
        for lotto in lotti_attivi:
            qta = lotto['Capi']
            razza = lotto['Razza']
            if razza not in df_curve.columns: continue
            
            subset = df_curve[['W', razza]].dropna()
            
            for _, row in subset.iterrows():
                try:
                    val_w = str(row['W']).replace(',', '.').strip()
                    if not val_w.replace('.', '', 1).isdigit(): continue
                    eta_gallina = float(val_w)
                    
                    # --- FILTRO IMPOSTAZIONI (VITA PRODUTTIVA) ---
                    # Se la gallina è troppo giovane o troppo vecchia rispetto ai parametri, saltiamo
                    if eta_gallina < LIMITE_MIN_ETA or eta_gallina > LIMITE_MAX_ETA:
                        continue
                    
                    perc = pulisci_percentuale(row[razza])
                    
                    if perc > 0:
                        sett_offset = lotto['Sett_Start'] + eta_gallina
                        anno_curr = lotto['Anno_Start']
                        sett_reale = sett_offset
                        while sett_reale > 52:
                            sett_reale -= 52
                            anno_curr += 1
                        
                        if anno_curr >= 2025:
                            uova_esatte = qta * perc * 7
                            periodo = f"{anno_curr}-{int(sett_reale):02d}"
                            nome_fonte = f"{lotto['Allevamento']} {lotto['Capannone']}"
                            
                            lista_dati.append({
                                "Periodo": periodo,
                                "Anno": anno_curr,
                                "Settimana": int(sett_reale),
                                "Prodotto": lotto['Prodotto'],
                                "Fonte": nome_fonte,
                                "Uova": int(uova_esatte),
                                "Età": int(eta_gallina)
                            })
                except: continue
        
        if lista_dati:
            df_tot = pd.DataFrame(lista_dati)
            df_tot = df_tot.sort_values(by=["Periodo"])

            LISTA_PRODOTTI_DISPONIBILI = ["Panoramica Totale"] + sorted(list(set(df_tot["Prodotto"])))
            
            col_sel, _ = st.columns([1, 2])
            with col_sel:
                view_mode = st.selectbox("🔍 Analizza Dettaglio:", LISTA_PRODOTTI_DISPONIBILI)
            
            if view_mode == "Panoramica Totale":
                df_chart = df_tot.pivot_table(index="Periodo", columns="Prodotto", values="Uova", aggfunc="sum").fillna(0)
                prodotti_target = ["Granpollo", "Pollo70", "Color Yeald", "Ross"]
                for p in prodotti_target:
                    if p not in df_chart.columns: df_chart[p] = 0
                df_chart = df_chart[prodotti_target]
                
                st.write("### Produzione Totale per Prodotto")
                st.line_chart(df_chart.round(-2).astype(int))
                
                st.write("### Totali Complessivi")
                cols = st.columns(4)
                totali = df_chart.sum()
                for i, p in enumerate(prodotti_target):
                    with cols[i]: st.metric(p, formatta_numero(totali.get(p, 0)))

            else:
                st.write(f"### Dettaglio: {view_mode}")
                df_filtered = df_tot[df_tot["Prodotto"] == view_mode].copy()
                df_filtered["Uova"] = df_filtered["Uova"].round(-2).astype(int)
                
                chart = alt.Chart(df_filtered).mark_area().encode(
                    x=alt.X('Periodo', title='Anno-Settimana'),
                    y=alt.Y('Uova', title='Produzione Uova (Impilata)'),
                    color=alt.Color('Fonte', title='Allevamento'),
                    tooltip=[
                        alt.Tooltip('Periodo', title='🗓️ Periodo'),
                        alt.Tooltip('Fonte', title='🏭 Allevamento'),
                        alt.Tooltip('Uova', title='🥚 Uova', format=",.0f"),
                        alt.Tooltip('Età', title='🐔 Età Galline (Sett)')
                    ]
                ).interactive()
                st.altair_chart(chart, use_container_width=True)
                
                st.divider()
                st.write(f"### Totali per Allevamento ({view_mode})")
                totali_fonte = df_filtered.groupby("Fonte")["Uova"].sum().sort_values(ascending=False)
                cols = st.columns(4)
                for i, (fonte, val) in enumerate(totali_fonte.items()):
                    with cols[i % 4]: st.metric(fonte, formatta_numero(val))

            with st.expander("🔎 Dati Tabellari"):
                if view_mode == "Panoramica Totale":
                    st.dataframe(df_chart, use_container_width=True)
                else:
                    st.dataframe(df_filtered[["Periodo", "Fonte", "Età", "Uova"]], use_container_width=True)
        else:
            st.warning("Nessun dato generato. Controlla che le impostazioni di vita produttiva non siano troppo restrittive.")

with tab3:
    st.header("⚙️ Impostazioni Carriera Produttiva")
    st.info("Queste impostazioni limitano la produzione anche se il file dati contiene settimane successive.")
    
    col_set1, col_set2 = st.columns(2)
    with col_set1:
        st.session_state['settings_lifecycle']['min'] = st.number_input(
            "Età Minima Deposizione (Settimane)", 
            min_value=18, max_value=30, 
            value=st.session_state['settings_lifecycle']['min']
        )
    with col_set2:
        st.session_state['settings_lifecycle']['max'] = st.number_input(
            "Fine Carriera / Macellazione (Settimane)", 
            min_value=40, max_value=100, 
            value=st.session_state['settings_lifecycle']['max']
        )
        
    st.write(f"**Risultato:** Le galline produrranno uova solo tra la settimana **{st.session_state['settings_lifecycle']['min']}** e la settimana **{st.session_state['settings_lifecycle']['max']}** di vita.")