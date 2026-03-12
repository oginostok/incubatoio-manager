# Issues da Risolvere

## Riepilogo

| # | Titolo | Componente | Stato |
|---|--------|------------|-------|
| 1 | Pulsanti +/- Data Fine Non Funzionanti | `AccasamentiTable.tsx` | ✅ Risolto |
| 2 | Formula Produzioni Non Si Ricalcola (T003) | `database.py` | ✅ Risolto |
| 3 | Totali Grafico Non Corrispondono alla Tabella | `ProductionPage.tsx` | ✅ Risolto |
| 4 | Dati Persi al Riavvio (DB Path Relativo) | `database.py` | ✅ Risolto |
| 5 | Grafico G001 Non Mostra Curve di Produzione | `production_service.py` | ✅ Risolto |
| 6 | Calcolo Vendite nel Grafico G001 Errato | `ProductionPage.tsx` | ✅ Risolto |
| 7 | V001 Non Usa Dati da T001 (Farm Structure Hardcoded) | `allevamenti.py` | ✅ Risolto |
| 8 | Modifiche T004 Non Aggiornano Grafici | `TradingTable.tsx`, `ProductionPage.tsx` | ✅ Risolto |
| 9 | Formula Non Ricalcolata Dopo Modifica T004 | `production_service.py` | ✅ Risolto |
| 10 | Modifiche T003 Richiedono Refresh Manuale (F5) | `ProductionPage.tsx`, `ProductionTablesView.tsx` | ✅ Risolto |
| 11 | Passirano 1 Calcolato Come Ross Invece di Granpollo | `helpers.py` (seed data) | ✅ Risolto |
| 12 | Configurare HTTPS/SSL per Server Produzione | Server VPS | 🔴 Non Risolto |
| 13 | T014 Età Settimane Errata Alla Selezione Allevamento | `EggStorageTable.tsx` | ✅ Risolto |
| 14 | Curva Produzione: Dropdown Non Persisteva + Calcoli Includevano Tutti i Lotti | `allevamenti.py`, `production_service.py` | ✅ Risolto |

---

## 1. Pulsanti +/- Data Fine Non Funzionanti

**Stato:** � Risolto  
**Data Risoluzione:** 2026-01-29  
**Data Segnalazione:** 2025-01-25  
**Componente:** `frontend/src/components/AccasamentiTable.tsx`

### Descrizione del Problema
I pulsanti rossi tondi (+/-) accanto alla colonna "Fine" nella tabella Impostazioni Accasamenti non funzionavano. Cliccando su di essi non succedeva nulla: nessun spinner, nessuna chiamata API, nessun cambio di data.

### Causa Root
Il problema era dovuto a **event propagation** e **table row click handlers**. Le righe della tabella intercettavano i click prima che arrivassero ai pulsanti.

### Soluzione Implementata
Sostituzione dei pulsanti con elementi `<span>` con styling button-like e gestione esplicita dell'evento:

```tsx
// PRIMA (non funzionava)
<Button onClick={(e) => { e.stopPropagation(); adjustEndDate(...) }} />

// DOPO (funziona)
<span
  role="button"
  onClick={(e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('[DEBUG] Left button clicked');
    adjustEndDate(lotto, -1);
  }}
  className="...chevron-button-styles..."
>
  <ChevronLeft />
</span>
```

### Verifica
- ✅ Click sul pulsante sinistro (<): riduce la data di 1 settimana
- ✅ Click sul pulsante destro (>): aumenta la data di 1 settimana
- ✅ Console log mostra debug messages corretti
- ✅ UI si aggiorna immediatamente con la nuova data

---

## 2. Formula Produzioni Non Si Ricalcola Automaticamente

**Stato:** 🟢 Risolto
**Data Risoluzione:** 2026-03-09
**Data:** 2025-01-25
**Componente:** `backend/routers/production_tables_router.py`, `backend/services/production_service.py`

### Descrizione del Problema
Dopo aver modificato una cella nella tabella "Tabelle Produzioni" (es. cambiando valori ROSS 308 STANDARD), la formula di calcolo delle produzioni non si ricalcola automaticamente. I grafici in "Produzioni e Totali" rimangono invariati nonostante i nuovi valori nelle curve di produzione.

