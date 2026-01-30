# Regole di Sviluppo

Questo file contiene le regole e le costanti ufficiali del progetto.

---

## 🎨 Colori Prodotti

I colori ufficiali dei prodotti sono definiti in **`frontend/tailwind.config.js`** (linee 44-64) e sono la **SINGLE SOURCE OF TRUTH**.

| Prodotto | HEX Bright | HEX Pastel | Tailwind Class |
|----------|------------|------------|----------------|
| **Granpollo** | `#22c55e` (green-500) | `#dcfce7` (green-100) | `bg-granpollo-bright`, `bg-granpollo-pastel` |
| **Pollo70** | `#3b82f6` (blue-500) | `#dbeafe` (blue-100) | `bg-pollo70-bright`, `bg-pollo70-pastel` |
| **Color Yeald** | `#ef4444` (red-500) | `#fee2e2` (red-100) | `bg-colorYeald-bright`, `bg-colorYeald-pastel` |
| **Ross** | `#f97316` (orange-500) | `#ffedd5` (orange-100) | `bg-ross-bright`, `bg-ross-pastel` |

### File Correlati
- **Definizione principale**: `frontend/tailwind.config.js`
- **Utility functions**: `frontend/src/lib/productColors.ts`
- **Grafici (usa HEX)**: `frontend/src/components/ProductionChart.tsx`

### Regole
1. ✅ Per CSS/Tailwind: usa le classi `bg-{prodotto}-bright` o `bg-{prodotto}-pastel`
2. ✅ Per i grafici Recharts: importa i colori da `productColors.ts` o usa gli HEX della tabella
3. ❌ NON inventare nuovi colori - usa sempre quelli di questa tabella

---

## 📦 Prodotti Ufficiali

```typescript
const PRODUCT_OPTIONS = ["Granpollo", "Pollo70", "Color Yeald", "Ross"];
```

> ⚠️ **Attenzione**: "Color Yeald" ha lo spazio. Non usare "ColorYeald".

---

## 🧬 Genetiche Ufficiali

```typescript
const GENETICS_OPTIONS = [
    "JA57 STANDARD",
    "JA57K STANDARD", 
    "JA57KI STANDARD",
    "JA87 STANDARD",
    "RANGER STANDARD",
    "ROSS 308 STANDARD"
];
```

---

## 📁 Struttura File Importante

| Scopo | File |
|-------|------|
| Colori Tailwind | `frontend/tailwind.config.js` |
| Utility colori | `frontend/src/lib/productColors.ts` |
| Tipi TypeScript | `frontend/src/types/index.ts` |
| Database | `backend/database.py` |
| Calcolo produzioni | `backend/services/production_service.py` |

---

## 🔄 Aggiornare i Colori

Se devi modificare un colore:

1. Modifica **`tailwind.config.js`** (singola fonte)
2. Se usi HEX nei grafici, aggiorna anche **`ProductionChart.tsx`** (linee 11-16)
3. Ricarica il frontend

---

## 📋 ID Univoci Tabelle e Grafici

Ogni elemento UI ha un ID univoco per riferimenti nella documentazione e nel codice.

### Convenzione
- **T###** = Tabelle
- **G###** = Grafici
- **V###** = Visualizzazioni/Grid

### ⚠️ REGOLA OBBLIGATORIA

> Ogni volta che crei una **nuova tabella o grafico**, DEVI:
> 1. Assegnargli un ID univoco (es. T006, G002)
> 2. Aggiungerlo alla tabella qui sotto
> 3. Usare l'ID nel codice come commento o attributo `data-id`

### 🏷️ Stile Badge ID

Il badge con l'ID deve essere mostrato **sotto il titolo** del componente con questo stile standard:

```tsx
<h2 className="text-xl font-bold text-gray-800">Titolo Componente</h2>
<p className="text-xs text-gray-400">T008</p>
```

> **Riferimento**: Vedi `FarmStatusGrid.tsx` (V001) e `BirthRatesTable.tsx` (T008)

---

## 📐 Tabelle con Larghezze Fisse

Quando si creano tabelle con celle editabili o input dinamici, usare sempre larghezze fisse per evitare resize durante l'editing.

