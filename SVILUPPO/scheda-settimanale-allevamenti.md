# Scheda Settimanale di Raccolta Dati — Galline Riproduttrici

Specifica dei campi estratti dalla scheda cartacea utilizzata per la raccolta dati settimanale degli allevamenti.

---

## 1. Intestazione (dati fissi del capannone/settimana)

| Campo | Descrizione | Esempio |
|---|---|---|
| **Allevamento** | Codice allevamento | `110AT700` |
| **Capannone** | Numero capannone | `5` |
| **Età in Settimane** | Età del gruppo in settimane | `21` |
| **Razza Galline** | Razza delle femmine | `RUSTIC` |
| **Razza Galli** | Razza dei maschi | `CNB` |
| **Galline presenti ad inizio settimana** | Conteggio femmine a inizio settimana | `9.267` |
| **Galli presenti ad inizio settimana** | Conteggio maschi a inizio settimana | `1.148` |
| **Galli Box** | Numero galli in box separato | — |
| **% Galli** | Percentuale galli su totale (calcolato) | — |

---

## 2. Tabella Giornaliera (7 righe: VEN → GIO)

Una riga per ogni giorno della settimana (1 VEN, 2 SAB, 3 DOM, 4 LUN, 5 MAR, 6 MER, 7 GIO).

| Colonna | Tipo | Descrizione |
|---|---|---|
| **Data** | data | Giorno della settimana (1-7) |
| **Mortalità Maschi** | intero | Numero galli morti nel giorno |
| **Mortalità Femmine** | intero | Numero galline morte nel giorno |
| **Temperatura MIN** | decimale (°C) | Temperatura minima registrata |
| **Temperatura MAX** | decimale (°C) | Temperatura massima registrata |
| **Luce DA** | orario (HH:MM) | Ora di accensione luci |
| **Luce A** | orario (HH:MM) | Ora di spegnimento luci |
| **Uova COVA** | intero | Numero uova da cova raccolte |
| **Uova SCARTO** | intero | Numero uova di scarto |
| **Razione Maschi** | grammi/gg | Razione giornaliera per maschio |
| **Razione Femmine** | grammi/gg | Razione giornaliera per femmina |
| **Acqua Consumata** | litri | Consumo d'acqua giornaliero |
| **% Deposizione** | percentuale | Percentuale di deposizione del giorno |

---

~~## 3. Carico Mangime~~ (**RIMOSSO** — richiesta cliente 2026-03-05)

---

## 3. Trattamenti (Acidi, Probiotici, Vitamine)

Una singola riga iniziale visibile. Pulsante con freccia (▼) per aggiungere righe aggiuntive.

| Campo | Tipo | Descrizione |
|---|---|---|
| **Prodotto** | testo | Nome del prodotto somministrato |
| **DA** | data | Data inizio trattamento |
| **A** | data | Data fine trattamento |

> **UI**: Una riga trattamento sempre visibile + pulsante "+" con freccia per espandere e aggiungere altre righe dinamicamente.

---

## 5. Pesi

| Campo | Tipo | Descrizione |
|---|---|---|
| **Peso Galline** | grammi | Peso rilevato delle femmine |
| **Peso Galline Atteso** | grammi | Peso atteso da standard di razza |
| **Peso Galli** | grammi | Peso rilevato dei maschi |
| **Peso Galli Atteso** | grammi | Peso atteso da standard di razza |

---

## 6. Note

Campo di testo libero per osservazioni generali sulla settimana.

---

## Valori Calcolabili (non presenti come input diretto)

- **% Galli** = Galli presenti / (Galline presenti + Galli presenti) × 100
- **% Deposizione** = Uova COVA / Galline presenti × 100
- **Mortalità cumulativa** settimanale (somma giornaliera maschi + femmine)
- **Galline/Galli a fine settimana** = presenti ad inizio − mortalità cumulativa
- **Consumo medio acqua** settimanale
- **Rapporto acqua/mangime**
