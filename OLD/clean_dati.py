"""
Script per pulire e riorganizzare dati.csv:
1. Rimuove colonne Unnamed
2. Limita righe a W <= 65
3. Riordina colonne (STANDARD prima, altre dopo)
4. Converte valori da decimale (0.529) a percentuale (52.90%)
"""
import pandas as pd
import os

# Leggi CSV originale
csv_path = "backend/dati.csv"
df = pd.read_csv(csv_path, sep=';', engine='python', encoding='latin1', on_bad_lines='skip')

print("🔍 ANALISI INIZIALE")
print(f"Righe totali: {len(df)}")
print(f"Colonne totali: {len(df.columns)}")
print(f"Colonne: {list(df.columns)}")

# 1. Rinomina prima colonna in W (rimuove BOM e \n)
df.columns = [col.replace('\ufeff', '').replace('\n', ' ').strip() for col in df.columns]
if df.columns[0] in ['W', 'ï»¿W']:
    df.rename(columns={df.columns[0]: 'W'}, inplace=True)

print(f"\n✅ Colonne dopo normalizzazione: {list(df.columns)}")

# 2. Rimuovi colonne Unnamed
unnamed_cols = [col for col in df.columns if 'Unnamed' in col]
print(f"\n🗑️ Rimuovo colonne: {unnamed_cols}")
df = df.drop(columns=unnamed_cols)

# 3. Filtra righe W <= 65
print(f"\n📊 Filtro righe W <= 65")
df['W'] = pd.to_numeric(df['W'].astype(str).str.replace(',', '.'), errors='coerce')
df = df[df['W'].notna() & (df['W'] <= 65)]
print(f"Righe dopo filtro: {len(df)}")

# 4. Riordina colonne
standard_cols_order = [
    'W',
    'JA57 STANDARD',
    'JA57K STANDARD', 
    'JA57KI STANDARD',
    'JA87 STANDARD',
    'RANGER STANDARD',
    'GOLDEN STANDARD',
    'ROSS 308 STANDARD'  # Nota: potrebbe essere "JA87" o nome diverso
]

# Trova colonne che matchano (case-insensitive, ignora spazi)
def normalize_col(col):
    return col.upper().replace(' ', '').replace('\n', '')

available_standard = []
for target in standard_cols_order[1:]:  # Escludi 'W'
    target_norm = normalize_col(target)
    for col in df.columns:
        if normalize_col(col) == target_norm:
            available_standard.append(col)
            break

# Altre colonne (non W e non STANDARD)
other_cols = [col for col in df.columns if col != 'W' and col not in available_standard]

# Nuovo ordine
new_order = ['W'] + available_standard + other_cols
df = df[new_order]

print(f"\n📑 Nuovo ordine colonne:")
for i, col in enumerate(df.columns):
    print(f"  {i+1}. {col}")

# 5. Converti valori da decimale a percentuale
# Per tutte le colonne tranne W
for col in df.columns:
    if col == 'W':
        continue
    
    # Converti valori
    def convert_to_percentage(val):
        if pd.isna(val):
            return None
        
        # Se già percentuale (contiene %), estrai numero
        val_str = str(val).strip()
        if '%' in val_str:
            return val_str
        
        # Rimuovi virgola e converti
        val_str = val_str.replace(',', '.')
        try:
            num = float(val_str)
            # Se < 1, è decimale (es. 0.529 -> 52.90%)
            if 0 < num < 1:
                return f"{num * 100:.2f}%"
            # Se >= 1, è già percentuale (es. 52.9 -> 52.90%)
            elif num >= 1:
                return f"{num:.2f}%"
            else:
                return None
        except:
            return val_str
    
    df[col] = df[col].apply(convert_to_percentage)

print(f"\n✅ Conversione percentuali completata")

# 6. Salva backup
backup_path = "backend/dati_backup.csv"
if os.path.exists(csv_path):
    print(f"\n💾 Backup originale: {backup_path}")
    os.replace(csv_path, backup_path)

# 7. Salva nuovo CSV
df.to_csv(csv_path, sep=';', index=False, encoding='utf-8')
print(f"\n✅ Salvato nuovo CSV: {csv_path}")

# 8. Mostra preview
print(f"\n📋 PREVIEW (prime 5 righe):")
print(df.head())

print(f"\n🎉 COMPLETATO!")
print(f"Righe finali: {len(df)}")
print(f"Colonne finali: {len(df.columns)}")
