import requests
import re
from typing import Optional
from dataclasses import dataclass
import logging

# Configure logging for debug output
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Custom exceptions for DeepWiki errors
class DeepWikiError(Exception):
    """Base exception for all DeepWiki-related errors."""
    def __init__(self, message: str, raw_response: Optional[str] = None):
        super().__init__(message)
        self.message = message
        self.raw_response = raw_response

class DeepWikiConnectionError(DeepWikiError):
    """Raised when there's a network connection issue with DeepWiki."""
    pass

class DeepWikiTimeoutError(DeepWikiError):
    """Raised when the request to DeepWiki times out."""
    pass

class DeepWikiAPIError(DeepWikiError):
    """Raised when DeepWiki API returns an error status code."""
    def __init__(self, message: str, status_code: int, raw_response: Optional[str] = None):
        super().__init__(message, raw_response)
        self.status_code = status_code

class DeepWikiResponseError(DeepWikiError):
    """Raised when DeepWiki returns an invalid or error response."""
    pass

class DeepWikiInitializationError(DeepWikiError):
    """Raised when the DeepWiki client is not properly initialized."""
    pass

class DeepWikiRepositoryNotFoundError(DeepWikiError):
    """Raised when a repository is not found or not indexed in DeepWiki."""
    def __init__(self, message: str, deepwiki_url: str, repo_type: str, raw_response: Optional[str] = None):
        super().__init__(message, raw_response)
        self.deepwiki_url = deepwiki_url
        self.repo_type = repo_type  # 'private' or 'not_indexed'

@dataclass
class DeepWikiResponse:
    """
    Response from DeepWiki containing the answer and search URL.
    
    Attributes:
        raw_response: The raw response from DeepWiki (before cleaning)
        response: The cleaned response content (used by frontend as markdown)
        view_search_url: URL to view the search on DeepWiki, or None if not found
    """
    raw_response: str
    response: str
    view_search_url: Optional[str] = None

def debug_log(message: str):
    """Debug logging function"""
    logger.info(message)

def clean_deepwiki_response(response: str) -> str:
    """
    Clean DeepWiki response by removing unwanted prefix and suffix text.
    
    Removes:
    - Any text before "## Project Overview" (exclusive)
    - Any text from "Wiki pages you might want to explore:" onwards (inclusive)
    
    Args:
        response: Raw DeepWiki response text
        
    Returns:
        Cleaned response text
    """
    if not response or not isinstance(response, str):
        return response
    
    cleaned = response
    
    # Find and remove text before "## Project Overview"
    markdown_file_start_indicator = "## Project Overview"
    project_overview_index = cleaned.find(markdown_file_start_indicator)
    if project_overview_index != -1:
        cleaned = cleaned[project_overview_index:]
    
    # Find and remove text from "Wiki pages you might want to explore:" onwards
    markdown_file_end_indicator = "Wiki pages you might want to explore:"
    markdown_file_end_index = cleaned.find(markdown_file_end_indicator)
    if markdown_file_end_index != -1:
        cleaned = cleaned[:markdown_file_end_index]
    
    # Clean up any trailing whitespace
    cleaned = cleaned.strip()
    
    return cleaned

def parse_sse_response(response_text: str) -> str:
    """
    Parse Server-Sent Events (SSE) response and extract the content.
    
    Args:
        response_text: Raw SSE response text
        
    Returns:
        Extracted content or error message
    """
    try:
        lines = response_text.strip().split('\n')
        content_parts = []
        
        for line in lines:
            if line.startswith('data: '):
                data_content = line[6:]  # Remove 'data: ' prefix
                if data_content and data_content != '[DONE]':
                    try:
                        import json
                        data_json = json.loads(data_content)
                        if 'content' in data_json:
                            content_parts.append(data_json['content'])
                        elif 'text' in data_json:
                            content_parts.append(data_json['text'])
                        elif isinstance(data_json, dict) and 'result' in data_json:
                            if isinstance(data_json['result'], dict) and 'content' in data_json['result']:
                                content_parts.append(data_json['result']['content'][0]['text'])
                    except json.JSONDecodeError:
                        # If not JSON, treat as plain text
                        content_parts.append(data_content)
        
        if content_parts:
            return ''.join(content_parts)
        else:
            # Fallback: return the entire response if no structured content found
            return response_text
            
    except Exception as e:
        debug_log(f"Error parsing SSE response: {str(e)}")
        return f"Error parsing SSE response: {str(e)}"

