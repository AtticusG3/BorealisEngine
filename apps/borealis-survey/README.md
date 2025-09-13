# Borealis Survey Service

A FastAPI-based microservice for survey calculation and verification in the Borealis drilling platform.

## Features

- Survey context management per well
- Survey input processing with sensor data or manual inc/azi values
- Automated verification with configurable rules
- Magnetic model age validation
- RESTful API with CORS support

## API Endpoints

- `POST /surveys/contexts` - Create/update survey context by well_id
- `GET /surveys/contexts/{well_id}/active` - Get active context for a well
- `POST /surveys/inputs` - Submit survey input data for processing
- `GET /surveys/solutions` - Get survey solutions with optional filtering
- `GET /surveys/verification/{inputId}` - Get verification result for specific input

## Setup and Installation

```bash
python -m venv .venv && source .venv/bin/activate && pip install poetry && poetry install
```

## Running the Service

```bash
uvicorn borealis_survey.main:app --reload --port 8010
```

The service will be available at `http://localhost:8010`

## Configuration

Configuration is handled through environment variables:

- `APP_NAME`: Application name (default: "Borealis Survey")
- `MAG_MODEL_MAX_AGE_DAYS`: Maximum age for magnetic models in days (default: 30)

## Verification Rules

The verification engine applies the following rules:

- If context is missing → flags `["UNVERIFIED", "CONTEXT_FALLBACK"]`
- If `context.mag_model_date` is missing → adds `"MAG_MODEL_MISSING"` flag
- If magnetic model is older than `MAG_MODEL_MAX_AGE_DAYS` → adds `"MAG_MODEL_STALE"` flag
- If sensors are present → runs "FULL" pipeline, otherwise "PARTIAL"

## Development

This service uses in-memory storage for development. In production, replace the dict stores in `models.py` with proper database connections.