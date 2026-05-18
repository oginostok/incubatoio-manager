"""
AGENTE DI CONTROLLO VENDITE - Incubatoio Manager
================================================
Per ogni settimana/prodotto con vendite registrate verifica:
  1. Quanto produce ogni allevamento (lordo)
  2. Quante uova vengono vendute e come sono assegnate agli allevamenti
  3. Se il netto per allevamento + vendite quadra col lordo
  4. Se le assegnazioni esplicite eccedono il totale vendita (over-assign)

Tutti i numeri vengono letti tramite l'API REST (stesso endpoint usato dal
frontend), quindi rispecchia esattamente ciò che vede l'utente.

Uso:
    python SVILUPPO/agente_vendite.py
    python SVILUPPO/agente_vendite.py --url https://avicore.it
    python SVILUPPO/agente_vendite.py --prodotto Granpollo
"""

import argparse
import sys
from collections import defaultdict

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    import requests
except ImportError:
    print("ERRORE: 'requests' non installato. Esegui: pip install requests")
    sys.exit(1)


DEFAULT_BASE_URL = "http://localhost:8000"
PRODUCTS = ["Granpollo", "Pollo70", "Color Yeald", "Ross"]


def fetch_summary(base_url: str, prodotto: str):
    r = requests.get(f"{base_url}/api/production/summary", params={"product": prodotto}, timeout=30)
    r.raise_for_status()
    return r.json()


def analyse_week(week: dict) -> dict:
    """Returns a dict with the diagnostic numbers + a list of anomalies.

    Convention:
      `quantita_lorda` = production before any sale deduction.
      `quantita`       = production after backend has subtracted both
                         explicit assignments and oldest-first residue.
    """
    lordo_per_allev: dict[str, int] = defaultdict(int)
    netto_per_allev: dict[str, int] = defaultdict(int)
    eta_per_allev: dict[str, int] = {}
    for det in week.get("dettagli_produzione", []):
        allev = det["allevamento"]
        # Multiple lotti can share an allevamento — sum them.
        lordo_per_allev[allev] += det.get("quantita_lorda", det["quantita"])
        netto_per_allev[allev] += det["quantita"]
        # Keep the lowest eta seen for that shed (used to predict oldest-first).
        eta = det.get("eta", 0)
        if allev not in eta_per_allev or eta < eta_per_allev[allev]:
            eta_per_allev[allev] = eta

    vendite_total = 0
    assegnato_per_allev: dict[str, int] = defaultdict(int)
    over_assign_vendite: list[dict] = []
    for v in week.get("dettagli_vendite", []):
        q = v.get("quantita", 0)
        vendite_total += q
        ass_sum = 0
        for a in v.get("assegnazioni") or []:
            assegnato_per_allev[a["allevamento"]] += a["quantita"]
            ass_sum += a["quantita"]
        if ass_sum > q:
            over_assign_vendite.append({
                "vendita_id": v.get("vendita_id"),
                "azienda": v.get("azienda"),
                "quantita_vendita": q,
                "somma_assegnazioni": ass_sum,
                "delta": ass_sum - q,
            })

    non_assegnato = max(0, vendite_total - sum(assegnato_per_allev.values()))

    # Predicted netto applying the same rules the backend uses:
    #   1. subtract explicit per shed
    #   2. distribute non_assegnato oldest-first (lowest eta wins)
    predicted_netto: dict[str, int] = {}
    for allev, lordo in lordo_per_allev.items():
        predicted_netto[allev] = max(0, lordo - assegnato_per_allev.get(allev, 0))
    remaining = non_assegnato
    for allev in sorted(predicted_netto, key=lambda a: eta_per_allev.get(a, 0)):
        if remaining <= 0:
            break
        take = min(predicted_netto[allev], remaining)
        predicted_netto[allev] -= take
        remaining -= take

    anomalie: list[str] = []
    if over_assign_vendite:
        for ov in over_assign_vendite:
            anomalie.append(
                f"OVER-ASSIGN vendita id={ov['vendita_id']} ({ov['azienda']}): "
                f"assegnazioni {ov['somma_assegnazioni']} > vendita {ov['quantita_vendita']} "
                f"(eccesso {ov['delta']})"
            )

    for allev in sorted(set(lordo_per_allev) | set(netto_per_allev) | set(predicted_netto)):
        l = lordo_per_allev.get(allev, 0)
        n_real = netto_per_allev.get(allev, 0)
        n_pred = predicted_netto.get(allev, 0)
        ass = assegnato_per_allev.get(allev, 0)
        # The shed cannot give back more eggs than its gross production.
        if n_real < 0:
            anomalie.append(f"NETTO NEGATIVO {allev}: {n_real}")
        if ass > l:
            anomalie.append(
                f"ASSEGNATO ECCEDE LORDO {allev}: assegnato {ass} > lordo {l}"
            )
        # Backend output should equal what we predicted from the rules.
        if n_real != n_pred:
            anomalie.append(
                f"MISMATCH {allev}: API={n_real} predicted={n_pred} "
                f"(lordo={l} assegnato={ass}, residuo_non_ass={non_assegnato})"
            )

    # Cassa: somma_netto + vendite_totale deve essere uguale a somma_lordo
    # (entro un certo errore se vendite > lordo totale — caso patologico).
    s_lordo = sum(lordo_per_allev.values())
    s_netto = sum(netto_per_allev.values())
    if s_lordo - s_netto != min(vendite_total, s_lordo):
        anomalie.append(
            f"BILANCIO non quadra: lordo {s_lordo} - netto {s_netto} = "
            f"{s_lordo - s_netto} != vendite_assorbite={min(vendite_total, s_lordo)} "
            f"(vendite_totale={vendite_total})"
        )

    # Aggregate sanity: API-level produzione_totale must equal sum of the
    # per-allevamento `quantita`, and totale_netto must equal
    # produzione_totale + acquisti_totale (vendite are display-only).
    prod_tot_api = week.get("produzione_totale", 0)
    if prod_tot_api != s_netto:
        anomalie.append(
            f"AGGREGATO produzione_totale={prod_tot_api} != somma dettagli={s_netto}"
        )
    acq_tot_api = week.get("acquisti_totale", 0)
    netto_api = week.get("totale_netto", 0)
    expected_netto = prod_tot_api + acq_tot_api
    if netto_api != expected_netto:
        anomalie.append(
            f"AGGREGATO totale_netto={netto_api} != produzione+acquisti={expected_netto} "
            f"(probabile doppia sottrazione delle vendite)"
        )

    return {
        "lordo_per_allev": dict(lordo_per_allev),
        "netto_per_allev": dict(netto_per_allev),
        "assegnato_per_allev": dict(assegnato_per_allev),
        "predicted_netto": predicted_netto,
        "vendite_totale": vendite_total,
        "non_assegnato": non_assegnato,
        "produzione_totale": week.get("produzione_totale"),
        "totale_netto": week.get("totale_netto"),
        "anomalie": anomalie,
    }


