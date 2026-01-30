# Cartella SVILUPPO

Questa cartella contiene documentazione per lo sviluppo del progetto Incubatoio Manager.

## 📌 File Principali

| File | Descrizione |
|------|-------------|
| [RULES.md](./RULES.md) | **Regole ufficiali** - Colori, prodotti, genetiche |
| [issues.md](./issues.md) | Bug e problemi da risolvere |
| [future-features.md](./future-features.md) | Feature future pianificate |

---

## 🎨 Colori Prodotti

Vedi **[RULES.md](./RULES.md)** per la tabella completa dei colori.

---

## 📚 Workarounds Disponibili

### [pandas-json-serialization.md](./pandas-json-serialization.md)
**Problema:** Errore 500 in FastAPI quando si restituiscono dati da pandas DataFrame  
**Causa:** Valori `NaN` non sono serializzabili in JSON  
**Soluzione:** Convertire `NaN` in `None` usando `pd.isna()`

---

## 🔍 Quando Consultare Questa Cartella

Controlla qui quando incontri:
- Errori inspiegabili che sembrano bug del framework
- Problemi di serializzazione/deserializzazione
- Comportamenti strani con librerie esterne
- Problemi di compatibilità tra tecnologie
- Errori ricorrenti che hai già risolto in passato

## ✍️ Come Aggiungere un Nuovo Workaround

Quando risolvi un problema non ovvio:

1. Crea un nuovo file `.md` con nome descrittivo (es. `react-state-update.md`)
2. Usa questo template:

```markdown
# Workaround: [Nome Problema]

## Problema Riscontrato
[Descrizione del problema e sintomi]

## Causa
[Spiegazione tecnica della causa]

## Soluzione
[Codice e spiegazione della soluzione]

## Alternative
[Altre possibili soluzioni]

## Quando Applicare
[Scenari specifici]
```

3. Aggiorna questo README.md con il link al nuovo workaround

## 🏷️ Categorie

I workarounds sono organizzati per categoria:
- **Backend (FastAPI/Python)**: pandas, serializzazione, database
- **Frontend (React/TypeScript)**: state management, rendering, hooks
- **Database**: query, performance, migrations
- **Build/Deploy**: configurazione, compatibilità

---

**Nota:** Questa è una risorsa vivente. Aggiorna e migliora i workarounds quando trovi soluzioni migliori!
