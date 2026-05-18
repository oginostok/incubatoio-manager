"""
Production Service - Calcolo Produzioni Uova
Implementa le formule definite in SVILUPPO/RULES.md

Formula base: Uova Prodotte = [NumGalline] × [Produzione] × 7
Formula completa: [TotaleUovaProdotto] = [UovaProdotte] + [UovaAcquisto] - [UovaVendita]
"""
import datetime
from typing import List, Dict, Optional
from utils.helpers import carica_dati_v20, pulisci_percentuale
from database import (
    get_lotti,
    get_trading_data,
    get_valid_cache,
    save_production_cache_bulk,
    get_cycle_settings,
    SessionLocal,
    Lotto,
    VenditaAssegnazione,
)


class ProductionService:
    
    # Constants from RULES.md
    LIFECYCLE_MIN = 25  # W 24+ starts production (we use 25 as first productive week)
    LIFECYCLE_MAX = 75  # W 76+ ends production
    
    @staticmethod
    def get_start_date_from_year_week(year: int, week: int) -> datetime.date:
        """Converts year/week to date."""
        return datetime.date.fromisocalendar(year, week, 1)
    
    @staticmethod
    def _normalize_year_week(anno: int, settimana: float) -> tuple:
        """
        Normalizes year/week when week overflows 52.
        Handles the week rollover correctly.
        """
        week = settimana
        year = anno
        while week > 52:
            week -= 52
            year += 1
        return (int(year), int(week))
    
    @staticmethod
    def _calculate_production_for_lotto(lotto: dict, df_curve, lifecycle_max: int = None) -> List[Dict]:
        """
        Calculates production for a single lotto across all weeks.
        Returns list of {anno, settimana, lotto_id, prodotto, uova, allevamento, eta}

        Follows RULES.md formula:
        - [EtaGalline] = W value from curve
        - [NumGalline] = lotto['Capi']
        - [Produzione] = percentage from T003 curve at row W
        - Uova = [NumGalline] × [Produzione] × 7 (rounded to nearest 100)

        Fine ciclo (Data_Fine_Prevista from T001) is the authoritative end date when set.
        When not set, lifecycle_max (eta_fine_ciclo from cycle settings) is used as default.
        """
        results = []

        # Resolve lifecycle_max if not provided (load from cycle settings)
        if lifecycle_max is None:
            try:
                cycle_settings = get_cycle_settings()
                lifecycle_max = cycle_settings.get('eta_fine_ciclo', ProductionService.LIFECYCLE_MAX)
            except Exception:
                lifecycle_max = ProductionService.LIFECYCLE_MAX

        # --- Variables from RULES.md ---
        num_galline = lotto['Capi']  # [NumGalline]
        curva_da_usare = lotto.get('Curva_Produzione')  # [GeneticaGalline] / Curve to use
        prodotto = lotto.get('Prodotto')  # Destination product
        lotto_id = lotto.get('id')

        # Parse Data_Fine_Prevista from T001 once per lotto
        fine_prod = lotto.get('Data_Fine_Prevista')
        fine_year = None
        fine_week = None
        has_fine_ciclo = False
        if fine_prod and '/' in str(fine_prod):
            try:
                fine_year, fine_week = map(int, str(fine_prod).strip().split('/'))
                has_fine_ciclo = True
            except:
                pass

        # Skip if no curve assigned
        if not curva_da_usare or curva_da_usare not in df_curve.columns:
            return results

        # Get curve data (W column + curve column)
        subset = df_curve[['W', curva_da_usare]].dropna()

        for _, row in subset.iterrows():
            try:
                # Parse W value (age of hens in weeks)
                val_w = str(row['W']).replace(',', '.').strip()
                if not val_w.replace('.', '', 1).isdigit():
                    continue

                eta_gallina = float(val_w)  # [EtaGalline]

                # Skip pre-productive weeks (RULES.md: W 24+ starts production)
                if eta_gallina < ProductionService.LIFECYCLE_MIN:
                    continue

                # When no fine ciclo is set in T001, apply the default lifecycle max
                # (eta_fine_ciclo from cycle settings). When fine ciclo IS set, it is
                # the authoritative cutoff — do not limit by lifecycle_max so the full
                # curve range is evaluated and filtered by Data_Fine_Prevista below.
                if not has_fine_ciclo and eta_gallina > lifecycle_max:
                    continue

                # Get production percentage from curve [Produzione]
                produzione = pulisci_percentuale(row[curva_da_usare])

                if produzione <= 0:
                    continue

                # Calculate real calendar week from lotto start + hen age
                sett_offset = lotto['Sett_Start'] + eta_gallina
                anno_curr = lotto['Anno_Start']

                # Normalize year/week overflow
                year, week = ProductionService._normalize_year_week(anno_curr, sett_offset)

                # Check "Data Fine Prevista" (fine ciclo from T001) — authoritative cutoff
                if has_fine_ciclo:
                    if year > fine_year or (year == fine_year and week > fine_week):
                        continue
                
                # --- RULES.md Formula ---
                # Uova Prodotte = [NumGalline] × [Produzione] × 7
                # Rounded to nearest 100
                uova_esatte = round((num_galline * produzione * 7) / 100) * 100
                
                results.append({
                    "anno": year,
                    "settimana": week,
                    "lotto_id": lotto_id,
                    "prodotto": prodotto,
                    "uova": int(uova_esatte),
                    "allevamento": f"{lotto['Allevamento']} {lotto['Capannone']}",
                    "eta": int(eta_gallina)
                })
                
            except Exception as e:
                continue
        
        return results
    
    @staticmethod
    def _aggregate_trading_by_product(trading_data, product_filter: Optional[str] = None) -> Dict:
        """
        Aggregates trading data (purchases or sales) by (year, week) and by product.
        Returns: {(anno, settimana): {prodotto: total_qty, ...}, ...}
        """
        result = {}
        for row in trading_data:
            if row.quantita <= 0:
                continue
            if product_filter and row.prodotto != product_filter:
                continue
                
            key = (row.anno, row.settimana)
            if key not in result:
                result[key] = {}
            
            prod = row.prodotto
            if prod not in result[key]:
                result[key][prod] = 0
            result[key][prod] += row.quantita
            
        return result
    
    @staticmethod
    def calculate_weekly_summary(product_filter: Optional[str] = None) -> List[Dict]:
        """
        Calculates the weekly summary for a specific product (or all if None).
        
        Implements RULES.md formula:
        [TotaleUovaProdotto] = [UovaProdotte] + [UovaAcquisto] - [UovaVendita]
        
        Returns a list of dictionaries with production, purchases, sales, and details.
        """
        
        # 1. LOAD CURVE DATA (T003)
        df_curve = carica_dati_v20()
        if df_curve.empty:
            return []

        # Load eta_fine_ciclo from cycle settings (default: LIFECYCLE_MAX constant)
        try:
            cycle_settings = get_cycle_settings()
            lifecycle_max = cycle_settings.get('eta_fine_ciclo', ProductionService.LIFECYCLE_MAX)
        except Exception:
            lifecycle_max = ProductionService.LIFECYCLE_MAX

        # 2. GET LOTTI
        lotti_db = get_lotti()
        lotti_attivi = [l for l in lotti_db if l.get('Attivo', True)]
        
        # Filter by product if specified
        if product_filter:
            lotti_attivi = [l for l in lotti_attivi if l.get('Prodotto') == product_filter]
        
        # Build lotto_id -> allevamento/genetics/start map for cache reconstruction
        lotto_allevamento_map = {}
        lotto_razza_map = {}
        lotto_start_map = {}
        for lotto in lotti_db:
            lotto_id = lotto.get('id')
            lotto_allevamento_map[lotto_id] = f"{lotto['Allevamento']} {lotto['Capannone']}"
            lotto_razza_map[lotto_id] = {
                "razza": lotto.get('Razza', ''),
                "razza_gallo": lotto.get('Razza_Gallo', '')
            }
            lotto_start_map[lotto_id] = (
                lotto.get('Anno_Start', 0),
                lotto.get('Sett_Start', 0)
            )

        # 3. CHECK CACHE
        cached = get_valid_cache(product_filter)
        cache_by_key = {}
        cached_lotto_ids = set()

        if cached:
            for c in cached:
                key = (c.anno, c.settimana, c.lotto_id)
                # Fix #17: recalculate eta from lotto start when cache entry has eta=0
                # (happens for entries written before the eta column was added)
                cached_eta = c.eta if c.eta else 0
                if cached_eta == 0 and c.lotto_id in lotto_start_map:
                    anno_start, sett_start = lotto_start_map[c.lotto_id]
                    if anno_start and sett_start:
                        cached_eta = max(0, (c.anno * 52 + c.settimana) - (anno_start * 52 + sett_start))
                cache_by_key[key] = {
                    "anno": c.anno,
                    "settimana": c.settimana,
                    "lotto_id": c.lotto_id,
                    "prodotto": c.prodotto,
                    "uova": c.uova,
                    "eta": cached_eta,
                    "allevamento": lotto_allevamento_map.get(c.lotto_id, f"Lotto {c.lotto_id}")
                }
                cached_lotto_ids.add(c.lotto_id)
        
        # 4. CALCULATE PRODUCTION (only for lotti not in valid cache)
        production_entries = []
        new_cache_entries = []
        
        for lotto in lotti_attivi:
            lotto_id = lotto.get('id')
            
            # Check if this lotto has valid cache
            if lotto_id in cached_lotto_ids:
                # Use cached data
                for key, entry in cache_by_key.items():
                    if key[2] == lotto_id:
                        production_entries.append(entry)
            else:
                # Calculate and cache
                lotto_production = ProductionService._calculate_production_for_lotto(lotto, df_curve, lifecycle_max)
                production_entries.extend(lotto_production)
                new_cache_entries.extend(lotto_production)
        
        # 5. SAVE NEW CACHE ENTRIES
        if new_cache_entries:
            save_production_cache_bulk(new_cache_entries)
        
        # 6. AGGREGATE PRODUCTION BY (year, week)
        production_data = {}  # (anno, settimana) -> list of details
        for entry in production_entries:
            key = (entry['anno'], entry['settimana'])
            if key not in production_data:
                production_data[key] = []
            lotto_id = entry.get('lotto_id')
            razza_info = lotto_razza_map.get(lotto_id, {})
            production_data[key].append({
                "allevamento": entry.get('allevamento', f"Lotto {lotto_id}"),
                "quantita": entry['uova'],
                "quantita_lorda": entry['uova'],  # preserved before sales-assignment decurtation
                "eta": entry.get('eta', 0),
                "prodotto": entry['prodotto'],
                "razza": razza_info.get('razza', ''),
                "razza_gallo": razza_info.get('razza_gallo', '')
            })
        
        # 7. GET TRADING DATA (T004 Purchases, T005 Sales)
        trading_acq = get_trading_data("acquisto")
        trading_ven = get_trading_data("vendita")
        
        # Aggregate by (year, week) and product
        purchases_by_week_product = ProductionService._aggregate_trading_by_product(trading_acq, product_filter)
        sales_by_week_product = ProductionService._aggregate_trading_by_product(trading_ven, product_filter)
        
        purchases_map = {}  # (anno, settimana) -> list of details
        sales_map = {}     # (anno, settimana) -> list of details

        for row in trading_acq:
            if row.quantita > 0 and (not product_filter or row.prodotto == product_filter):
                k = (row.anno, row.settimana)
                if k not in purchases_map:
                    purchases_map[k] = []
                purchases_map[k].append({
                    "azienda": row.azienda,
                    "prodotto": row.prodotto,
                    "quantita": row.quantita
                })

        # Map vendita_id -> trading row (needed to enrich assegnazioni with azienda/prodotto)
        vendita_rows_by_id = {row.id: row for row in trading_ven}
        # Pre-load all assegnazioni in one query (avoid N+1).
        # assegnazioni_by_week[(anno, settimana)] = list of dicts
        # assegnazioni_by_week_allev[(anno, settimana, allevamento)] = total qty (used to decurt sheds)
        assegnazioni_by_vendita: Dict[int, List[Dict]] = {}
        assegnazioni_by_week_allev: Dict[tuple, int] = {}
        db = SessionLocal()
        try:
            for a in db.query(VenditaAssegnazione).all():
                vrow = vendita_rows_by_id.get(a.vendita_id)
                if vrow is None:
                    continue
                # Skip orphan assignments attached to ghost vendita rows
                # (quantita<=0). Without this, the shed decurtation runs
                # against assegnazioni the user can no longer see in T002.
                if vrow.quantita <= 0:
                    continue
                if product_filter and vrow.prodotto != product_filter:
                    continue
                assegnazioni_by_vendita.setdefault(a.vendita_id, []).append({
                    "allevamento": a.allevamento,
                    "quantita": a.quantita,
                })
                k = (vrow.anno, vrow.settimana, a.allevamento)
                assegnazioni_by_week_allev[k] = assegnazioni_by_week_allev.get(k, 0) + a.quantita
        finally:
            db.close()

        for row in trading_ven:
            if row.quantita > 0 and (not product_filter or row.prodotto == product_filter):
                k = (row.anno, row.settimana)
                if k not in sales_map:
                    sales_map[k] = []
                sales_map[k].append({
                    "azienda": row.azienda,
                    "prodotto": row.prodotto,
                    "quantita": row.quantita,
                    "vendita_id": row.id,
                    "assegnazioni": assegnazioni_by_vendita.get(row.id, []),
                })

        # Subtract sales from each shed's production (per week).
        # Pass 1 — explicit user assignments always win.
        for (anno, sett, allev), tot_assigned in assegnazioni_by_week_allev.items():
            details = production_data.get((anno, sett))
            if not details:
                continue
            remaining = tot_assigned
            for det in details:
                if remaining <= 0:
                    break
                if det.get("allevamento") != allev:
                    continue
                take = min(det["quantita"], remaining)
                det["quantita"] -= take
                remaining -= take

        # Pass 2 — optional auto-assignment of the un-assigned residue.
        # Controlled by the `auto_assign_sales` flag in cycle_settings.
        # Heuristic: take from sheds with eta ∈ [30, 45] first (youngest first),
        # then fall back to the remaining sheds (still youngest first).
        if cycle_settings.get('auto_assign_sales'):
            all_week_keys = set(production_data.keys()) | set(sales_map.keys())
            for (year, week) in all_week_keys:
                details = production_data.get((year, week)) or []
                ven_for_week = sum(d['quantita'] for d in sales_map.get((year, week), []))
                explicit_for_week = sum(
                    qty for (a, s, _), qty in assegnazioni_by_week_allev.items()
                    if (a, s) == (year, week)
                )
                remaining = max(0, ven_for_week - explicit_for_week)
                if remaining <= 0 or not details:
                    continue
                # Bucket the indexes: in-window (30..45) first, others second;
                # inside each bucket sort by eta ascending (youngest first).
                in_window = [i for i, d in enumerate(details) if 30 <= d.get('eta', 0) <= 45]
                others = [i for i, d in enumerate(details) if not (30 <= d.get('eta', 0) <= 45)]
                in_window.sort(key=lambda i: details[i].get('eta', 0))
                others.sort(key=lambda i: details[i].get('eta', 0))
                for idx in in_window + others:
                    if remaining <= 0:
                        break
                    take = min(details[idx]['quantita'], remaining)
                    details[idx]['quantita'] -= take
                    remaining -= take

        # 8. AGGREGATE SUMMARY
        all_keys = set(production_data.keys()) | set(purchases_map.keys()) | set(sales_map.keys())
        sorted_keys = sorted(list(all_keys))

        summary = []
        for year, week in sorted_keys:
            prod_details = production_data.get((year, week), [])
            prod_total = sum(d['quantita'] for d in prod_details)

            acq_details = purchases_map.get((year, week), [])
            acq_total = sum(d['quantita'] for d in acq_details)

            ven_details = sales_map.get((year, week), [])
            ven_total = sum(d['quantita'] for d in ven_details)

            # produzione_totale already reflects the vendite subtracted from
            # the shed details (explicit + optional auto-assign). The residue
            # that no shed absorbed must still be removed from totale_netto.
            absorbed = sum(d.get('quantita_lorda', d['quantita']) - d['quantita'] for d in prod_details)
            non_assegnato = max(0, ven_total - absorbed)
            net_total = prod_total + acq_total - non_assegnato

            summary.append({
                "periodo": f"{year} - {week:02d}",
                "anno": year,
                "settimana": week,
                "produzione_totale": prod_total,
                "acquisti_totale": acq_total,
                "vendite_totale": ven_total,
                "totale_netto": net_total,
                "dettagli_produzione": prod_details,
                "dettagli_acquisti": acq_details,
                "dettagli_vendite": ven_details
            })
        
        return summary
