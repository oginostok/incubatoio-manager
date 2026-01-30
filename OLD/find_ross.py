import pandas as pd
from backend.database import engine
import sqlite3

# Controlla se esiste il database
conn = sqlite3.connect('backend/incubatoio.db')

# 1. Controlla tabelle
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print("Tabelle nel database:")
for table in tables:
    print(f"  - {table[0]}")

# 2. Se esiste standard_curves_old o backup
for table_name in ['standard_curves_old', 'standard_curves_backup', 'curves_backup']:
    try:
        df = pd.read_sql(f"SELECT * FROM {table_name} LIMIT 1", conn)
        print(f"\n✅ Trovata tabella: {table_name}")
        print(f"Colonne: {list(df.columns)}")
        
        ross = [col for col in df.columns if 'ROSS' in col.upper()]
        if ross:
            print(f"  🎯 ROSS columns: {ross}")
    except:
        pass

# 3. Verifica dati.csv.bak o simili
import os
backend_dir = 'backend'
csv_files = [f for f in os.listdir(backend_dir) if 'dati' in f.lower() and f.endswith('.csv')]
print(f"\nFile CSV in backend/:")
for f in csv_files:
    print(f"  - {f}")
    if 'backup' not in f.lower():
        try:
            df_test = pd.read_csv(f'backend/{f}', sep=';', encoding='latin1', on_bad_lines='skip', nrows=1)
            ross_test = [col for col in df_test.columns if 'ROSS' in col.upper()]
            if ross_test:
                print(f"    🎯 CONTIENE ROSS: {ross_test}")
        except:
            pass

conn.close()