### Regole

1. ✅ Usare `table-fixed` sulla tabella: `<table className="w-full text-sm table-fixed">`
2. ✅ Assegnare width esplicite agli header: `w-24`, `w-28`, `w-32` etc.
3. ❌ NON usare `min-w-[N]` da solo - non previene il resize
4. ✅ Per celle con input, assicurarsi che l'input abbia `w-full`

### Esempio

```tsx
<table className="w-full text-sm table-fixed">
  <thead>
    <tr>
      <th className="... w-24">Nome</th>
      <th className="... w-28">Valore</th>
    </tr>
  </thead>
</table>
```

> **Riferimento**: Vedi `RossPlanningTable.tsx` (T013)


---

### ALLEVAMENTI

| ID | Nome | Percorso UI | Componente |
|----|------|-------------|------------|
| **V001** | Stato Allevamenti | Allevamenti → Stato Allevamenti | `FarmStatusGrid.tsx` |
| **T001** | Impostazioni Accasamenti | Allevamenti → Impostazioni Accasamenti | `AccasamentiTable.tsx` |
| **T006** | Impostazioni Genetiche Gallina | Allevamenti → Impostazioni Genetiche | `GeneticsSettingsTable.tsx` |
| **T007** | Impostazioni Genetiche Gallo | Allevamenti → Impostazioni Genetiche | `GeneticsSettingsTable.tsx` |

---

### PRODUZIONE UOVA

| ID | Nome | Percorso UI | Componente |
|----|------|-------------|------------|
| **G001** | Grafico Produzioni | Produzione Uova → Produzioni e Totali → Grafico | `ProductionChart.tsx` |
| **T002** | Riepilogo Settimanale | Produzione Uova → Produzioni e Totali → Tabella | `WeeklySummaryTable.tsx` |
| **T003** | Tabelle Produzioni (Curve) | Produzione Uova → Tabelle Produzioni | `ProductionPage.tsx` (inline) |
| **T004** | Acquisti | Produzione Uova → Acquisti | `TradingTable.tsx` |
| **T005** | Vendite | Produzione Uova → Vendite | `TradingTable.tsx` |

---

### PULCINI

| ID | Nome | Percorso UI | Componente |
|----|------|-------------|------------|
| **T010** | Pianificazione Nascite Granpollo | Pulcini → Granpollo | `GranpolloPlanningTable.tsx` |
| **T009** | Nascita Uova in Acquisto | Pulcini → Tabelle di Nascita | `PurchaseBirthRatesTable.tsx` |
| **T008** | Tabelle di Nascita | Pulcini → Tabelle di Nascita | `BirthRatesTable.tsx` |

---

### Riferimento Rapido

```
ALLEVAMENTI
├── V001: Stato Allevamenti (griglia capannoni)
├── T001: Impostazioni Accasamenti (tabella lotti)
├── T006: Impostazioni Genetiche Gallina
└── T007: Impostazioni Genetiche Gallo

PRODUZIONE UOVA
├── Produzioni e Totali
│   ├── G001: Grafico Produzioni
│   └── T002: Riepilogo Settimanale
├── T003: Tabelle Produzioni (curve standard)
├── T004: Acquisti
└── T005: Vendite

PULCINI
├── T010: Pianificazione Nascite Granpollo
├── T009: Nascita Uova in Acquisto (% nascita uova acquistate)
└── T008: Tabelle di Nascita (percentuali nascita W24-W64)
```


---

## 🧮 Calcolo Produzioni Uova

Questa sezione definisce la **formula ufficiale** per calcolare la produzione uova. Tutti i calcoli sul sito DEVONO seguire questa logica.

---

### 🐔 Definizione: LOTTO (Ciclo Produttivo)

Un **Lotto** rappresenta un **ciclo produttivo**: un gruppo di galline+galli di una genetica specifica, posizionate in un capannone, con un inizio e una fine.

Ogni lotto ha un **ID univoco** (`lotto_id`) che viene usato per:
- Tracciare tutte le produzioni associate
- Invalidare/ricalcolare SOLO quel lotto quando viene modificato

