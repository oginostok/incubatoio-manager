# Workaround: Pandas DataFrame to JSON in FastAPI

## Problema Riscontrato

Quando si restituisce dati da un DataFrame pandas attraverso un endpoint FastAPI, si può ricevere un errore 500 (Internal Server Error) anche se il codice sembra corretto.

### Sintomo
- L'endpoint restituisce `500 Internal Server Error`
- Il DataFrame viene caricato correttamente (non è vuoto)
- Non ci sono errori evidenti nel codice

### Causa
Il metodo `row.to_dict()` di pandas può restituire valori `NaN` (Not a Number) che **non sono serializzabili in JSON**. Quando FastAPI cerca di convertire la risposta in JSON, fallisce con un errore 500.

## Soluzione

### ❌ Codice che NON funziona
```python
data = []
for _, row in df.iterrows():
    row_dict = row.to_dict()  # ❌ Può contenere NaN non serializzabili
    data.append(row_dict)

return {"data": data}  # ❌ Errore 500 se ci sono NaN
```

### ✅ Codice che funziona
```python
import pandas as pd

data = []
for idx, row in df.iterrows():
    row_dict = {}
    for col in df.columns:
        val = row[col]
        # Converti NaN in None (serializzabile in JSON)
        if pd.isna(val):
            row_dict[col] = None
        else:
            row_dict[col] = val
    data.append(row_dict)

return {"data": data}  # ✅ Funziona correttamente
```

## Alternative

### Opzione 1: Usare fillna()
```python
df = df.fillna('')  # Sostituisce NaN con stringa vuota
data = df.to_dict('records')
```

### Opzione 2: Usare replace()
```python
import numpy as np
df = df.replace({np.nan: None})
data = df.to_dict('records')
```

### Opzione 3: Usare orient='records' con gestione manuale
```python
data = df.to_dict('records')
# Poi pulire manualmente i NaN se necessario
```

## Quando Applicare Questo Workaround

Applica questa soluzione quando:
1. Stai restituendo dati da pandas DataFrame attraverso FastAPI
2. Il DataFrame potrebbe contenere valori mancanti (NaN, None, NA)
3. Ricevi errori 500 inspiegabili anche se il codice sembra corretto
4. I log mostrano errori di serializzazione JSON

## Best Practice

1. **Sempre gestire NaN**: Quando lavori con pandas e API, converti sempre NaN in None
2. **Testare con dati reali**: I dati di test potrebbero non avere NaN, ma i dati reali sì
3. **Logging dettagliato**: Aggiungi print/logging per vedere la forma e il contenuto del DataFrame
4. **Validazione**: Considera l'uso di Pydantic models per validare i dati prima di restituirli

## Esempio Completo

```python
from fastapi import APIRouter, HTTPException
import pandas as pd

router = APIRouter()

@router.get("/data")
async def get_data():
    try:
        # Carica DataFrame
        df = load_dataframe()
        
        # Converti in lista di dict gestendo NaN
        data = []
        for idx, row in df.iterrows():
            row_dict = {}
            for col in df.columns:
                val = row[col]
                if pd.isna(val):
                    row_dict[col] = None
                else:
                    row_dict[col] = val
            data.append(row_dict)
        
        return {
            "data": data,
            "columns": list(df.columns),
            "count": len(data)
        }
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
```

## Note Aggiuntive

- Questo problema è specifico della serializzazione JSON, non di pandas stesso
- Altri formati (CSV, Excel) gestiscono NaN senza problemi
- FastAPI usa `json.dumps()` internamente, che non supporta NaN
- Numpy NaN e pandas NA sono entrambi problematici per JSON

## Riferimenti

- Pandas documentation: https://pandas.pydata.org/docs/reference/api/pandas.isna.html
- FastAPI JSON encoding: https://fastapi.tiangolo.com/advanced/custom-response/
- Python JSON module limitations: https://docs.python.org/3/library/json.html
