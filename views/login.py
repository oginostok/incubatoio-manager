import streamlit as st

def login_page():
    c1, c2, c3 = st.columns([1, 2, 1])
    with c2:
        try:
            st.image("logo.jpg", use_container_width=True)
        except:
            st.warning("Logo non trovato (logo.jpg)")
        
        st.markdown("<h3 style='text-align: center;'>Area Riservata</h3>", unsafe_allow_html=True)
        
        with st.form("login_form"):
            username = st.text_input("Username")
            password = st.text_input("Password", type="password")
            
            # Pulsante con freccia
            submit = st.form_submit_button("Accedi ➡️", type="primary", use_container_width=True)
            
            if submit:
                if username == "Demo" and password == "Accesso!@#":
                    st.session_state['authenticated'] = True
                    st.session_state['current_page'] = 'home' # Default a home
                    st.rerun()
                else:
                    st.error("Credenziali non valide")
