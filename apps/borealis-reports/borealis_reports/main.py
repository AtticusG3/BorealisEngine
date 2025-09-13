"""FastAPI application for Borealis Reports Service"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import json
from datetime import datetime

from .settings import settings
from .store import store_template, get_template, list_templates, store_report, get_report
from .render import render


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
        
        # Add stub defaults based on context
        stub_defaults = {
            "depth_start_m": 100,
            "depth_end_m": 120,
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        # Add context-specific defaults with proper field name mapping
        if wellId:
            stub_defaults["well_id"] = wellId
            stub_defaults["well_name"] = f"Well {wellId}"
            # Map to common template field names
            if "well" in fields_json:
                stub_defaults["well"] = f"Well {wellId}"
            
        if rigId:
            stub_defaults["rig_id"] = rigId
            stub_defaults["rig_name"] = f"Rig {rigId}"
            # Map to common template field names
            if "rig" in fields_json:
                stub_defaults["rig"] = f"Rig {rigId}"
            
        if bhaId:
            stub_defaults["bha_id"] = bhaId
            stub_defaults["bha_name"] = f"BHA {bhaId}"
            # Map to common template field names
            if "bha" in fields_json:
                stub_defaults["bha"] = f"BHA {bhaId}"
        
        # Merge stub defaults with existing field values
        # Include context metadata and only override empty/null values for existing keys
        for key, value in stub_defaults.items():
            if key in fields_json:
                # Only override if the existing value is empty/null/zero
                if fields_json[key] in (None, "", 0):
                    fields_json[key] = value
            else:
                # Add new context keys (well_id, rig_id, etc.) that aren't in template
                fields_json[key] = value
        
        # Also map common ID/name field variations if they exist in template
        if wellId:
            for field_name in ["well_name", "well_id"]:
                if field_name in fields_json and fields_json[field_name] in (None, "", 0):
                    if field_name.endswith("_name"):
                        fields_json[field_name] = f"Well {wellId}"
                    else:
                        fields_json[field_name] = wellId
                        
        if rigId:
            for field_name in ["rig_name", "rig_id"]:
                if field_name in fields_json and fields_json[field_name] in (None, "", 0):
                    if field_name.endswith("_name"):
                        fields_json[field_name] = f"Rig {rigId}"
                    else:
                        fields_json[field_name] = rigId
                        
        if bhaId:
            for field_name in ["bha_name", "bha_id"]:
                if field_name in fields_json and fields_json[field_name] in (None, "", 0):
                    if field_name.endswith("_name"):
                        fields_json[field_name] = f"BHA {bhaId}"
                    else:
                        fields_json[field_name] = bhaId
        
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
        "version": "0.1.0",
        "scope": "company:demo",
        "engine": "jinja-html",
        "fields_json": {
            "date": "",
            "rig": "",
            "well": "",
            "depth_start_m": 0,
            "depth_end_m": 0,
            "on_bottom_hours": 0,
            "pump_rate_avg_lpm": 0
        },
        "content": """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Drilling Report - {{ fields.well }}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px; }
        .section { margin-bottom: 20px; }
        .field { margin-bottom: 10px; }
        .label { font-weight: bold; color: #374151; }
        .value { color: #1f2937; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        th { background-color: #f3f4f6; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Daily Drilling Report (DDR)</h1>
        <h2>{{ fields.well }} - {{ fields.rig }}</h2>
        <p><strong>Date:</strong> {{ fields.date }}</p>
    </div>
    
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
    </div>
    
    <div class="section">
        <h3>Operations Summary</h3>
        <p>Drilling operations conducted on {{ fields.rig }} for well {{ fields.well }}.</p>
        <p>Total depth drilled: {{ fields.depth_end_m - fields.depth_start_m }} meters</p>
        <p>Average rate of penetration: {{ "%.2f"|format((fields.depth_end_m - fields.depth_start_m) / fields.on_bottom_hours if fields.on_bottom_hours > 0 else 0) }} m/hr</p>
    </div>
    
    <footer style="margin-top: 40px; border-top: 1px solid #d1d5db; padding-top: 20px; color: #6b7280;">
        <p>Generated by Borealis Reports • {{ fields.date }}</p>
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