### Analisi Tecnica
- **Trigger implementato:** `ProductionService.calculate_weekly_summary()` viene chiamato dopo `PUT /api/production-tables`
- **Problema:** Il ricalcolo viene eseguito ma i risultati non sembrano aggiornarsi
- **Ipotesi:**
  1. `calculate_weekly_summary()` non persiste i risultati nel database
  2. Frontend usa cache vecchia dei dati di produzione
  3. Risultati calcolati non vengono salvati da nessuna parte

### Comportamento Osservato
- ✅ Modifica cella salva correttamente nel database `standard_curves`
- ✅ Frontend mostra checkmark verde
- ✅ Backend chiama `calculate_weekly_summary()` (log: "Triggering production recalculation...")
- ❌ Grafici "Produzioni e Totali" NON si aggiornano con nuovi calcoli

### File Coinvolti
- `backend/routers/production_tables_router.py` (linea ~107: trigger ricalcolo)
- `backend/services/production_service.py` (`calculate_weekly_summary()`)

### Come Riprodurre
1. Vai su http://localhost:5173
2. PRODUZIONE UOVA > Tabelle Produzioni
3. Modifica una cella (es. ROSS 308 STANDARD, W=26, valore="88.50%")
4. Vai su PRODUZIONE UOVA > Produzioni e Totali
5. Osserva che i grafici NON riflettono il nuovo valore

### Soluzione Implementata
Fix in `database.py`: `invalidate_cache_by_curve()` ora normalizza gli spazi bianchi nel nome della curva prima del confronto, risolvendo il mismatch tra nomi con spazi doppi nel DB e nomi normalizzati dal frontend. Il refresh del frontend era già stato risolto dall'Issue #10.

---

## 3. Totali nel Grafico "Produzioni e Totali" Non Corrispondono alla Tabella

**Stato:** 🟢 Risolto  
**Data:** 2026-01-27  
**Componente:** `frontend/src/pages/ProductionPage.tsx` (funzione `chartData`)

### Descrizione del Problema
Quando si seleziona un prodotto specifico (es. Granpollo), i totali mostrati nel tooltip del grafico non corrispondevano ai totali nella tabella "Riepilogo Settimanale".

**Esempio concreto (Settimana 2026 - 05, Granpollo):**
- **Tabella (CORRETTA):** Produzione: 42.600
- **Grafico (ERRATO):** ~57.446 (valori inflazionati)

### Causa Root
Il codice in `chartData` per la vista "Tutti i Prodotti" distribuiva proporzionalmente gli acquisti globali tra le linee dei prodotti:

```typescript
// CODICE ERRATO (rimosso)
if (week.acquisti_totale > 0 && totalProduction > 0) {
    Object.keys(weekData).forEach(product => {
        const proportion = weekData[product] / totalProduction;
        weekData[product] += week.acquisti_totale * proportion; // ← Inflaziona i valori!
    });
}
```

### Soluzione Implementata
Rimossa la logica di distribuzione proporzionale degli acquisti. Ogni linea nel grafico "Tutti i Prodotti" mostra ora SOLO i valori di produzione puri.

```typescript
// CODICE CORRETTO
// NOTE: In "All Products" view, each line shows ONLY production.
// Trading data (acquisti/vendite) is NOT distributed to individual product lines.
// The checkbox "Acquisti / Vendite selezionati" only affects single-product view.
```

### Verifica
I valori nel grafico ora corrispondono esattamente a quelli nella tabella:
- 2026-05: Produzione 42.600 ✅
- 2026-06: Produzione 42.100 ✅

---

## 4. Dati Persi al Riavvio del Server (Database Path Relativo)

**Stato:** 🟢 Risolto  
**Data:** 2026-01-26  
**Componente:** `backend/database.py`

### Descrizione del Problema
Modifiche fatte alla tabella "Impostazioni Accasamenti" (es. campo "Usa dati di:") e alla tabella "Tabelle Produzioni" (es. valori ROSS 308 STANDARD) vengono perse quando il server backend viene riavviato.

### Causa Root
Il database SQLite usa un **path relativo** (`incubatoio.db`). Se il server viene avviato da una directory diversa, viene creato un NUOVO file database, perdendo tutti i dati precedenti.

```python
# database.py linea 8
DATABASE_URL = f"sqlite:///{DB_NAME}"  # Path relativo!
```

