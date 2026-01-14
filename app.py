import streamlit as st
import pandas as pd
import numpy as np

# Import Views
from views.login import login_page
from views.home import home_page
from views.allevamenti import page_allevamenti
from views.incubatoio import page_incubatoio
from views.produzione_uova import page_produzioni_uova
from views.produzione_pulcini import page_produzioni_pulcini

# Configurazione pagina
st.set_page_config(
    page_title="Incubatoio Manager Pro",
    page_icon="🐣",
    layout="wide"
)

# Caricamento CSS globale
def load_css():
    try:
        with open("assets/style.css") as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)
    except Exception as e:
        st.warning(f"Errore caricamento CSS: {e}")

load_css()

# Gestione Session State
if 'authenticated' not in st.session_state:
    st.session_state['authenticated'] = False

if 'current_page' not in st.session_state:
    st.session_state['current_page'] = 'home'

# --- ROUTER PRINCIPALE ---
if not st.session_state['authenticated']:
    login_page()
else:
    # Router delle pagine
    if st.session_state['current_page'] == 'home':
        home_page()
    elif st.session_state['current_page'] == 'allevamenti':
        page_allevamenti()
    elif st.session_state['current_page'] == 'incubatoio':
        page_incubatoio()
    elif st.session_state['current_page'] == 'produzioni_uova':
        page_produzioni_uova()
    elif st.session_state['current_page'] == 'produzioni_pulcini':
        page_produzioni_pulcini()
    else:
        home_page()
