import streamlit as st
import pandas as pd
import altair as alt
import datetime
from utils.helpers import carica_dati_v20, pulisci_percentuale, formatta_numero

def get_start_date_from_year_week(year, week):
    """Restituisce il lunedì della settimana specificata"""
    return datetime.date.fromisocalendar(year, week, 1)

def aggio_date_preset():
    """Callback per aggiornare la data di fine in base al preset selezionato"""
    preset = st.session_state.get('preset_periodo')
    start = st.session_state.get('prod_start_date')
    
    if not start or not preset: return

    if preset == "1 Mese":
        st.session_state['prod_end_date'] = start + datetime.timedelta(days=30)
    elif preset == "2 Mesi":
        st.session_state['prod_end_date'] = start + datetime.timedelta(days=60)
    elif preset == "6 Mesi":
        st.session_state['prod_end_date'] = start + datetime.timedelta(days=180)
    elif preset == "Fino fine anno":
        st.session_state['prod_end_date'] = datetime.date(start.year, 12, 31)

def reset_filtri():
    """Callback per resettare i filtri"""
    today = datetime.date.today()
    st.session_state['prod_start_date'] = today
    
    # Calcolo fine massima teorica (approx) based on active lots
    # Una stima sicura è fine del prossimo anno o +18 mesi, 
    # dato che non possiamo accedere facilmente a df_tot qui senza ricalcolarlo.
    # Useremo + 2 anni per essere sicuri di prendere tutto.
    st.session_state['prod_end_date'] = today + datetime.timedelta(days=730)
    
    # Reset preset to None or specific value if needed
    # st.session_state['preset_periodo'] = "Personalizzato" # Streamlit handles this tricky sometimes

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
    
    # Init Date Session State
    if 'prod_start_date' not in st.session_state:
        st.session_state['prod_start_date'] = today
    if 'prod_end_date' not in st.session_state:
        st.session_state['prod_end_date'] = today + datetime.timedelta(days=365)

    # --- SIDEBAR ---
    with st.sidebar:
        if st.button("⬅️ Torna alla Home"):
            st.session_state['current_page'] = 'home'
            st.rerun()
        
        st.divider()
        st.header("📅 Filtri Analisi")
        
        st.date_input(
            "Data Inizio", 
            key="prod_start_date",
            format="DD/MM/YYYY"
        )
        
        st.date_input(
            "Data Fine",
            key="prod_end_date",
            format="DD/MM/YYYY"
        )
        
        st.selectbox(
            "Periodo Rapido",
            ["Personalizzato", "1 Mese", "2 Mesi", "6 Mesi", "Fino fine anno"],
            key="preset_periodo",
            on_change=aggio_date_preset
        )
        
        st.button(
            "🔄 Reset Filtri", 
            key="btn_reset_filtri",
            on_click=reset_filtri,
            use_container_width=True
        )

    # --- MAIN CONTENT ---
    st.title("🥚 PRODUZIONE UOVA")
    st.subheader("📈 Analisi Previsionale")
    
    # Date effettive per i filtri
    d_start = st.session_state['prod_start_date']
    d_end = st.session_state['prod_end_date']
    
    if 'lotti' not in st.session_state:
        st.session_state['lotti'] = []

    lotti_attivi = [l for l in st.session_state['lotti'] if l.get('Attivo', True)]
    
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
                        
                        date_obj = get_start_date_from_year_week(int(anno_curr), int(sett_reale))

                        # --- FILTRO DATA ---
                        if date_obj < d_start or date_obj > d_end:
                            continue

                        if anno_curr >= 2025:
                            uova_esatte = qta * perc * 7
                            periodo_label = f"{int(anno_curr)} - {int(sett_reale)}"
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

            LISTA_PRODOTTI_DISPONIBILI = ["Panoramica Totale"] + sorted(list(set(df_tot["Prodotto"])))
            
            # Sposto il selettore dettaglio sopra il grafico
            view_mode = st.selectbox("🔍 Dettaglio Prodotto:", LISTA_PRODOTTI_DISPONIBILI)
            
            # --- GRAFICO ---
            if view_mode == "Panoramica Totale":
                df_chart = df_tot.groupby(["Periodo", "Prodotto", "SortDate"])["Uova"].sum().reset_index()
                df_chart = df_chart.sort_values(by="SortDate")

                base = alt.Chart(df_chart).encode(
                    x=alt.X('Periodo', sort=None, title="Periodo (Anno - Settimana)", axis=alt.Axis(labelFontWeight='bold')),
                    y=alt.Y('Uova'),
                    color='Prodotto'
                )

                nearest = alt.selection_point(nearest=True, on='mouseover', fields=['Periodo'], empty=False)
                
                line = base.mark_line(interpolate='monotone')
                
                selectors = alt.Chart(df_chart).mark_point().encode(
                    x='Periodo',
                    opacity=alt.value(0),
                ).add_params(nearest)
                
                points = line.mark_point().encode(
                    opacity=alt.condition(nearest, alt.value(1), alt.value(0))
                )
                
                text = line.mark_text(align='left', dx=5, dy=-5).encode(
                    text=alt.condition(nearest, 'Uova', alt.value(' '))
                )
                
                rules = alt.Chart(df_chart).mark_rule(color='gray').encode(
                    x='Periodo',
                ).transform_filter(nearest)

                chart_final = alt.layer(line, selectors, points, rules, text).properties(
                    width=800, height=400
                ).interactive()
                
                st.write("### Produzione Totale per Prodotto")
                st.altair_chart(chart_final, use_container_width=True)

            else:
                st.write(f"### Dettaglio: {view_mode}")
                df_filtered = df_tot[df_tot["Prodotto"] == view_mode].copy()
                df_filtered = df_filtered.sort_values(by="SortDate")
                
                base = alt.Chart(df_filtered).encode(
                    x=alt.X('Periodo', sort=None, title="Periodo (Anno - Settimana)", axis=alt.Axis(labelFontWeight='bold')),
                    y=alt.Y('Uova', stack=True),
                    color='Fonte',
                    tooltip=['Periodo', 'Fonte', 'Uova', 'Età']
                )
                
                nearest = alt.selection_point(nearest=True, on='mouseover', fields=['Periodo'], empty=False)
                
                area = base.mark_area()
                
                selectors = alt.Chart(df_filtered).mark_point().encode(
                    x='Periodo',
                    opacity=alt.value(0),
                ).add_params(nearest)
                
                rules = alt.Chart(df_filtered).mark_rule(color='gray').encode(
                    x='Periodo',
                ).transform_filter(nearest)

                chart_final = alt.layer(area, selectors, rules).interactive()
                
                st.altair_chart(chart_final, use_container_width=True)
                
                st.divider()
                st.write(f"### Totali per Allevamento ({view_mode})")
                totali_fonte = df_filtered.groupby("Fonte")["Uova"].sum().sort_values(ascending=False)
                cols = st.columns(4)
                for i, (fonte, val) in enumerate(totali_fonte.items()):
                    with cols[i % 4]: st.metric(fonte, formatta_numero(val))

            # --- TOTALI COMPLESSIVI ---
            st.divider()
            st.write("### Totali Complessivi (Periodo Selezionato)")
            
            prodotti_target = ["Granpollo", "Pollo70", "Color Yeald", "Ross"]
            totali = df_tot.groupby("Prodotto")["Uova"].sum()

            cols = st.columns(4)
            for i, p in enumerate(prodotti_target):
                val = totali.get(p, 0)
                with cols[i]: 
                    st.metric(p, formatta_numero(val))

        else:
            st.warning("Nessun dato nel periodo selezionato.")