def extract_repository_url_from_error(error_message: str) -> Optional[str]:
    """
    Extract DeepWiki repository URL from error message.
    
    Handles error messages like:
    'Error processing question: Repository not found. Visit https://deepwiki.com/saharmor/DeepAnswer to index it.ping'
    
    Args:
        error_message: The error message containing the URL
        
    Returns:
        The extracted DeepWiki URL without .ping suffix, or None if not found
    """
    if not error_message:
        return None
    
    # Look for URLs in the error message
    import re
    url_pattern = r"Visit (https://deepwiki\.com/[^\s]+)"
    match = re.search(url_pattern, error_message)
    
    if match:
        url = match.group(1)
        # Remove .ping suffix if present
        if url.endswith('.ping'):
            url = url[:-5]
        return url
    
    return None

def check_repo_not_found_error_type(repository: str) -> str:
    """
    Check if a repository is private or not indexed by hitting the GitHub repository URL.
    
    Args:
        repository: The GitHub repository URL to check
        
    Returns:
        'private' if repository returns 404 (private), 'not_indexed' if accessible (just not indexed), 'unknown' if can't determine
    """
    try:        
        # Check if the repository exists on GitHub
        response = requests.get(repository, timeout=10)
        
        if response.status_code == 404:
            # Repository not found on GitHub - likely private
            return "private"
        elif response.status_code == 200:
            # Repository exists on GitHub - just not indexed on DeepWiki
            return "not_indexed"
        else:
            debug_log(f"Unexpected status code {response.status_code} for {repository}")
            return "unknown"
            
    except Exception as e:
        debug_log(f"Error checking repository type for {repository}: {str(e)}")
        return "unknown"

def extract_view_search_url(response_text: str) -> Optional[str]:
    """
    Extract the view search URL from DeepWiki response text.
    
    Searches for text that follows "View this search on DeepWiki: " 
    and captures the URL until a newline character.
    
    Args:
        response_text: The complete response text from DeepWiki
        
    Returns:
        The extracted URL or None if not found
    """
    if not response_text:
        return None
    
    # Look for the pattern "View this search on DeepWiki: " followed by URL
    pattern = r"View this search on DeepWiki:\s*([^\n]+)"
    match = re.search(pattern, response_text)
    
    if match:
        url = match.group(1).strip()
        return url if url else None
    
    return None

