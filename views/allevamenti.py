import streamlit as st
import pandas as pd
from utils.helpers import carica_dati_v20, pulisci_percentuale, formatta_numero

def page_allevamenti():
    with st.sidebar:
        if st.button("⬅️ Torna alla Home"):
            st.session_state['current_page'] = 'home'
            st.rerun()
    
    st.title("🐓 ALLEVAMENTI")
    
    # --- CARICAMENTO DATI ---
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

    # --- SIDEBAR ---
    with st.sidebar:
        st.header("⚙️ Strutture")
        with st.expander("➕ Nuovo Allevamento"):
            nuovo_all = st.text_input("Nome")
            if st.button("Crea"):
                if nuovo_all and nuovo_all not in st.session_state['allevamenti']:
                    st.session_state['allevamenti'][nuovo_all] = []
                    st.success("OK")
                    st.rerun()

    # --- MAIN ---
    st.subheader("📝 Gestione Lotti - Inserimento Accasamento")
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
            sett_start = st.number_input("Anno Acc.", 1, 52, 27)

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

    # --- settings expander ---
    with st.expander("⚙️ Impostazioni Carriera Produttiva"):
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
        st.caption(f"**Risultato:** Le galline produrranno uova solo tra la settimana **{st.session_state['settings_lifecycle']['min']}** e la settimana **{st.session_state['settings_lifecycle']['max']}** di vita.")

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
