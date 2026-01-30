import streamlit as st

def home_page():
    # Titolo centrato
    st.markdown("<h1 style='text-align: center;'>Dashboard Principale</h1>", unsafe_allow_html=True)
    
    # CSS specifico per la Home Page (Bottoni Grandi)
    st.markdown("""
    <style>
    div.stButton > button {
        height: 150px !important;
        font-size: 36px !important;
        border-radius: 15px !important;
        margin: 10px 0 !important;
    }
    div.stButton > button p {
        font-size: 30px !important;
    }
    </style>
    """, unsafe_allow_html=True)
    
    # Spaziatore verticale per centratura (push down)
    for _ in range(3): st.write("")

    # Layout griglia 2x2 centrata
    # Colonne laterali per padding, colonne centrali uguali per i bottoni
    c_left, c1, c2, c_right = st.columns([1, 4, 4, 1])
    
    with c1:
        if st.button("🏭\nINCUBATOIO", use_container_width=True):
            st.session_state['current_page'] = 'incubatoio'
            st.rerun()
            
        if st.button("🥚\nUOVA", use_container_width=True):
            st.session_state['current_page'] = 'produzioni_uova'
            st.rerun()

    with c2:
        if st.button("🐓\nALLEVAMENTI", use_container_width=True):
            st.session_state['current_page'] = 'allevamenti'
            st.rerun()
            
        if st.button("🐥\nPULCINI", use_container_width=True):
            st.session_state['current_page'] = 'produzioni_pulcini'
            st.rerun()

    st.divider()
    
    # Bottone Esci
    _, c_logout, _ = st.columns([5, 1, 5])
    with c_logout:
        # Usa type="tertiary" per rimuovere bordi e sfondo (stile link/testo)
        if st.button("Esci", type="tertiary", key="logout_home"):
            st.session_state['authenticated'] = False
            st.rerun()