class DeepWikiClient:
    """
    DeepWiki MCP Client that maintains a persistent session for efficient querying.
    
    Initializes the MCP session once and reuses it for multiple queries,
    significantly improving performance compared to initializing on each call.
    """
    
    def __init__(self, auto_initialize: bool = True):
        """Initialize the MCP client and optionally establish a session with DeepWiki.
        
        Args:
            auto_initialize: If True, initialize session immediately. If False, call initialize() manually.
        """
        self.mcp_url = "https://mcp.deepwiki.com/mcp"
        self.session_id = None
        self.is_initialized = False
        if auto_initialize:
            self._initialize_session()
    
    def initialize(self):
        """Initialize the session manually (for use when auto_initialize=False)."""
        if not self.is_initialized:
            self._initialize_session()
    
    def _initialize_session(self):
        """Initialize MCP session with DeepWiki server."""
        try:
            debug_log("Initializing DeepWiki MCP session...")
            
            init_payload = {
                "jsonrpc": "2.0",
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {}
                    },
                    "clientInfo": {
                        "name": "deepanswer-mcp-client",
                        "version": "1.0.0"
                    }
                },
                "id": 1
            }
            
            init_response = requests.post(
                self.mcp_url,
                json=init_payload,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json, text/event-stream"
                },
                timeout=30
            )
            
            if init_response.status_code != 200:
                raise Exception(f"Initialization failed with status {init_response.status_code}: {init_response.text}")
            
            # Extract session ID from response headers
            self.session_id = init_response.headers.get("mcp-session-id")
            if not self.session_id:
                raise Exception("No session ID returned from DeepWiki server")
            
            self.is_initialized = True
            debug_log(f"MCP session initialized successfully (ID: {self.session_id[:8]}...)")
            
        except requests.exceptions.Timeout:
            debug_log("Timeout during MCP session initialization")
            self.is_initialized = False
        except requests.exceptions.RequestException as e:
            debug_log(f"Network error during initialization: {str(e)}")
            self.is_initialized = False
        except Exception as e:
            debug_log(f"Failed to initialize MCP session: {str(e)}")
            self.is_initialized = False
    
    def query(self, repository: Optional[str], question: str) -> DeepWikiResponse:
        """
        Query DeepWiki and return complete response
        
        Args:
            repository: Repository name or None for general query
            question: The question to ask
            
        Returns:
            DeepWikiResponse: Response containing the answer and view search URL
            
        Raises:
            DeepWikiInitializationError: If the client is not properly initialized
            DeepWikiRepositoryNotFoundError: If the repository is not found or not indexed
            DeepWikiConnectionError: If there's a network connection issue
            DeepWikiTimeoutError: If the request times out
            DeepWikiAPIError: If the API returns an error status code
            DeepWikiResponseError: If the response is invalid or contains errors
            DeepWikiError: For any other unexpected errors
        """
        try:
            if not self.is_initialized:
                error_msg = "MCP client not properly initialized"
                debug_log(error_msg)
                raise DeepWikiInitializationError(error_msg)
            
            # Normalize repository name if provided
            if repository:
                # Handle various repository formats
                m = re.match(r"(?:https?://github\.com/)?([^/]+/[^/]+)", repository)
                if m:
                    repo_name = m.group(1)
                else:
                    # Assume it's already in owner/repo format
                    repo_name = repository
            else:
                repo_name = "general"  # Fallback for general queries
            
            tool_payload = {
                "jsonrpc": "2.0",
                "method": "tools/call",
                "params": {
                    "name": "ask_question",
                    "arguments": {
                        "repoName": repo_name,
                        "question": question
                    }
                },
                "id": 2
            }
            
            debug_log(f"Querying DeepWiki - Repository: {repo_name}, Question: {question[:100]}...")
            
            # Make request to DeepWiki MCP
            tool_response = requests.post(
                self.mcp_url,
                json=tool_payload,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json, text/event-stream",
                    "Mcp-Session-Id": self.session_id
                },
                timeout=300  # Increased to 5 minutes for large repositories
            )
            
            if tool_response.status_code == 200:
                # Check if response has content
                if not tool_response.text.strip():
                    raise DeepWikiResponseError("Empty response from DeepWiki", raw_response="")
                
                # Parse the SSE response
                text_content = parse_sse_response(tool_response.text)
                
                # Check if the parsed content indicates an error
                if not text_content:
                    raise DeepWikiResponseError("Failed to parse response from DeepWiki", raw_response=tool_response.text)
                
                # Check for repository not found error first
                if "Repository not found. Visit" in text_content:
                    deepwiki_url = extract_repository_url_from_error(text_content)
                    if deepwiki_url:
                        repo_type = check_repo_not_found_error_type(repository)
                        
                        if repo_type == "private":
                            message = "This repository requires a DeepWiki account to access."
                        elif repo_type == "not_indexed":
                            message = f"This repository hasn't been indexed yet. Trigger indexing by opening the repository on DeepWiki and try again in about 10 minutes."
                        else:
                            message = f"Repository not found. Visit {deepwiki_url} to index it and try again in 5 minutes."
                        
                        raise DeepWikiRepositoryNotFoundError(message, deepwiki_url, repo_type, raw_response=text_content)
                
                # Check for other known error patterns
                error_patterns = [
                    "DeepWiki error:",
                    "Failed to parse",
                    "Error parsing",
                    "Error processing",
                    "No message event"
                ]
                
                for pattern in error_patterns:
                    if text_content.startswith(pattern):
                        raise DeepWikiResponseError(f"DeepWiki returned error: {text_content}", raw_response=text_content)
                
                # If we get here, it's a successful response
                # Extract the view search URL from the raw response
                view_url = extract_view_search_url(text_content)
                # Clean the response for frontend use
                cleaned_response = clean_deepwiki_response(text_content)
                return DeepWikiResponse(raw_response=text_content, response=cleaned_response, view_search_url=view_url)
            else:
                error_msg = f"DeepWiki API returned error status: {tool_response.text}"
                debug_log(f"DeepWiki API Error {tool_response.status_code}: {tool_response.text}")
                raise DeepWikiAPIError(error_msg, status_code=tool_response.status_code, raw_response=tool_response.text)
                
        except requests.exceptions.Timeout:
            error_msg = "Request to DeepWiki timed out"
            debug_log(error_msg)
            raise DeepWikiTimeoutError(error_msg)
        except requests.exceptions.RequestException as e:
            error_msg = f"Error connecting to DeepWiki: {str(e)}"
            debug_log(error_msg)
            raise DeepWikiConnectionError(error_msg)
        except DeepWikiError:
            # Re-raise our custom exceptions as-is
            raise
        except Exception as e:
            error_msg = f"Unexpected error processing DeepWiki response: {str(e)}"
            debug_log(error_msg)
            raise DeepWikiError(error_msg)
    
    def close(self):
        """Close the MCP session (optional cleanup)."""
        if self.is_initialized:
            debug_log("Closing DeepWiki MCP session...")
            self.session_id = None
            self.is_initialized = False

# client=DeepWikiClient()

# try:   
#     response=client.query("https://github.com/saharmor/DeepAnswer", "What is the main purpose of the DeepAnswer project?")
#     print(response)
# except DeepWikiRepositoryNotFoundError as e:
#     print(e)

# try:
#     response=client.query("https://github.com/saharmor/sidekick-buddy-gen", "What is the main purpose of the DeepAnswer project?")
#     print(response)
# except DeepWikiRepositoryNotFoundError as e:
#     print(e)