### Comportamento Osservato
- ✅ API funziona correttamente (`PUT /api/allevamenti/lotti/{id}` salva nel DB)
- ✅ Dati vengono persistiti durante la sessione
- ❌ Al riavvio del server, se la CWD è diversa, i dati vengono persi

### Soluzione Proposta
Usare un **path assoluto** per il database in `database.py`:

```python
import os
DB_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = f"sqlite:///{os.path.join(DB_DIR, 'incubatoio.db')}"
```

---

## 5. Grafico G001 Non Mostra Curve di Produzione

**Stato:** 🟢 Risolto  
**Data:** 2026-01-27  
**Componente:** `backend/services/production_service.py`

### Descrizione del Problema
Il grafico G001 ("Produzioni e Totali") mostrava un'area vuota senza linee colorate, nonostante la tabella T002 sottostante mostrasse correttamente i dati di produzione.

### Causa Root
Quando i dati di produzione venivano recuperati dalla **cache** (`ProductionCache`), il campo `allevamento` non veniva incluso. Il sistema usava il fallback `"Lotto {id}"` che non matchava il formato atteso dal frontend.

**Frontend aspettava:** `"Cortefranca 1B"` (formato `Allevamento Capannone`)  
**Backend restituiva:** `"Lotto 26"` (formato fallback dalla cache)

La mappa `allevamentoProductMap` nel frontend non trovava corrispondenze, quindi tutti i valori rimanevano a 0.

### Analisi Tecnica
```python
# production_service.py - PRIMA (problematico)
cache_by_key[key] = {
    "anno": c.anno,
    "settimana": c.settimana,
    "lotto_id": c.lotto_id,
    "prodotto": c.prodotto,
    "uova": c.uova
    # MANCANTE: allevamento!
}

# Aggregazione usava fallback sbagliato
"allevamento": entry.get('allevamento', f"Lotto {entry['lotto_id']}")
```

### Soluzione Implementata
Aggiunta mappa `lotto_allevamento_map` per ricostruire il campo `allevamento` corretto per i dati dalla cache:

```python
# production_service.py - DOPO (corretto)
# Build lotto_id -> allevamento map
lotto_allevamento_map = {}
for lotto in lotti_db:
    lotto_id = lotto.get('id')
    lotto_allevamento_map[lotto_id] = f"{lotto['Allevamento']} {lotto['Capannone']}"

# Cache entries now include correct allevamento
cache_by_key[key] = {
    ...
    "allevamento": lotto_allevamento_map.get(c.lotto_id, f"Lotto {c.lotto_id}")
}
```

### File Modificati
- `backend/services/production_service.py` (linee ~178-199)

### Verifica
Dopo la fix, il grafico mostra correttamente:
- 🔴 Color Yeald
- 🟢 Granpollo
- 🔵 Pollo70
- 🟠 Ross

---

## 6. Calcolo Vendite nel Grafico G001 Errato

**Stato:** 🟢 Risolto  
**Data:** 2026-01-27  
**Componente:** `frontend/src/pages/ProductionPage.tsx` (funzione `chartData`)

### Descrizione del Problema
Il calcolo del grafico G001 non applicava correttamente la formula `Produzione + Acquisti - Vendite`. Le vendite venivano sottratte proporzionalmente invece che direttamente per prodotto.

### Causa Root
Il codice originale sottraeva le vendite in modo proporzionale tra tutti i prodotti invece di applicare la formula semplice per singolo prodotto.

### Soluzione Implementata
- Aggiunto fetch separato per vendite (`/api/trading/data/vendita`)
- Modificata la logica `chartData` (linee 204-242) per calcolare: `Production + Purchases - Sales` direttamente per ogni prodotto
- Aggiunto stato `tradingDataVendite` per gestire i dati vendite

### Verifica
Il grafico G001 per "Granpollo" settimana 2026-05 ora mostra correttamente:
- 95.880 = 42.600 (Produzione) + 53.280 (Acquisti) - 0 (Vendite) ✅

---

## 7. V001 Stato Allevamenti Non Usa Dati da T001

**Stato:** 🟢 Risolto
**Data Risoluzione:** 2026-03-09
**Data:** 2026-01-27
**Componente:** `backend/routers/allevamenti.py`

