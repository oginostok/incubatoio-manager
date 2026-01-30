import streamlit as st
import pandas as pd
from utils.helpers import carica_dati_v20, pulisci_percentuale, formatta_numero
from database import add_lotto, get_lotti, update_lotto, delete_lotto, engine
import time

def page_allevamenti():
    with st.sidebar:
        if st.button("⬅️ Torna alla Home"):
            st.session_state['current_page'] = 'home'
            st.rerun()
        
        st.divider()
        st.divider()
        nav_options = ["Situazione Allevamenti", "Inserimento Accasamento", "Storico Genetico"]
        selection = st.radio("Navigazione", nav_options)
    
    st.title("🐓 ALLEVAMENTI E GENETICA")
    
    # --- CARICAMENTO DATI (OTTIMIZZATO CON SESSION STATE) ---
    if 'df_genetica' not in st.session_state:
        # Caricamento iniziale
        st.session_state['df_genetica'] = carica_dati_v20()
    
    dati = st.session_state['df_genetica']
    
    if isinstance(dati, str):
        st.error(f"Errore caricamento dati: {dati}")
        return
    
    df_curve = dati

    # Assicuriamo che le colonne mancanti (es. ROSS 308) ci siano nello state
    target_standard_cols_check = ["JA57 STANDARD", "JA57K STANDARD", "JA57KI STANDARD", "JA87 STANDARD", "RANGER STANDARD", "ROSS 308 STANDARD"]
    for col in target_standard_cols_check:
        if col not in df_curve.columns:
            df_curve[col] = 0.0

    colonne_escluse = ['W', 'Unnamed', 'SELEZIONA', 'NUM GALLINE', 'UOVA SETTIMANALI']
    colonne_razze = [c for c in df_curve.columns if not any(x in str(c) for x in colonne_escluse)]
    
    RAZZA_DEMO_DETECTED = None
    for col in colonne_razze:
        if "JA87" in col:
            RAZZA_DEMO_DETECTED = col
            break
    if not RAZZA_DEMO_DETECTED and len(colonne_razze) > 0:
        RAZZA_DEMO_DETECTED = colonne_razze[0]
 
    # --- SEZIONE: INSERIMENTO ACCASAMENTO ---
    if selection == "Inserimento Accasamento":
        st.subheader("📝 Gestione Lotti - Inserimento Accasamento")
        
        # Form di inserimento (codice originale)
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
                sett_start = st.number_input("Sett. Acc.", 1, 52, 27)

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

        # Impostazioni globali ciclo vita
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

    # --- SEZIONE: SITUAZIONE ALLEVAMENTI ---
    elif selection == "Situazione Allevamenti":
        st.subheader("Situatione Allevamenti")
        
        # Reload DB data
        lotti_db = get_lotti()
        import datetime
        from database import update_lotto

        # --- HELPERS ---
        STRUTTURA_ALLEVAMENTI = {
            "Cortefranca": [1, 2],
            "Mussano": [1],
            "Passirano": [1, 2, 3],
            "Tarantasca": [1],
            "Tonengo": [1, 2, 3, 4, 5, 6],
            "Villafranca": [1, 2, 3, 4]
        }
        
        # Helper per trovare lotti attivi (lista)
        def get_active_lotti_list(allevamento, shed_num):
            res = []
            str_shed = str(shed_num)
            if not lotti_db: return []
            for lotto in lotti_db:
                 is_active = lotto.get('Attivo') == 1 or lotto.get('Attivo') is True
                 if is_active and lotto.get('Allevamento') == allevamento:
                     # Logica di match: Esatto o Inizia per (es. 1 -> 1A, 1B)
                     # Per evitare che 1 matchi 10, verifichiamo che il resto non sia cifra
                     cap = str(lotto.get('Capannone'))
                     if cap == str_shed:
                         res.append(lotto)
                     elif cap.startswith(str_shed):
                         suffix = cap[len(str_shed):]
                         if suffix and not suffix[0].isdigit():
                             res.append(lotto)
            return res

        def calculate_age_weeks(year_start, week_start):
             try:
                today = datetime.date.today()
                start_date = datetime.date.fromisocalendar(int(year_start), int(week_start), 1)
                days_diff = (today - start_date).days
                return max(0, int(days_diff / 7))
             except:
                return 0

        # Callback per aggiornamento immediato
        def on_change_update(lid, field, key):
            new_val = st.session_state[key]
            update_lotto(lid, {field: new_val})
            st.toast(f"Aggiornato {field}!", icon="💾")

        # --- INTERFACCIA ---
        
        # Init selection (store Key instead of ID to support multi-lotto sheds)
        if 'selected_shed_key' not in st.session_state:
            st.session_state['selected_shed_key'] = None

        sorted_farms = sorted(STRUTTURA_ALLEVAMENTI.keys())
        
        # Definiamo le opzioni per la genetica (solo Standard)
        target_standard_cols = ["JA57 STANDARD", "JA57K STANDARD", "JA57KI STANDARD", "JA87 STANDARD", "RANGER STANDARD", "ROSS 308 STANDARD"]
        valid_genetics = [c for c in target_standard_cols if c in colonne_razze]
        
        for farm in sorted_farms:
            with st.container(border=True):
                st.markdown(f"### 🏠 {farm}")
                sheds = STRUTTURA_ALLEVAMENTI[farm]
                
                cols = st.columns(len(sheds) if len(sheds) < 8 else 8)
                
                for i, shed in enumerate(sheds):
                    idx_col = i % 8 
                    with cols[idx_col]:
                        # Controlliamo se ci sono lotti attivi per questo capannone (anche 1A, 1B...)
                        all_active_lotti = get_active_lotti_list(farm, shed)
                        
                        # FILTRO: Mostriamo verde solo se il lotto è effettivamente partito (Età > 0)
                        started_lotti = []
                        for l in all_active_lotti:
                            age = calculate_age_weeks(l.get("Anno_Start", 2025), l.get("Sett_Start", 1))
                            if age >= 24:
                                started_lotti.append(l)
                        
                        active_lotti = started_lotti
                        
                        btn_label = f"Cap. {shed}"
                        btn_key_id = f"btn_{farm}_{shed}" # Unique ID for button
                        shed_key_val = f"{farm}|{shed}"   # Value to store
                        
                        if active_lotti:
                            is_selected = (st.session_state['selected_shed_key'] == shed_key_val)
                            icon = "🟢" if not is_selected else "✅"
                            
                            if st.button(f"{icon} {btn_label}", key=btn_key_id, use_container_width=True):
                                if st.session_state['selected_shed_key'] == shed_key_val:
                                    st.session_state['selected_shed_key'] = None
                                else:
                                    st.session_state['selected_shed_key'] = shed_key_val
                                st.rerun()
                        else:
                            st.button(f"⚪ {btn_label}", key=btn_key_id, disabled=True, use_container_width=True)

                # --- AREA DETTAGLIO ---
                current_selection = st.session_state['selected_shed_key']
                if current_selection and current_selection.startswith(farm + "|"):
                     _, sel_shed = current_selection.split("|")
                     
                     # Find fresh data
                     # FILTRO: Anche qui filtriamo solo quelli partiti (Età > 0)
                     all_lotti_shed = get_active_lotti_list(farm, sel_shed)
                     lotti_to_show = []
                     for l in all_lotti_shed:
                         age = calculate_age_weeks(l.get("Anno_Start", 2025), l.get("Sett_Start", 1))
                         if age >= 24:
                             lotti_to_show.append(l)
                     
                     if lotti_to_show:
                         st.divider()
                         st.markdown(f"**✏️ Modifica Dettagli - {farm} Capannone {sel_shed}**")
                         
                         for idx_l, current_lotto in enumerate(lotti_to_show):
                             sel_id = current_lotto['id']
                             # Visual cues se ci sono più lotti (es. 1A, 1B)
                             if len(lotti_to_show) > 1:
                                 st.markdown(f"**🔹 Sezione: {current_lotto['Capannone']}**")
                             
                             # Form Editabile
                             c1, c2, c3, c4 = st.columns(4)
                             
                             # 1. Genetica Gallina (SOLO STANDARD)
                             with c1:
                                 curr_gen = current_lotto.get('Razza')
                                 # Fallback if current val not in valid list
                                 if curr_gen not in valid_genetics and curr_gen:
                                     local_opts = valid_genetics + [curr_gen]
                                 else:
                                     local_opts = valid_genetics
                                     
                                 idx_gen = local_opts.index(curr_gen) if curr_gen in local_opts else 0
                                 st.selectbox(
                                     "Gen. Gallina", 
                                     local_opts, 
                                     index=idx_gen,
                                     key=f"sel_razza_{sel_id}",
                                     on_change=on_change_update,
                                     args=(sel_id, "Razza", f"sel_razza_{sel_id}")
                                 )

                             # 2. Genetica Gallo
                             with c2:
                                 curr_gallo = current_lotto.get('Razza_Gallo', '') or ''
                                 st.text_input(
                                     "Gen. Gallo",
                                     value=curr_gallo,
                                     key=f"txt_gallo_{sel_id}",
                                     on_change=on_change_update,
                                     args=(sel_id, "Razza_Gallo", f"txt_gallo_{sel_id}")
                                 )

                             # 3. Prodotto
                             with c3:
                                  opt_prod = ["Granpollo", "Pollo70", "Color Yeald", "Ross"]
                                  curr_prod = current_lotto.get('Prodotto', 'Granpollo')
                                  idx_prod = opt_prod.index(curr_prod) if curr_prod in opt_prod else 0
                                  st.selectbox(
                                      "Prodotto",
                                      opt_prod,
                                      index=idx_prod,
                                      key=f"sel_prod_{sel_id}",
                                      on_change=on_change_update,
                                      args=(sel_id, "Prodotto", f"sel_prod_{sel_id}")
                                  )

                             # 4. Capi
                             with c4:
                                 st.number_input(
                                     "Capi Presenti",
                                     step=100,
                                     value=current_lotto.get('Capi', 0),
                                     key=f"num_capi_{sel_id}",
                                     on_change=on_change_update,
                                     args=(sel_id, "Capi", f"num_capi_{sel_id}")
                                 )
                             
                             # Row 2
                             c5, c6, c7, c8 = st.columns(4)
                             with c5:
                                  st.number_input(
                                     "Anno Acc.",
                                     step=1,
                                     value=current_lotto.get("Anno_Start", 2025),
                                     key=f"num_anno_{sel_id}",
                                     on_change=on_change_update,
                                     args=(sel_id, "Anno_Start", f"num_anno_{sel_id}")
                                 )
                             with c6:
                                  st.number_input(
                                     "Sett. Acc.",
                                     min_value=1, max_value=52,
                                     value=current_lotto.get("Sett_Start", 1),
                                     key=f"num_sett_{sel_id}",
                                     on_change=on_change_update,
                                     args=(sel_id, "Sett_Start", f"num_sett_{sel_id}")
                                 )
                             
                             age_w = calculate_age_weeks(current_lotto.get("Anno_Start", 2025), current_lotto.get("Sett_Start", 1))
                             with c7:
                                 st.metric("Età (Sett.)", f"{age_w}")
                             
                             with c8:
                                 if st.button("🗑️ Elimina", key=f"btn_del_{sel_id}", type="primary"):
                                     update_lotto(sel_id, {"Attivo": False})
                                     # Don't reset selection immediately to allow viewing others
                                     st.rerun()
                             
                             st.divider()

        st.divider()
        
        # TABELLA DI GESTIONE (VECCHIA)
        # TABELLA DI GESTIONE (VECCHIA)
        with st.expander("🛠️ Ispeziona/Gestisci Lotti nel Database (Storico/Modifica)"):
            if lotti_db:
                df_lotti = pd.DataFrame(lotti_db).sort_values(by=['Anno_Start', 'Sett_Start']).reset_index(drop=True)
                
                # --- CALCULATE DEFAULT END DATE ---
                if 'Data_Fine_Prevista' not in df_lotti.columns:
                    df_lotti['Data_Fine_Prevista'] = None
                
                # Default Logic: Start + 64 Weeks
                def calc_end(row):
                    val = row.get('Data_Fine_Prevista')
                    if pd.notna(val) and str(val).strip():
                        return str(val).strip()
                    try:
                        y = int(row['Anno_Start']) if pd.notna(row['Anno_Start']) else 2025
                        w = int(row['Sett_Start']) if pd.notna(row['Sett_Start']) else 1
                        import datetime
                        # Use Monday of start week + 64 weeks
                        start_d = datetime.date.fromisocalendar(y, w, 1)
                        end_d = start_d + datetime.timedelta(weeks=64)
                        y_e, w_e, _ = end_d.isocalendar()
                        return f"{y_e}/{w_e:02d}"
                    except:
                        return None
                
                df_lotti['Data_Fine_Prevista'] = df_lotti.apply(calc_end, axis=1)

                if 'id' in df_lotti.columns:
                    column_config = {
                        "Allevamento": st.column_config.SelectboxColumn("All.", options=list(STRUTTURA_ALLEVAMENTI.keys()), required=True),
                        "Capannone": st.column_config.TextColumn("Cap.", required=True),
                        "Razza": st.column_config.SelectboxColumn("Genetica", options=colonne_razze, required=True),
                        "Razza_Gallo": st.column_config.TextColumn("Gen. Gallo"),
                        "Prodotto": st.column_config.SelectboxColumn("Prod.", options=["Granpollo", "Pollo70", "Color Yeald", "Ross"], required=True),
                        "Capi": st.column_config.NumberColumn("Capi", step=100),
                        "Anno_Start": st.column_config.NumberColumn("Anno", format="%d"),
                        "Sett_Start": st.column_config.NumberColumn("Sett."),
                        "Data_Fine_Prevista": st.column_config.TextColumn(
                            "Tm. Prod.", 
                            help="Fine Produzione (YYYY/WW). Default: +64 sett.",
                            validate=r"^20[2-9][0-9]/[0-5][0-9]$" # Basic YYYY/WW regex
                        ),
                        "Attivo": st.column_config.CheckboxColumn("On")
                    }
                    
                    edited_df = st.data_editor(
                        df_lotti, 
                        column_config=column_config,
                        column_order=["Allevamento", "Capannone", "Razza", "Razza_Gallo", "Prodotto", "Capi", "Anno_Start", "Sett_Start", "Data_Fine_Prevista", "Attivo"], 
                        num_rows="dynamic", 
                        use_container_width=True, 
                        hide_index=True, 
                        key="editor_lotti"
                    )
                    
                    if st.button("💾 Salva modifiche alla programmazione capannoni", type="primary"):
                        original_ids = set(l['id'] for l in lotti_db)
                        current_ids = set(edited_df['id'].dropna().astype(int))
                        
                        # 1. DELETE
                        ids_to_delete = original_ids - current_ids
                        for mid in ids_to_delete:
                            delete_lotto(int(mid))
                        
                        # 2. UPDATE & NEW
                        original_dict = {l['id']: l for l in lotti_db}
                        for index, row in edited_df.iterrows():
                            # NEW (No ID or NaN)
                            if pd.isna(row.get('id')):
                                new_data = row.to_dict()
                                # Basic Validation
                                if new_data.get("Allevamento"):
                                    # Ensure defaults
                                    if not new_data.get("Anno_Start"): new_data["Anno_Start"] = 2025
                                    if not new_data.get("Sett_Start"): new_data["Sett_Start"] = 1
                                    add_lotto(new_data)
                            
                            # UPDATE (Has ID)
                            else:
                                mid = int(row['id'])
                                if mid in original_dict:
                                    orig = original_dict[mid]
                                    diff = {}
                                    check_cols = ["Allevamento", "Capannone", "Razza", "Razza_Gallo", "Prodotto", "Capi", "Anno_Start", "Sett_Start", "Data_Fine_Prevista", "Attivo"]
                                    for k in check_cols:
                                         if k not in row: continue
                                         val_new = row.get(k)
                                         val_old = orig.get(k)
                                         
                                         # Normalize types for comparison
                                         if k in ["Capi", "Anno_Start", "Sett_Start"]:
                                             try: 
                                                 val_new = int(val_new) if pd.notna(val_new) else 0
                                                 val_old = int(val_old) if pd.notna(val_old) else 0
                                             except: pass
                                         
                                         if val_new != val_old:
                                             diff[k] = val_new
                                    
                                    if diff:
                                        update_lotto(mid, diff)
                        
                        st.success("Programmazione aggiornata!")
                        time.sleep(1)
                        st.rerun()
            else:
                st.info("Nessun lotto attivo nel DB.")

    # --- SEZIONE: STORICO GENETICO ---

    elif selection == "Storico Genetico":
        st.subheader("🧬 Storico deposizione per genetica")
        st.info("Modifica i valori e clicca su 'Salva' al termine.")
        
        # 1. Ensure Columns in MAIN DF (Critico per il salvataggio di nuove colonne come Ross)
        target_standard_cols = [
            "JA57 STANDARD", 
            "JA57K STANDARD", 
            "JA57KI STANDARD", 
            "JA87 STANDARD", 
            "RANGER STANDARD",
            "ROSS 308 STANDARD"
        ]
        
        for col in target_standard_cols:
            if col not in df_curve.columns:
                df_curve[col] = 0.0
        
        # Filtro dati: solo prime 40 righe (0-39)
        # Usiamo una copia per il confronto, ma l'update finale lo facciamo su df_curve
        df_editor = df_curve.iloc[:40].copy()
        
        # Identifichiamo quali di queste esistono nel DF (ora dovrebbero esserci tutte le target)
        cols_standard = [c for c in target_standard_cols if c in df_editor.columns]
        
        # Identifichiamo le colonne rimanenti
        cols_excluded_display = ['W', 'Unnamed', 'SELEZIONA', 'NUM GALLINE', 'UOVA SETTIMANALI']
        cols_remaining = [
            c for c in df_editor.columns 
            if c not in cols_standard 
            and not any(x in str(c) for x in cols_excluded_display)
            and "GOLDEN" not in str(c).upper()
        ]
        
        # --- FUNZIONE CONFIG HELPER ---
        def get_col_config(columns):
            cfg = {}
            for col_name in columns:
                if col_name == "W":
                     cfg[col_name] = st.column_config.NumberColumn(
                        label="Sett.",
                        help="Settimana di vita",
                        required=True,
                        disabled=True, 
                        format="%d",
                        step=1,
                        width="small"
                    )
                else:
                    cfg[col_name] = st.column_config.NumberColumn(
                        label=col_name,
                        required=True,
                        step=0.01,
                        width="medium"
                    )
            return cfg

        def save_diff_to_db(orig, new_df):
            from sqlalchemy import text
            try:
                with engine.connect() as conn:
                    for idx, row in new_df.iterrows():
                        if idx in orig.index:
                            orig_row = orig.loc[idx]
                            # Simple equality check appropriate for this context
                            if not row.equals(orig_row):
                                 w_val = row['W']
                                 changes = {}
                                 for col in new_df.columns:
                                     if col == 'W': continue
                                     if row[col] != orig_row[col]:
                                         changes[col] = row[col]
                                 
                                 if changes:
                                     set_parts = [f'"{k}" = :v{i}' for i, k in enumerate(changes.keys())]
                                     sql = f'UPDATE standard_curves SET {", ".join(set_parts)} WHERE "W" = :w'
                                     params = {f'v{i}': v for i, v in enumerate(changes.values())}
                                     params['w'] = w_val
                                     conn.execute(text(sql), params)
                    conn.commit()
            except Exception as e:
                st.error(f"DB Update Error: {e}")

        # --- TABELLA 1: STANDARD ---
        st.markdown("### STANDARD JA57 / JA87 / RANGER / ROSS")
        
        df_std_orig = df_editor[['W'] + cols_standard].copy()
        
        edited_std = st.data_editor(
            df_std_orig,
            column_config=get_col_config(['W'] + cols_standard),
            use_container_width=True,
            num_rows="fixed",
            hide_index=True, 
            key="editor_curve_std"
        )
        
        # --- TABELLA 2: STORICO RAZZE ---
        st.markdown("### Storico razze")
        
        df_hist_orig = df_editor[['W'] + cols_remaining].copy()
        
        edited_hist = st.data_editor(
            df_hist_orig,
            column_config=get_col_config(['W'] + cols_remaining),
            use_container_width=True,
            num_rows="fixed",
            hide_index=True, 
            key="editor_curve_hist"
        )
        
        # Legenda
        st.markdown("""
        <div style="display: flex; gap: 20px; margin-top: 10px; margin-bottom: 20px; font-size: 14px;">
          <div style="display: flex; align-items: center;">
            <div style="width: 15px; height: 15px; background-color: #FDFD96; margin-right: 8px; border: 1px solid #ccc; border-radius: 3px;"></div>
            <span>Dati Standard</span>
          </div>
          <div style="display: flex; align-items: center;">
            <div style="width: 15px; height: 15px; background-color: #AEC6CF; margin-right: 8px; border: 1px solid #ccc; border-radius: 3px;"></div>
            <span>Dati Storici</span>
          </div>
        </div>
        """, unsafe_allow_html=True)

        if st.button("💾 Salva Modifiche", type="primary"):
            try:
                # 1. Standard
                df_curve.update(edited_std)
                save_diff_to_db(df_std_orig, edited_std)
                
                # 2. History
                df_curve.update(edited_hist)
                save_diff_to_db(df_hist_orig, edited_hist)
                
                # Clear Cache & Confirmation
                carica_dati_v20.clear()
                st.success("Tutte le modifiche sono state salvate con successo!")
                time.sleep(1)
                st.rerun()
            except Exception as e:
                st.error(f"Errore salvataggio: {e}")
