"""FastAPI backend for Sidekick Dev - AI-powered coding context generator."""

import os
import tempfile
import base64
from fastapi import FastAPI, HTTPException, Response, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from models import GenerateRequest, GenerateResponse, ErrorResponse
from services import generate_markdown_files, create_zip_file, extract_repo_name, initialize_deepwiki_client, close_deepwiki_client
from config import CORS_ORIGINS, DEBUG
import logging
from sqlalchemy.orm import Session
from db import init_db, get_db
from db_models import UserQuery, ErrorEvent

# Configure logging
logging.basicConfig(level=logging.INFO if DEBUG else logging.WARNING)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Sidekick Dev API",
    description="Automatically generate high-quality markdown context files for coding agents",
    version="1.0.0",
    docs_url="/docs" if DEBUG else None,
    redoc_url="/redoc" if DEBUG else None
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize services on application startup."""
    logger.info("Initializing application services...")
    # Initialize database and tables
    init_db()
    initialize_deepwiki_client()
    logger.info("Application startup complete")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup services on application shutdown."""
    logger.info("Shutting down application services...")
    close_deepwiki_client()
    logger.info("Application shutdown complete")

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "Sidekick Dev API is running", "version": "1.0.1"}

@app.get("/health")
async def health():
    """Health check endpoint for monitoring."""
    return {"status": "healthy", "service": "sidekick-dev-api"}

@app.post("/api/generate", response_model=GenerateResponse)
async def generate_context_files(request: GenerateRequest, http_request: Request, db: Session = Depends(get_db)):
    """
    Generate context markdown files for the specified GitHub repository and agents.
    
    Args:
        request: Contains github_url and selected_agents
        
    Returns:
        Success response with download information or error response
    """
    try:
        logger.info(f"Generate request received - URL: {request.github_url}, Agents: {request.selected_agents}")
        
        # Persist the query for analytics
        user_query_record = None
        try:
            client_info = http_request.headers.get("User-Agent", "")
            user_query_record = UserQuery(
                github_url=request.github_url,
                agents_csv=",".join(request.selected_agents),
                session_id=http_request.headers.get("X-Session-Id"),
                client_id=http_request.headers.get("X-Client-Id"),
                client_info=client_info,
            )
            db.add(user_query_record)
            db.commit()
            db.refresh(user_query_record)
        except Exception as e:
            logger.warning(f"Failed to persist user query: {e}")

        # Generate markdown files
        files, error, view_search_url = generate_markdown_files(request.github_url, request.selected_agents)
        
        if error:
            logger.error(f"File generation failed: {error}")
            
            # Check if error is structured (repository not found)
            if isinstance(error, dict) and error.get("type") == "repository_not_found":
                # Create structured error response for repository not found
                error_response = ErrorResponse(
                    error=error["message"],
                    error_type="repository_not_found",
                    deepwiki_url=error["deepwiki_url"],
                    repo_type=error["repo_type"]
                )
                # Record error event in DB if possible
                try:
                    if user_query_record is not None:
                        # Persist canonical enum labels using model enum
                        event_type = (
                            ErrorEvent.ErrorEventType.PRIVATE_REPOSITORY
                            if error.get("repo_type") == "private"
                            else ErrorEvent.ErrorEventType.REPOSITORY_NOT_INDEXED
                        )
                        error_event = ErrorEvent(
                            event_type=event_type,
                            repository_url=request.github_url,
                            user_query_id=user_query_record.id,
                        )
                        db.add(error_event)
                        db.commit()
                except Exception as e:
                    logger.warning(f"Failed to persist error event: {e}")
                raise HTTPException(status_code=404, detail=error_response.dict())
            else:
                # Regular error handling for other types of errors
                raise HTTPException(status_code=400, detail=error)
        
        if not files:
            logger.error("No files were generated")
            raise HTTPException(status_code=500, detail="No files were generated")
        
        # Extract repository name for filename
        repo_name = extract_repo_name(request.github_url)
        
        # If only one file, return it directly
        if len(files) == 1:
            filename = list(files.keys())[0]
            content = list(files.values())[0]
            
            logger.info(f"Generated single file: {filename}")
            
            return GenerateResponse(
                success=True,
                message="Context file generated successfully",
                files_generated=[filename],
                view_search_url=view_search_url,
                file_content=content,
                filename=filename,
                is_zip=False
            )
        
        # Multiple files - create ZIP
        else:
            zip_content = create_zip_file(files)
            zip_filename = f"{repo_name}-context-files.zip"
            
            logger.info(f"Generated ZIP file with {len(files)} files: {zip_filename}")
            
            # Encode ZIP content as base64 for JSON response
            zip_b64 = base64.b64encode(zip_content).decode('utf-8')
            
            return GenerateResponse(
                success=True,
                message="Context files generated successfully",
                files_generated=list(files.keys()),
                view_search_url=view_search_url,
                file_content=zip_b64,
                filename=zip_filename,
                is_zip=True
            )
            
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error in generate endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler."""
    # Check if detail is already a structured error dict (from repository not found)
    if isinstance(exc.detail, dict) and 'error_type' in exc.detail:
        # Already a structured error response
        content = exc.detail
        content['success'] = False  # Ensure success is set to False
    else:
        # Regular error handling
        content = ErrorResponse(error=exc.detail).dict()
    
    return JSONResponse(
        status_code=exc.status_code,
        content=content
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """General exception handler for unexpected errors."""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Internal server error",
            details=str(exc) if DEBUG else None
        ).dict()
    )

# Cleanup function for temporary files (in production, you might want a more robust cleanup strategy)
import atexit
import glob

def cleanup_temp_files():
    """Clean up temporary files on app shutdown."""
    temp_files = glob.glob(os.path.join(tempfile.gettempdir(), "tmp*"))
    for file_path in temp_files:
        try:
            if os.path.exists(file_path):
                os.unlink(file_path)
        except Exception as e:
            logger.warning(f"Failed to cleanup temp file {file_path}: {e}")

atexit.register(cleanup_temp_files)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=DEBUG)