#### ID Utente Ciclo (User-Friendly ID)

Per facilitare l'identificazione dei cicli da parte dell'utente, ogni lotto mostra un **ID leggibile** sotto il nome dell'allevamento nella tabella T001.

**Formato:**
```
[id][ALLEVAMENTO(3 lettere maiuscole)][Anno_Start][RAZZA(prima parte)]
```

**Esempi:**
| ID DB | Allevamento | Anno | Razza | → ID Utente |
|-------|-------------|------|-------|-------------|
| 1 | Tonengo | 2025 | JA87 STANDARD | `1TON2025JA87` |
| 5 | Cortefranca | 2026 | ROSS 308 STANDARD | `5COR2026ROSS` |
| 12 | Passirano | 2025 | JA57K STANDARD | `12PAS2025JA57K` |

> **Implementazione**: `getUserId()` in `AccasamentiTable.tsx`

#### Metadati del Lotto

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `lotto_id` | INTEGER | **ID univoco** del lotto (auto-generato) |
| `allevamento` | VARCHAR | Nome dell'allevamento (es. "Cortefranca") |
| `capannone` | VARCHAR | Identificativo capannone (es. "1A", "2B") |
| `razza` | VARCHAR | Genetica gallina (es. "ROSS 308 STANDARD") |
| `razza_gallo` | VARCHAR | Genetica gallo (opzionale) |
| `curva_produzione` | VARCHAR | Quale curva usare in T003 (se diversa da `razza`) |
| `prodotto` | VARCHAR | Prodotto destinazione (Granpollo, Pollo70, etc.) |
| `capi` | INTEGER | Numero di animali accasati |
| `anno_start` | INTEGER | Anno di accasamento |
| `sett_start` | INTEGER | Settimana di accasamento (1-52) |
| `data_fine_prevista` | DATE | Data fine ciclo (opzionale) |
| `attivo` | BOOLEAN | Se il lotto è attivo |

#### Ciclo Produttivo

```
┌─────────────────────────────────────────────────────────────┐
│  CICLO PRODUTTIVO                                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Settimana 0 ─────────────────────────────────────▶ Fine    │
│       │                                                      │
│       │  W 0-23: Crescita (nessuna produzione)              │
│       │                                                      │
│       │  W 24-64: PRODUZIONE ATTIVA                         │
│       │           └─ Questo è il range calcolato            │
│       │                                                      │
│       │  W 65+: Fine ciclo (produzione zero o chiusura)     │
│       ▼                                                      │
└─────────────────────────────────────────────────────────────┘
```

#### Età Produttiva Standard

| Range Settimane | Stato |
|-----------------|-------|
| W 0-23 | **Crescita** - Nessuna produzione uova |
| W 24-64 | **Produzione Attiva** - Calcolo con formula |
| W 65+ | **Fine Ciclo** - Generalmente chiuso |

---

### Variabili

| Nome Variabile | Descrizione |
|----------------|-------------|
| `[WSolare]` | Settimana solare (anno/settimana) per la quale calcolare la produzione |
| `[CapannoneX]` | Identificativo del capannone (es. "Cortefranca_1A") |
| `[EtaGalline]` | Età in settimane delle galline presenti in `[CapannoneX]` durante `[WSolare]` |
| `[GeneticaGalline]` | Genetica delle galline (es. "JA57 STANDARD", "ROSS 308 STANDARD") |
| `[NumGalline]` | Numero di animali presenti in `[CapannoneX]` durante `[WSolare]` |
| `[Produzione]` | Percentuale di produzione (0.xx) trovata in **T003** |

### Come Trovare `[Produzione]`

1. Vai alla tabella **T003** (Tabelle Produzioni)
2. Trova la colonna che corrisponde a `[GeneticaGalline]` (es. "ROSS 308 STANDARD")
3. Trova la riga dove **W** = `[EtaGalline]`
4. L'incrocio riga/colonna è `[Produzione]` (valore decimale, es. 0.752 per 75.2%)

### Formula Ufficiale

```
Uova Prodotte = [NumGalline] × [Produzione] × 7
```

