"""In-memory storage for templates and reports"""

from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid


# In-memory stores
templates: Dict[str, Dict[str, Any]] = {}
reports: Dict[str, Dict[str, Any]] = {}


def store_template(template_data: Dict[str, Any]) -> str:
    """Store a template and return its ID"""
    template_id = str(uuid.uuid4())
    template_data["id"] = template_id
    template_data["created_at"] = datetime.utcnow().isoformat()
    templates[template_id] = template_data
    return template_id


def get_template(template_id: str) -> Optional[Dict[str, Any]]:
    """Get a template by ID"""
    return templates.get(template_id)


def list_templates(scope: Optional[str] = None, name: Optional[str] = None) -> List[Dict[str, Any]]:
    """List templates with optional filtering"""
    template_list = list(templates.values())
    
    if scope:
        template_list = [t for t in template_list if t.get("scope") == scope]
    
    if name:
        template_list = [t for t in template_list if t.get("name") == name]
    
    return template_list


def store_report(report_data: Dict[str, Any]) -> str:
    """Store a report and return its ID"""
    report_id = str(uuid.uuid4())
    report_data["id"] = report_id
    report_data["created_at"] = datetime.utcnow().isoformat()
    reports[report_id] = report_data
    return report_id


def get_report(report_id: str) -> Optional[Dict[str, Any]]:
    """Get a report by ID"""
    return reports.get(report_id)


def list_reports() -> List[Dict[str, Any]]:
    """List all reports"""
    return list(reports.values())