import pandas as pd

df = pd.read_csv('backend/dati.csv', sep=';', encoding='utf-8')

print("Colonne disponibili:")
for i, col in enumerate(df.columns, 1):
    print(f"  {i}. {col}")

print(f"\nTotale colonne: {len(df.columns)}")
print(f"Totale righe: {len(df)}")

# Cerca ROSS 308
ross_cols = [col for col in df.columns if 'ROSS' in col.upper()]
print(f"\nColonne contenenti 'ROSS': {ross_cols}")

if not ross_cols:
    print("\n❌ ROSS 308 NON TROVATO nel CSV!")
    print("\nColonne STANDARD trovate:")
    standard_cols = [col for col in df.columns if 'STANDARD' in col.upper()]
    for col in standard_cols:
        print(f"  - {col}")