> **Esempio:**
> - `[NumGalline]` = 3.600 galline
> - `[Produzione]` = 0.75 (75%)
> - Calcolo: 3.600 × 0.75 × 7 = **18.900 uova/settimana**

### Arrotondamento

Il risultato viene arrotondato al **centinaio più vicino** per scopi di reportistica:

```python
uova = round((num_galline * produzione * 7) / 100) * 100
```

---

### Totale Uova per Prodotto

Una volta calcolate le **Uova Prodotte** per `[WSolare]`, bisogna aggiungere gli **acquisti** e sottrarre le **vendite** per ottenere il totale disponibile.

#### Variabili Aggiuntive

| Nome Variabile | Descrizione | Tabella Riferimento |
|----------------|-------------|---------------------|
| `[UovaAcquisto]` | Uova acquistate per quel prodotto in `[WSolare]` | **T004** (Acquisti) |
| `[UovaVendita]` | Uova vendute per quel prodotto in `[WSolare]` | **T005** (Vendite) |
| `[TotaleUovaProdotto]` | Totale uova disponibili per quel prodotto | Risultato formula |

#### Formula Completa

```
[TotaleUovaProdotto] = [UovaProdotte] + [UovaAcquisto] - [UovaVendita]
```

#### Come Trovare `[UovaAcquisto]`

1. Vai alla tabella **T004** (Acquisti)
2. Trova la riga corrispondente a `[WSolare]` (Anno/Settimana)
3. Somma tutte le colonne che hanno quel `[Prodotto]` (es. "Boyè_Granpollo", "Amadori_Granpollo" → somma per Granpollo)

#### Come Trovare `[UovaVendita]`

1. Vai alla tabella **T005** (Vendite)
2. Trova la riga corrispondente a `[WSolare]` (Anno/Settimana)
3. Somma tutte le colonne che hanno quel `[Prodotto]` (es. "Cliente1_Granpollo" → somma per Granpollo)

> **Esempio Completo:**
> - `[WSolare]` = 2026-W05
> - `[Prodotto]` = Granpollo
> - `[UovaProdotte]` = 25.000 (calcolate dalla formula precedente)
> - `[UovaAcquisto]` = 5.000 (da T004, somma colonne Granpollo per W05)
> - `[UovaVendita]` = 2.000 (da T005, somma colonne Granpollo per W05)
> - **`[TotaleUovaProdotto]`** = 25.000 + 5.000 - 2.000 = **28.000 uova**

---

## 🗄️ Strategia Cache Produzioni (Opzione 1)

Per mantenere il sito veloce, i calcoli vengono salvati in una tabella cache.

### Tabella: `production_cache`

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| `id` | INTEGER | Primary key |
| `anno` | INTEGER | Anno solare |
| `settimana` | INTEGER | Settimana solare 1-52 |
| `lotto_id` | INTEGER | FK verso tabella lotti |
| `prodotto` | VARCHAR | Prodotto (Granpollo, Pollo70, etc.) |
| `uova` | INTEGER | Uova calcolate |
| `valid` | BOOLEAN | Se il dato è ancora valido |
| `calculated_at` | TIMESTAMP | Quando è stato calcolato |

### Quando Invalidare la Cache

| Evento | Azione |
|--------|--------|
| Modifica lotto (Capi, Data, Genetica) | Invalida cache di **quel lotto** |
| Modifica curva in T003 | Invalida cache di **tutti i lotti** che usano quella curva |
| Nuovo lotto creato | Calcola cache per il nuovo lotto |
| Lotto eliminato | Elimina cache di quel lotto |

### Flusso Ricalcolo

```
┌─────────────────────────────────────────────────────────┐
│  1. Utente modifica dato                                 │
│                    ▼                                     │
│  2. Backend marca cache come invalid (valid = false)     │
│                    ▼                                     │
│  3. Frontend richiede dati produzione                    │
│                    ▼                                     │
│  4. Backend controlla cache:                             │
│     - Se valid = true → restituisce cache               │
│     - Se valid = false → ricalcola, salva, restituisce  │
└─────────────────────────────────────────────────────────┘
```

---
