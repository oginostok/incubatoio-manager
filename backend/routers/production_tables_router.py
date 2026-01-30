from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from utils.helpers import carica_dati_v20
from database import engine
from services.production_service import ProductionService
import pandas as pd

router = APIRouter(prefix="/api/production-tables", tags=["production-tables"])

class CellUpdate(BaseModel):
    week: float
    column: str
    value: str

@router.get("/test")
async def test_endpoint():
    """Test endpoint to verify router is working"""
    return {"status": "ok", "message": "Production tables router is working"}

@router.get("")
async def get_production_tables():
    """
    Returns the production tables (curve di produzione) from standard_curves table in DB.
    Each row represents a week (W) with production percentages for each breed.
    """
    try:
        print("Loading production tables data...")
        df = carica_dati_v20()
        print(f"Loaded dataframe with shape: {df.shape}")
        print(f"Columns: {list(df.columns)}")
        
        if df.empty:
            print("DataFrame is empty!")
            return {"error": "No data available", "data": [], "columns": []}
        
        # Convert DataFrame to list of dictionaries
        # Only include rows where W column has a numeric value
        data = []
        for idx, row in df.iterrows():
            row_dict = {}
            for col in df.columns:
                val = row[col]
                # Convert pandas NA/NaN to None for JSON serialization
                if pd.isna(val):
                    row_dict[col] = None
                else:
                    row_dict[col] = val
            
            # Only include rows with valid W (week number)
            if 'W' in row_dict and row_dict['W'] is not None:
                try:
                    w_val = str(row_dict['W']).replace(',', '.').strip()
                    if w_val and w_val.replace('.', '', 1).replace('-', '', 1).isdigit():
                        float(w_val)
                        data.append(row_dict)
                except (ValueError, AttributeError) as e:
                    print(f"Skipping row {idx} due to invalid W value: {e}")
                    continue
        
        print(f"Returning {len(data)} rows")
        return {
            "data": data,
            "columns": list(df.columns)
        }
    except Exception as e:
        print(f"ERROR in production_tables endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error loading production tables: {str(e)}")

@router.put("")
async def update_production_table_cell(update: CellUpdate):
    """
    Update a single cell in the production table.
    Data is saved to the database (standard_curves table).
    """
    try:
        print(f"Updating cell: W={update.week}, Column={update.column}, Value={update.value}")
        
        # Load current data
        df = carica_dati_v20()
        
        if df.empty:
            raise HTTPException(status_code=404, detail="Production table not found")
        
        # Validate column exists
        if update.column not in df.columns:
            raise HTTPException(status_code=400, detail=f"Column '{update.column}' not found")
        
        # Find row with matching W value
        df['W'] = pd.to_numeric(df['W'], errors='coerce')
        row_idx = df[df['W'] == update.week].index
        
        if len(row_idx) == 0:
            raise HTTPException(status_code=404, detail=f"Week {update.week} not found")
        
        # Update value
        df.loc[row_idx[0], update.column] = update.value
        
        # Save to database
        try:
            df.to_sql("standard_curves", engine, if_exists='replace', index=False)
            print(f"Successfully updated cell and saved to database")
            
            # Invalidate cache for all lotti using this curve (as per RULES.md)
            print(f"Invalidating cache for curve: {update.column}")
            try:
                from database import invalidate_cache_by_curve
                invalidate_cache_by_curve(update.column)
                print(f"✅ Cache invalidated for curve: {update.column}")
            except Exception as calc_error:
                print(f"⚠️ Warning: Failed to recalculate productions: {calc_error}")
                # Don't fail the request if recalculation fails
                
        except Exception as e:
            print(f"Error saving to database: {e}")
            raise HTTPException(status_code=500, detail=f"Error saving to database: {str(e)}")
        
        return {
            "success": True,
            "message": "Cell updated successfully",
            "week": update.week,
            "column": update.column,
            "value": update.value
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR updating cell: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error updating cell: {str(e)}")
