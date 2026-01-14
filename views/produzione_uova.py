import streamlit as st
import pandas as pd
import altair as alt
from utils.helpers import carica_dati_v20, pulisci_percentuale, formatta_numero

def page_produzioni_uova():
    with st.sidebar:
        if st.button("⬅️ Torna alla Home"):
            st.session_state['current_page'] = 'home'
            st.rerun()

    st.title("🥚 PRODUZIONE UOVA")

    # --- CARICAMENTO DATI ---
    dati = carica_dati_v20()
    if isinstance(dati, str):
        st.error(f"Errore CSV: {dati}")
        st.stop()
    else:
        df_curve = dati

    # --- INIZIALIZZAZIONE ---
    if 'settings_lifecycle' not in st.session_state:
        st.session_state['settings_lifecycle'] = {'min': 25, 'max': 64}
    
    # Recuperiamo le impostazioni di vita produttiva
    LIMITE_MIN_ETA = st.session_state['settings_lifecycle']['min']
    LIMITE_MAX_ETA = st.session_state['settings_lifecycle']['max']

    # --- 1. SETTINGS (COLLAPSED) ---
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

    # --- 2. ANALISI PRODUZIONE ---
    st.subheader("📈 Analisi Previsionale")
    
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
                    
                    # --- FILTRO IMPOSTAZIONI (VITA PRODUTTIVA) ---
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
