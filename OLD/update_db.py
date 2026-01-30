"""
Script per forzare l'aggiornamento del database standard_curves
con i dati puliti dal CSV.
"""
import pandas as pd
from backend.database import engine

# 1. Carica CSV pulito
print("📄 Caricando CSV pulito...")
df = pd.read_csv('backend/dati.csv', sep=';', encoding='utf-8')
print(f"   Righe: {len(df)}, Colonne: {len(df.columns)}")
print(f"   Colonne: {list(df.columns)}")

# 2. Normalizza nomi colonne
df.columns = df.columns.str.replace(r'\s+', ' ', regex=True).str.strip()

# 3. Sovrascrivi tabella DB
print("\n💾 Aggiornando database standard_curves...")
df.to_sql("standard_curves", engine, if_exists='replace', index=False)
print("   ✅ Database aggiornato!")

# 4. Verifica
print("\n🔍 Verifica database...")
df_check = pd.read_sql("standard_curves", engine)
print(f"   Righe nel DB: {len(df_check)}")
print(f"   Colonne nel DB: {len(df_check.columns)}")

# Check per Unnamed
unnamed = [col for col in df_check.columns if 'Unnamed' in col]
if unnamed:
    print(f"   ❌ Colonne Unnamed trovate: {unnamed}")
else:
    print(f"   ✅ Nessuna colonna Unnamed!")

# Check W max
max_w = df_check['W'].max()
print(f"   W massima: {max_w}")
if max_w > 65:
    print(f"   ❌ W > 65!")
else:
    print(f"   ✅ W ≤ 65!")

print("\n" + "="*60)
if len(df_check) == 41 and len(unnamed) == 0 and max_w <= 65:
    print("✅ DATABASE AGGIORNATO CORRETTAMENTE!")
else:
    print("❌ PROBLEMI CON L'AGGIORNAMENTO")
print("="*60)