### Descrizione del Problema
I capannoni visualizzati nella griglia V001 (Situazione Allevamenti) non prendono i dati direttamente dalla tabella T001 (Impostazioni Accasamenti). Usavano dati hardcoded.

### Causa Root
`FARM_STRUCTURE` era una costante hardcoded in `allevamenti.py` che definiva staticamente quali capannoni appartengono a ogni allevamento.

### Soluzione Implementata
Rimossa la costante `FARM_STRUCTURE`. Il endpoint `GET /api/allevamenti/farms` ora genera la struttura dinamicamente leggendo tutti i lotti da T001 ed estraendo i numeri capannone univoci per allevamento.

---

## 8. Modifiche a T004 Non Aggiornano Produzioni e Grafici

**Stato:** � Risolto  
**Data Risoluzione:** 2026-01-29  
**Data Segnalazione:** 2026-01-27  
**Componente:** `frontend/src/components/TradingTable.tsx`, `frontend/src/pages/ProductionPage.tsx`

### Descrizione del Problema
Quando vengono inseriti o modificati valori nella tabella T004 (Acquisti), i dati di produzione e i grafici non si aggiornavano automaticamente.

### Soluzione Implementata
Implementato **Data Refresh Pattern** con callback `onDataRefresh` in `TradingTable.tsx`:

- Prop `onDataRefresh?: () => void` aggiunta a `TradingTable`
- Chiamata dopo ogni operazione di salvataggio riuscita (handleSave, handleDelete, handleAddNew)
- `ProductionPage.tsx` passa `refreshAllData()` come callback per ricaricare trading data + production data

### Verifica
- ✅ Modifiche in T004 aggiornano immediatamente il grafico G001 senza F5
- ✅ Console log conferma refresh dei dati trading e produzione

---

## 9. Formula Non Ricalcolata Dopo Modifica T004

