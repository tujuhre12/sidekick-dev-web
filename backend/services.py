"""Business logic services for the Sidekick Dev backend."""

import io
import zipfile
from typing import List, Dict, Tuple
import threading
from deepwiki_client import DeepWikiClient, DeepWikiRepositoryNotFoundError
from config import AGENT_CONFIG, UNIVERSAL_PROMPT_TEMPLATE, FOOTER_TEMPLATE
import logging

logger = logging.getLogger(__name__)

# Global DeepWiki client instance - initialized once at startup
_global_deepwiki_client: DeepWikiClient = None
# Serialize access to the shared DeepWiki client to avoid concurrent session usage
_deepwiki_client_lock = threading.Lock()

def get_deepwiki_client() -> DeepWikiClient:
    """Get the global DeepWiki client instance."""
    global _global_deepwiki_client
    if _global_deepwiki_client is None:
        raise RuntimeError("DeepWiki client not initialized. Call initialize_deepwiki_client() first.")
    return _global_deepwiki_client

def initialize_deepwiki_client():
    """Initialize the global DeepWiki client instance."""
    global _global_deepwiki_client
    if _global_deepwiki_client is None:
        logger.info("Initializing global DeepWiki client...")
        _global_deepwiki_client = DeepWikiClient(auto_initialize=True)
        if _global_deepwiki_client.is_initialized:
            logger.info("Global DeepWiki client initialized successfully")
        else:
            logger.error("Failed to initialize global DeepWiki client")
    else:
        logger.info("Global DeepWiki client already initialized")

def close_deepwiki_client():
    """Close the global DeepWiki client instance."""
    global _global_deepwiki_client
    if _global_deepwiki_client is not None:
        _global_deepwiki_client.close()
        _global_deepwiki_client = None
        logger.info("Global DeepWiki client closed")

def customize_markdown_for_agent(markdown: str, agent: str) -> str:
    """
    Customize markdown content for specific agents.
    Currently a no-op placeholder for future agent-specific formatting.
    
    Args:
        markdown: The base markdown content
        agent: The target agent (claude, cursor, windsurf, gemini, cline, bolt, vscode, intellij, lovable)
        
    Returns:
        Customized markdown content
    """
    # Future: Apply agent-specific formatting here
    return markdown

def generate_markdown_files(github_url: str, selected_agents: List[str]) -> Tuple[Dict[str, str], str, str]:
    """
    Generate markdown files for the selected agents.
    
    Args:
        github_url: The GitHub repository URL
        selected_agents: List of selected agent IDs
        
    Returns:
        Tuple of (files_dict, error_message, view_search_url)
        files_dict: Dictionary mapping filenames to content
        error_message: Error message if generation failed, None if successful
        view_search_url: URL for follow-up questions on DeepWiki, None if not available
    """
    try:
        # Get the global DeepWiki client
        deepwiki_client = get_deepwiki_client()
        
        if not deepwiki_client.is_initialized:
            return {}, "DeepWiki client is not initialized", None
        
        # Query DeepWiki with the universal prompt
        logger.info(f"Generating context for repository: {github_url}")
        # Some MCP servers do not support concurrent requests per session.
        # Since we reuse a single client (and session) per process, serialize calls.
        with _deepwiki_client_lock:
            deepwiki_response = deepwiki_client.query(github_url, UNIVERSAL_PROMPT_TEMPLATE)
        
        # Check for errors in response
        if deepwiki_response.raw_response.startswith("DeepWiki error:") or deepwiki_response.raw_response.startswith("Error"):
            return {}, f"DeepWiki query failed: {deepwiki_response.response}", None
        
        if not deepwiki_response.response or deepwiki_response.response.strip() == "":
            return {}, "Empty response from DeepWiki", None
        
        # Extract the view search URL from the response
        view_search_url = deepwiki_response.view_search_url
        
        # Generate files for each selected agent
        files = {}
        for agent in selected_agents:
            if agent not in AGENT_CONFIG:
                logger.warning(f"Unknown agent: {agent}")
                continue
            
            # Customize content for the specific agent
            customized_content = customize_markdown_for_agent(deepwiki_response.response, agent)
            
            # Add footer
            final_content = customized_content + FOOTER_TEMPLATE
            
            # Get filename for this agent
            filename = AGENT_CONFIG[agent]["filename"]
            files[filename] = final_content
            
            logger.info(f"Generated {filename} for {AGENT_CONFIG[agent]['name']}")
        
        # Note: We don't close the global client here as it's reused across requests
        
        return files, None, view_search_url
        
    except DeepWikiRepositoryNotFoundError as e:
        logger.warning(f"Repository not found: {str(e)}")
        # Return the structured error information for the API to handle
        error_data = {
            "type": "repository_not_found",
            "message": e.message,
            "deepwiki_url": e.deepwiki_url,
            "repo_type": e.repo_type
        }
        return {}, error_data, None
    except Exception as e:
        logger.error(f"Error generating markdown files: {str(e)}")
        return {}, f"Internal error: {str(e)}", None

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