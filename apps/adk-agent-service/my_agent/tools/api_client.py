import os
import requests
from dotenv import load_dotenv
from google.adk.tools import ToolContext

load_dotenv()

API_BASE = os.getenv("API_BASE_URL", "http://localhost:8787")
AGENT_SERVICE_SECRET = os.getenv("AGENT_SERVICE_SECRET", "").strip()


def _get_headers(user_id: str):
    return {
        "Content-Type": "application/json",
        "X-Agent-Secret": AGENT_SERVICE_SECRET,
        "X-User-Id": user_id,
    }


def _get_ctx(tool_context: ToolContext):
    project_id = tool_context.state.get("project_id")
    user_id = tool_context.state.get("user_id")
    if not project_id or not user_id:
        raise ValueError("Missing project_id or user_id in session state")
    return project_id, user_id


def search_project_knowledge(query: str, tool_context: ToolContext, doc_types=None, limit=10):
    """
    Semantic + keyword search across project docs.
    """
    project_id, user_id = _get_ctx(tool_context)
    url = f"{API_BASE}/api/rag/query"
    payload = {
        "projectId": project_id,
        "query": query,
        "config": {"limit": limit, "hybridWeight": 0.5},
    }
    if doc_types:
        payload["filters"] = {"docTypes": doc_types}

    response = requests.post(url, json=payload, headers=_get_headers(user_id))
    response.raise_for_status()
    return response.json()


def list_project_docs(tool_context: ToolContext):
    """
    Get all docs metadata (no content).
    """
    project_id, user_id = _get_ctx(tool_context)
    url = f"{API_BASE}/api/projects/{project_id}/docs"
    response = requests.get(url, headers=_get_headers(user_id))
    response.raise_for_status()
    return response.json()


def get_doc_content(doc_id: str, tool_context: ToolContext):
    """
    Read full document content.
    """
    project_id, user_id = _get_ctx(tool_context)
    url = f"{API_BASE}/api/projects/{project_id}/docs/{doc_id}"
    response = requests.get(url, headers=_get_headers(user_id))
    response.raise_for_status()
    return response.json()


def list_issues(tool_context: ToolContext, status=None):
    """
    Get all issues (filter by status if needed).
    """
    project_id, user_id = _get_ctx(tool_context)
    url = f"{API_BASE}/api/projects/{project_id}/issues"
    response = requests.get(url, headers=_get_headers(user_id))
    response.raise_for_status()
    issues = response.json()
    if status:
        return [i for i in issues if i.get("status") == status]
    return issues


def get_issue_details(issue_id: str, tool_context: ToolContext):
    """
    Get full issue with description.
    """
    project_id, user_id = _get_ctx(tool_context)
    url = f"{API_BASE}/api/projects/{project_id}/issues/{issue_id}"
    response = requests.get(url, headers=_get_headers(user_id))
    response.raise_for_status()
    return response.json()


def create_issue(title: str, description: str, tool_context: ToolContext, priority: str = "medium"):
    """
    Create new task/issue.
    """
    project_id, user_id = _get_ctx(tool_context)
    url = f"{API_BASE}/api/projects/{project_id}/issues"
    payload = {
        "title": title,
        "description": description,
        "priority": priority,
    }
    response = requests.post(url, json=payload, headers=_get_headers(user_id))
    response.raise_for_status()
    return response.json()


def update_issue_status(issue_id: str, status: str, tool_context: ToolContext, **kwargs):
    """
    Update issue status/priority.
    """
    project_id, user_id = _get_ctx(tool_context)
    url = f"{API_BASE}/api/projects/{project_id}/issues/{issue_id}"

    # Fetch current state first because PUT replaces the object
    current_issue = get_issue_details(issue_id, tool_context)

    update_payload = {
        "title": current_issue["title"],
        "description": current_issue.get("description", ""),
        "status": status,
        "priority": current_issue.get("priority", "medium"),
    }
    update_payload.update(kwargs)

    response = requests.put(url, json=update_payload, headers=_get_headers(user_id))
    response.raise_for_status()
    return response.json()


def get_project_info(tool_context: ToolContext):
    """
    Get project metadata.
    """
    project_id, user_id = _get_ctx(tool_context)
    url = f"{API_BASE}/api/projects/{project_id}"
    response = requests.get(url, headers=_get_headers(user_id))
    response.raise_for_status()
    return response.json()