**Stato:** 🟢 Risolto
**Data Risoluzione:** 2026-03-09 (via Issue #8)
**Data:** 2026-01-27
**Componente:** `backend/routers/trading_router.py`, `backend/services/production_service.py`

### Risoluzione
I dati trading in `calculate_weekly_summary()` vengono sempre letti freschi dal DB (non sono cachati), quindi non serve invalidazione. Il frontend refresh dopo T004 era già risolto dall'Issue #8.

---

## 10. Modifiche a T003 Richiedono Refresh Manuale (F5)

**Stato:** � Risolto  
**Data Risoluzione:** 2026-01-29  
**Data Segnalazione:** 2026-01-27  
**Componente:** `frontend/src/pages/ProductionPage.tsx`, `frontend/src/components/ProductionTablesView.tsx`

### Descrizione del Problema
Dopo aver modificato una cella in T003 (Tabelle Produzioni), i cambiamenti non si riflettevano nei grafici finché non si premeva F5 per ricaricare la pagina.

### Soluzione Implementata
Implementato **Data Refresh Pattern** con callback `onDataRefresh` in `ProductionTablesView.tsx`:

- Prop `onDataRefresh?: () => void` aggiunta a `ProductionTablesView`
- Chiamata dopo ogni operazione di salvataggio riuscita
- `ProductionPage.tsx` passa `refreshAllData()` come callback per ricaricare tutti i dati

### File Modificati
- `frontend/src/pages/ProductionPage.tsx` (aggiunto refreshAllData, passato come prop)
- `frontend/src/components/ProductionTablesView.tsx` (aggiunto prop onDataRefresh)

### Verifica
- ✅ Modifiche in T003 aggiornano immediatamente i grafici senza F5
- ✅ Console log conferma refresh dei dati produzione

---

## 11. Bug: Passirano 1 Calcolato Come Ross Invece di Granpollo

**Stato:** 🟢 Risolto
**Data Risoluzione:** 2026-03-09
**Data:** 2026-01-27
**Componente:** `backend/utils/helpers.py` (seed data)

### Causa Root
Il seed data iniziale in `helpers.py` aveva Passirano 1 con `Prodotto: 'Ross'` invece di `'Granpollo'`.

### Soluzione Implementata
Corretto il seed data. **Nota:** se il database è già stato seeded con il valore errato, è necessario aggiornare manualmente il lotto in T001 (Impostazioni Accasamenti) impostando il Prodotto su "Granpollo".

---

## 12. Configurare HTTPS/SSL per Server Produzione

**Stato:** 🔴 Non Risolto  
**Data:** 2026-01-31  
**Componente:** Server VPS (Nginx + Let's Encrypt)

### Descrizione del Problema
Il server di produzione (`http://162.55.184.122`) usa HTTP senza certificato SSL. Questo causa:
- Connessioni non criptate
- Avvisi di sicurezza nel browser
- GitHub Webhook richiede "Disable SSL verification"

### Soluzione Proposta
Configurare **Let's Encrypt** con Certbot per ottenere certificato SSL gratuito:
1. Registrare un dominio (es. `incubatoio.example.com`)
2. Installare Certbot sul server
3. Configurare Nginx per HTTPS
4. Aggiornare GitHub Webhook con URL https

### Priorità
🟡 Media - Funziona senza SSL, ma consigliato per sicurezza

---

## 13. Bug: T014 Età Settimane Errata Alla Selezione Allevamento

**Stato:** 🟢 Risolto
**Data Risoluzione:** 2026-03-09
**Data:** 2026-03-05  
**Componente:** `frontend/src/components/EggStorageTable.tsx`

### Descrizione del Problema
Quando si aggiunge una partita al magazzino (T014) e si seleziona un allevamento come origine, il campo "Età (settimane)" non mostra il valore corretto. Ad esempio, selezionando "Passirano" dovrebbe mostrare 63 ma mostra 10.

### Analisi Tecnica
La logica di calcolo dell'età usa l'aritmetica "absolute week" (`Year * 52 + Week`) per calcolare la differenza tra la settimana corrente e la settimana di inizio del lotto. Possibili cause:
1. Il sistema seleziona il lotto sbagliato (es. un lotto più recente con poche settimane di vita)
2. Il calcolo della settimana corrente è errato (valore statico o timezone issue)
3. Il calcolo della differenza in settimane è errato (overflow anno non gestito correttamente)

### Come Riprodurre
1. Vai su Incubatoio → Magazzino Uova
2. Clicca "Aggiungi partita"
3. Seleziona "Passirano" come allevamento di origine
4. Osserva il valore mostrato in "Età (settimane)" — dovrebbe essere ~63, mostra 10

### Causa Root
In `handleOrigineChange` (EggStorageTable.tsx), quando un allevamento ha più lotti attivi, veniva selezionata l'**età minima** (`Math.min`) invece dell'età massima. Il lotto più giovane (10 settimane) veniva preferito rispetto a quello più vecchio (63 settimane).

### Soluzione Implementata
Cambiato `Math.min` in `Math.max` in `handleOrigineChange`: viene ora usata l'età del lotto più anziano (gregge principale in produzione).

---

## 14. Curva Produzione: Dropdown Non Persisteva + Calcoli Includevano Tutti i Lotti

**Stato:** 🟢 Risolto
**Data Risoluzione:** 2026-01-25
**Componente:** `backend/routers/allevamenti.py`, `backend/services/production_service.py`

### Bug #1: Dropdown non persisteva nel database

**Problema:** Selezionando una curva dal dropdown "Usa dati di:" in T001, il valore tornava a "-" dopo refresh.

**Causa Root:** Import errato in `allevamenti.py` che puntava a un'istanza diversa del modulo database (working directory diversa). Le API restituivano 200 OK ma scrivevano su un database fantasma.

**Soluzione:** Corretto l'import per usare il path relativo corretto al modulo database.

### Bug #2: Calcoli includevano tutti i lotti anche senza curva

**Problema:** La pagina "Produzioni Uova" includeva tutti i lotti nei totali anche se non avevano `Curva_Produzione` impostata.

**Causa Root:** `production_service.py` faceva fallback automatico su `Razza` se `Curva_Produzione` era vuoto:
```python
curva_da_usare = lotto.get('Curva_Produzione') or lotto.get('Razza')  # ERRATO
```

**Soluzione:** Rimosso il fallback. Solo lotti con `Curva_Produzione` esplicita vengono inclusi nei calcoli:
```python
curva_da_usare = lotto.get('Curva_Produzione')
if not curva_da_usare or curva_da_usare not in df_curve.columns:
    continue  # skip lotti senza curva
```

---
