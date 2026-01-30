import requests
import json

response = requests.get('http://localhost:8000/api/production-tables')
data = response.json()

print("=" * 60)
print("VERIFICA BACKEND RIAVVIATO")
print("=" * 60)
print(f"Righe: {len(data['data'])}")
print(f"Colonne: {len(data['columns'])}")
print(f"\nNomi colonne:")
for i, col in enumerate(data['columns'], 1):
    print(f"  {i}. {col}")

# Verifica presenza Unnamed
unnamed = [col for col in data['columns'] if 'Unnamed' in col]
print(f"\n✅ Colonne 'Unnamed': {len(unnamed)}")
if unnamed:
    print(f"   ❌ TROVATE: {unnamed}")
else:
    print(f"   ✅ NESSUNA (corretto!)")

# Verifica max W
max_w = max(row['W'] for row in data['data'] if row['W'] is not None)
print(f"\n✅ Massima settimana (W): {max_w}")
if max_w > 65:
    print(f"   ❌ Oltre 65! Dovrebbe essere max 65")
else:
    print(f"   ✅ Corretto (≤ 65)")

# Verifica ROSS 308
ross = [col for col in data['columns'] if 'ROSS' in col.upper()]
print(f"\n✅ Colonne 'ROSS 308': {len(ross)}")
if ross:
    print(f"   ⚠️  TROVATE: {ross}")
else:
    print(f"   ℹ️  Nessuna (non presente nel CSV pulito)")

print("\n" + "=" * 60)
if len(data['data']) == 41 and len(data['columns']) == 12 and len(unnamed) == 0:
    print("✅ ✅ ✅ BACKEND CARICATO CORRETTAMENTE! ✅ ✅ ✅")
else:
    print("❌ BACKEND HA ANCORA DATI VECCHI")
print("=" * 60)
