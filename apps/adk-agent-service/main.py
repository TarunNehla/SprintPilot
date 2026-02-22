import os
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
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

AGENT_SERVICE_SECRET = os.environ.get("AGENT_SERVICE_SECRET", "").strip()

# Routes that skip auth
AUTH_SKIP_PREFIXES = ("/debug", "/docs", "/openapi.json", "/dev-ui")

# Call the function to get the FastAPI app instance.
app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    session_service_uri=SESSION_SERVICE_URI,
    allow_origins=ALLOWED_ORIGINS,
    web=SERVE_WEB_INTERFACE,
)


@app.middleware("http")
async def verify_backend_secret(request: Request, call_next):
    path = request.url.path
    if any(path.startswith(p) for p in AUTH_SKIP_PREFIXES):
        return await call_next(request)

    if path in ("/run_sse", "/api/query"):
        secret = request.headers.get("X-Backend-Secret", "").strip()
        if not secret:
            return JSONResponse(status_code=401, content={"error": "Missing X-Backend-Secret"})
        if secret != AGENT_SERVICE_SECRET:
            return JSONResponse(status_code=403, content={"error": "Invalid X-Backend-Secret"})

    return await call_next(request)


# Custom endpoint models
class QueryRequest(BaseModel):
    session_id: str
    message: str
    user_id: str = "default-user"


@app.get("/debug")
async def debug():
    return {
        "state_keys": dir(app.state),
        "routes": [route.path for route in app.routes],
    }


@app.post("/api/query")
async def query_agent(query: QueryRequest):
    """
    Simplified endpoint that directly uses ADK's runner.
    Accepts session_id and message, returns agent response.
    """
    try:
        adk_web_server = app.state.adk_web_server

        new_message = types.Content(
            role="user", parts=[types.Part(text=query.message)]
        )

        runner = await adk_web_server.get_runner_async("my_agent")

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
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
