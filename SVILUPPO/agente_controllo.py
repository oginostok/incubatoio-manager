"""
AGENTE DI CONTROLLO - Incubatoio Manager
=========================================
Accede alle stesse API REST usate dal frontend (nessun accesso diretto al DB).
Controlla la coerenza tra V001, T001 e G001 e riporta le anomalie trovate.

Uso:
    python SVILUPPO/agente_controllo.py
    python SVILUPPO/agente_controllo.py --url http://162.55.184.122
"""

import argparse
import datetime
import random
import sys
import time

# Force UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    import requests
except ImportError:
    print("ERRORE: 'requests' non installato. Esegui: pip install requests")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Configurazione
# ---------------------------------------------------------------------------

DEFAULT_BASE_URL = "http://localhost:8000"
ETA_INIZIO_CICLO_DEFAULT = 24   # settimane minime per essere "in produzione"

PRODUCTS = ["Granpollo", "Pollo70", "Color Yeald", "Ross"]


# ---------------------------------------------------------------------------
# Utility: week arithmetic
# ---------------------------------------------------------------------------

def date_from_year_week(year: int, week: int) -> datetime.date:
    """Lunedì della settimana ISO."""
    return datetime.date.fromisocalendar(year, week, 1)


def age_weeks(anno_start: int, sett_start: int) -> int:
    """Età in settimane dalla settimana di accasamento ad oggi."""
    today = datetime.date.today()
    try:
        start = date_from_year_week(anno_start, sett_start)
    except ValueError:
        return 0
    diff = (today - start).days
    return max(0, diff // 7)


def current_year_week() -> tuple[int, int]:
    iso = datetime.date.today().isocalendar()
    return iso[0], iso[1]


def parse_fine_ciclo(fine: str | None) -> tuple[int, int] | None:
    """Converte 'YYYY/WW' in (year, week). Ritorna None se non valido."""
    if not fine:
        return None
    parts = str(fine).strip().split("/")
    if len(parts) == 2:
        try:
            return int(parts[0]), int(parts[1])
        except ValueError:
            pass
    return None


def week_label(year: int, week: int) -> str:
    return f"{year}/{week:02d}"


# ---------------------------------------------------------------------------
# V001 shed-matching logic (replica di FarmStatusGrid.tsx)
# ---------------------------------------------------------------------------

def shed_matches(capannone: str, shed_id) -> bool:
    """
    Replica la logica JS:
      cap === shedStr  → match esatto
      cap.startsWith(shedStr) + carattere successivo non è cifra → match (es. "1A" su shed 1)
    """
    cap = str(capannone)
    shed = str(shed_id)
    if cap == shed:
        return True
    if cap.startswith(shed) and len(cap) > len(shed):
        next_char = cap[len(shed)]
        if not next_char.isdigit():
            return True
    return False


def get_productive_lotti_for_shed(lotti: list, farm: str, shed_id, eta_inizio: int) -> list:
    """Lotti attivi + età >= eta_inizio per un dato farm/shed (logica V001)."""
    result = []
    for l in lotti:
        if not l.get("Attivo"):
            continue
        if l.get("Allevamento") != farm:
            continue
        if not shed_matches(l.get("Capannone", ""), shed_id):
            continue
        eta = age_weeks(l["Anno_Start"], l["Sett_Start"])
        if eta >= eta_inizio:
            result.append({**l, "_eta_weeks": eta})
    return result


# ---------------------------------------------------------------------------
# API fetch
# ---------------------------------------------------------------------------

def fetch(session: requests.Session, url: str):
    try:
        r = session.get(url, timeout=10)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.ConnectionError:
        print(f"  ERRORE: impossibile connettersi a {url}")
        print("  Assicurati che il backend sia avviato (es. uvicorn backend.main:app)")
        sys.exit(1)
    except Exception as e:
        print(f"  ERRORE fetch {url}: {e}")
        sys.exit(1)


# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------

def run_checks(lotti: list, farm_structure: dict, prod_summary: list,
               eta_inizio: int, eta_fine: int) -> list[str]:
    """
    Ritorna lista di stringhe con le anomalie trovate.
    """
    issues = []
    curr_year, curr_week = current_year_week()

    # ------------------------------------------------------------------
    # Prepara mappa allevamento_key -> lotto
    # (chiave = "Allevamento Capannone", es. "Cortefranca 1B")
    # ------------------------------------------------------------------
    allevamento_lotto_map: dict[str, list] = {}
    for l in lotti:
        key = f"{l['Allevamento']} {l['Capannone']}"
        allevamento_lotto_map.setdefault(key, []).append(l)

    # ------------------------------------------------------------------
    # V001: capannoni produttivi
    # ------------------------------------------------------------------
    v001_sheds: list[dict] = []   # {farm, shed, lotti: [...]}
    for farm in sorted(farm_structure.keys()):
        for shed in farm_structure[farm]:
            productive = get_productive_lotti_for_shed(lotti, farm, shed, eta_inizio)
            if productive:
                v001_sheds.append({"farm": farm, "shed": shed, "lotti": productive})

    # ------------------------------------------------------------------
    # CHECK 1 – V001: fine ciclo mancante
    # ------------------------------------------------------------------
    for shed_info in v001_sheds:
        for l in shed_info["lotti"]:
            if not l.get("Data_Fine_Prevista"):
                issues.append(
                    f"[V001/T001] {shed_info['farm']} Cap.{shed_info['shed']} "
                    f"(lotto #{l['id']}, {l['Prodotto']}) — "
                    f"Fine ciclo NON IMPOSTATO"
                )

    # ------------------------------------------------------------------
    # CHECK 2 – V001: fine ciclo già passato ma capannone ancora attivo
    # ------------------------------------------------------------------
    for shed_info in v001_sheds:
        for l in shed_info["lotti"]:
            fc = parse_fine_ciclo(l.get("Data_Fine_Prevista"))
            if fc and (curr_year, curr_week) > fc:
                issues.append(
                    f"[V001/T001] {shed_info['farm']} Cap.{shed_info['shed']} "
                    f"(lotto #{l['id']}, {l['Prodotto']}) — "
                    f"Fine ciclo {week_label(*fc)} è GIÀ PASSATO "
                    f"ma il lotto è ancora Attivo=True in T001"
                )

    # ------------------------------------------------------------------
    # CHECK 3 – T001 lotti "In produzione" vs V001
    # Ogni lotto attivo con età >= eta_inizio e fine ciclo non passato
    # dovrebbe apparire in V001.
    # ------------------------------------------------------------------
    v001_lotto_ids = {l["id"] for s in v001_sheds for l in s["lotti"]}

    for l in lotti:
        if not l.get("Attivo"):
            continue
        eta = age_weeks(l["Anno_Start"], l["Sett_Start"])
        if eta < eta_inizio:
            continue
        fc = parse_fine_ciclo(l.get("Data_Fine_Prevista"))
        if fc and (curr_year, curr_week) > fc:
            continue   # Fine ciclo passato → normale che non sia in V001
        # Dovrebbe essere in V001
        if l["id"] not in v001_lotto_ids:
            issues.append(
                f"[T001→V001] Lotto #{l['id']} ({l['Allevamento']} Cap.{l['Capannone']}, "
                f"{l['Prodotto']}, età {eta}w) — è 'In produzione' in T001 "
                f"ma NON COMPARE in V001"
            )

    # ------------------------------------------------------------------
    # CHECK 3b – T001: formato Data_Fine_Prevista non valido (non YYYY/WW)
    # ------------------------------------------------------------------
    import re
    week_pattern = re.compile(r"^\d{4}/\d{1,2}$")
    for l in lotti:
        if not l.get("Attivo"):
            continue
        fine_raw = l.get("Data_Fine_Prevista")
        if fine_raw and not week_pattern.match(str(fine_raw).strip()):
            issues.append(
                f"[T001] Lotto #{l['id']} ({l['Allevamento']} Cap.{l['Capannone']}, "
                f"{l['Prodotto']}) — Data_Fine_Prevista '{fine_raw}' "
                f"NON E' in formato YYYY/WW"
            )

    # ------------------------------------------------------------------
    # CHECK 4 – T001: lotti attivi senza curva di produzione
    # (non contribuiranno a G001)
    # ------------------------------------------------------------------
    for l in lotti:
        if not l.get("Attivo"):
            continue
        eta = age_weeks(l["Anno_Start"], l["Sett_Start"])
        if eta < eta_inizio:
            continue
        fc = parse_fine_ciclo(l.get("Data_Fine_Prevista"))
        if fc and (curr_year, curr_week) > fc:
            continue
        if not l.get("Curva_Produzione"):
            issues.append(
                f"[T001/G001] Lotto #{l['id']} ({l['Allevamento']} Cap.{l['Capannone']}, "
                f"{l['Prodotto']}) — In produzione ma CURVA non impostata: "
                f"non contribuirà a G001"
            )

    # ------------------------------------------------------------------
    # CHECK 5 – G001 vs T001: fine produzione per allevamento
    # Per ogni allevamento presente in G001, cerca l'ultima settimana
    # con produzione > 0 e la confronta con Data_Fine_Prevista in T001.
    # ------------------------------------------------------------------
    # Costruisce: allevamento_key -> ultima (year, week) con produzione
    last_prod_week: dict[str, tuple[int, int]] = {}
    first_prod_week: dict[str, tuple[int, int]] = {}

    for entry in prod_summary:
        year = entry.get("anno")
        week = entry.get("settimana")
        for det in entry.get("dettagli_produzione", []):
            alv = det.get("allevamento", "")
            qty = det.get("quantita", 0)
            if qty > 0 and alv:
                curr_key = (year, week)
                if alv not in last_prod_week or curr_key > last_prod_week[alv]:
                    last_prod_week[alv] = curr_key
                if alv not in first_prod_week or curr_key < first_prod_week[alv]:
                    first_prod_week[alv] = curr_key

    for alv_key, last_week in last_prod_week.items():
        matching_lotti = allevamento_lotto_map.get(alv_key, [])
        if not matching_lotti:
            # Nessun lotto attivo per questa chiave — può essere normale se il lotto
            # è stato disattivato dopo che la produzione era stata calcolata
            continue

        # Prendi il fine ciclo più recente tra i lotti che matchano
        fine_cicli = [parse_fine_ciclo(l.get("Data_Fine_Prevista")) for l in matching_lotti]
        fine_cicli = [fc for fc in fine_cicli if fc is not None]

        if fine_cicli:
            expected_end = max(fine_cicli)  # ultimo fine ciclo atteso

            if last_week > expected_end:
                issues.append(
                    f"[G001→T001] {alv_key} — "
                    f"Produzione in G001 continua fino a {week_label(*last_week)} "
                    f"ma il fine ciclo T001 è {week_label(*expected_end)} "
                    f"(produzione oltre il limite)"
                )
            elif last_week < expected_end:
                # Se il fine ciclo è nel futuro, la produzione potrebbe
                # non essere ancora arrivata a quella settimana → non è un errore.
                # Ma se il fine ciclo è nel passato, è un problema.
                if expected_end <= (curr_year, curr_week):
                    issues.append(
                        f"[G001→T001] {alv_key} — "
                        f"Produzione in G001 termina a {week_label(*last_week)} "
                        f"ma il fine ciclo T001 è {week_label(*expected_end)} "
                        f"(produzione si ferma prima del limite)"
                    )

    # ------------------------------------------------------------------
    # CHECK 6 – T001 lotti in produzione senza dati in G001
    # ------------------------------------------------------------------
    alv_keys_in_g001 = set(last_prod_week.keys())
    for l in lotti:
        if not l.get("Attivo") or not l.get("Curva_Produzione"):
            continue
        eta = age_weeks(l["Anno_Start"], l["Sett_Start"])
        if eta < eta_inizio:
            continue
        fc = parse_fine_ciclo(l.get("Data_Fine_Prevista"))
        if fc and (curr_year, curr_week) > fc:
            continue
        alv_key = f"{l['Allevamento']} {l['Capannone']}"
        if alv_key not in alv_keys_in_g001:
            issues.append(
                f"[T001→G001] Lotto #{l['id']} ({alv_key}, {l['Prodotto']}) — "
                f"Ha curva impostata ed è in produzione, "
                f"ma NON COMPARE tra i dati di produzione in G001"
            )

    return issues


# ---------------------------------------------------------------------------
# CHECK 7 – G001: coerenza "tutti i prodotti" vs per-prodotto (campione casuale)
# ---------------------------------------------------------------------------

def check_g001_consistency(
    session: "requests.Session",
    api: str,
    prod_summary_all: list,
    n_every: int = 10,
) -> tuple[list[str], list[tuple[int, int]]]:
    """
    Campiona casualmente 1 settimana ogni n_every e confronta i totali
    per-prodotto della vista 'tutti' con quelli delle API filtrate per prodotto.

    Ritorna (lista_anomalie, settimane_campionate).
    """
    issues: list[str] = []

    # Costruisce mappa (anno, settimana) → {prodotto: totale} dalla vista "tutti"
    all_by_week: dict[tuple, dict] = {}
    for entry in prod_summary_all:
        key = (entry["anno"], entry["settimana"])
        totals: dict[str, int] = {}
        for det in entry.get("dettagli_produzione", []):
            prod = det.get("prodotto", "")
            totals[prod] = totals.get(prod, 0) + det.get("quantita", 0)
        all_by_week[key] = totals

    all_weeks = sorted(all_by_week.keys())
    if not all_weeks:
        return issues, []

    # Campiona 1 settimana casuale per ogni gruppo di n_every
    sampled: list[tuple[int, int]] = []
    for i in range(0, len(all_weeks), n_every):
        group = all_weeks[i : i + n_every]
        sampled.append(random.choice(group))

    # Scarica le summary per-prodotto
    product_summaries: dict[str, list] = {}
    for product in PRODUCTS:
        encoded = requests.utils.quote(product)
        product_summaries[product] = fetch(session, f"{api}/production/summary?product={encoded}")

    # Costruisce mappa (anno, settimana) → {prodotto: totale} dalle API per-prodotto
    pp_by_week: dict[tuple, dict] = {}
    for product, summary in product_summaries.items():
        for entry in summary:
            key = (entry["anno"], entry["settimana"])
            if key not in pp_by_week:
                pp_by_week[key] = {}
            total = sum(d["quantita"] for d in entry.get("dettagli_produzione", []))
            pp_by_week[key][product] = total

    # Confronta le settimane campionate
    for yw in sorted(sampled):
        label = week_label(*yw)
        all_totals = all_by_week.get(yw, {})
        pp_totals  = pp_by_week.get(yw, {})

        for product in PRODUCTS:
            v_all = all_totals.get(product, 0)
            v_pp  = pp_totals.get(product, 0)
            if v_all != v_pp:
                issues.append(
                    f"[G001] Settimana {label} — {product}: "
                    f"vista 'tutti' = {v_all:,} vs per-prodotto = {v_pp:,} "
                    f"(Δ {v_all - v_pp:+,})"
                )

    return issues, sampled


# ---------------------------------------------------------------------------
# Stampa report
# ---------------------------------------------------------------------------

def print_section(title: str):
    print(f"\n{'─' * 60}")
    print(f"  {title}")
    print(f"{'─' * 60}")


def run_once(base_url: str, run_num: int):
    print(f"\n{'═' * 60}")
    print(f"  RUN {run_num}  —  {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Backend: {base_url}")
    print(f"{'═' * 60}")

    session = requests.Session()
    api = f"{base_url}/api"

    # ---- Fetch dati ----
    print("\nFetching dati dal backend...")
    lotti         = fetch(session, f"{api}/allevamenti/lotti")
    farm_structure = fetch(session, f"{api}/allevamenti/farms")
    prod_summary  = fetch(session, f"{api}/production/summary")
    cycle_settings = fetch(session, f"{api}/settings/cycle")

    eta_inizio = cycle_settings.get("eta_inizio_ciclo", ETA_INIZIO_CICLO_DEFAULT)
    eta_fine   = cycle_settings.get("eta_fine_ciclo", 64)
    curr_year, curr_week = current_year_week()

    print(f"  Lotti totali: {len(lotti)} | Attivi: {sum(1 for l in lotti if l.get('Attivo'))}")
    print(f"  Settimana corrente: {week_label(curr_year, curr_week)}")
    print(f"  Eta inizio ciclo: {eta_inizio}w | Eta fine ciclo: {eta_fine}w")

    # ---- V001 ----
    print_section("V001 — Situazione Allevamenti (capannoni produttivi)")
    v001_count = 0
    for farm in sorted(farm_structure.keys()):
        for shed in farm_structure[farm]:
            productive = get_productive_lotti_for_shed(lotti, farm, shed, eta_inizio)
            if productive:
                v001_count += 1
                for l in productive:
                    fc = l.get("Data_Fine_Prevista") or "N/D"
                    print(f"  ● {farm} Cap.{shed}: {l['Prodotto']}, "
                          f"età {l['_eta_weeks']}w, fine ciclo: {fc}")
    if v001_count == 0:
        print("  (nessun capannone produttivo)")

    # ---- T001 ----
    print_section("T001 — Impostazioni Accasamenti (lotti attivi)")
    for l in sorted(lotti, key=lambda x: (x["Allevamento"], str(x["Capannone"]))):
        if not l.get("Attivo"):
            continue
        eta = age_weeks(l["Anno_Start"], l["Sett_Start"])
        fc_raw = l.get("Data_Fine_Prevista") or "N/D"
        fc = parse_fine_ciclo(l.get("Data_Fine_Prevista"))

        if eta < eta_inizio:
            status = f"In crescita ({eta}w)"
        elif fc and (curr_year, curr_week) > fc:
            status = f"Fine ciclo passato [{fc_raw}]"
        else:
            status = f"In produzione ({eta}w)"

        curva = l.get("Curva_Produzione") or "⚠ CURVA MANCANTE"
        print(f"  • {l['Allevamento']} Cap.{l['Capannone']}: "
              f"{l['Prodotto']} | fine: {fc_raw} | {status} | curva: {curva}")

    # ---- G001 ----
    print_section("G001 — Produzioni (ultime settimane per allevamento)")

    # Mostra l'ultima settimana con produzione > 0 per ogni allevamento
    last_prod: dict[str, tuple] = {}
    first_prod: dict[str, tuple] = {}
    for entry in prod_summary:
        y, w = entry["anno"], entry["settimana"]
        for det in entry.get("dettagli_produzione", []):
            alv = det.get("allevamento", "")
            if det.get("quantita", 0) > 0:
                if alv not in last_prod or (y, w) > last_prod[alv]:
                    last_prod[alv] = (y, w)
                if alv not in first_prod or (y, w) < first_prod[alv]:
                    first_prod[alv] = (y, w)

    if last_prod:
        for alv in sorted(last_prod.keys()):
            fp = first_prod.get(alv)
            lp = last_prod.get(alv)
            print(f"  ▸ {alv}: prima produzione {week_label(*fp)} → ultima {week_label(*lp)}")
    else:
        print("  (nessun dato di produzione trovato in G001)")

    # ---- Checks V001/T001/G001 ----
    print_section("ANALISI COERENZA V001/T001/G001")
    issues = run_checks(lotti, farm_structure, prod_summary, eta_inizio, eta_fine)

    if not issues:
        print("\n  ✅  Nessuna anomalia trovata — V001, T001 e G001 sono coerenti.")
    else:
        print(f"\n  ⚠️   Trovate {len(issues)} anomalie:\n")
        for i, issue in enumerate(issues, 1):
            print(f"  {i:2d}. {issue}")

    # ---- CHECK 7: G001 coerenza tutti vs per-prodotto ----
    print_section("CHECK 7 — G001: 'tutti i prodotti' vs per-prodotto (campione casuale)")
    g001_issues, sampled_weeks = check_g001_consistency(session, api, prod_summary)
    sampled_labels = [week_label(*w) for w in sorted(sampled_weeks)]
    if sampled_labels:
        print(f"  Settimane campionate ({len(sampled_labels)}): {', '.join(sampled_labels)}")
    else:
        print("  Nessuna settimana disponibile per il campionamento.")
    if not g001_issues:
        print("  ✅  Nessuna discrepanza — i totali G001 sono consistenti.")
    else:
        print(f"\n  ⚠️   Trovate {len(g001_issues)} discrepanze:\n")
        for iss in g001_issues:
            print(f"    • {iss}")
    issues.extend(g001_issues)

    return issues


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Agente di controllo Incubatoio Manager")
    parser.add_argument("--url", default=DEFAULT_BASE_URL,
                        help=f"URL base del backend (default: {DEFAULT_BASE_URL})")
    parser.add_argument("--runs", type=int, default=2,
                        help="Numero di run (default: 2)")
    parser.add_argument("--delay", type=int, default=10,
                        help="Secondi di attesa tra un run e il successivo (default: 10)")
    args = parser.parse_args()

    all_issues = []
    for run_num in range(1, args.runs + 1):
        issues = run_once(args.url, run_num)
        all_issues.extend(issues)
        if run_num < args.runs:
            print(f"\n  Attesa {args.delay}s prima del prossimo run...")
            time.sleep(args.delay)

    # Riepilogo finale
    print(f"\n\n{'═' * 60}")
    print(f"  RIEPILOGO FINALE  ({args.runs} run)")
    print(f"{'═' * 60}")
    if not all_issues:
        print("  ✅  Tutti i run OK — nessuna anomalia.")
    else:
        unique = list(dict.fromkeys(all_issues))  # deduplica mantenendo ordine
        print(f"  ⚠️   {len(unique)} anomalie uniche trovate:")
        for i, iss in enumerate(unique, 1):
            print(f"  {i:2d}. {iss}")

    print()


if __name__ == "__main__":
    main()