def fmt(n) -> str:
    return f"{n:>8,}".replace(",", ".") if isinstance(n, int) else str(n)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default=DEFAULT_BASE_URL, help="Base URL del backend")
    parser.add_argument("--prodotto", choices=PRODUCTS, help="Limita a un solo prodotto")
    parser.add_argument("--only-anomalies", action="store_true",
                        help="Stampa solo le settimane con almeno una anomalia")
    args = parser.parse_args()

    target_products = [args.prodotto] if args.prodotto else PRODUCTS

    grand_total_anomalies = 0
    for prodotto in target_products:
        print("=" * 72)
        print(f"PRODOTTO: {prodotto}")
        print("=" * 72)
        try:
            summary = fetch_summary(args.url, prodotto)
        except Exception as e:
            print(f"  ERRORE: {e}")
            continue

        weeks_with_sales = [w for w in summary if w.get("vendite_totale", 0) > 0 or w.get("dettagli_vendite")]
        if not weeks_with_sales:
            print("  Nessuna vendita registrata.")
            continue

        n_anom = 0
        for week in weeks_with_sales:
            d = analyse_week(week)
            if args.only_anomalies and not d["anomalie"]:
                continue
            print()
            print(f"  {week['periodo']}  produzione_totale={fmt(d['produzione_totale'])} "
                  f"vendite={fmt(d['vendite_totale'])} totale_netto={fmt(d['totale_netto'])}")
            print(f"    {'Allevamento':<20} {'Lordo':>9} {'Assegn.':>9} {'Pred.netto':>11} {'API.netto':>10}")
            for allev in sorted(d["lordo_per_allev"]):
                print(f"    {allev:<20} "
                      f"{fmt(d['lordo_per_allev'][allev])} "
                      f"{fmt(d['assegnato_per_allev'].get(allev, 0))} "
                      f"{fmt(d['predicted_netto'].get(allev, 0))} "
                      f"{fmt(d['netto_per_allev'].get(allev, 0))}")
            if d["non_assegnato"]:
                print(f"    (non assegnato distribuito oldest-first: {d['non_assegnato']:,})".replace(",", "."))
            for a in d["anomalie"]:
                print(f"    ⚠ {a}")
                n_anom += 1
        if n_anom == 0:
            print()
            print("  ✅ Tutti i numeri tornano.")
        else:
            print()
            print(f"  ❌ {n_anom} anomalie trovate per {prodotto}.")
        grand_total_anomalies += n_anom

    print()
    print("=" * 72)
    if grand_total_anomalies == 0:
        print(f"✅ Nessuna anomalia complessiva su {len(target_products)} prodotto/i.")
    else:
        print(f"❌ Totale anomalie: {grand_total_anomalies}")
    print("=" * 72)
    sys.exit(0 if grand_total_anomalies == 0 else 1)


if __name__ == "__main__":
    main()
