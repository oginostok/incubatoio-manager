"""
Router for Chick Planning API (T010 - Pianificazione Nascite)
Calculates expected chicks based on production, purchases, sales and birth rates.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import date
from database import (
    get_chick_planning,
    update_chick_planning,
    get_chick_planning_value,
    get_lotti,
    get_trading_data,
    get_birth_rate,
    get_purchase_birth_rates,
    get_ross_clients,
    add_ross_client,
    delete_ross_client,
    get_ross_client_data,
    update_ross_client_data,
    get_coloryeald_clients,
    add_coloryeald_client,
    delete_coloryeald_client,
    get_coloryeald_client_data,
    update_coloryeald_client_data,
    get_pollo70_clients,
    add_pollo70_client,
    delete_pollo70_client,
    get_pollo70_client_data,
    update_pollo70_client_data
)
from services.production_service import ProductionService
from utils.helpers import carica_dati_v20

router = APIRouter(prefix="/api/chick-planning", tags=["chick-planning"])


class ChickPlanningUpdate(BaseModel):
    anno: int
    settimana: int
    richiesta_guidi: Optional[int] = None
    altri_clienti: Optional[int] = None


class RossClientCreate(BaseModel):
    nome_cliente: str
    sex_type: str  # 'maschi', 'femmine', 'entrambi'


class RossClientDataUpdate(BaseModel):
    anno: int
    settimana: int
    cliente_id: int
    quantita: int


def get_current_week():
    """Returns current year and week."""
    today = date.today()
    year, week, _ = today.isocalendar()
    return year, week


def normalize_year_week(year: int, week: int):
    """Normalizes year/week when week overflows 52 or underflows."""
    while week > 52:
        week -= 52
        year += 1
    while week < 1:
        week += 52
        year -= 1
    return year, week


def generate_weeks(start_offset: int, num_weeks: int):
    """Generates weeks starting from current + offset."""
    current_year, current_week = get_current_week()
    start_year, start_week = normalize_year_week(current_year, current_week + start_offset)
    
    weeks = []
    year, week = start_year, start_week
    for _ in range(num_weeks):
        weeks.append((year, week))
        week += 1
        if week > 52:
            week = 1
            year += 1
    return weeks


# --- ROSS CLIENT ENDPOINTS (T013) - Must be BEFORE /{product} ---

@router.get("/ross/clients")
def get_clients():
    """Get all active Ross clients."""
    try:
        clients = get_ross_clients()
        return {"clients": clients}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ross/clients")
def create_client(client: RossClientCreate):
    """Create a new Ross client."""
    valid_sex_types = ["maschi", "femmine", "entrambi"]
    if client.sex_type not in valid_sex_types:
        raise HTTPException(status_code=400, detail=f"Invalid sex_type: {client.sex_type}")
    
    try:
        result = add_ross_client(client.nome_cliente, client.sex_type)
        return {"success": True, "client": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/ross/clients/{client_id}")
def remove_client(client_id: int):
    """Soft delete a Ross client."""
    try:
        success = delete_ross_client(client_id)
        if success:
            return {"success": True, "message": "Client deleted"}
        else:
            raise HTTPException(status_code=404, detail="Client not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/ross/client-data")
def update_client_data(update: RossClientDataUpdate):
    """Update Ross client data for a specific week."""
    try:
        result = update_ross_client_data(
            update.anno,
            update.settimana,
            update.cliente_id,
            update.quantita
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ross-extended")
def get_ross_extended():
    """
    Get Ross planning table with dynamic clients and M/F totals.
    Returns data for T013 extended with client columns.
    """
    try:
        # Get base Ross data (reuse same logic as ross endpoint)
        from services.production_service import ProductionService
        from utils.helpers import carica_dati_v20
        
        db_product_name = "Ross"
        product = "ross"
        
        # Get production data
        production_summary = ProductionService.calculate_weekly_summary(db_product_name)
        production_map = {(p['anno'], p['settimana']): p for p in production_summary}
        
        # Get detailed production by lotto
        df_curve = carica_dati_v20()
        lotti_db = get_lotti()
        lotti_attivi = [l for l in lotti_db if l.get('Attivo', True) and l.get('Prodotto', '').lower() == db_product_name.lower()]
        
        # Build lotto production details
        lotto_details = {}
        for lotto in lotti_attivi:
            lotto_production = ProductionService._calculate_production_for_lotto(lotto, df_curve)
            for entry in lotto_production:
                key = (entry['anno'], entry['settimana'])
                if key not in lotto_details:
                    lotto_details[key] = []
                lotto_details[key].append({
                    "allevamento": entry.get('allevamento', f"Lotto {lotto.get('id')}"),
                    "eta": entry.get('eta', 30),
                    "uova": entry['uova']
                })
        
        # Get trading data
        trading_acq = get_trading_data("acquisto")
        trading_ven = get_trading_data("vendita")
        
        purchases_map = {}
        sales_map = {}
        
        for row in trading_acq:
            if row.prodotto.lower() == db_product_name.lower() and row.quantita > 0:
                key = (row.anno, row.settimana)
                purchases_map[key] = purchases_map.get(key, 0) + row.quantita
        
        for row in trading_ven:
            if row.prodotto.lower() == db_product_name.lower() and row.quantita > 0:
                key = (row.anno, row.settimana)
                sales_map[key] = sales_map.get(key, 0) + row.quantita
        
        # Get birth rates
        purchase_birth_rates = get_purchase_birth_rates()
        purchase_rate = purchase_birth_rates.get(product, 84.0) / 100.0
        
        # Get Ross clients
        clients = get_ross_clients()
        client_data = get_ross_client_data()
        
        # Generate 52 weeks starting from current+3
        weeks = generate_weeks(3, 52)
        
        # Check if vendite/acquisti columns have any values
        has_vendite = False
        has_acquisti = False
        
        # Build result
        result = []
        for birth_year, birth_week in weeks:
            source_year, source_week = normalize_year_week(birth_year, birth_week - 3)
            source_key = (source_year, source_week)
            
            # Get production data
            prod_data = production_map.get(source_key, {})
            uova_prodotte = prod_data.get('produzione_totale', 0)
            uova_acquistate = purchases_map.get(source_key, 0)
            uova_vendute = sales_map.get(source_key, 0)
            
            if uova_vendute > 0:
                has_vendite = True
            if uova_acquistate > 0:
                has_acquisti = True
            
            uova_totali = uova_prodotte + uova_acquistate - uova_vendute
            
            # Calculate animali possibili (simplified for Ross)
            animali = 0
            lotto_entries = lotto_details.get(source_key, [])
            
            if uova_vendute > 0 and lotto_entries:
                sorted_entries = sorted(lotto_entries, key=lambda x: x['eta'])
                remaining_sales = uova_vendute
                
                for entry in sorted_entries:
                    eta = entry['eta']
                    uova_original = entry['uova']
                    
                    if remaining_sales > 0:
                        if remaining_sales >= uova_original:
                            remaining_sales -= uova_original
                            uova_remaining = 0
                        else:
                            uova_remaining = uova_original - remaining_sales
                            remaining_sales = 0
                    else:
                        uova_remaining = uova_original
                    
                    if uova_remaining > 0:
                        rate_data = get_birth_rate(eta, product)
                        rate = (rate_data['rate'] if rate_data else 82.0) / 100.0
                        animali += round(uova_remaining * rate)
            else:
                for entry in lotto_entries:
                    eta = entry['eta']
                    uova = entry['uova']
                    rate_data = get_birth_rate(eta, product)
                    rate = (rate_data['rate'] if rate_data else 82.0) / 100.0
                    animali += round(uova * rate)
            
            if uova_acquistate > 0:
                animali += round(uova_acquistate * purchase_rate)
            
            animali_possibili = round(animali / 100) * 100
            
            # Calculate 50/50 split
            maschi_disponibili = animali_possibili // 2
            femmine_disponibili = animali_possibili // 2
            
            # Build client data for this week
            client_values = {}
            richieste_maschi = 0
            richieste_femmine = 0
            
            for client in clients:
                client_id = client['id']
                quantita = client_data.get((birth_year, birth_week, client_id), 0)
                client_values[client_id] = quantita
                
                # Accumulate requests by sex type
                if client['sex_type'] == 'maschi':
                    richieste_maschi += quantita
                elif client['sex_type'] == 'femmine':
                    richieste_femmine += quantita
                else:  # entrambi - 50/50 split
                    richieste_maschi += quantita // 2
                    richieste_femmine += quantita // 2
            
            # Calculate remaining
            totale_maschi = maschi_disponibili - richieste_maschi
            totale_femmine = femmine_disponibili - richieste_femmine
            
            result.append({
                "settimana_nascita": f"{birth_year}/{birth_week:02d}",
                "anno": birth_year,
                "settimana": birth_week,
                "uova_prodotte": uova_prodotte,
                "uova_acquistate": uova_acquistate,
                "uova_vendute": uova_vendute,
                "uova_totali": uova_totali,
                "animali_possibili": animali_possibili,
                "client_values": client_values,
                "totale_maschi": totale_maschi,
                "totale_femmine": totale_femmine
            })
        
        return {
            "product": "ross",
            "has_vendite": has_vendite,
            "has_acquisti": has_acquisti,
            "clients": clients,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- COLORYEALD CLIENT ENDPOINTS (T012) ---

@router.get("/colorYeald-extended")
def get_coloryeald_extended():
    """
    Get ColorYeald planning table with dynamic clients and M/F totals.
    Returns data for T012 extended with client columns.
    """
    try:
        db_product_name = "Color Yeald"
        product = "colorYeald"
        
        production_summary = ProductionService.calculate_weekly_summary(db_product_name)
        production_map = {(p['anno'], p['settimana']): p for p in production_summary}
        
        df_curve = carica_dati_v20()
        lotti_db = get_lotti()
        lotti_attivi = [l for l in lotti_db if l.get('Attivo', True) and l.get('Prodotto', '').lower() == db_product_name.lower()]
        
        lotto_details = {}
        for lotto in lotti_attivi:
            lotto_production = ProductionService._calculate_production_for_lotto(lotto, df_curve)
            for entry in lotto_production:
                key = (entry['anno'], entry['settimana'])
                if key not in lotto_details:
                    lotto_details[key] = []
                lotto_details[key].append({
                    "allevamento": entry.get('allevamento', f"Lotto {lotto.get('id')}"),
                    "eta": entry.get('eta', 30),
                    "uova": entry['uova']
                })
        
        trading_acq = get_trading_data("acquisto")
        trading_ven = get_trading_data("vendita")
        
        purchases_map = {}
        sales_map = {}
        
        for row in trading_acq:
            if row.prodotto.lower() == db_product_name.lower() and row.quantita > 0:
                key = (row.anno, row.settimana)
                purchases_map[key] = purchases_map.get(key, 0) + row.quantita
        
        for row in trading_ven:
            if row.prodotto.lower() == db_product_name.lower() and row.quantita > 0:
                key = (row.anno, row.settimana)
                sales_map[key] = sales_map.get(key, 0) + row.quantita
        
        purchase_birth_rates = get_purchase_birth_rates()
        purchase_rate = purchase_birth_rates.get(product, 84.0) / 100.0
        
        clients = get_coloryeald_clients()
        client_data = get_coloryeald_client_data()
        
        weeks = generate_weeks(3, 52)
        
        has_vendite = False
        has_acquisti = False
        
        result = []
        for birth_year, birth_week in weeks:
            source_year, source_week = normalize_year_week(birth_year, birth_week - 3)
            source_key = (source_year, source_week)
            
            prod_data = production_map.get(source_key, {})
            uova_prodotte = prod_data.get('produzione_totale', 0)
            uova_acquistate = purchases_map.get(source_key, 0)
            uova_vendute = sales_map.get(source_key, 0)
            
            if uova_vendute > 0:
                has_vendite = True
            if uova_acquistate > 0:
                has_acquisti = True
            
            uova_totali = uova_prodotte + uova_acquistate - uova_vendute
            
            animali = 0
            lotto_entries = lotto_details.get(source_key, [])
            
            if uova_vendute > 0 and lotto_entries:
                sorted_entries = sorted(lotto_entries, key=lambda x: x['eta'])
                remaining_sales = uova_vendute
                
                for entry in sorted_entries:
                    eta = entry['eta']
                    uova_original = entry['uova']
                    
                    if remaining_sales > 0:
                        sell_from_this = min(uova_original, remaining_sales)
                        uova_remaining = uova_original - sell_from_this
                        remaining_sales -= sell_from_this
                    else:
                        uova_remaining = uova_original
                    
                    if uova_remaining > 0:
                        birth_rate = get_birth_rate(product, eta)
                        rate = birth_rate / 100.0 if birth_rate else 0.84
                        animali += int(uova_remaining * rate)
                
                if uova_acquistate > 0:
                    animali += int(uova_acquistate * purchase_rate)
            else:
                for entry in lotto_entries:
                    eta = entry['eta']
                    uova = entry['uova']
                    birth_rate = get_birth_rate(product, eta)
                    rate = birth_rate / 100.0 if birth_rate else 0.84
                    animali += int(uova * rate)
                
                if uova_acquistate > 0:
                    animali += int(uova_acquistate * purchase_rate)
            
            animali_possibili = round(animali / 100) * 100
            
            client_values = {}
            total_maschi_requests = 0
            total_femmine_requests = 0
            
            for client in clients:
                qty = client_data.get((birth_year, birth_week, client['id']), 0)
                client_values[client['id']] = qty
                
                if client['sex_type'] == 'maschi':
                    total_maschi_requests += qty
                elif client['sex_type'] == 'femmine':
                    total_femmine_requests += qty
                else:
                    total_maschi_requests += qty // 2
                    total_femmine_requests += qty // 2
            
            maschi_disponibili = animali_possibili // 2
            femmine_disponibili = animali_possibili // 2
            
            totale_maschi = maschi_disponibili - total_maschi_requests
            totale_femmine = femmine_disponibili - total_femmine_requests
            
            result.append({
                "settimana_nascita": f"{birth_year}/{birth_week:02d}",
                "anno": birth_year,
                "settimana": birth_week,
                "uova_prodotte": uova_prodotte,
                "uova_acquistate": uova_acquistate,
                "uova_vendute": uova_vendute,
                "uova_totali": uova_totali,
                "animali_possibili": animali_possibili,
                "client_values": client_values,
                "totale_maschi": totale_maschi,
                "totale_femmine": totale_femmine
            })
        
        return {
            "product": "colorYeald",
            "has_vendite": has_vendite,
            "has_acquisti": has_acquisti,
            "clients": clients,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/colorYeald/clients")
def list_coloryeald_clients():
    """List all active ColorYeald clients."""
    return get_coloryeald_clients()

@router.post("/colorYeald/clients")
def create_coloryeald_client(client: RossClientCreate):
    """Create a new ColorYeald client."""
    if client.sex_type not in ['maschi', 'femmine', 'entrambi']:
        raise HTTPException(status_code=400, detail="sex_type must be 'maschi', 'femmine', or 'entrambi'")
    return add_coloryeald_client(client.nome_cliente, client.sex_type)

@router.delete("/colorYeald/clients/{client_id}")
def remove_coloryeald_client(client_id: int):
    """Delete a ColorYeald client."""
    if delete_coloryeald_client(client_id):
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Client not found")

@router.put("/colorYeald/client-data")
def update_coloryeald_data(data: RossClientDataUpdate):
    """Update ColorYeald client data for a specific week."""
    return update_coloryeald_client_data(data.anno, data.settimana, data.cliente_id, data.quantita)


# --- POLLO70 CLIENT ENDPOINTS (T011) ---

@router.get("/pollo70-extended")
def get_pollo70_extended():
    """
    Get Pollo70 planning table with dynamic clients and M/F totals.
    Returns data for T011 extended with client columns.
    """
    try:
        db_product_name = "Pollo70"
        product = "pollo70"
        
        production_summary = ProductionService.calculate_weekly_summary(db_product_name)
        production_map = {(p['anno'], p['settimana']): p for p in production_summary}
        
        df_curve = carica_dati_v20()
        lotti_db = get_lotti()
        lotti_attivi = [l for l in lotti_db if l.get('Attivo', True) and l.get('Prodotto', '').lower() == db_product_name.lower()]
        
        lotto_details = {}
        for lotto in lotti_attivi:
            lotto_production = ProductionService._calculate_production_for_lotto(lotto, df_curve)
            for entry in lotto_production:
                key = (entry['anno'], entry['settimana'])
                if key not in lotto_details:
                    lotto_details[key] = []
                lotto_details[key].append({
                    "allevamento": entry.get('allevamento', f"Lotto {lotto.get('id')}"),
                    "eta": entry.get('eta', 30),
                    "uova": entry['uova']
                })
        
        trading_acq = get_trading_data("acquisto")
        trading_ven = get_trading_data("vendita")
        
        purchases_map = {}
        sales_map = {}
        
        for row in trading_acq:
            if row.prodotto.lower() == db_product_name.lower() and row.quantita > 0:
                key = (row.anno, row.settimana)
                purchases_map[key] = purchases_map.get(key, 0) + row.quantita
        
        for row in trading_ven:
            if row.prodotto.lower() == db_product_name.lower() and row.quantita > 0:
                key = (row.anno, row.settimana)
                sales_map[key] = sales_map.get(key, 0) + row.quantita
        
        purchase_birth_rates = get_purchase_birth_rates()
        purchase_rate = purchase_birth_rates.get(product, 84.0) / 100.0
        
        clients = get_pollo70_clients()
        client_data = get_pollo70_client_data()
        
        weeks = generate_weeks(3, 52)
        
        has_vendite = False
        has_acquisti = False
        
        result = []
        for birth_year, birth_week in weeks:
            source_year, source_week = normalize_year_week(birth_year, birth_week - 3)
            source_key = (source_year, source_week)
            
            prod_data = production_map.get(source_key, {})
            uova_prodotte = prod_data.get('produzione_totale', 0)
            uova_acquistate = purchases_map.get(source_key, 0)
            uova_vendute = sales_map.get(source_key, 0)
            
            if uova_vendute > 0:
                has_vendite = True
            if uova_acquistate > 0:
                has_acquisti = True
            
            uova_totali = uova_prodotte + uova_acquistate - uova_vendute
            
            animali = 0
            lotto_entries = lotto_details.get(source_key, [])
            
            if uova_vendute > 0 and lotto_entries:
                sorted_entries = sorted(lotto_entries, key=lambda x: x['eta'])
                remaining_sales = uova_vendute
                
                for entry in sorted_entries:
                    eta = entry['eta']
                    uova_original = entry['uova']
                    
                    if remaining_sales > 0:
                        sell_from_this = min(uova_original, remaining_sales)
                        uova_remaining = uova_original - sell_from_this
                        remaining_sales -= sell_from_this
                    else:
                        uova_remaining = uova_original
                    
                    if uova_remaining > 0:
                        birth_rate = get_birth_rate(product, eta)
                        rate = birth_rate / 100.0 if birth_rate else 0.84
                        animali += int(uova_remaining * rate)
                
                if uova_acquistate > 0:
                    animali += int(uova_acquistate * purchase_rate)
            else:
                for entry in lotto_entries:
                    eta = entry['eta']
                    uova = entry['uova']
                    birth_rate = get_birth_rate(product, eta)
                    rate = birth_rate / 100.0 if birth_rate else 0.84
                    animali += int(uova * rate)
                
                if uova_acquistate > 0:
                    animali += int(uova_acquistate * purchase_rate)
            
            animali_possibili = round(animali / 100) * 100
            
            client_values = {}
            total_maschi_requests = 0
            total_femmine_requests = 0
            
            for client in clients:
                qty = client_data.get((birth_year, birth_week, client['id']), 0)
                client_values[client['id']] = qty
                
                if client['sex_type'] == 'maschi':
                    total_maschi_requests += qty
                elif client['sex_type'] == 'femmine':
                    total_femmine_requests += qty
                else:
                    total_maschi_requests += qty // 2
                    total_femmine_requests += qty // 2
            
            maschi_disponibili = animali_possibili // 2
            femmine_disponibili = animali_possibili // 2
            
            totale_maschi = maschi_disponibili - total_maschi_requests
            totale_femmine = femmine_disponibili - total_femmine_requests
            
            result.append({
                "settimana_nascita": f"{birth_year}/{birth_week:02d}",
                "anno": birth_year,
                "settimana": birth_week,
                "uova_prodotte": uova_prodotte,
                "uova_acquistate": uova_acquistate,
                "uova_vendute": uova_vendute,
                "uova_totali": uova_totali,
                "animali_possibili": animali_possibili,
                "client_values": client_values,
                "totale_maschi": totale_maschi,
                "totale_femmine": totale_femmine
            })
        
        return {
            "product": "pollo70",
            "has_vendite": has_vendite,
            "has_acquisti": has_acquisti,
            "clients": clients,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pollo70/clients")
def list_pollo70_clients():
    """List all active Pollo70 clients."""
    return get_pollo70_clients()

@router.post("/pollo70/clients")
def create_pollo70_client(client: RossClientCreate):
    """Create a new Pollo70 client."""
    if client.sex_type not in ['maschi', 'femmine', 'entrambi']:
        raise HTTPException(status_code=400, detail="sex_type must be 'maschi', 'femmine', or 'entrambi'")
    return add_pollo70_client(client.nome_cliente, client.sex_type)

@router.delete("/pollo70/clients/{client_id}")
def remove_pollo70_client(client_id: int):
    """Delete a Pollo70 client."""
    if delete_pollo70_client(client_id):
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Client not found")

@router.put("/pollo70/client-data")
def update_pollo70_data(data: RossClientDataUpdate):
    """Update Pollo70 client data for a specific week."""
    return update_pollo70_client_data(data.anno, data.settimana, data.cliente_id, data.quantita)


@router.get("/{product}")
def get_planning_data(product: str):
    """
    Get chick planning table for a product (e.g., granpollo).
    Returns calculated data for 52 weeks starting from current+3.
    """
    valid_products = ["granpollo", "pollo70", "colorYeald", "ross"]
    if product not in valid_products:
        raise HTTPException(status_code=400, detail=f"Invalid product: {product}")
    
    # 1. Map product name to match DB format (case-insensitive)
    product_map = {
        "granpollo": "Granpollo",
        "pollo70": "Pollo70",
        "coloryeald": "Color Yeald",
        "ross": "Ross"
    }
    db_product_name = product_map.get(product.lower(), product)
    
    # 2. Get production data (use DB product name for filtering)
    production_summary = ProductionService.calculate_weekly_summary(db_product_name)
    production_map = {(p['anno'], p['settimana']): p for p in production_summary}
    
    # 3. Get detailed production by lotto (for age-based birth rate calculation)
    df_curve = carica_dati_v20()
    lotti_db = get_lotti()
    lotti_attivi = [l for l in lotti_db if l.get('Attivo', True) and l.get('Prodotto', '').lower() == db_product_name.lower()]
    
    # Build lotto production details for birth rate calculation AND tooltip display
    lotto_details = {}  # {(anno, settimana): [{"allevamento": X, "eta": Y, "uova": Z}, ...]}
    for lotto in lotti_attivi:
        lotto_production = ProductionService._calculate_production_for_lotto(lotto, df_curve)
        for entry in lotto_production:
            key = (entry['anno'], entry['settimana'])
            if key not in lotto_details:
                lotto_details[key] = []
            lotto_details[key].append({
                "allevamento": entry.get('allevamento', f"Lotto {lotto.get('id')}"),
                "eta": entry.get('eta', 30),
                "uova": entry['uova']
            })
    
    # 3. Get trading data with details per azienda
    trading_acq = get_trading_data("acquisto")
    trading_ven = get_trading_data("vendita")
    
    purchases_map = {}  # (anno, settimana) -> total by product
    purchases_details_map = {}  # (anno, settimana) -> [{azienda, quantita}, ...]
    sales_map = {}
    
    for row in trading_acq:
        if row.prodotto.lower() == db_product_name.lower() and row.quantita > 0:
            key = (row.anno, row.settimana)
            purchases_map[key] = purchases_map.get(key, 0) + row.quantita
            
            if key not in purchases_details_map:
                purchases_details_map[key] = []
            purchases_details_map[key].append({
                "azienda": row.azienda,
                "quantita": row.quantita
            })
    
    for row in trading_ven:
        if row.prodotto.lower() == db_product_name.lower() and row.quantita > 0:
            key = (row.anno, row.settimana)
            sales_map[key] = sales_map.get(key, 0) + row.quantita
    
    # 4. Get birth rates
    purchase_birth_rates = get_purchase_birth_rates()
    purchase_rate = purchase_birth_rates.get(product, 84.0) / 100.0
    purchase_rate_percent = purchase_birth_rates.get(product, 84.0)
    
    # 5. Get saved planning data
    planning_data = get_chick_planning(product)
    
    # 6. Generate 52 weeks starting from current+3
    weeks = generate_weeks(3, 52)
    
    # 7. Check if vendite/acquisti columns have any values
    has_vendite = False
    has_acquisti = False
    
    # 8. Build result
    result = []
    for birth_year, birth_week in weeks:
        # Source week is birth_week - 3
        source_year, source_week = normalize_year_week(birth_year, birth_week - 3)
        source_key = (source_year, source_week)
        
        # Get production data for source week
        prod_data = production_map.get(source_key, {})
        uova_prodotte = prod_data.get('produzione_totale', 0)
        uova_acquistate = purchases_map.get(source_key, 0)
        uova_vendute = sales_map.get(source_key, 0)
        
        if uova_vendute > 0:
            has_vendite = True
        if uova_acquistate > 0:
            has_acquisti = True
        
        uova_totali = uova_prodotte + uova_acquistate - uova_vendute
        
        # Calculate animali possibili with calculation details for tooltip
        animali = 0
        animali_calc_details = []
        
        # From production (per-lotto with age)
        lotto_entries = lotto_details.get(source_key, [])
        
        # Subtract sales from production starting from lowest ages (applies to ALL products)
        if uova_vendute > 0 and lotto_entries:
            # Sort by age (ascending) - lowest age first for sales deduction
            sorted_entries = sorted(lotto_entries, key=lambda x: x['eta'])
            remaining_sales = uova_vendute
            
            for entry in sorted_entries:
                eta = entry['eta']
                uova_original = entry['uova']
                allevamento = entry['allevamento']
                
                # Subtract sales from this batch
                if remaining_sales > 0:
                    if remaining_sales >= uova_original:
                        # All eggs from this batch go to sales
                        remaining_sales -= uova_original
                        uova_remaining = 0
                    else:
                        # Only part of eggs go to sales
                        uova_remaining = uova_original - remaining_sales
                        remaining_sales = 0
                else:
                    uova_remaining = uova_original
                
                # Only calculate animali for remaining eggs
                if uova_remaining > 0:
                    rate_data = get_birth_rate(eta, product)
                    rate_percent = rate_data['rate'] if rate_data else 82.0
                    rate = rate_percent / 100.0
                    result_value = round(uova_remaining * rate)
                    animali += result_value
                    animali_calc_details.append({
                        "source": allevamento,
                        "uova": uova_remaining,
                        "eta": eta,
                        "rate_percent": rate_percent,
                        "animali": result_value
                    })
        else:
            # No sales - standard logic
            for entry in lotto_entries:
                eta = entry['eta']
                uova = entry['uova']
                allevamento = entry['allevamento']
                # Get birth rate from T008
                rate_data = get_birth_rate(eta, product)
                rate_percent = rate_data['rate'] if rate_data else 82.0
                rate = rate_percent / 100.0
                result_value = round(uova * rate)
                animali += result_value
                animali_calc_details.append({
                    "source": allevamento,
                    "uova": uova,
                    "eta": eta,
                    "rate_percent": rate_percent,
                    "animali": result_value
                })
        
        # From purchases (use T009 rate) - only if NOT colorYeald or no sales
        # For colorYeald, purchases are added after subtracting sales from production
        if uova_acquistate > 0:
            result_value = round(uova_acquistate * purchase_rate)
            animali += result_value
            animali_calc_details.append({
                "source": "Uova Acquistate",
                "uova": uova_acquistate,
                "eta": None,
                "rate_percent": purchase_rate_percent,
                "animali": result_value
            })
        
        # Round to nearest 100
        animali_possibili = round(animali / 100) * 100
        
        # Get planning values (or defaults based on product)
        planning_key = (birth_year, birth_week)
        # Default values per product
        default_values = {
            "granpollo": {"richiesta_guidi": 80000, "altri_clienti": 3000},
            "pollo70": {"richiesta_guidi": 40000, "altri_clienti": 5400},
            "colorYeald": {"richiesta_guidi": 2500, "altri_clienti": 500},
            "ross": {"richiesta_guidi": 50000, "altri_clienti": 5000}
        }
        product_defaults = default_values.get(product, {"richiesta_guidi": 50000, "altri_clienti": 5000})
        planning = planning_data.get(planning_key, product_defaults)
        richiesta_guidi = planning['richiesta_guidi']
        altri_clienti = planning['altri_clienti']
        
        # Calculate mancanze/esubero
        mancanze_esubero = animali_possibili - richiesta_guidi - altri_clienti
        
        # Get production details for tooltip (from source week, not birth week)
        production_details = lotto_details.get(source_key, [])
        
        # Get purchases details for tooltip
        purchase_details = purchases_details_map.get(source_key, [])
        
        result.append({
            "settimana_nascita": f"{birth_year}/{birth_week:02d}",
            "anno": birth_year,
            "settimana": birth_week,
            "uova_prodotte": uova_prodotte,
            "uova_acquistate": uova_acquistate,
            "uova_vendute": uova_vendute,
            "uova_totali": uova_totali,
            "animali_possibili": animali_possibili,
            "richiesta_guidi": richiesta_guidi,
            "altri_clienti": altri_clienti,
            "mancanze_esubero": mancanze_esubero,
            "production_details": production_details,
            "purchase_details": purchase_details,
            "animali_calc_details": animali_calc_details
        })
    
    return {
        "product": product,
        "has_vendite": has_vendite,
        "has_acquisti": has_acquisti,
        "data": result
    }


@router.put("/{product}")
def update_planning(product: str, update: ChickPlanningUpdate):
    """Update richiesta_guidi and/or altri_clienti for a specific week."""
    valid_products = ["granpollo", "pollo70", "colorYeald", "ross"]
    if product not in valid_products:
        raise HTTPException(status_code=400, detail=f"Invalid product: {product}")
    
    result = update_chick_planning(
        update.anno,
        update.settimana,
        product,
        update.richiesta_guidi,
        update.altri_clienti
    )
    
    return {"success": True, "data": result}

