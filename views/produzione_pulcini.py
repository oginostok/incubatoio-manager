import streamlit as st

def page_produzioni_pulcini():
    st.title("🐥 PRODUZIONE PULCINI")
    st.info("Area in costruzione.")
    if st.button("⬅️ Torna alla Home"):
        st.session_state['current_page'] = 'home'
        st.rerun()
