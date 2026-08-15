import io
import os
import tempfile
from markdown_pdf import MarkdownPdf, Section

def generate_pdf_from_markdown(markdown_content: str) -> io.BytesIO:
    """
    Transforms Markdown content into a formatted PDF document entirely in-memory.
    
    Args:
        markdown_content (str): The markdown string to be converted to PDF.
        
    Returns:
        io.BytesIO: An in-memory buffer containing the compiled PDF data.
    """
    pdf = MarkdownPdf(toc_level=2)
    section = Section(markdown_content)
    pdf.add_section(section)
    
    buffer = io.BytesIO()
    
    # Create a temporary file since MarkdownPdf.save() expects a file path
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    temp_path = temp_file.name
    temp_file.close()
    
    try:
        pdf.save(temp_path)
        
        with open(temp_path, 'rb') as f:
            buffer.write(f.read())
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
    buffer.seek(0)
    
    return buffer