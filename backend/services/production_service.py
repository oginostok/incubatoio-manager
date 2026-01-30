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
    SessionLocal,
    Lotto
)


class ProductionService:
    
    # Constants from RULES.md
    LIFECYCLE_MIN = 25  # W 24+ starts production (we use 25 as first productive week)
    LIFECYCLE_MAX = 64  # W 65+ ends production
    
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
    def _calculate_production_for_lotto(lotto: dict, df_curve) -> List[Dict]:
        """
        Calculates production for a single lotto across all weeks.
        Returns list of {anno, settimana, lotto_id, prodotto, uova, allevamento, eta}
        
        Follows RULES.md formula:
        - [EtaGalline] = W value from curve
        - [NumGalline] = lotto['Capi']
        - [Produzione] = percentage from T003 curve at row W
        - Uova = [NumGalline] × [Produzione] × 7 (rounded to nearest 100)
        """
        results = []
        
        # --- Variables from RULES.md ---
        num_galline = lotto['Capi']  # [NumGalline]
        curva_da_usare = lotto.get('Curva_Produzione')  # [GeneticaGalline] / Curve to use
        prodotto = lotto.get('Prodotto')  # Destination product
        lotto_id = lotto.get('id')
        
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
                
                # Skip weeks outside productive lifecycle (RULES.md: W 24-64)
                if eta_gallina < ProductionService.LIFECYCLE_MIN or eta_gallina > ProductionService.LIFECYCLE_MAX:
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
                
                # Check "Data Fine Prevista" (end date)
                fine_prod = lotto.get('Data_Fine_Prevista')
                if fine_prod and '/' in str(fine_prod):
                    try:
                        fy, fw = map(int, str(fine_prod).strip().split('/'))
                        if year > fy or (year == fy and week > fw):
                            continue
                    except:
                        pass
                
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
        
        # 2. GET LOTTI
        lotti_db = get_lotti()
        lotti_attivi = [l for l in lotti_db if l.get('Attivo', True)]
        
        # Filter by product if specified
        if product_filter:
            lotti_attivi = [l for l in lotti_attivi if l.get('Prodotto') == product_filter]
        
        # Build lotto_id -> allevamento map for cache reconstruction
        lotto_allevamento_map = {}
        for lotto in lotti_db:
            lotto_id = lotto.get('id')
            lotto_allevamento_map[lotto_id] = f"{lotto['Allevamento']} {lotto['Capannone']}"
        
        # 3. CHECK CACHE
        cached = get_valid_cache(product_filter)
        cache_by_key = {}
        cached_lotto_ids = set()
        
        if cached:
            for c in cached:
                key = (c.anno, c.settimana, c.lotto_id)
                cache_by_key[key] = {
                    "anno": c.anno,
                    "settimana": c.settimana,
                    "lotto_id": c.lotto_id,
                    "prodotto": c.prodotto,
                    "uova": c.uova,
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
                lotto_production = ProductionService._calculate_production_for_lotto(lotto, df_curve)
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
            production_data[key].append({
                "allevamento": entry.get('allevamento', f"Lotto {entry['lotto_id']}"),
                "quantita": entry['uova'],
                "eta": entry.get('eta', 0),
                "prodotto": entry['prodotto']
            })
        
        # 7. GET TRADING DATA (T004 Purchases, T005 Sales)
        trading_acq = get_trading_data("acquisto")
        trading_ven = get_trading_data("vendita")
        
        # Aggregate by (year, week) and product
        purchases_by_week_product = ProductionService._aggregate_trading_by_product(trading_acq, product_filter)
        sales_by_week_product = ProductionService._aggregate_trading_by_product(trading_ven, product_filter)
        
        # Create simple maps for backward compatibility
        purchases_map = {}  # (anno, settimana) -> list of details
        sales_map = {}      # (anno, settimana) -> total
        
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
        
        for row in trading_ven:
            if row.quantita > 0 and (not product_filter or row.prodotto == product_filter):
                k = (row.anno, row.settimana)
                if k not in sales_map:
                    sales_map[k] = 0
                sales_map[k] += row.quantita
        
        # 8. AGGREGATE SUMMARY
        all_keys = set(production_data.keys()) | set(purchases_map.keys()) | set(sales_map.keys())
        sorted_keys = sorted(list(all_keys))
        
        summary = []
        for year, week in sorted_keys:
            prod_details = production_data.get((year, week), [])
            prod_total = sum(d['quantita'] for d in prod_details)
            
            acq_details = purchases_map.get((year, week), [])
            acq_total = sum(d['quantita'] for d in acq_details)
            
            ven_total = sales_map.get((year, week), 0)
            
            # --- RULES.md Formula ---
            # [TotaleUovaProdotto] = [UovaProdotte] + [UovaAcquisto] - [UovaVendita]
            net_total = prod_total + acq_total - ven_total
            
            summary.append({
                "periodo": f"{year} - {week:02d}",
                "anno": year,
                "settimana": week,
                "produzione_totale": prod_total,
                "acquisti_totale": acq_total,
                "vendite_totale": ven_total,
                "totale_netto": net_total,
                "dettagli_produzione": prod_details,
                "dettagli_acquisti": acq_details
            })
        
        return summary
