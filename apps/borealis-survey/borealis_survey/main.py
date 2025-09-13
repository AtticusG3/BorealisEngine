"""FastAPI application for Borealis Survey Service"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import uuid
from datetime import datetime

from .settings import settings
from .models import (
    get_survey_context, 
    set_survey_context, 
    store_survey_input, 
    get_survey_input,
    store_survey_solution,
    get_survey_solutions,
    get_survey_solution_by_id
)
from .verifier import verify


app = FastAPI(title=settings.APP_NAME, version="0.1.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:3000"],  # Restrict to known origins
    allow_credentials=False,  # Disable credentials for security
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


# Pydantic models for request/response
class SurveyContext(BaseModel):
    well_id: str
    data: Dict[str, Any]


class SurveyInput(BaseModel):
    well_id: Optional[str] = None
    sensors: Optional[Dict[str, Any]] = None
    inc_deg: Optional[float] = None
    azi_deg: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None
    
    @classmethod
    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
    
    def model_post_init(self, __context) -> None:
        """Validate that either sensors are provided OR inc_deg/azi_deg are provided"""
        has_sensors = self.sensors and len(self.sensors) > 0
        has_manual_data = self.inc_deg is not None and self.azi_deg is not None
        
        if not has_sensors and not has_manual_data:
            raise ValueError(
                "Either 'sensors' (non-empty dict) or both 'inc_deg' and 'azi_deg' must be provided"
            )


class SurveyInputResponse(BaseModel):
    input_id: str
    status: str
    message: str


class VerificationResult(BaseModel):
    input_id: str
    flags: List[str]
    solution: Dict[str, Any]
    status: str


@app.get("/")
@app.get("/health")
async def root():
    """Health check endpoint"""
    return {
        "service": settings.APP_NAME,
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/surveys/contexts")
async def create_update_context(context: SurveyContext):
    """Create or update survey context by well_id"""
    try:
        set_survey_context(context.well_id, context.data)
        return {
            "well_id": context.well_id,
            "status": "success",
            "message": "Context updated successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update context: {str(e)}")


@app.get("/surveys/contexts/{well_id}/active")
async def get_active_context(well_id: str):
    """Get active survey context for a well"""
    context = get_survey_context(well_id)
    if not context:
        raise HTTPException(status_code=404, detail="Context not found for this well")
    
    return {
        "well_id": well_id,
        "context": context,
        "status": "active"
    }


@app.post("/surveys/inputs", response_model=SurveyInputResponse)
async def submit_survey_input(survey_input: SurveyInput):
    """
    Submit survey input data for processing
    Accepts either sensors{} or inc_deg/azi_deg; attaches context if exists; enqueues verify
    """
    # Generate unique input ID
    input_id = str(uuid.uuid4())
    
    # Prepare input data
    input_data = survey_input.dict()
    input_data["input_id"] = input_id
    
    # Get context if well_id provided
    context = None
    if survey_input.well_id:
        context = get_survey_context(survey_input.well_id)
        if context:
            input_data["context_attached"] = True
        else:
            input_data["context_attached"] = False
    
    # Store the input
    store_survey_input(input_id, input_data)
    
    # Run verification
    try:
        flags, solution = verify(input_data, context)
        
        # Store the solution
        solution_data = {
            "input_id": input_id,
            "well_id": survey_input.well_id,
            "flags": flags,
            "solution": solution
        }
        store_survey_solution(input_id, solution_data)
        
        return SurveyInputResponse(
            input_id=input_id,
            status="processed",
            message="Survey input processed and verified successfully"
        )
    except Exception as e:
        return SurveyInputResponse(
            input_id=input_id,
            status="error",
            message=f"Verification failed: {str(e)}"
        )


@app.get("/surveys/solutions")
async def get_solutions(wellId: Optional[str] = None, from_date: Optional[str] = None, to_date: Optional[str] = None):
    """Get survey solutions with optional filtering"""
    try:
        solutions = get_survey_solutions(well_id=wellId, from_date=from_date, to_date=to_date)
        return {
            "solutions": solutions,
            "count": len(solutions),
            "filters": {
                "wellId": wellId,
                "from": from_date,
                "to": to_date
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve solutions: {str(e)}")


@app.get("/surveys/verification/{input_id}", response_model=VerificationResult)
async def get_verification_result(input_id: str):
    """Get verification result for a specific input"""
    # Get the input data
    input_data = get_survey_input(input_id)
    if not input_data:
        raise HTTPException(status_code=404, detail="Input not found")
    
    # Get the solution using direct O(1) access
    solution_data = get_survey_solution_by_id(input_id)
    if not solution_data:
        raise HTTPException(status_code=404, detail="Verification result not found")
    
    return VerificationResult(
        input_id=input_id,
        flags=solution_data.get("flags", []),
        solution=solution_data.get("solution", {}),
        status="completed"
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8010, reload=True)