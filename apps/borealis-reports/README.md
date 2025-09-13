# Borealis Reports Service

A FastAPI-based microservice for template-based report generation using Jinja2 templating engine for the Borealis drilling platform.

## Features

- Template management with versioning and scoping
- Jinja2-based HTML report rendering
- Field prefilling with context-aware defaults
- Report instance creation and preview
- Example DDR and Survey Report templates included
- RESTful API with CORS support

## API Endpoints

- `POST /templates` - Create new report templates
- `GET /templates?scope=&name=` - List templates with optional filtering
- `POST /reports/{template_id}/prefill?wellId=&rigId=&bhaId=` - Prefill template fields with defaults
- `POST /reports` - Create new report instances
- `GET /reports/{id}/preview` - Preview reports as rendered HTML

## Setup and Installation

```bash
python -m venv .venv && source .venv/bin/activate && pip install poetry && poetry install
```

## Running the Service

```bash
uvicorn borealis_reports.main:app --reload --port 8020
```

The service will be available at `http://localhost:8020`

## Example Templates

The service comes pre-loaded with two example templates:

### 1. Borealis DDR (Daily Drilling Report)
- **Scope**: `company:demo`
- **Fields**: date, rig, well, depth_start_m, depth_end_m, on_bottom_hours, pump_rate_avg_lpm
- **Purpose**: Daily operational reporting with drilling metrics

### 2. Borealis Survey Report
- **Scope**: `company:demo`  
- **Fields**: date, well, survey_type, depth_start_m, depth_end_m, inclination_deg, azimuth_deg, magnetic_declination
- **Purpose**: Wellbore survey documentation and analysis

## Template Structure

Templates use the following JSON structure:

```json
{
  "name": "Template Name",
  "version": "1.0.0",
  "scope": "company:demo",
  "engine": "jinja-html",
  "fields_json": {
    "field_name": "default_value"
  },
  "content": "HTML template with {{ fields.field_name }} placeholders"
}
```

## Configuration

Configuration is handled through environment variables:

- `APP_NAME`: Application name (default: "Borealis Reports")

## Development

This service uses in-memory storage for development. In production, replace the dict stores in `store.py` with proper database connections.

## Template Development

Templates use Jinja2 syntax with auto-escaping enabled for HTML content. Access field values using `{{ fields.field_name }}` syntax. The rendering engine includes error handling and will display debugging information if template rendering fails.