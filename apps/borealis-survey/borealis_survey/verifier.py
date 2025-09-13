"""Survey verification logic"""

from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple

from .settings import settings


def verify(input_data: Dict[str, Any], context: Dict[str, Any] = None) -> Tuple[List[str], Dict[str, Any]]:
    """
    Verify survey input and return flags and solution
    
    Args:
        input_data: Survey input data
        context: Survey context data (optional)
    
    Returns:
        Tuple of (flags, solution)
    """
    flags = []
    
    # Check if context is missing
    if not context:
        flags.extend(["UNVERIFIED", "CONTEXT_FALLBACK"])
    else:
        # Check for missing mag_model_date
        if "mag_model_date" not in context:
            flags.append("MAG_MODEL_MISSING")
        else:
            # Check if mag model is stale
            try:
                mag_date = datetime.fromisoformat(context["mag_model_date"])
                max_age = timedelta(days=settings.MAG_MODEL_MAX_AGE_DAYS)
                if datetime.utcnow() - mag_date > max_age:
                    flags.append("MAG_MODEL_STALE")
            except (ValueError, TypeError):
                flags.append("MAG_MODEL_INVALID")
    
    # Determine pipeline type and create solution
    has_sensors = "sensors" in input_data and input_data["sensors"]
    pipeline_type = "FULL" if has_sensors else "PARTIAL"
    
    # Create solution with copied or derived inc/azi
    solution = {
        "pipeline_type": pipeline_type,
        "flags": flags,
        "timestamp": datetime.utcnow().isoformat(),
    }
    
    # Copy or derive inclination and azimuth
    if "inc_deg" in input_data:
        solution["inc_deg"] = input_data["inc_deg"]
    else:
        solution["inc_deg"] = 0.0  # Dummy default
        
    if "azi_deg" in input_data:
        solution["azi_deg"] = input_data["azi_deg"]
    else:
        solution["azi_deg"] = 0.0  # Dummy default
    
    # If sensors present, add sensor processing results
    if has_sensors:
        solution["sensors_processed"] = True
        solution["sensor_count"] = len(input_data["sensors"])
    else:
        solution["sensors_processed"] = False
        solution["sensor_count"] = 0
    
    # Copy context info to solution if available
    if context:
        solution["context_applied"] = True
        solution["well_id"] = context.get("well_id")
    else:
        solution["context_applied"] = False
    
    return flags, solution