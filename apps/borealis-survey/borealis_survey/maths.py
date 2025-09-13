"""
Minimum-curvature trajectory calculations for directional drilling
"""
import math

def min_curvature(prev_md, prev_inc_deg, prev_azi_deg, md, inc_deg, azi_deg):
    """
    Calculate dogleg severity and ratio factor using minimum curvature method
    Returns (dls_deg_per_30m, rf)
    """
    dmd = md - prev_md
    if dmd <= 0: 
        return 0.0, 0.0
    
    inc1, inc2 = math.radians(prev_inc_deg), math.radians(inc_deg)
    azi1, azi2 = math.radians(prev_azi_deg), math.radians(azi_deg)
    
    cos_dogleg = math.cos(inc2 - inc1) - (math.sin(inc1) * math.sin(inc2) * (1 - math.cos(azi2 - azi1)))
    cos_dogleg = max(-1.0, min(1.0, cos_dogleg))  # Clamp to valid range
    
    dogleg = math.acos(cos_dogleg)
    rf = 1.0 if dogleg < 1e-6 else (2/dogleg) * math.tan(dogleg/2)
    dls = math.degrees(dogleg) * (30.0 / dmd)
    
    return dls, rf

def mc_step(prev_md, prev_inc_deg, prev_azi_deg, prev_n, prev_e, prev_tvd, md, inc_deg, azi_deg):
    """
    Calculate single minimum-curvature step for position calculation
    Returns new (northing, easting, tvd) coordinates
    """
    dmd = md - prev_md
    _, rf = min_curvature(prev_md, prev_inc_deg, prev_azi_deg, md, inc_deg, azi_deg)
    
    inc1, inc2 = math.radians(prev_inc_deg), math.radians(inc_deg)
    azi1, azi2 = math.radians(prev_azi_deg), math.radians(azi_deg)
    
    n = prev_n + 0.5 * dmd * (math.sin(inc1)*math.cos(azi1) + math.sin(inc2)*math.cos(azi2)) * rf
    e = prev_e + 0.5 * dmd * (math.sin(inc1)*math.sin(azi1) + math.sin(inc2)*math.sin(azi2)) * rf
    tvd = prev_tvd + 0.5 * dmd * (math.cos(inc1) + math.cos(inc2)) * rf
    
    return n, e, tvd