"""
Aggiunge colonna ROSS 308 STANDARD vuota al CSV
"""
import pandas as pd
from backend.database import engine

# 1. Carica CSV attuale
df = pd.read_csv('backend/dati.csv', sep=';', encoding='utf-8')

print("📄 CSV ATTUALE:")
print(f"Righe: {len(df)}, Colonne: {len(df.columns)}")
print(f"Colonne: {list(df.columns)}")

# 2. Trova posizione dopo GOLDEN STANDARD
golden_idx = df.columns.get_loc('GOLDEN  STANDARD')
print(f"\n📍 GOLDEN STANDARD trovato all'indice: {golden_idx}")

# 3. Crea nuova colonna vuota (NaN)
df.insert(golden_idx + 1, 'ROSS 308  STANDARD', None)

print(f"\n✅ Aggiunta colonna 'ROSS 308  STANDARD' all'indice {golden_idx + 1}")
print(f"\nNUOVO ORDINE COLONNE:")
for i, col in enumerate(df.columns):
    marker = " ← NUOVA!" if col == 'ROSS 308  STANDARD' else ""
    print(f"  {i+1}. {col}{marker}")

# 4. Salva CSV
df.to_csv('backend/dati.csv', sep=';', index=False, encoding='utf-8')
print(f"\n💾 CSV salvato: backend/dati.csv")

# 5. Aggiorna database
df.to_sql("standard_curves", engine, if_exists='replace', index=False)
print(f"💾 Database aggiornato: standard_curves")

# 6. Verifica
print(f"\n🔍 VERIFICA:")
print(f"Righe finali: {len(df)}")
print(f"Colonne finali: {len(df.columns)}")

# Check ROSS
ross_cols = [col for col in df.columns if 'ROSS' in col.upper()]
print(f"✅ Colonne ROSS: {ross_cols}")

print("\n🎉 COMPLETATO! La colonna ROSS 308 STANDARD è stata aggiunta.")
print("   Ora puoi popolarla manualmente tramite editing inline nella tabella.")
