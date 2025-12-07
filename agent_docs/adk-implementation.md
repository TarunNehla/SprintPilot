# ADK Service Implementation Plan

This document outlines the step-by-step plan to implement the ADK-based agent service in `/apps/adk-agent-service`.

## 1. Project Initialization
- [ ] **Directory Setup**: Ensure `/apps/adk-agent-service` is ready.
- [ ] **Dependencies**: Create `requirements.txt` with necessary ADK packages.
    -   `google-genai-adk` (or equivalent verified package name from docs)
    -   `python-dotenv`
- [ ] **Environment**: Create `.env` for API keys (GOOGLE_API_KEY).

## 2. Basic Agent Implementation
- [ ] **Agent Scaffolding**: Create `src/main.py`.
- [ ] **Configuration**: Setup `model` and `agent` initialization.
    -   Use `google.genai.Agent(model='gemini-1.5-flash', ...)` (example)
- [ ] **Run Loop**: Implement a basic CLI loop or use ADK runner.

## 3. Tool Implementation
- [ ] **Define Tools**: Create `src/tools.py`.
- [ ] **Register Tools**: Bind tools to the agent.
- [ ] **Test Tools**: Verify tool execution independently.

## 4. Testing & Verification
- [ ] **Automated Tests**: specific unit tests for tools.
- [ ] **Manual Verification**: Run interaction script.
