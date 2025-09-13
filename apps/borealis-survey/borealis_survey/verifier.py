"""
Survey verification and quality control logic
"""
from datetime import datetime, timedelta

def verify(context: dict | None, max_age_days: int):
    """
    Verify survey context and return quality flags
    """
    flags = []
    
    if not context:
        return ["UNVERIFIED", "CONTEXT_FALLBACK"]
    
    # Check magnetic field model
    mag = (context or {}).get("mag_field") or {}
    mdate = mag.get("model_date")
    if not mdate:
        flags.append("MAG_MODEL_MISSING")
    else:
        try:
            dt = datetime.fromisoformat(mdate)
            if datetime.utcnow() - dt > timedelta(days=max_age_days):
                flags.append("MAG_MODEL_STALE")
        except Exception:
            flags.append("MAG_MODEL_MISSING")
    
    # Check grid configuration
    grid = (context or {}).get("grid") or {}
    if "grid" in grid and not grid.get("convergence_deg"):
        flags.append("GRID_INCOMPLETE")
    
    # Check datums
    datums = (context or {}).get("datums") or {}
    if not datums.get("KB"):
        flags.append("DATUM_INCOMPLETE")
    
    return flags