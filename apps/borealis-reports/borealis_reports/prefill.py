"""
Enhanced DDR prefill functionality that pulls data from multiple services
"""
import httpx, os, datetime

SURVEY_URL = os.getenv("SURVEY_URL", "http://127.0.0.1:8010")
BOREALIS_API_URL = os.getenv("BOREALIS_API_URL", "http://127.0.0.1:5000")

async def ddr_prefill(well_id: str, rig_id: str | None = None, tenant: str = "public"):
    """
    Pull comprehensive data from Survey service and Borealis API to create enhanced DDR prefill data
    """
    prefill_data = {
        "date": datetime.date.today().isoformat(),
        "depth_start_m": 0,
        "depth_end_m": 0,
        "on_bottom_hours": 8,
        "pump_rate_avg_lpm": 400,
        # Company information
        "company_name": "",
        "company_logo_url": "",
        # Geodesy data  
        "surface_latitude": 0.0,
        "surface_longitude": 0.0,
        "coordinate_system": "",
        "magnetic_declination": 0.0,
        "grid_convergence": 0.0,
        # Personnel and time logs
        "personnel": [],
        "time_logs": []
    }
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Headers for tenant-aware requests
        headers = {"x-tenant-id": tenant}
        
        try:
            # 1. Pull survey data from Survey service
            try:
                survey_resp = await client.get(f"{SURVEY_URL}/surveys/solutions", params={"wellId": well_id})
                if survey_resp.status_code == 200:
                    survey_solutions = survey_resp.json()
                    if survey_solutions:
                        prefill_data["depth_start_m"] = survey_solutions[0]["md_m"]
                        prefill_data["depth_end_m"] = survey_solutions[-1]["md_m"]
            except Exception as e:
                print(f"Survey data fetch failed: {e}")
            
            # 2. Pull well data from Borealis API
            try:
                well_resp = await client.get(f"{BOREALIS_API_URL}/api/wells/{well_id}", headers=headers)
                if well_resp.status_code == 200:
                    well_data = well_resp.json()
                    prefill_data["well"] = well_data.get("name", "")
                    prefill_data["surface_latitude"] = well_data.get("surfaceLatitude", 0.0)
                    prefill_data["surface_longitude"] = well_data.get("surfaceLongitude", 0.0)
                    
                    # Get company data if well has companyId
                    company_id = well_data.get("companyId")
                    if company_id:
                        try:
                            company_resp = await client.get(f"{BOREALIS_API_URL}/api/companies/{company_id}", headers=headers)
                            if company_resp.status_code == 200:
                                company_data = company_resp.json()
                                prefill_data["company_name"] = company_data.get("name", "")
                                prefill_data["company_logo_url"] = company_data.get("logoUrl", "")
                        except Exception as e:
                            print(f"Company data fetch failed: {e}")
                    
                    # Get survey settings for geodesy data
                    try:
                        settings_resp = await client.get(f"{BOREALIS_API_URL}/api/survey-settings", 
                                                       params={"wellId": well_id}, headers=headers)
                        if settings_resp.status_code == 200:
                            settings_list = settings_resp.json()
                            if settings_list:
                                settings = settings_list[0]  # Get first (should be latest) settings
                                prefill_data["coordinate_system"] = f"{settings.get('crs', '')} ({settings.get('crsDatum', '')})"
                                prefill_data["magnetic_declination"] = settings.get("magneticDeclination", 0.0)
                                prefill_data["grid_convergence"] = settings.get("gridConvergence", 0.0)
                    except Exception as e:
                        print(f"Survey settings fetch failed: {e}")
            except Exception as e:
                print(f"Well data fetch failed: {e}")
            
            # 3. Pull rig data if rig_id provided
            if rig_id:
                try:
                    rig_resp = await client.get(f"{BOREALIS_API_URL}/api/rigs/{rig_id}", headers=headers)
                    if rig_resp.status_code == 200:
                        rig_data = rig_resp.json()
                        prefill_data["rig"] = rig_data.get("name", "")
                except Exception as e:
                    print(f"Rig data fetch failed: {e}")
            
            # 4. Pull personnel data
            try:
                personnel_resp = await client.get(f"{BOREALIS_API_URL}/api/personnel", 
                                                params={"wellId": well_id}, headers=headers)
                if personnel_resp.status_code == 200:
                    personnel_data = personnel_resp.json()
                    # Format personnel for template
                    prefill_data["personnel"] = [
                        {
                            "name": person.get("name", ""),
                            "role": person.get("role", ""),
                            "company": person.get("company", "")
                        }
                        for person in personnel_data
                    ]
            except Exception as e:
                print(f"Personnel data fetch failed: {e}")
            
            # 5. Pull time log data for today
            try:
                time_logs_resp = await client.get(f"{BOREALIS_API_URL}/api/time-logs", 
                                                params={"wellId": well_id}, headers=headers)
                if time_logs_resp.status_code == 200:
                    time_logs_data = time_logs_resp.json()
                    # Filter for today's logs and format for template
                    today = datetime.date.today().isoformat()
                    today_logs = []
                    
                    for log in time_logs_data:
                        # Check if log is from today (basic date matching)
                        if log.get("date") == today or not log.get("date"):
                            # Format times for display
                            start_time = log.get("startTime", "")
                            end_time = log.get("endTime", "")
                            
                            # Calculate duration if times are available
                            duration_hours = log.get("durationHours")
                            if not duration_hours and start_time and end_time:
                                try:
                                    # Simple time parsing (assumes HH:MM format)
                                    start_parts = start_time.split(":")
                                    end_parts = end_time.split(":")
                                    start_minutes = int(start_parts[0]) * 60 + int(start_parts[1])
                                    end_minutes = int(end_parts[0]) * 60 + int(end_parts[1])
                                    duration_hours = (end_minutes - start_minutes) / 60.0
                                except:
                                    duration_hours = 0
                            
                            today_logs.append({
                                "activityCode": log.get("activityCode", ""),
                                "description": log.get("description", ""),
                                "startTime": start_time,
                                "endTime": end_time,
                                "durationHours": duration_hours,
                                "depthM": log.get("depthM")
                            })
                    
                    prefill_data["time_logs"] = today_logs
                    
                    # Update on_bottom_hours based on time logs
                    if today_logs:
                        total_hours = sum(log.get("durationHours", 0) for log in today_logs)
                        prefill_data["on_bottom_hours"] = round(total_hours, 2)
                        
            except Exception as e:
                print(f"Time logs data fetch failed: {e}")
        
        except Exception as e:
            print(f"General prefill error: {e}")
    
    return prefill_data