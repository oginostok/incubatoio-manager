# Fix: Curva Produzione - Dropdown e Calcoli

**Data:** 2026-01-25  
**Issue:** Il campo "Usa dati di:" (Curva_Produzione) non persisteva e i calcoli includevano tutti i lotti

---

## Bug #1: Dropdown non persisteva nel database

### Problema
Quando si selezionava una curva di produzione dal dropdown nella tabella "Impostazioni Accasamenti", l'interfaccia mostrava un checkmark verde di conferma, ma dopo il refresh della pagina il valore tornava a "-" (vuoto). Il database non salvava effettivamente il valore.

### Causa Root
Nel file `backend/routers/allevamenti.py`, l'import del modulo database era errato:

```python
# ERRATO - causava il caricamento di un modulo diverso
from database import get_lotti, add_lotto, update_lotto, delete_lotto
```

Questo import faceva sì che il router API caricasse un'istanza diversa del modulo database, che puntava a un file `.db` in una working directory diversa. Le chiamate API restituivano 200 OK ma scrivevano su un database fantasma.

### Soluzione
Corretto l'import per usare il path completo del modulo backend:

```python
# CORRETTO - usa il modulo backend corretto
from backend.database import get_lotti, add_lotto, update_lotto, delete_lotto
```

**File modificato:** `backend/routers/allevamenti.py` (righe 7-9)

### Verifica
- Test API diretto: `PUT /api/allevamenti/lotti/5` con `{"Curva_Produzione":"GOLDEN STANDARD"}` → database mostra valore salvato ✅
- Test browser: selezione dropdown su "Tonengo Cap 6" → valore persiste dopo refresh ✅

---

## Bug #2: Calcoli produzione includevano tutti i lotti

### Problema
Anche dopo aver impostato `Curva_Produzione` solo su 2 lotti, la pagina "Produzioni Uova" mostrava ancora tutti i lotti nei totali settimanali invece di filtrare solo quelli con curva assegnata.

### Causa Root
Nel file `backend/services/production_service.py`, la logica di selezione della curva faceva un fallback automatico sul campo `Razza` se `Curva_Produzione` era vuoto:

```python
# ERRATO - fallback automatico su Razza
curva_da_usare = lotto.get('Curva_Produzione') or lotto.get('Razza')
```

Questo comportamento includeva tutti i lotti nei calcoli, anche quelli senza `Curva_Produzione` esplicita.

### Soluzione
Rimosso il fallback. Ora solo i lotti con `Curva_Produzione` esplicitamente impostata vengono inclusi:

```python
# CORRETTO - solo lotti con Curva_Produzione esplicita
curva_da_usare = lotto.get('Curva_Produzione')

# Skip lotti without explicit Curva_Produzione
if not curva_da_usare or curva_da_usare not in df_curve.columns:
    continue
```

**File modificato:** `backend/services/production_service.py` (righe 40-44)

### Verifica
- API `/api/production/summary` restituisce solo 2 allevamenti nei dettagli produzione (invece di tutti)
- I totali settimanali riflettono solo i lotti configurati ✅

---

## Riepilogo Modifiche

| File | Righe | Tipo Modifica |
|------|-------|---------------|
| `backend/routers/allevamenti.py` | 7-9 | Import corretto del modulo database |
| `backend/services/production_service.py` | 40-44 | Rimosso fallback automatico su Razza |

## Note Implementative

1. **Database Migration**: Il campo `curva_produzione` è stato aggiunto alla tabella `lotti` tramite ALTER TABLE in `database.py` (righe 89-93)

2. **Valore di Default**: I lotti senza `Curva_Produzione` assegnata hanno valore `NULL` nel database e vengono automaticamente esclusi dai calcoli

3. **Compatibilità**: Le modifiche sono backward-compatible - i lotti esistenti continuano a funzionare, semplicemente non vengono inclusi nei calcoli finché non viene assegnata una curva

4. **Frontend**: Il dropdown in `AccasamentiTable.tsx` carica dinamicamente le colonne disponibili da `/api/production-tables` e aggiorna correttamente via PUT
