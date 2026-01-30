NO
import pandas as pd
from database import engine
from sqlalchemy import text

# Mock user function
def save_diff_to_db(orig, new_df):
    print("Testing save_diff_to_db...")
    try:
        with engine.connect() as conn:
            for idx, row in new_df.iterrows():
                if idx in orig.index:
                    orig_row = orig.loc[idx]
                    if not row.equals(orig_row):
                         w_val = row['W']
                         changes = {}
                         for col in new_df.columns:
                             if col == 'W': continue
                             if row[col] != orig_row[col]:
                                 changes[col] = row[col]
                         
                         if changes:
                             print(f"Updating W={w_val} with {changes}")
                             set_parts = [f'"{k}" = :v{i}' for i, k in enumerate(changes.keys())]
                             sql = f'UPDATE standard_curves SET {", ".join(set_parts)} WHERE "W" = :w'
                             params = {f'v{i}': v for i, v in enumerate(changes.values())}
                             params['w'] = w_val
                             conn.execute(text(sql), params)
            conn.commit()
    except Exception as e:
        print(f"DB Update Error: {e}")

def test_manual_update():
    # 1. Load Data
    try:
        df_orig = pd.read_sql("standard_curves", engine)
    except Exception as e:
        print(f"Initial read failed: {e}")
        return

    # Check existence
    if df_orig.empty:
        print("DB is empty!")
        return

    # 2. Simulate Edit
    # Let's modify row with W=25
    original_val = df_orig.loc[df_orig['W'] == 25, 'ROSS 308 STANDARD'].values[0]
    print(f"Original Value at W=25: {original_val}")
    
    # Create new DF with change
    df_new = df_orig.copy()
    test_val = 0.999 # distinctive value
    
    # Using index from df_orig
    idx = df_orig.index[df_orig['W'] == 25].tolist()[0]
    df_new.at[idx, 'ROSS 308 STANDARD'] = test_val
    
    # 3. Apply Save
    save_diff_to_db(df_orig, df_new)
    
    # 4. Verify Persistence
    df_check = pd.read_sql("standard_curves", engine)
    new_val = df_check.loc[df_check['W'] == 25, 'ROSS 308 STANDARD'].values[0]
    print(f"New Value in DB at W=25: {new_val}")
    
    if abs(new_val - test_val) < 0.0001:
        print("SUCCESS: DB Updated correctly.")
    else:
        print("FAILURE: DB validation failed.")
        
    # 5. Revert
    print("Reverting change...")
    save_diff_to_db(df_check, df_orig) # revert to orig
    print("Revert complete.")

if __name__ == "__main__":
    test_manual_update()
