# Future Features - Funzionalità da Implementare

Questa lista contiene le funzionalità pianificate per le prossime versioni del sistema.

---

## 🐔 Gestione Genetiche Allevamenti

**Descrizione:**  
Migliorare la scheda allevamenti con selezione separata delle genetiche per gallo e gallina.

**Dettagli:**
- Lista dropdown per **Genetica Gallina** (attualmente campo "Razza")
- Lista dropdown per **Genetica Gallo** (attualmente campo "Razza_Gallo")
- Entrambe le liste devono essere popolate da un database/configurazione centralizzata
- Possibilità di aggiungere nuove genetiche senza modificare il codice

**Stato:** 📋 Pianificato

---

## 🐣 Produzioni Pulcini per Settimana

**Descrizione:**  
Sistema di tracciamento e previsione della produzione di pulcini su base settimanale.

**Dettagli:**
- Calcolo automatico basato su:
  - Uova disponibili (produzione + acquisti - vendite)
  - Tassi di schiusa per genetica
  - Capacità incubatoio
- Dashboard con grafici settimanali
- Esportazione dati per reporting

**Stato:** 📋 Pianificato

---

## 🚚 Gestione Trasporti

**Descrizione:**  
Modulo per la gestione dei trasporti di uova e pulcini.

**Dettagli:**
- Registrazione trasporti in entrata/uscita
- Tracciamento origine/destinazione
- Associazione con lotti e settimane
- Documentazione trasportatori
- Reportistica viaggi

**Stato:** 📋 Pianificato

---

## 📦 Magazzino Incubatoio

**Descrizione:**  
Sistema di gestione del magazzino dell'incubatoio.

**Dettagli:**
- Inventario uova per:
  - Genetica/Prodotto
  - Data di arrivo
  - Stato (in attesa, in incubazione, schiuse)
- Gestione capacità macchine
- Tracciamento lotti in incubazione
- Scadenze e rotazione stock
- Alert per anomalie (temperatura, umidità, ecc.)

**Stato:** 📋 Pianificato

---

## 👥 Sistema Multi-Utente con Notifiche Real-Time

**Descrizione:**  
Implementazione di 4 utenti con login separato e notifiche in tempo reale quando qualcuno modifica i dati.

**Utenti:**
- 👤 **Carlo** - Gestione Allevamenti
- 👤 **Roberto** - Gestione Allevamenti  
- 👤 **Alessandra** - Gestione Incubatoio/Uova
- 👤 **Marta** - Supervisore

**Funzionalità:**
- Login con username/password per ogni utente
- Tracciamento "Modificato da [Utente] alle [HH:MM]" su ogni record
- **Popup real-time**: Quando un utente modifica una pagina, gli altri vedono:
  > ⚠️ "Alessandra ha modificato questa pagina adesso. Clicca per ricaricare."
- Prevenzione conflitti: se due utenti modificano lo stesso record, il secondo riceve avviso
- Log attività: storico di chi ha modificato cosa

**Implementazione Tecnica:**
- Backend: Tabella `users` con autenticazione JWT
- Backend: WebSocket per notifiche real-time
- Frontend: Context `AuthProvider` per gestione sessione
- Frontend: Hook `useRealTimeUpdates` per ricevere notifiche
- Database: Colonne `updated_by`, `updated_at` su tutte le tabelle principali

**Stato:** 📋 Pianificato

---

## 🏠 Nomi Commerciali nei Capannoni

**Descrizione:**  
Implementare i nomi commerciali dei prodotti (BLA, Pelato Bianco, ecc.) all'interno di ogni capannone in V001, in modo che siano disponibili come opzioni di selezione durante la creazione di nuove incubazioni in T016.

**Dettagli:**
- Ogni capannone in V001 avrà associato un nome commerciale configurabile
- I nomi commerciali verranno memorizzati nel database
- In T016, quando si crea una nuova incubazione:
  - Appariranno automaticamente i nomi commerciali disponibili
  - L'utente potrà selezionare direttamente il nome commerciale dalla lista
  - Selezione tramite dropdown popolato dai nomi dei capannoni
- Sincronizzazione automatica: modificando il nome in V001, si aggiorna ovunque

**Stato:** 📋 Pianificato

---

## Legenda Stati

- 📋 **Pianificato** - Feature in backlog, da implementare
- 🚧 **In Sviluppo** - Implementazione in corso
- ✅ **Completato** - Feature rilasciata
- ⏸️ **In Pausa** - Sviluppo temporaneamente sospeso

---

**Ultimo aggiornamento:** 2026-02-03
