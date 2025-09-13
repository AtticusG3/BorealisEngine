"""
DDR prefill functionality that pulls data from Survey Service
"""
import httpx, os, datetime

SURVEY_URL = os.getenv("SURVEY_URL", "http://127.0.0.1:8010")

async def ddr_prefill(well_id: str):
    """
    Pull solutions from Survey service and create DDR prefill data
    """
    # Pull solutions from Survey service
    async with httpx.AsyncClient(timeout=10.0) as c:
        r = await c.get(f"{SURVEY_URL}/surveys/solutions", params={"wellId": well_id})
        r.raise_for_status()
        sols = r.json()
    
    if not sols:
        return {"depth_start_m": 0, "depth_end_m": 0, "on_bottom_hours": 0, "pump_rate_avg_lpm": 0}
    
    depth_start = sols[0]["md_m"]
    depth_end = sols[-1]["md_m"]
    # crude placeholder stats
    pump_rate_avg = 0
    on_bottom_hours = 0
    
    return {
        "date": datetime.date.today().isoformat(),
        "depth_start_m": depth_start,
        "depth_end_m": depth_end,
        "pump_rate_avg_lpm": pump_rate_avg,
        "on_bottom_hours": on_bottom_hours
    }