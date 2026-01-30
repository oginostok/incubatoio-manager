import streamlit as st
import pandas as pd
import altair as alt
import datetime
import itertools
from utils.helpers import carica_dati_v20, pulisci_percentuale, formatta_numero
from database import (get_lotti, init_trading_db_tables, get_trading_config, 
                      add_trading_config, get_trading_data, save_trading_data_bulk, 
                      init_default_trading_config, update_trading_config, delete_trading_config)

def get_start_date_from_year_week(year, week):
    """Restituisce il lunedì della settimana specificata"""
    return datetime.date.fromisocalendar(year, week, 1)

# Removed unused callbacks

def page_produzioni_uova():
    # --- CARICAMENTO DATI E SETUP ---
    dati = carica_dati_v20()
    if isinstance(dati, str):
        st.error(f"Errore CSV: {dati}")
        st.stop()
    else:
        df_curve = dati

    # Defaults
    if 'settings_lifecycle' not in st.session_state:
        st.session_state['settings_lifecycle'] = {'min': 25, 'max': 64}
    
    LIMITE_MIN_ETA = st.session_state['settings_lifecycle']['min']
    LIMITE_MAX_ETA = st.session_state['settings_lifecycle']['max']
    
    today = datetime.date.today()
    monday_of_week = today - datetime.timedelta(days=today.weekday())
    
    # Init Date Session State
    if 'prod_start_date' not in st.session_state:
        st.session_state['prod_start_date'] = monday_of_week
    if 'prod_end_date' not in st.session_state:
        # Default to end of current year (Week 52 Sunday)
        y_curr, _, _ = today.isocalendar()
        try:
             st.session_state['prod_end_date'] = datetime.date.fromisocalendar(y_curr, 52, 7)
        except:
             st.session_state['prod_end_date'] = datetime.date(y_curr, 12, 31)

    # --- SIDEBAR ---
    with st.sidebar:

        # Custom CSS for compact radio buttons
        st.markdown("""
            <style>
            /* Force full width on the Streamlit container for this key */
            /* Force full width on the Streamlit container for this key */
            .st-key-week_selector_radio, .st-key-vis_mode_radio, .st-key-mode_nav_radio {
                width: 100% !important;
            }

            /* Container styling */
            div[role="radiogroup"] {
                gap: 5px !important;
                display: flex;
                flex-direction: column;
                width: 100% !important;
            }
            
            /* --- TIMELINE STYLE (For Week Selector) --- */
            /* Default: Green (Selected) */
            .st-key-week_selector_radio div[role="radiogroup"] label {
                background-color: #28a745 !important;
                color: white !important;
                padding: 0px 10px !important;
                border-radius: 5px;
                border: 1px solid #28a745 !important;
                margin-bottom: 0px !important;
                height: 25px !important;
                min-height: 25px !important;
                width: 100% !important;
                display: flex !important;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            .st-key-week_selector_radio div[role="radiogroup"] label p {
                color: white !important;
                font-size: 0.8rem !important;
                font-weight: 600;
                margin: 0 !important;
            }
            /* Items AFTER selection: Grey */
            .st-key-week_selector_radio div[role="radiogroup"] label:has(input:checked) ~ label {
                background-color: #f0f2f6 !important;
                border: 1px solid #e0e0e0 !important;
            }
            .st-key-week_selector_radio div[role="radiogroup"] label:has(input:checked) ~ label p {
                color: #31333F !important;
            }
            .st-key-week_selector_radio div[role="radiogroup"] label:has(input:checked) ~ label p {
                color: #31333F !important;
            }
            .st-key-week_selector_radio div[role="radiogroup"] label > div:first-child {
                display: none !important;
            }

            /* --- HEADER TOGGLE STYLE (For Dashboard/Trading) --- */
            /* Default: Grey (Unselected) */
            .st-key-mode_nav_radio div[role="radiogroup"] label {
                background-color: #f0f2f6 !important;
                color: #31333F !important;
                padding: 0px 10px !important;
                border-radius: 5px;
                border: 1px solid #e0e0e0 !important;
                margin-bottom: 0px !important;
                height: 40px !important;
                min-height: 40px !important;
                width: 100% !important;
                display: flex !important;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            .st-key-mode_nav_radio div[role="radiogroup"] label p {
                color: #31333F !important;
                font-size: 1rem !important;
                font-weight: 600;
                margin: 0 !important;
            }
            /* Selected: Blue (Dashboard) / Purple (Trading) - Let's use standard Green or customize */
            .st-key-mode_nav_radio div[role="radiogroup"] label:has(input:checked) {
                background-color: #28a745 !important; /* Green for main Nav */
                border: 1px solid #28a745 !important;
            }
            .st-key-mode_nav_radio div[role="radiogroup"] label:has(input:checked) p {
                color: white !important;
            }
            .st-key-mode_nav_radio div[role="radiogroup"] label > div:first-child {
                 display: none !important;
            }

            /* --- TOGGLE STYLE (For Vis Mode) --- */
            /* Default: Grey (Unselected) */
            .st-key-vis_mode_radio div[role="radiogroup"] label {
                background-color: #f0f2f6 !important;
                color: #31333F !important;
                padding: 0px 10px !important;
                border-radius: 5px;
                border: 1px solid #e0e0e0 !important;
                margin-bottom: 0px !important;
                height: 35px !important;
                min-height: 35px !important;
                width: 100% !important;
                display: flex !important;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            .st-key-vis_mode_radio div[role="radiogroup"] label p {
                color: #31333F !important;
                font-size: 1rem !important;
                font-weight: 600;
                margin: 0 !important;
            }
            /* Selected: Green */
            .st-key-vis_mode_radio div[role="radiogroup"] label:has(input:checked) {
                background-color: #28a745 !important;
                border: 1px solid #28a745 !important;
            }
            .st-key-vis_mode_radio div[role="radiogroup"] label:has(input:checked) p {
                color: white !important;
            }
            .st-key-vis_mode_radio div[role="radiogroup"] label > div:first-child {
                 display: none !important;
            }

            /* Vega Tooltip Customization */
            #vg-tooltip-element {
                white-space: pre-wrap !important;
                font-family: inherit !important;
                font-size: 0.8rem !important;
            }
            </style>
        """, unsafe_allow_html=True)

        if st.button("⬅️ Torna alla Home"):
            st.session_state['current_page'] = 'home'
            st.rerun()
        
        st.divider()
        
        # Mode Toggle
        if 'egg_view_mode' not in st.session_state: st.session_state['egg_view_mode'] = 'dashboard'
        
        # Sync Radio with Session State
        # We use a callback or just standard logic. 
        # Better: Use the radio state as source of truth if possible, or sync.
        
        # Map technical keys to labels
        mode_map_inv = {"dashboard": "📊 Dashboard Uova", "trading": "💰 Acquisto e Vendita"}
        mode_map = {v: k for k, v in mode_map_inv.items()}
        
        current_label = mode_map_inv.get(st.session_state['egg_view_mode'], "📊 Dashboard Uova")
        
        selected_mode_label = st.radio(
            "Sezione:",
            ["📊 Dashboard Uova", "💰 Acquisto e Vendita"],
            index=0 if st.session_state['egg_view_mode'] == 'dashboard' else 1,
            label_visibility="collapsed",
            key="mode_nav_radio"
        )
        
        # Update State
        new_mode = mode_map[selected_mode_label]
        if new_mode != st.session_state['egg_view_mode']:
            st.session_state['egg_view_mode'] = new_mode
            st.rerun()

        st.divider()
        # Toggle Grafico / Tabella
        st.radio("Visualizzazione Totali:", ["Grafico", "Tabella"], horizontal=True, key="vis_mode_radio")
        st.divider()
        st.header("📅 Periodo Analisi")
        st.caption("Seleziona fino a quale settimana visualizzare:")
        
        # Current info
        y_curr, w_curr, _ = today.isocalendar()
        
        # State for max week
        if 'selected_max_week' not in st.session_state:
            st.session_state['selected_max_week'] = 52
            
        # Loop weeks
        # Fixed to 52 as requested
        max_weeks = 52
            
        for w in range(w_curr, max_weeks + 1):
            pass # Replacement happens below
            
        weeks_options = list(range(w_curr, 53)) + ["Tutto"]

        default_idx = len(weeks_options) - 1
        
        def format_func(opt):
             if opt == "Tutto": return "Tutto"
             return f"Sett. {opt:02d} / {y_curr}"
        
        sel_week = st.radio(
            "Seleziona settimana",
            weeks_options,
            format_func=format_func,
            index=default_idx,
            label_visibility="collapsed",
            key="week_selector_radio"
        )
        
        # Logic update
        st.session_state['selected_max_week'] = sel_week
        
        if sel_week == "Tutto":
             st.session_state['prod_end_date'] = today + datetime.timedelta(days=730)
        else:
            try:
                 sunday = datetime.date.fromisocalendar(y_curr, sel_week, 7)
                 st.session_state['prod_end_date'] = sunday
            except: pass

    # --- MAIN CONTENT ---
    if st.session_state['egg_view_mode'] == 'trading':
        init_trading_db_tables()
        init_default_trading_config() # Seed defaults
        
        # --- SEED COLOR YEALD SALES ---
        # User request: Pre-fill Color Yeald Sales with 42,000 if not present
        cfgs = get_trading_config("vendita")
        cy_cfg = next((c for c in cfgs if c.prodotto == "Color Yeald"), None)
        if not cy_cfg:
             add_trading_config("vendita", "Cliente Standard", "Color Yeald")
        
        # Check data
        # We check if there is ANY data for Color Yeald Sales. If not, seed it.
        # This is a bit aggressive, but user asked to "precompila". 
        # To avoid overwriting meaningful data, we only check if empty or zero?
        # Let's check a specific recent key or just check if the list is empty for CY.
        raw_sales = get_trading_data("vendita")
        cy_sales = [r for r in raw_sales if r.prodotto == "Color Yeald"]
        
        if not cy_sales:
             # Bulk insert 42000 for all 52 weeks of current year (and next?)
             # Let's do it for the years in the timeline (current + 1)
             updates_seed = []
             y_curr, _, _ = today.isocalendar()
             # Seed for this year and next year to be safe
             for y_seed in [y_curr, y_curr+1]:
                 for w_seed in range(1, 53):
                     updates_seed.append({
                         "anno": y_seed,
                         "settimana": w_seed,
                         "azienda": "Cliente Standard",
                         "prodotto": "Color Yeald",
                         "quantita": 42000
                     })
             save_trading_data_bulk("vendita", updates_seed)
             st.toast("Dati Vendita Color Yeald precompilati (42.000)!")
             st.rerun()
        
        st.title("💰 Acquisto e Vendita Uova")

        # helper for week generation
        def get_fy_fw(d):
            y, w, _ = d.isocalendar()
            return y, w

        start_date_curr = today - datetime.timedelta(days=today.weekday())
        weeks_list = []
        curr = start_date_curr
        for _ in range(52):
            y, w = get_fy_fw(curr)
            weeks_list.append({"Anno": y, "Settimana": w, "DateRef": curr})
            curr += datetime.timedelta(days=7)
        
        df_dates = pd.DataFrame(weeks_list)
        df_dates['Periodo'] = df_dates.apply(lambda x: f"{x['Anno']} - {x['Settimana']:02d}", axis=1)

        def render_section(tipo_transazione, title_emoji):
            st.divider()
            c1, c2 = st.columns([3, 1])
            with c1: st.subheader(f"{title_emoji} {tipo_transazione.capitalize()} Uova")
            
            # --- COLUMN MANAGEMENT ---
            with c2:
                with st.popover("⚙️ Gestisci Colonne"):
                    st.write("**Aggiungi Colonna**")
                    new_az = st.text_input("Azienda", key=f"new_az_{tipo_transazione}")
                    new_prod = st.selectbox("Prodotto", ["Granpollo", "Pollo70", "Color Yeald", "Ross"], key=f"new_prod_{tipo_transazione}")
                    if st.button("Aggiungi", key=f"btn_add_{tipo_transazione}"):
                        if new_az:
                            add_trading_config(tipo_transazione, new_az, new_prod)
                            st.success("Aggiunto!")
                            st.rerun()
                    
                    st.divider()
                    st.write("**Modifica / Elimina**")
                    configs = get_trading_config(tipo_transazione)
                    for c in configs:
                        with st.expander(f"{c.azienda} - {c.prodotto}"):
                            edit_az = st.text_input("Nome Azienda", value=c.azienda, key=f"edit_az_{c.id}")
                            edit_prod = st.selectbox("Prodotto", ["Granpollo", "Pollo70", "Color Yeald", "Ross"], index=["Granpollo", "Pollo70", "Color Yeald", "Ross"].index(c.prodotto) if c.prodotto in ["Granpollo", "Pollo70", "Color Yeald", "Ross"] else 0, key=f"edit_prod_{c.id}")
                            
                            c_col1, c_col2 = st.columns(2)
                            with c_col1:
                                if st.button("Salva", key=f"save_edit_{c.id}"):
                                    update_trading_config(c.id, edit_az, edit_prod)
                                    st.success("Modificato!")
                                    st.rerun()
                            with c_col2:
                                if st.button("Elimina", key=f"del_edit_{c.id}", type="primary"):
                                    delete_trading_config(c.id)
                                    st.success("Eliminato!")
                                    st.rerun()

            # Load Params and Data
            configs = get_trading_config(tipo_transazione) # list of TradingConfig objects
            raw_data = get_trading_data(tipo_transazione) # list of TradingData objects
            
            # Prepare Config Map: "Azienda - Prodotto"
            cols_map = []
            for c in configs:
                col_name = f"{c.azienda} - {c.prodotto}"
                cols_map.append({"header": col_name, "azienda": c.azienda, "prodotto": c.prodotto})
            
            # Build Data Grid
            data_lookup = {}
            for r in raw_data:
                k = (r.anno, r.settimana)
                c_name = f"{r.azienda} - {r.prodotto}"
                if k not in data_lookup: data_lookup[k] = {}
                data_lookup[k][c_name] = r.quantita
            
            grid_data = []
            for _, row_d in df_dates.iterrows():
                row_obj = {
                    "Anno": row_d['Anno'],
                    "Settimana": row_d['Settimana'],
                    "Periodo": row_d['Periodo']
                }
                k = (row_d['Anno'], row_d['Settimana'])
                vals = data_lookup.get(k, {})
                
                for cm in cols_map:
                    row_obj[cm['header']] = vals.get(cm['header'], 0)
                
                grid_data.append(row_obj)
            
            df_grid = pd.DataFrame(grid_data)
            
            # Config Columns
            col_config = {
                "Anno": None, # Hide
                "Settimana": None, # Hide
                "Periodo": st.column_config.TextColumn("Periodo", disabled=True, width="medium"),
            }
            for cm in cols_map:
                col_config[cm['header']] = st.column_config.NumberColumn(cm['header'], format="%d")

            edited_df = st.data_editor(
                df_grid,
                column_config=col_config,
                hide_index=True,
                use_container_width=True,
                key=f"editor_{tipo_transazione}",
                height=400
            )

            if st.button(f"💾 Salva {tipo_transazione.capitalize()}", key=f"save_{tipo_transazione}"):
                updates = []
                for _, row in edited_df.iterrows():
                    anno = row['Anno']
                    sett = row['Settimana']
                    for cm in cols_map:
                        val = row[cm['header']]
                        updates.append({
                            "anno": anno,
                            "settimana": sett,
                            "azienda": cm['azienda'],
                            "prodotto": cm['prodotto'],
                            "quantita": val
                        })
                
                save_trading_data_bulk(tipo_transazione, updates)
                st.success("Salvataggio completato!")

        render_section("acquisto", "📥")
        render_section("vendita", "📤")

        return # STOP EXECUTION HERE FOR TRADING MODE

    st.title("🥚 PRODUZIONE UOVA")
    st.subheader("📈 Analisi Previsionale")
    
    # Date effettive per i filtri
    d_start = st.session_state['prod_start_date']
    d_end = st.session_state['prod_end_date']

    if 'lotti' not in st.session_state:
        # Compatibility (though we should strictly use DB)
        st.session_state['lotti'] = []

    # Use DB source of truth
    lotti_db = get_lotti()
    lotti_attivi = [l for l in lotti_db if l.get('Attivo', True)]
    
    if not lotti_attivi:
        st.warning("Nessun lotto attivo. Vai su 'ALLEVAMENTI' per inserire i lotti.")
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
                            
                        # CHECK FINE PRODUZIONE
                        fine_prod = lotto.get('Data_Fine_Prevista')
                        if fine_prod and '/' in str(fine_prod):
                             try:
                                 fy, fw = map(int, str(fine_prod).strip().split('/'))
                                 if int(anno_curr) > fy or (int(anno_curr) == fy and int(sett_reale) > fw):
                                     continue
                             except: pass
                        
                        date_obj = get_start_date_from_year_week(int(anno_curr), int(sett_reale))

                        # --- FILTRO DATA ---
                        if date_obj < d_start or date_obj > d_end:
                            continue

                        if anno_curr >= 2025:
                            uova_esatte = round((qta * perc * 7) / 100) * 100
                            periodo_label = f"{int(anno_curr)} - {int(sett_reale):02d}"
                            nome_fonte = f"{lotto['Allevamento']} {lotto['Capannone']}"
                            
                            lista_dati.append({
                                "Periodo": periodo_label, 
                                "SortDate": date_obj, 
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
            df_tot = df_tot.sort_values(by=["SortDate"])

            # --- TOGGLE VISUALIZZAZIONE ---
            vis_mode = st.session_state.get("vis_mode_radio", "Grafico")
            
            # --- GLOBAL CHECKBOX INCLUDE ACQUISTI ---
            # Moved up to be accessible by Table View
            include_acquisti = st.checkbox("Includi Acquisti/Vendite", value=True)

            if vis_mode == "Tabella":
                st.subheader("📋 Tabella Riepilogo Settimanale")
                
                # Base DF
                df_calc = df_tot.copy()
                
                if include_acquisti:
                    # 1. ACQUISTI
                    trading_acq = get_trading_data("acquisto")
                    to_add_acq = []
                    if trading_acq:
                        for row in trading_acq:
                             if row.quantita > 0:
                                 try:
                                     s_date = datetime.date.fromisocalendar(row.anno, row.settimana, 1)
                                     if s_date < d_start or s_date > d_end: continue
                                     periodo = f"{row.anno} - {row.settimana:02d}"
                                     to_add_acq.append({
                                         "Periodo": periodo,
                                         "Prodotto": row.prodotto,
                                         "SortDate": s_date,
                                         "Anno": row.anno,
                                         "Settimana": row.settimana,
                                         "Uova": row.quantita
                                     })
                                 except: pass
                    
                    if to_add_acq:
                        df_acq = pd.DataFrame(to_add_acq)
                        # Sum Uova (Positive)
                        df_acq_grouped = df_acq.groupby(["Anno", "Settimana", "SortDate", "Prodotto"])["Uova"].sum().reset_index()
                        df_calc = pd.concat([df_calc, df_acq_grouped], ignore_index=True)

                    # 2. VENDITE (Subtract)
                    trading_ven = get_trading_data("vendita")
                    to_subtract_ven = []
                    if trading_ven:
                        for row in trading_ven:
                             if row.quantita > 0:
                                 try:
                                     s_date = datetime.date.fromisocalendar(row.anno, row.settimana, 1)
                                     if s_date < d_start or s_date > d_end: continue
                                     periodo = f"{row.anno} - {row.settimana:02d}"
                                     to_subtract_ven.append({
                                         "Periodo": periodo,
                                         "Prodotto": row.prodotto,
                                         "SortDate": s_date,
                                         "Anno": row.anno,
                                         "Settimana": row.settimana,
                                         "Uova": -row.quantita # NEGATIVE
                                     })
                                 except: pass
                    
                    if to_subtract_ven:
                        df_ven = pd.DataFrame(to_subtract_ven)
                        df_ven_grouped = df_ven.groupby(["Anno", "Settimana", "SortDate", "Prodotto"])["Uova"].sum().reset_index()
                        df_calc = pd.concat([df_calc, df_ven_grouped], ignore_index=True)

                # Pivot Result (Summing Positive Prod/Acq and Negative Vendita)
                df_table = df_calc.groupby(["Anno", "Settimana", "SortDate", "Prodotto"])["Uova"].sum().reset_index()
                
                # Exclude Week 53 just in case
                df_table = df_table[df_table['Settimana'] != 53]

                df_table = df_table.pivot_table(index=['Anno', 'Settimana', 'SortDate'], columns='Prodotto', values='Uova', aggfunc='sum').fillna(0).reset_index()
                df_table = df_table.sort_values('SortDate')
                
                # Format
                df_table['Anno/Settimana'] = df_table.apply(lambda x: f"{int(x['Anno'])} / {int(x['Settimana']):02d}", axis=1)
                
                # Ensure targets
                targets = ["Granpollo", "Pollo70", "Color Yeald", "Ross"]
                for t in targets:
                    if t not in df_table.columns: df_table[t] = 0
                    
                # Select Cols
                final_cols = ["Anno/Settimana"] + targets
                final_df = df_table[final_cols]
                
                # Define formatter for Italian numbers (dots for thousands)
                def fmt_it(x):
                    try:
                        return f"{int(x):,}".replace(",", ".")
                    except:
                        return str(x)

                st.dataframe(
                    final_df.style.format({t: fmt_it for t in targets}),
                    use_container_width=True,
                    hide_index=True,
                    column_config={
                        "Anno/Settimana": st.column_config.TextColumn("Anno / Sett", width="medium"),
                        "Granpollo": st.column_config.NumberColumn("Granpollo"),
                        "Pollo70": st.column_config.NumberColumn("Pollo 70"),
                        "Color Yeald": st.column_config.NumberColumn("Color Yeald"),
                        "Ross": st.column_config.NumberColumn("Ross"),
                    },
                    height=700
                )
                return

            LISTA_PRODOTTI_DISPONIBILI = ["Panoramica Totale"] + sorted(list(set(df_tot["Prodotto"])))
            
            # Sposto il selettore dettaglio sopra il grafico
            view_mode = st.selectbox("🔍 Dettaglio Prodotto:", LISTA_PRODOTTI_DISPONIBILI)
            
            # --- GLOBAL CHECKBOX INCLUDE ACQUISTI ---
            # Define earlier (line 486) to be accessible by Table View
            # include_acquisti = st.checkbox("Includi Acquisti/Vendite", value=True) 
            # REMOVED DUPLICATE
            
            # --- GRAFICO ---
            if view_mode == "Panoramica Totale":
                df_chart = df_tot.groupby(["Periodo", "Prodotto", "SortDate"])["Uova"].sum().reset_index()
                df_chart = df_chart.sort_values(by="SortDate")
                
                df_chart_final = df_chart.copy()
                
                if include_acquisti:
                    # 1. Fetch Trading Data (Acquisto - Positive)
                    trading_data = get_trading_data("acquisto")
                    to_add = []
                    if trading_data:
                        for row in trading_data:
                            if row.quantita > 0:
                                try:
                                    s_date = datetime.date.fromisocalendar(row.anno, row.settimana, 1)
                                    if s_date < d_start or s_date > d_end: continue
                                    periodo = f"{row.anno} - {row.settimana:02d}"
                                    to_add.append({
                                        "Periodo": periodo,
                                        "Prodotto": row.prodotto,
                                        "SortDate": s_date,
                                        "Uova": row.quantita
                                    })
                                except: continue
                    
                    # 2. Fetch Trading Data (Vendita - Negative)
                    trading_ven = get_trading_data("vendita")
                    if trading_ven:
                        for row in trading_ven:
                            if row.quantita > 0:
                                try:
                                    s_date = datetime.date.fromisocalendar(row.anno, row.settimana, 1)
                                    if s_date < d_start or s_date > d_end: continue
                                    periodo = f"{row.anno} - {row.settimana:02d}"
                                    # We add to 'to_add' but with negative value. 
                                    # Note: Panoramica groups by Product, so 'Vendita' decreases the Product total?
                                    # Or do we want to see it?
                                    # Panoramica Chart groups by [Periodo, Prodotto]. 
                                    # If we add a negative row for "Granpollo", it will subtract from the Granpollo Total. 
                                    # This is likely what is desired: "Net Granpollo".
                                    to_add.append({
                                        "Periodo": periodo,
                                        "Prodotto": row.prodotto,
                                        "SortDate": s_date,
                                        "Uova": -row.quantita # Subtract from product total
                                    })
                                except: continue

                    if to_add:
                        df_trading = pd.DataFrame(to_add)
                        df_trading_grouped = df_trading.groupby(["Periodo", "Prodotto", "SortDate"])["Uova"].sum().reset_index()
                        
                        df_prod_base = df_tot.groupby(["Periodo", "Prodotto", "SortDate"])["Uova"].sum().reset_index()
                        df_combined = pd.concat([df_prod_base, df_trading_grouped], ignore_index=True)
                        
                        df_chart_final = df_combined.groupby(["Periodo", "Prodotto", "SortDate"])["Uova"].sum().reset_index()
                        df_chart_final = df_chart_final.sort_values(by="SortDate")
                
                # FORCE EXCLUDE WEEK 53 FROM FINAL CHART DATA
                df_chart_final = df_chart_final[~df_chart_final['Periodo'].str.endswith('- 53')]
                
                # --- PREPARE DATA FOR SHARED TOOLTIP ---
                # Pivot per avere colonne per ogni prodotto
                df_pivot = df_chart.pivot_table(index='Periodo', columns='Prodotto', values='Uova', aggfunc='sum').fillna(0).reset_index()
                # Merge back
                df_chart = pd.merge(df_chart, df_pivot, on='Periodo', how='left')
                
                # Tooltip fields
                product_cols = [c for c in df_pivot.columns if c != 'Periodo']
                # Create sorted tooltip list for consistency
                # Force specific order if desired, or alphabetical
                sorted_products = ["Granpollo", "Pollo70", "Color Yeald", "Ross"] # Custom order
                final_tooltip = ['Periodo'] + [alt.Tooltip(c, format=',.0f') for c in sorted_products if c in df_chart.columns]

                # Color Scale Definition
                domain = ["Granpollo", "Pollo70", "Color Yeald", "Ross"]
                # Verde, Ciano, Rosa, Arancione
                range_ = ["#2ca02c", "#17becf", "#e377c2", "#ff7f0e"]

                base = alt.Chart(df_chart).encode(
                    x=alt.X('Periodo', sort=alt.EncodingSortField(field="SortDate", order="ascending"), title="Periodo (Anno - Settimana)", axis=alt.Axis(labelFontWeight='bold')),
                    y=alt.Y('Uova'),
                    color=alt.Color('Prodotto', scale=alt.Scale(domain=domain, range=range_)),
                    tooltip=final_tooltip
                )

                nearest = alt.selection_point(nearest=True, on='mouseover', fields=['Periodo'], empty=False)
                
                line = base.mark_line(interpolate='monotone')
                
                selectors = base.mark_point().encode(
                    opacity=alt.value(0),
                ).add_params(nearest)
                
                points = line.mark_point().encode(
                    opacity=alt.condition(nearest, alt.value(1), alt.value(0))
                )
                
                text = line.mark_text(align='left', dx=5, dy=-5).encode(
                    text=alt.condition(nearest, alt.Text('Uova:Q', format=',.0f'), alt.value(' '))
                )
                
                rules = alt.Chart(df_chart).mark_rule(color='gray').encode(
                    x=alt.X('Periodo', sort=alt.EncodingSortField(field="SortDate", order="ascending")),
                ).transform_filter(nearest)

                chart_final = alt.layer(line, selectors, points, rules, text).properties(
                    width=800, height=400
                ).interactive()
                
                st.write("### Totale uova per prodotto")

                # --- CHECKBOX REMOVED FROM HERE (MOVED UP) ---
                # Checkbox 'include_acquisti' defined above
                
                # Only need the logic if include_acquisti was True AND we are in Panoramica, 
                # but the code block above (Chunk 1) already handled the Panoramica data prep.
                # So here we just do the Chart part.
                
                # Wait, I need to be careful. The previous code block (Chunk 1) ENDS with:
                #    df_chart_final = df_chart_final.sort_values(by="SortDate")
                # So we just proceed to chart generation using df_chart_final which is already prepared in Chunk 1.
                
                # RE-PIVOT for Tooltip on the new final DF
                df_pivot_f = df_chart_final.pivot_table(index='Periodo', columns='Prodotto', values='Uova', aggfunc='sum').fillna(0).reset_index()
                df_chart_final = pd.merge(df_chart_final, df_pivot_f, on='Periodo', how='left')

                # Re-calc tooltip
                sorted_products_f = ["Granpollo", "Pollo70", "Color Yeald", "Ross"]
                final_tooltip_f = ['Periodo'] + [alt.Tooltip(c, format=',.0f') for c in sorted_products_f if c in df_chart_final.columns]

                base = alt.Chart(df_chart_final).encode(
                    x=alt.X('Periodo', sort=alt.EncodingSortField(field="SortDate", order="ascending"), title="Periodo (Anno - Settimana)", axis=alt.Axis(labelFontWeight='bold')),
                    y=alt.Y('Uova'),
                    color=alt.Color('Prodotto', scale=alt.Scale(domain=domain, range=range_)),
                    tooltip=final_tooltip_f
                )

                nearest = alt.selection_point(nearest=True, on='mouseover', fields=['Periodo'], empty=False)
                
                line = base.mark_line(interpolate='monotone')
                
                selectors = base.mark_point().encode(
                    opacity=alt.value(0),
                ).add_params(nearest)
                
                points = line.mark_point().encode(
                    opacity=alt.condition(nearest, alt.value(1), alt.value(0))
                )
                
                text = line.mark_text(align='left', dx=5, dy=-5).encode(
                    text=alt.condition(nearest, alt.Text('Uova:Q', format=',.0f'), alt.value(' '))
                )
                
                rules = alt.Chart(df_chart_final).mark_rule(color='gray').encode(
                    x=alt.X('Periodo', sort=alt.EncodingSortField(field="SortDate", order="ascending")),
                ).transform_filter(nearest)

                chart_final = alt.layer(line, selectors, points, rules, text).properties(
                    width=800, height=400
                ).interactive()
                
                st.altair_chart(chart_final, use_container_width=True)
                
                # --- TOTALI COMPLESSIVI (ONLY FOR PANORAMICA) ---
                st.divider()
                st.write("### Totali Complessivi (Periodo Selezionato)")
                
                # Use df_chart_final for totals to respect the chart data (including purchases)
                totali = df_chart_final.groupby("Prodotto")["Uova"].sum()
                prodotti_target = ["Granpollo", "Pollo70", "Color Yeald", "Ross"]

                cols = st.columns(4)
                for i, p in enumerate(prodotti_target):
                    val = totali.get(p, 0)
                    with cols[i]: 
                        st.metric(p, formatta_numero(val))

            else:
                st.write(f"### Dettaglio: {view_mode}")
                
                # Base Filtered DF
                df_filtered = df_tot[df_tot["Prodotto"] == view_mode].copy()
                
                # --- INCLUDE ACQUISTI IN DETAIL ---
                if include_acquisti:
                    trading_data = get_trading_data("acquisto")
                    # Even if no trading data, we might want to show the line as 0? 
                    # But request is "include if selected".
                    
                    # Create Full Timeline from d_start to d_end to ensure continuity
                    # regardless of production data availability
                    full_timeline_rows = []
                    curr = d_start
                    while curr <= d_end:
                         y, w, _ = curr.isocalendar()
                         if w != 53: # FORCE EXCLUDE WEEK 53
                             full_timeline_rows.append({
                                 "SortDate": curr,
                                 "Periodo": f"{y} - {w:02d}",
                                 "Anno": y,
                                 "Settimana": w
                             })
                         curr += datetime.timedelta(days=7)
                    
                    df_timeline = pd.DataFrame(full_timeline_rows)
                    
                    if trading_data:
                        # Map existing trading data
                        trading_map = {}
                        for row in trading_data:
                            if row.quantita > 0 and row.prodotto == view_mode:
                                k = (row.anno, row.settimana)
                                trading_map[k] = trading_map.get(k, 0) + row.quantita
                     
                    # FETCH SALES DATA (VENDITA)
                    trading_ven = get_trading_data("vendita")
                    sales_map = {}
                    if trading_ven:
                        for row in trading_ven:
                            if row.quantita > 0 and row.prodotto == view_mode:
                                k = (row.anno, row.settimana)
                                sales_map[k] = sales_map.get(k, 0) + row.quantita

                    to_add_detail = []
                     
                    # Iterate FULL TIMELINE
                    for _, t_row in df_timeline.iterrows():
                        k = (t_row['Anno'], t_row['Settimana'])
                        
                        # ACQUISTO ROW (Positive)
                        qty_acq = trading_map.get(k, 0)
                        to_add_detail.append({
                            "Periodo": t_row['Periodo'], 
                            "SortDate": t_row['SortDate'], 
                            "Anno": t_row['Anno'],
                            "Settimana": t_row['Settimana'],
                            "Prodotto": view_mode,
                            "Fonte": "Acquisto",
                            "Uova": qty_acq,
                            "Età": 0
                        })

                        # VENDITA ROW (Negative)
                        qty_ven = sales_map.get(k, 0)
                        to_add_detail.append({
                            "Periodo": t_row['Periodo'], 
                            "SortDate": t_row['SortDate'], 
                            "Anno": t_row['Anno'],
                            "Settimana": t_row['Settimana'],
                            "Prodotto": view_mode,
                            "Fonte": "Vendita",
                            "Uova": -qty_ven,
                            "Età": 0
                        })
                    
                    if to_add_detail:
                        df_trading_detail = pd.DataFrame(to_add_detail)
                        df_filtered = pd.concat([df_filtered, df_trading_detail], ignore_index=True)

                # --- DENSIFICATION LOGIC ---
                # Ensure every Source (Farm/Acquisto) has a row for every Period in df_timeline
                # This fixes "White Holes" in Stacked Area Charts
                
                # 1. Identify all unique sources
                unique_sources = df_filtered['Fonte'].unique()
                
                # 2. Use df_timeline (created above) as the Master Time Axis
                # If df_timeline wasn't created (include_acquisti=False), we need to create it now based on d_start/d_end
                # to fix gaps even for normal production
                if 'df_timeline' not in locals():
                     full_timeline_rows = []
                     curr = d_start
                     while curr <= d_end:
                         y, w, _ = curr.isocalendar()
                         if w != 53: # FORCE EXCLUDE WEEK 53
                             full_timeline_rows.append({
                                 "SortDate": curr,
                                 "Periodo": f"{y} - {w:02d}",
                                 "Anno": y,
                                 "Settimana": w
                             })
                         curr += datetime.timedelta(days=7)
                     df_timeline = pd.DataFrame(full_timeline_rows)

                # 3. Create Cartesian Product: (All Periods) x (All Sources)
                grid_combinations = list(itertools.product(df_timeline['Periodo'].unique(), unique_sources))
                df_grid = pd.DataFrame(grid_combinations, columns=['Periodo', 'Fonte'])
                
                # 4. Merge Data onto Grid
                # We drop columns that define uniqueness except Period/Fonte before merging to avoid duplication issues if any
                # But best is to merge LEFT on Period/Fonte
                df_densified = pd.merge(df_grid, df_filtered, on=['Periodo', 'Fonte'], how='left')
                
                # 5. Fill Missing Values
                df_densified['Uova'] = df_densified['Uova'].fillna(0)
                df_densified['Prodotto'] = df_densified['Prodotto'].fillna(view_mode) 
                df_densified['Età'] = df_densified['Età'].fillna(0)
                
                # 6. Restore Metadata from df_timeline (SortDate, Anno, Settimana)
                # Drop potentially incomplete/NaN metadata cols from merge
                df_densified = df_densified.drop(columns=['SortDate', 'Anno', 'Settimana'], errors='ignore')
                df_densified = pd.merge(df_densified, df_timeline, on='Periodo', how='left')
                
                df_filtered = df_densified.sort_values(by="SortDate")
                
                # --- PREPARE DETAILED TOOLTIP ---
                # Consolidate all active sheds into one multiline string per week
                def format_info(row):
                    # Hide 0 values from tooltip to keep it clean
                    if row['Uova'] <= 0: return None 
                    
                    u = formatta_numero(row['Uova'])
                    if row['Fonte'] == "Acquisto":
                        return f"• 💰 Acquisto: {u}"
                    if row['Fonte'] == "Vendita":
                        return f"• 📤 Vendita: {u}" # u will be negative string e.g -42.000 or I can abs?
                        # formatta_numero handles int(n). 
                    
                    a = int(row['Età'])
                    return f"• {row['Fonte']}: {u} (Età {a})"
                
                df_filtered['TooltipEntry'] = df_filtered.apply(format_info, axis=1)
                
                # Group by Periodo and join strings with newline
                # Filter out None values before joining
                df_tooltip_agg = df_filtered.groupby('Periodo')['TooltipEntry'].apply(lambda x: '\n'.join([s for s in x if s])).reset_index()
                df_tooltip_agg.rename(columns={'TooltipEntry': 'DettagliCapannoni'}, inplace=True)
                
                # Merge back
                df_filtered = pd.merge(df_filtered, df_tooltip_agg, on='Periodo', how='left')

                # Define Palettes
                palettes = {
                    "Granpollo": ['#31a354', '#74c476', '#a1d99b', '#c7e9c0', '#006d2c'],
                    "Pollo70": ['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#08519c'],
                    "Ross": ['#e6550d', '#fd8d3c', '#fdae6b', '#fdd0a2', '#a63603'],
                    "Color Yeald": ['#756bb1', '#9e9ac8', '#bcbddc', '#dadaeb', '#54278f'],
                }
                default_palette = ['#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c', '#98df8a']
                
                current_palette = palettes.get(view_mode, default_palette)
                
                # Build Domain & Range
                # "Acquisto" should be Yellow. Others from palette.
                unique_sources = sorted(list(set(df_filtered['Fonte'])))
                
                domain = []
                range_ = []
                palette_idx = 0
                
                # Ensure Acquisto is first or last? Sorted usually puts "Acquisto" first alphabetically (A).
                # Sorted: Acquisto, Farm..., Vendita (V is late)
                for s in unique_sources:
                    domain.append(s)
                    if s == "Acquisto":
                        range_.append('#FFD700') # Yellow
                    elif s == "Vendita":
                        range_.append('#d62728') # Red for Sales
                    else:
                        range_.append(current_palette[palette_idx % len(current_palette)])
                        palette_idx += 1
                
                base = alt.Chart(df_filtered).encode(
                    x=alt.X('Periodo', sort=None, title="Periodo (Anno - Settimana)", axis=alt.Axis(labelFontWeight='bold')),
                    y=alt.Y('Uova', stack=True),
                    order=alt.Order("Fonte", sort="ascending"), # Fix stack stability
                    color=alt.Color('Fonte', scale=alt.Scale(domain=domain, range=range_)),
                    tooltip=['Periodo', alt.Tooltip('DettagliCapannoni', title='Dettaglio')]
                )
                
                nearest = alt.selection_point(nearest=True, on='mouseover', fields=['Periodo'], empty=False)
                
                # Stacked Area should usually use linear interpolation to avoid gaps/overshoot with 0s
                # Monotone can cause artifacts when stacking sparse/0 data
                area = base.mark_area(interpolate='linear')
                
                selectors = alt.Chart(df_filtered).mark_point().encode(
                    x=alt.X('Periodo', sort=alt.EncodingSortField(field="SortDate", order="ascending")),
                    y=alt.Y('Uova', stack=True),
                    color=alt.value('white'), # Dummy
                    opacity=alt.value(0),
                    tooltip=['Periodo', alt.Tooltip('DettagliCapannoni', title='Dettaglio')]
                ).add_params(nearest)
                
                rules = alt.Chart(df_filtered).mark_rule(color='gray').encode(
                    x=alt.X('Periodo', sort=alt.EncodingSortField(field="SortDate", order="ascending")),
                ).transform_filter(nearest)

                chart_final = alt.layer(area, selectors, rules).interactive()
                
                st.altair_chart(chart_final, use_container_width=True)
                
                # REMOVED EXTRA CHART CALL HERE
                
                st.divider()
                st.write("### Riassunto Settimanale")
                
                # --- PREPARE SUMMARY TABLE DATA ---
                
                # 1. Fetch Sales Data (Vendita)
                sales_data = get_trading_data("vendita")
                sales_map = {}
                if sales_data:
                    for row in sales_data:
                         if row.prodotto == view_mode and row.quantita > 0:
                             k = (row.anno, row.settimana)
                             sales_map[k] = sales_map.get(k, 0) + row.quantita
                
                # 2. Iterate Timeline to build rows
                summary_rows = []
                
                # Ensure we have df_timeline available (it should be from densification block)
                # If not, fallback to distinct periods in df_filtered
                periods_source = df_timeline if 'df_timeline' in locals() else df_filtered[['Periodo', 'Anno', 'Settimana']].drop_duplicates()
                
                for _, t_row in periods_source.iterrows():
                    p_label = t_row['Periodo']
                    annp = t_row['Anno']
                    sett = t_row['Settimana']
                    
                    # Filter df_filtered for this period
                    matches = df_filtered[df_filtered['Periodo'] == p_label]
                    
                    # Prod = All except Acquisto and Vendita
                    prod_matches = matches[(matches['Fonte'] != 'Acquisto') & (matches['Fonte'] != 'Vendita')]
                    prod_val = prod_matches['Uova'].sum()
                    
                    # Build tooltip for production details
                    prod_details = []
                    for _, pm in prod_matches.iterrows():
                        if pm['Uova'] > 0:
                            fonte_name = pm['Fonte']
                            uova_qty = int(pm['Uova'])
                            eta_val = int(pm['Età'])
                            prod_details.append(f"{fonte_name} - {uova_qty:,} - Età {eta_val}".replace(",", "."))
                    
                    prod_tooltip = "\n".join(prod_details) if prod_details else ""
                    
                    # Acq = Only Acquisto
                    acq_val = matches[matches['Fonte'] == 'Acquisto']['Uova'].sum()
                    
                    # Sale = From Sales Map
                    sale_val = sales_map.get((annp, sett), 0)
                    
                    # Net Total
                    net_val = prod_val + acq_val - sale_val
                    
                    # Only add if there's activity? User requested table "Periodo...". 
                    # Timeline is already filtered by d_start/d_end, so we show all valid weeks.
                    
                    summary_rows.append({
                        "Periodo": p_label,
                        "Produzione": prod_val,
                        "Dettaglio Produzione": prod_tooltip,
                        "Uova Acquisto": acq_val,
                        "Uova Vendita": sale_val,
                        "Uova Totali": net_val
                    })
                
                df_summary = pd.DataFrame(summary_rows)
                
                # Formatting Helper
                def fmt_it(x):
                    try:
                        return f"{int(x):,}".replace(",", ".")
                    except:
                        return str(x)
                
                st.write("### 📊 Riassunto Settimanale")
                st.caption("Seleziona una riga per vedere i dettagli")
                
                # Get purchase data for details
                purchase_data = get_trading_data("acquisto")
                purchase_map = {}
                if purchase_data:
                    for row in purchase_data:
                        if row.prodotto == view_mode and row.quantita > 0:
                            k = (row.anno, row.settimana)
                            if k not in purchase_map:
                                purchase_map[k] = []
                            purchase_map[k].append({
                                'azienda': row.azienda,
                                'quantita': row.quantita
                            })
                
                # Create display dataframe with formatted numbers
                df_display = df_summary[['Periodo', 'Produzione', 'Uova Acquisto', 'Uova Vendita', 'Uova Totali']].copy()
                
                # Add selection column
                if 'selected_week_idx' not in st.session_state:
                    st.session_state['selected_week_idx'] = None
                
                # Render Table
                c1, c2, c3 = st.columns([1, 3, 1])
                with c2:
                    # Show table
                    st.dataframe(
                        df_display.style.format({
                            "Produzione": fmt_it,
                            "Uova Acquisto": fmt_it,
                            "Uova Vendita": fmt_it,
                            "Uova Totali": fmt_it
                        }),
                        use_container_width=True,
                        hide_index=True,
                        column_config={
                             "Periodo": st.column_config.TextColumn("Periodo", width="medium"),
                             "Produzione": st.column_config.NumberColumn("Produzione"),
                             "Uova Acquisto": st.column_config.NumberColumn("Uova Acquisto"),
                             "Uova Vendita": st.column_config.NumberColumn("Uova Vendita"),
                             "Uova Totali": st.column_config.NumberColumn("Uova Totali")
                        }
                    )
                    
                    st.write("")
                    st.write("**Seleziona settimana per dettagli:**")
                    
                    # Radio buttons for selection
                    selected_periodo = st.radio(
                        "Settimana",
                        options=df_summary['Periodo'].tolist(),
                        index=None,
                        label_visibility="collapsed",
                        horizontal=False,
                        key=f"week_selector_{view_mode}"
                    )
                    
                    # Show details if a row is selected
                    if selected_periodo:
                        selected_row = df_summary[df_summary['Periodo'] == selected_periodo].iloc[0]
                        periodo = selected_row['Periodo']
                        
                        st.divider()
                        
                        # Production Details
                        if selected_row['Produzione'] > 0 and selected_row['Dettaglio Produzione']:
                            st.markdown(f"**📊 Dettaglio Produzione - {periodo}**")
                            st.code(selected_row['Dettaglio Produzione'], language=None)
                        
                        # Purchase Details
                        if selected_row['Uova Acquisto'] > 0:
                            anno_val = int(periodo.split(' - ')[0])
                            sett_val = int(periodo.split(' - ')[1])
                            purchases = purchase_map.get((anno_val, sett_val), [])
                            
                            if purchases:
                                st.markdown(f"**📥 Dettaglio Acquisti - {periodo}**")
                                detail_text = "\n".join([f"{p['azienda']}: {fmt_it(p['quantita'])}" for p in purchases])
                                st.code(detail_text, language=None)

        else:
            st.warning("Nessun dato nel periodo selezionato.")
