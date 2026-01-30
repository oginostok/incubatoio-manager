import streamlit as st

def page_incubatoio():
    st.title("🏭 INCUBATOIO")
    st.info("Area in costruzione.")
    if st.button("⬅️ Torna alla Home"):
        st.session_state['current_page'] = 'home'
        st.rerun()
