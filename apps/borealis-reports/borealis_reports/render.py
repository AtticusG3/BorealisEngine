"""Jinja2 template rendering engine"""

from jinja2 import Environment, BaseLoader, StrictUndefined, select_autoescape
from jinja2.sandbox import SandboxedEnvironment
from typing import Dict, Any


class StringLoader(BaseLoader):
    """Custom Jinja2 loader for rendering templates from strings"""
    
    def __init__(self, template_content: str):
        self.template_content = template_content
    
    def get_source(self, environment, template):
        return self.template_content, None, lambda: True


def render(content: str, fields: Dict[str, Any]) -> str:
    """
    Render a Jinja2 template string with provided fields
    
    Args:
        content: The Jinja2 template content as a string
        fields: Dictionary of field values to inject into the template
    
    Returns:
        Rendered HTML string
    """
    try:
        # Create sandboxed Jinja2 environment with strict HTML auto-escaping for security
        env = SandboxedEnvironment(
            loader=StringLoader(content),
            autoescape=True,  # Always enable HTML auto-escaping for XSS protection
            undefined=StrictUndefined  # Fail fast on undefined variables
        )
        
        # Get the template (using a dummy name since we're loading from string)
        template = env.get_template("")
        
        # Render with fields
        rendered = template.render(fields=fields)
        
        return rendered
        
    except Exception as e:
        # Log error details server-side for debugging (don't expose in response)
        import logging
        logging.error(f"Template rendering failed: {e}")
        logging.error(f"Template content length: {len(content)}")
        logging.error(f"Field count: {len(fields)}")
        
        # Return safe JSON error response instead of HTML with user content
        import json
        return json.dumps({
            "error": "Template rendering failed",
            "message": "Please check your template syntax and field values",
            "error_type": type(e).__name__
        })