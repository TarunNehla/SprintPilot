import os
import uvicorn
from fastapi import FastAPI, HTTPException
from google.adk.cli.fast_api import get_fast_api_app
from google.genai import types
from pydantic import BaseModel

# Get the directory where main.py is located
AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
# Example session service URI (e.g., SQLite)
SESSION_SERVICE_URI = "sqlite:///./sessions.db"
# Example allowed origins for CORS
ALLOWED_ORIGINS = ["http://localhost", "http://localhost:8080", "*"]
# Set web=True if you intend to serve a web interface, False otherwise
SERVE_WEB_INTERFACE = True

# Call the function to get the FastAPI app instance.
# It returns a single FastAPI object, so assign it to one variable.
app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    session_service_uri=SESSION_SERVICE_URI,
    allow_origins=ALLOWED_ORIGINS,
    web=SERVE_WEB_INTERFACE,
)

# Custom endpoint models
class QueryRequest(BaseModel):
    session_id: str
    message: str
    user_id: str = "default-user"


@app.get("/debug")
async def debug():
    return {
        "state_keys": dir(app.state),
        "routes": [route.path for route in app.routes]
    }


@app.post("/api/query")
async def query_agent(query: QueryRequest):
    """
    Simplified endpoint that directly uses ADK's runner.
    Accepts session_id and message, returns agent response.
    """
    try:
        # Access ADK web server from app.state.
        # This will be available once uvicorn starts the app and its lifespan events run.
        adk_web_server = app.state.adk_web_server
        
        # Create ADK message format
        new_message = types.Content(
            role="user",
            parts=[types.Part(text=query.message)]
        )
        
        # Get the runner for the agent using the adk_web_server_instance
        # Ensure the agent directory name ('my_agent') matches your agent folder
        runner = await adk_web_server.get_runner_async("my_agent") 
        
        # Run the agent
        events = []
        async for event in runner.run_async(
            user_id=query.user_id,
            session_id=query.session_id,
            new_message=new_message,
        ):
            events.append(event)
        
        return {"status": "success", "events": events}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

if __name__ == "__main__":
    # Use the PORT environment variable provided by Cloud Run, defaulting to 8080
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))

