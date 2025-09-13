"""In-memory data stores for survey contexts, inputs, and solutions"""

from typing import Dict, Any, Optional
from datetime import datetime


# In-memory stores
brls_survey_context: Dict[str, Dict[str, Any]] = {}
brls_survey_input: Dict[str, Dict[str, Any]] = {}
brls_survey_solution: Dict[str, Dict[str, Any]] = {}


def get_survey_context(well_id: str) -> Optional[Dict[str, Any]]:
    """Get survey context by well ID"""
    return brls_survey_context.get(well_id)


def set_survey_context(well_id: str, context: Dict[str, Any]) -> None:
    """Set survey context for well ID"""
    context["well_id"] = well_id  # Preserve well_id in context
    context["created_at"] = datetime.utcnow().isoformat()
    brls_survey_context[well_id] = context


def store_survey_input(input_id: str, input_data: Dict[str, Any]) -> None:
    """Store survey input data"""
    input_data["created_at"] = datetime.utcnow().isoformat()
    brls_survey_input[input_id] = input_data


def get_survey_input(input_id: str) -> Optional[Dict[str, Any]]:
    """Get survey input by ID"""
    return brls_survey_input.get(input_id)


def store_survey_solution(solution_id: str, solution_data: Dict[str, Any]) -> None:
    """Store survey solution data"""
    solution_data["created_at"] = datetime.utcnow().isoformat()
    brls_survey_solution[solution_id] = solution_data


def get_survey_solution_by_id(input_id: str) -> Optional[Dict[str, Any]]:
    """Get survey solution by input ID (direct O(1) access)"""
    return brls_survey_solution.get(input_id)


def get_survey_solutions(well_id: str = None, from_date: str = None, to_date: str = None) -> list[Dict[str, Any]]:
    """Get survey solutions with optional filtering"""
    solutions = list(brls_survey_solution.values())
    
    if well_id:
        solutions = [s for s in solutions if s.get("well_id") == well_id]
    
    # Note: Date filtering would be implemented here if needed
    # For now, returning all filtered solutions
    
    return solutions