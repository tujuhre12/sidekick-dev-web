"""Business logic services for the Sidekick Code backend."""

import io
import zipfile
from typing import List, Dict, Tuple
from deepwiki_client import DeepWikiClient
from config import AGENT_CONFIG, UNIVERSAL_PROMPT_TEMPLATE, FOOTER_TEMPLATE
import logging

logger = logging.getLogger(__name__)

def customize_markdown_for_agent(markdown: str, agent: str) -> str:
    """
    Customize markdown content for specific agents.
    Currently a no-op placeholder for future agent-specific formatting.
    
    Args:
        markdown: The base markdown content
        agent: The target agent (claude, cursor, windsurf, gemini)
        
    Returns:
        Customized markdown content
    """
    # Future: Apply agent-specific formatting here
    return markdown

def generate_markdown_files(github_url: str, selected_agents: List[str]) -> Tuple[Dict[str, str], str]:
    """
    Generate markdown files for the selected agents.
    
    Args:
        github_url: The GitHub repository URL
        selected_agents: List of selected agent IDs
        
    Returns:
        Tuple of (files_dict, error_message)
        files_dict: Dictionary mapping filenames to content
        error_message: Error message if generation failed, None if successful
    """
    try:
        # Initialize DeepWiki client
        deepwiki_client = DeepWikiClient()
        
        if not deepwiki_client.is_initialized:
            return {}, "Failed to initialize DeepWiki client"
        
        # Query DeepWiki with the universal prompt
        logger.info(f"Generating context for repository: {github_url}")
        response = deepwiki_client.query(github_url, UNIVERSAL_PROMPT_TEMPLATE)
        
        # Check for errors in response
        if response.startswith("DeepWiki error:") or response.startswith("Error"):
            return {}, f"DeepWiki query failed: {response}"
        
        if not response or response.strip() == "":
            return {}, "Empty response from DeepWiki"
        
        # Generate files for each selected agent
        files = {}
        for agent in selected_agents:
            if agent not in AGENT_CONFIG:
                logger.warning(f"Unknown agent: {agent}")
                continue
            
            # Customize content for the specific agent
            customized_content = customize_markdown_for_agent(response, agent)
            
            # Add footer
            final_content = customized_content + FOOTER_TEMPLATE
            
            # Get filename for this agent
            filename = AGENT_CONFIG[agent]["filename"]
            files[filename] = final_content
            
            logger.info(f"Generated {filename} for {AGENT_CONFIG[agent]['name']}")
        
        # Close DeepWiki client
        deepwiki_client.close()
        
        return files, None
        
    except Exception as e:
        logger.error(f"Error generating markdown files: {str(e)}")
        return {}, f"Internal error: {str(e)}"

def create_zip_file(files: Dict[str, str]) -> bytes:
    """
    Create a ZIP file containing the generated markdown files.
    
    Args:
        files: Dictionary mapping filenames to content
        
    Returns:
        ZIP file content as bytes
    """
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for filename, content in files.items():
            zip_file.writestr(filename, content)
    
    zip_buffer.seek(0)
    return zip_buffer.getvalue()

def extract_repo_name(github_url: str) -> str:
    """
    Extract repository name from GitHub URL for use in filenames.
    
    Args:
        github_url: GitHub repository URL
        
    Returns:
        Repository name in format "owner-repo"
    """
    import re
    
    # Extract owner/repo from URL
    match = re.search(r'github\.com/([^/]+)/([^/]+)', github_url)
    if match:
        owner, repo = match.groups()
        # Clean up repo name (remove .git suffix if present)
        repo = repo.replace('.git', '')
        return f"{owner}-{repo}"
    
    return "unknown-repo"