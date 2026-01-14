import streamlit as st
import pandas as pd
from utils.helpers import carica_dati_v20, pulisci_percentuale, formatta_numero
from database import add_lotto, get_lotti, update_lotto, delete_lotto

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
            new_lotto_data = {
                "Allevamento": sel_all, "Capannone": sel_cap,
                "Razza": sel_razza, "Prodotto": sel_prod,
                "Capi": num_capi, "Anno_Start": anno_start,
                "Sett_Start": sett_start, "Attivo": True
            }
            add_lotto(new_lotto_data)
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
    
    # LOAD FROM DB
    lotti_db = get_lotti()
    
    if lotti_db:
        df_lotti = pd.DataFrame(lotti_db)
        
        # Ensure 'id' is present for tracking
        if 'id' not in df_lotti.columns:
            # Should not happen if DB is working, but safe fallback
            st.error("Errore caricamento ID dal DB")
            st.stop()

        column_config = {
            "id": None, # Hide ID
            "Allevamento": st.column_config.SelectboxColumn("All.", options=list(st.session_state['allevamenti'].keys()), required=True),
            "Razza": st.column_config.SelectboxColumn("Genetica", options=colonne_razze, required=True),
            "Prodotto": st.column_config.SelectboxColumn("Prod.", options=LISTA_PRODOTTI, required=True),
            "Capi": st.column_config.NumberColumn("Capi", step=100),
            "Anno_Start": st.column_config.NumberColumn("Anno", format="%d"),
            "Sett_Start": st.column_config.NumberColumn("Sett."),
            "Attivo": st.column_config.CheckboxColumn("On")
        }
        
        edited_df = st.data_editor(
            df_lotti, 
            column_config=column_config, 
            num_rows="dynamic", 
            use_container_width=True, 
            hide_index=True, 
            key="editor_lotti"
        )
        
        # SYNC LOGIC (Simple check for diffs)
        # This is run on every rerun. 
        # Identify changes by comparing original 'lotti_db' with 'edited_df'
        # BUT: modifying DB inside render loop might be tricky if we don't manage state distinctness.
        # Streamlit's data_editor output is the "new state".
        
        # To handle updates:
        # We can iterate over edited_df and update DB for each row. 
        # Or better: use st.session_state to track if editing happened?
        # Creating a diff is safer.
        
        # Check for deleted rows
        current_ids = set(edited_df['id'].dropna().astype(int))
        original_ids = set(l['id'] for l in lotti_db)
        
        # 1. DELETE
        ids_to_delete = original_ids - current_ids
        for mid in ids_to_delete:
            delete_lotto(int(mid))
            st.rerun()

        # 2. UPDATE / ADD (Add via editor handles new rows with NaN ID usually, or we disable adding rows via editor?)
        # Let's see: num_rows="dynamic" allows adding.
        # If user adds a row in editor, it has no ID.
        # But our custom "Add" form is better. Let's set num_rows="fixed" to force usage of form for creation, 
        # avoiding complexity of handling "new" rows from editor without proper defaults.
        # Wait, user might want to delete. So let's allow delete but maybe not add?
        # For this refactor, let's update modified rows.
        
        # Optimization: convert to dicts keyed by ID
        original_dict = {l['id']: l for l in lotti_db}
        
        changes_made = False
        for index, row in edited_df.iterrows():
            if pd.isna(row.get('id')): 
                # New row added via editor? Ignore or handle?
                # If we changed to num_rows="fixed", this won't happen.
                continue
                
            mid = int(row['id'])
            if mid in original_dict:
                orig = original_dict[mid]
                # Check fields
                # We only check fields that matter
                diff = {}
                for k in ["Allevamento", "Capannone", "Razza", "Prodotto", "Capi", "Anno_Start", "Sett_Start", "Attivo"]:
                    val_new = row[k]
                    val_old = orig.get(k)
                    
                    # Casting types for comparison safety
                    if k == "Capi" or k == "Anno_Start" or k == "Sett_Start":
                        try: val_new = int(val_new); val_old = int(val_old)
                        except: pass
                    
                    if val_new != val_old:
                        diff[k] = val_new
                
                if diff:
                    update_lotto(mid, diff)
                    changes_made = True
        
        if changes_made:
             st.rerun()

    else:
        st.info("Nessun lotto.")
