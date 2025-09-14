"""FastAPI application for Borealis Reports Service"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import json
from datetime import datetime

from .settings import settings
from .store import store_template, get_template, list_templates, store_report, get_report
from .render import render
from .prefill import ddr_prefill


app = FastAPI(title=settings.APP_NAME, version="0.1.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


# Pydantic models for request/response
class TemplateCreate(BaseModel):
    name: str
    version: str
    scope: str
    engine: str = "jinja-html"
    fields_json: Dict[str, Any]
    content: str


class ReportCreate(BaseModel):
    templateId: str
    fields: Dict[str, Any]


class PrefillResponse(BaseModel):
    fields_json: Dict[str, Any]


@app.get("/")
@app.get("/health")
async def root():
    """Health check endpoint"""
    return {
        "service": settings.APP_NAME,
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/templates")
async def create_template(template: TemplateCreate):
    """Create a new report template"""
    try:
        template_data = template.dict()
        template_id = store_template(template_data)
        
        return {
            "id": template_id,
            "status": "success",
            "message": "Template created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create template: {str(e)}")


@app.get("/templates")
async def list_available_templates(scope: Optional[str] = None, name: Optional[str] = None):
    """List templates with optional filtering by scope and name"""
    try:
        templates = list_templates(scope=scope, name=name)
        return {
            "templates": templates,
            "count": len(templates),
            "filters": {
                "scope": scope,
                "name": name
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list templates: {str(e)}")


@app.post("/reports/{template_id}/prefill")
async def prefill_report_fields(
    template_id: str,
    request: Request,
    wellId: Optional[str] = None, 
    rigId: Optional[str] = None, 
    bhaId: Optional[str] = None
):
    """Generate prefilled field values for a report based on template and context"""
    template = get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    try:
        # Start with template fields structure
        fields_json = template["fields_json"].copy()
        
        # Use DDR prefill functionality if wellId is provided
        if wellId and template["name"] == "Borealis DDR":
            try:
                # Get tenant from request header or use default
                tenant = request.headers.get("x-tenant-id", "demo")  # Default to demo if header missing
                ddr_data = await ddr_prefill(wellId, rigId or None, tenant)
                # Merge DDR data with template fields
                for key, value in ddr_data.items():
                    if key in fields_json:
                        fields_json[key] = value
                    else:
                        # Add new fields that might not be in the template structure
                        fields_json[key] = value
            except Exception as e:
                print(f"DDR prefill failed: {e}, using defaults")
        
        # Add context-specific defaults
        defaults = {
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        # Add context-specific defaults with proper field name mapping
        if wellId:
            defaults["well_id"] = wellId
            defaults["well_name"] = f"Well {wellId}"
            # Map to common template field names
            if "well" in fields_json:
                defaults["well"] = f"Well {wellId}"
            
        if rigId:
            defaults["rig_id"] = rigId
            defaults["rig_name"] = f"Rig {rigId}"
            # Map to common template field names
            if "rig" in fields_json:
                defaults["rig"] = f"Rig {rigId}"
        
        # Merge defaults with existing field values (only override empty/null values)
        for key, value in defaults.items():
            if key in fields_json:
                if fields_json[key] in (None, "", 0):
                    fields_json[key] = value
            else:
                fields_json[key] = value
        
        return PrefillResponse(fields_json=fields_json)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to prefill fields: {str(e)}")


@app.post("/reports")
async def create_report(report: ReportCreate):
    """Create a new report instance"""
    template = get_template(report.templateId)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    try:
        report_data = {
            "template_id": report.templateId,
            "template_name": template["name"],
            "template_version": template["version"],
            "fields": report.fields,
            "status": "created"
        }
        
        report_id = store_report(report_data)
        
        return {
            "id": report_id,
            "template_id": report.templateId,
            "status": "success",
            "message": "Report created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create report: {str(e)}")


# Alias endpoints to prevent path doubling when accessed via gateway
@app.post("/prefill/{template_id}")
async def prefill_report_fields_alias(
    template_id: str,
    request: Request,
    wellId: Optional[str] = None, 
    rigId: Optional[str] = None, 
    bhaId: Optional[str] = None
):
    """Alias for prefill endpoint to prevent path doubling"""
    return await prefill_report_fields(template_id, request, wellId, rigId, bhaId)


@app.get("/reports/{report_id}/preview", response_class=HTMLResponse)
async def preview_report(report_id: str):
    """Preview a report as rendered HTML"""
    report = get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    template = get_template(report["template_id"])
    if not template:
        raise HTTPException(status_code=404, detail="Template not found for this report")
    
    try:
        # Render the template with report fields
        rendered_html = render(template["content"], report["fields"])
        return HTMLResponse(content=rendered_html)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to render report: {str(e)}")


# Initialize with example templates
def initialize_example_templates():
    """Initialize the application with example templates"""
    
    # DDR Template
    ddr_template = {
        "name": "Borealis DDR",
        "version": "1.0.0",
        "scope": "company:demo",
        "engine": "jinja-html",
        "fields_json": {
            "date": "",
            "rig": "",
            "well": "",
            "depth_start_m": 0,
            "depth_end_m": 0,
            "on_bottom_hours": 0,
            "pump_rate_avg_lpm": 0,
            # Company information
            "company_name": "",
            "company_logo_url": "",
            # Geodesy data
            "surface_latitude": 0.0,
            "surface_longitude": 0.0,
            "coordinate_system": "",
            "magnetic_declination": 0.0,
            "grid_convergence": 0.0,
            # Personnel list
            "personnel": [],
            # Time logs
            "time_logs": []
        },
        "content": """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Drilling Report - {{ fields.well }}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
        .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px; display: flex; align-items: center; }
        .header-content { flex: 1; }
        .company-logo { margin-left: 20px; text-align: right; }
        .company-logo img { max-height: 80px; max-width: 200px; }
        .section { margin-bottom: 25px; page-break-inside: avoid; }
        .field { margin-bottom: 8px; }
        .label { font-weight: bold; color: #374151; }
        .value { color: #1f2937; }
        table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        th { background-color: #f3f4f6; font-weight: bold; }
        .two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .personnel-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .person-card { border: 1px solid #d1d5db; padding: 12px; border-radius: 6px; background: #f9fafb; }
        .time-summary { background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .geodesy-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        @media print { body { margin: 0; } .section { page-break-inside: avoid; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <h1>Daily Drilling Report (DDR)</h1>
            <h2>{{ fields.well }} - {{ fields.rig }}</h2>
            <p><strong>Date:</strong> {{ fields.date }}</p>
        </div>
        {% if fields.company_logo_url %}
        <div class="company-logo">
            <img src="{{ fields.company_logo_url }}" alt="{{ fields.company_name }}" />
            <br><small>{{ fields.company_name }}</small>
        </div>
        {% elif fields.company_name %}
        <div class="company-logo">
            <h3>{{ fields.company_name }}</h3>
        </div>
        {% endif %}
    </div>
    
    <div class="two-column">
        <div class="section">
            <h3>Drilling Summary</h3>
            <div class="field">
                <span class="label">Depth Start (m):</span> 
                <span class="value">{{ fields.depth_start_m }}</span>
            </div>
            <div class="field">
                <span class="label">Depth End (m):</span> 
                <span class="value">{{ fields.depth_end_m }}</span>
            </div>
            <div class="field">
                <span class="label">On Bottom Hours:</span> 
                <span class="value">{{ fields.on_bottom_hours }}</span>
            </div>
            <div class="field">
                <span class="label">Average Pump Rate (LPM):</span> 
                <span class="value">{{ fields.pump_rate_avg_lpm }}</span>
            </div>
            <div class="field">
                <span class="label">Total Depth Drilled:</span> 
                <span class="value">{{ fields.depth_end_m - fields.depth_start_m }} meters</span>
            </div>
            <div class="field">
                <span class="label">Rate of Penetration:</span> 
                <span class="value">{{ "%.2f"|format((fields.depth_end_m - fields.depth_start_m) / fields.on_bottom_hours if fields.on_bottom_hours > 0 else 0) }} m/hr</span>
            </div>
        </div>

        <div class="section">
            <h3>Well Location & Geodesy</h3>
            <div class="geodesy-grid">
                <div>
                    <div class="field">
                        <span class="label">Surface Latitude:</span>
                        <span class="value">{{ "%.6f"|format(fields.surface_latitude) if fields.surface_latitude is not none else 'N/A' }}°</span>
                    </div>
                    <div class="field">
                        <span class="label">Surface Longitude:</span>
                        <span class="value">{{ "%.6f"|format(fields.surface_longitude) if fields.surface_longitude is not none else 'N/A' }}°</span>
                    </div>
                </div>
                <div>
                    <div class="field">
                        <span class="label">Coordinate System:</span>
                        <span class="value">{{ fields.coordinate_system or 'N/A' }}</span>
                    </div>
                    <div class="field">
                        <span class="label">Magnetic Declination:</span>
                        <span class="value">{{ "%.2f"|format(fields.magnetic_declination) if fields.magnetic_declination is not none else 'N/A' }}°</span>
                    </div>
                    <div class="field">
                        <span class="label">Grid Convergence:</span>
                        <span class="value">{{ "%.4f"|format(fields.grid_convergence) if fields.grid_convergence is not none else 'N/A' }}°</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="section">
        <h3>Personnel on Location</h3>
        {% if fields.personnel and fields.personnel|length > 0 %}
        <div class="personnel-grid">
            {% for person in fields.personnel %}
            <div class="person-card">
                <div style="font-weight: bold; margin-bottom: 4px;">{{ person.name }}</div>
                <div style="font-size: 0.9em; color: #6b7280;">{{ person.role }}</div>
                {% if person.company %}
                <div style="font-size: 0.85em; color: #9ca3af;">{{ person.company }}</div>
                {% endif %}
            </div>
            {% endfor %}
        </div>
        {% else %}
        <p style="color: #6b7280; font-style: italic;">No personnel records available for this date.</p>
        {% endif %}
    </div>

    <div class="section">
        <h3>Time Log Summary</h3>
        {% if fields.time_logs and fields.time_logs|length > 0 %}
        <div class="time-summary">
            <div style="font-weight: bold; margin-bottom: 10px;">
                Total Activities: {{ fields.time_logs|length }}
            </div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Activity Code</th>
                    <th>Description</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Duration (hrs)</th>
                    <th>Depth (m)</th>
                </tr>
            </thead>
            <tbody>
                {% for log in fields.time_logs %}
                <tr>
                    <td>{{ log.activityCode or 'N/A' }}</td>
                    <td>{{ log.description or 'N/A' }}</td>
                    <td>{{ log.startTime or 'N/A' }}</td>
                    <td>{{ log.endTime or 'N/A' }}</td>
                    <td>{{ "%.2f"|format(log.durationHours) if log.durationHours else 'N/A' }}</td>
                    <td>{{ log.depthM if log.depthM else 'N/A' }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
        {% else %}
        <p style="color: #6b7280; font-style: italic;">No time log records available for this date.</p>
        {% endif %}
    </div>
    
    <div class="section">
        <h3>Operations Summary</h3>
        <p>Drilling operations conducted on <strong>{{ fields.rig }}</strong> for well <strong>{{ fields.well }}</strong>.</p>
        {% if fields.personnel and fields.personnel|length > 0 %}
        <p><strong>{{ fields.personnel|length }}</strong> personnel on location representing various service companies and operators.</p>
        {% endif %}
        {% if fields.time_logs and fields.time_logs|length > 0 %}
        <p><strong>{{ fields.time_logs|length }}</strong> time activities logged for operational tracking and analysis.</p>
        {% endif %}
        <p>Well positioned using <strong>{{ fields.coordinate_system or 'standard' }}</strong> coordinate reference system with magnetic declination correction of <strong>{{ "%.2f"|format(fields.magnetic_declination) if fields.magnetic_declination is not none else '0.00' }}°</strong>.</p>
    </div>
    
    <footer style="margin-top: 40px; border-top: 1px solid #d1d5db; padding-top: 20px; color: #6b7280; font-size: 0.9em;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>Generated by Borealis Reports • {{ fields.date }}</div>
            {% if fields.company_name %}
            <div>{{ fields.company_name }}</div>
            {% endif %}
        </div>
    </footer>
</body>
</html>
        """
    }
    
    # Survey Report Template
    survey_template = {
        "name": "Borealis Survey Report",
        "version": "0.1.0",
        "scope": "company:demo",
        "engine": "jinja-html",
        "fields_json": {
            "date": "",
            "well": "",
            "survey_type": "MWD",
            "depth_start_m": 0,
            "depth_end_m": 0,
            "inclination_deg": 0,
            "azimuth_deg": 0,
            "magnetic_declination": 0
        },
        "content": """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Survey Report - {{ fields.well }}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { border-bottom: 2px solid #059669; padding-bottom: 20px; margin-bottom: 20px; }
        .section { margin-bottom: 20px; }
        .field { margin-bottom: 10px; }
        .label { font-weight: bold; color: #374151; }
        .value { color: #1f2937; }
        .measurement { background-color: #f0fdf4; padding: 10px; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Survey Report</h1>
        <h2>{{ fields.well }}</h2>
        <p><strong>Survey Type:</strong> {{ fields.survey_type }} | <strong>Date:</strong> {{ fields.date }}</p>
    </div>
    
    <div class="section">
        <h3>Survey Measurements</h3>
        <div class="measurement">
            <div class="field">
                <span class="label">Measured Depth Start (m):</span> 
                <span class="value">{{ fields.depth_start_m }}</span>
            </div>
            <div class="field">
                <span class="label">Measured Depth End (m):</span> 
                <span class="value">{{ fields.depth_end_m }}</span>
            </div>
            <div class="field">
                <span class="label">Inclination (degrees):</span> 
                <span class="value">{{ "%.2f"|format(fields.inclination_deg) }}</span>
            </div>
            <div class="field">
                <span class="label">Azimuth (degrees):</span> 
                <span class="value">{{ "%.2f"|format(fields.azimuth_deg) }}</span>
            </div>
            <div class="field">
                <span class="label">Magnetic Declination:</span> 
                <span class="value">{{ fields.magnetic_declination }}°</span>
            </div>
        </div>
    </div>
    
    <div class="section">
        <h3>Survey Analysis</h3>
        <p>Survey conducted using {{ fields.survey_type }} technology.</p>
        <p>Wellbore deviation: {{ "%.2f"|format(fields.inclination_deg) }}° from vertical</p>
        <p>Survey interval: {{ fields.depth_end_m - fields.depth_start_m }} meters</p>
    </div>
    
    <footer style="margin-top: 40px; border-top: 1px solid #d1d5db; padding-top: 20px; color: #6b7280;">
        <p>Generated by Borealis Reports • {{ fields.date }}</p>
    </footer>
</body>
</html>
        """
    }
    
    # Store example templates
    store_template(ddr_template)
    store_template(survey_template)


# Initialize example templates on startup
@app.on_event("startup")
async def startup_event():
    initialize_example_templates()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8020, reload=True)