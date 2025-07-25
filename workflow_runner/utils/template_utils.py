"""
Template Utilities for Enhanced Workflow Runner
Contains template processing and placeholder replacement utilities
"""

import datetime
import re
from typing import Any


class TemplateUtils:
    """Utility class for template processing and placeholder replacement"""
    
    @staticmethod
    def replace_template_placeholders(text: str) -> str:
        """Replace template placeholders in text (like {{DATE}})"""
        if not isinstance(text, str):
            return text
        
        # Replace {{DATE}} with current date in YYYY-MM-DD format
        if '{{DATE}}' in text:
            current_date = datetime.datetime.now().strftime('%Y-%m-%d')
            text = text.replace('{{DATE}}', current_date)
        
        # Replace {{DATETIME}} with current datetime
        if '{{DATETIME}}' in text:
            current_datetime = datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
            text = text.replace('{{DATETIME}}', current_datetime)
        
        # Replace {{TIMESTAMP}} with unix timestamp
        if '{{TIMESTAMP}}' in text:
            timestamp = str(int(datetime.datetime.now().timestamp()))
            text = text.replace('{{TIMESTAMP}}', timestamp)
        
        return text
    
    @staticmethod
    def replace_input_data_placeholders(text: str, input_data: Any) -> str:
        """Replace input data placeholders in text (like {{data}})"""
        if not isinstance(text, str) or input_data is None:
            return text
        
        # Handle different types of input data
        if isinstance(input_data, dict):
            # Replace specific field placeholders
            for key, value in input_data.items():
                placeholder = f"{{{{{key}}}}}"
                if placeholder in text:
                    text = text.replace(placeholder, str(value))
            
            # Replace generic {{data}} with the entire input or specific field
            if '{{data}}' in text:
                # Try to use a sensible default field
                if 'data' in input_data:
                    text = text.replace('{{data}}', str(input_data['data']))
                elif 'text' in input_data:
                    text = text.replace('{{data}}', str(input_data['text']))
                elif 'content' in input_data:
                    text = text.replace('{{data}}', str(input_data['content']))
                else:
                    # Use first available value
                    first_value = next(iter(input_data.values()), '')
                    text = text.replace('{{data}}', str(first_value))
        else:
            # For non-dict input, replace {{data}} with the string representation
            if '{{data}}' in text:
                text = text.replace('{{data}}', str(input_data))
        
        return text
