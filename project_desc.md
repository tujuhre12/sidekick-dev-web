📄 Project Overview: DeepCode
Goal:
Automatically generate high-quality markdown context files for coding agents like Claude Code, Cursor, Windsurf, and Gemini. These files enhance the performance of coding agents by providing curated context about a GitHub repository.

Use case:
Developers often spend significant time manually creating claude.md, project_general.md, etc., to improve results inside their AI coding IDEs. DeepCode eliminates this manual work by using DeepWiki’s MCP interface to generate these files instantly.

🛠 Architecture
✅ Frontend
Framework: React
Hosting: GitHub pages
Responsibilities:

Accept public GitHub repo URL input

Let user select one or more target agents (e.g., Claude Code, Cursor)

Send request to FastAPI backend

Receive one or more markdown files

Zip & download multiple files if needed

Add a Generated using DeepCode footer to each file

✅ Backend
Framework: FastAPI
Hosting: Render
Responsibilities:

Accept frontend payload: repo URL + selected agents

Query DeepWiki’s /mcp endpoint using a universal prompt template

Apply post-processing per agent (via customize_markdown_for_agent()—currently a no-op)

Return generated .md files to frontend

If >1 file: return .zip archive

✅ DeepWiki Integration
Endpoint: https://mcp.deepwiki.com/mcp

Method: POST

Prompt format: fixed, structured markdown that outlines:

Project architecture

Development commands

Code style

Testing patterns

Git workflow

Security practices

This prompt is universal—no tech stack specialization is currently required.

# DeepWiki working implementation shared by a colleague
class DeepWikiClient:
    """
    DeepWiki MCP Client that maintains a persistent session for efficient querying.
    
    Initializes the MCP session once and reuses it for multiple queries,
    significantly improving performance compared to initializing on each call.
    """
    
    def __init__(self):
        """Initialize the MCP client and establish a session with DeepWiki."""
        self.mcp_url = "https://mcp.deepwiki.com/mcp"
        self.session_id = None
        self.is_initialized = False
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
    
    def query(self, repository: Optional[str], question: str) -> str:
        """
        Query DeepWiki and return complete response
        
        Args:
            repository: Repository name or None for general query
            question: The question to ask
            
        Returns:
            str: Complete response from DeepWiki or error message
        """
        try:
            if not self.is_initialized:
                error_msg = "MCP client not properly initialized"
                debug_log(error_msg)
                return error_msg
            
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
            
            debug_log(f"Querying DeepWiki - Repository: {repo_name}, Question: {question}")
            
            # Make request to DeepWiki MCP
            tool_response = requests.post(
                self.mcp_url,
                json=tool_payload,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json, text/event-stream",
                    "Mcp-Session-Id": self.session_id
                },
                timeout=60
            )
            
            if tool_response.status_code == 200:
                # Check if response has content
                if not tool_response.text.strip():
                    return "Empty response from DeepWiki"
                
                # Parse the SSE response
                text_content = parse_sse_response(tool_response.text)
                if text_content and not text_content.startswith("DeepWiki error:") and not text_content.startswith("Failed to parse") and not text_content.startswith("Error parsing") and not text_content.startswith("No message event"):
                    return text_content
                else:
                    debug_log(f"SSE parsing result: {text_content}")
                    return text_content
            else:
                error_msg = f"DeepWiki API Error {tool_response.status_code}: {tool_response.text}"
                debug_log(error_msg)
                return error_msg
                
        except requests.exceptions.Timeout:
            error_msg = "Request to DeepWiki timed out"
            debug_log(error_msg)
            return error_msg
        except requests.exceptions.RequestException as e:
            error_msg = f"Error connecting to DeepWiki: {str(e)}"
            debug_log(error_msg)
            return error_msg
        except Exception as e:
            error_msg = f"Error processing DeepWiki response: {str(e)}"
            debug_log(error_msg)
            return error_msg
    
    def close(self):
        """Close the MCP session (optional cleanup)."""
        if self.is_initialized:
            debug_log("Closing DeepWiki MCP session...")
            self.session_id = None
            self.is_initialized = False
            

📁 Output Mapping by Agent
Agent	Output Filename
Claude Code	claude.md
Cursor	project_general.md
Windsurf	windsurf.md
Gemini	gemini.md

The markdown content is currently identical across agents. In the future, agent-specific tweaks will be handled by the empty placeholder function:

python
Copy
Edit
def customize_markdown_for_agent(markdown: str, agent: str) -> str:
    # In future, apply agent-specific formatting here
    return markdown
📦 Output Format Example
Each .md file ends with a footer:

yaml
Copy
Edit
---
Generated using [DeepCode](https://github.com/your-org/deepcode), your coding agent sidekick.
🧪 Testing Plan
✅ Happy Path
Valid GitHub repo + one agent → single .md file downloaded

Valid GitHub repo + multiple agents → .zip download with correct filenames

🚫 Unhappy Path
Invalid GitHub URL → frontend validation error

DeepWiki timeout or malformed response → error message returned

No agent selected → submit disabled or prompt

🧱 Edge Cases
Monorepos with multiple projects

Repos missing structure (no src/, no test suite)

Non-JS/TS stacks (should still generate a usable markdown file)

📚 Future Considerations
Feature	Status
Private repo support	❌ Not planned in v1
CLI interface	❌ Not needed
Auth layer	❌ Public only
Rate limit handling	❌ Not handled yet
Agent-specific formatting	⚙️ Function stubbed, to be implemented
Zip bundling for output	✅ Will be supported

✅ Summary
Component	Tech Stack
Frontend	React + Lavaboom
Backend	FastAPI + Render
LLM Engine	DeepWiki MCP
File Output	Markdown (.md) or .zip
Agent Support	Claude, Cursor, Gemini, Windsurf

