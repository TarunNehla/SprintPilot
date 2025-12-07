import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_BASE = os.getenv("API_BASE_URL", "http://localhost:8787")
# Hardcoded ownerId from docs for MVP
OWNER_ID = "8DmS1YCNa4rpnPFoU521iAxzlt7I4iZe"
PROJECT_ID_DEFAULT = "cbdb4743-d375-4458-b7ef-0cb47bc02963"

def _get_headers():
    return {
        "Content-Type": "application/json"
    }

def search_project_knowledge(project_id: str = PROJECT_ID_DEFAULT, query: str = None, doc_types=None, limit=10):
    """
    Semantic + keyword search across project docs.
    """
    url = f"{API_BASE}/api/rag/query"
    payload = {
        "projectId": project_id,
        "query": query,
        "filters": {"docTypes": doc_types} if doc_types else None,
        "config": {"limit": limit, "hybridWeight": 0.5}
    }
    if payload["filters"] is None:
        del payload["filters"]
        
    response = requests.post(url, json=payload, headers=_get_headers())
    response.raise_for_status()
    return response.json()

def list_project_docs(project_id: str = PROJECT_ID_DEFAULT):
    """
    Get all docs metadata (no content).
    """
    url = f"{API_BASE}/api/projects/{project_id}/docs"
    response = requests.get(url, headers=_get_headers())
    response.raise_for_status()
    return response.json()

def get_doc_content(doc_id: str, project_id: str = PROJECT_ID_DEFAULT):
    """
    Read full document content.
    """
    url = f"{API_BASE}/api/projects/{project_id}/docs/{doc_id}"
    response = requests.get(url, headers=_get_headers())
    response.raise_for_status()
    return response.json()

def list_issues(project_id: str = PROJECT_ID_DEFAULT, status=None):
    """
    Get all issues (filter by status if needed).
    """
    url = f"{API_BASE}/api/projects/{project_id}/issues"
    response = requests.get(url, headers=_get_headers())
    response.raise_for_status()
    issues = response.json()
    if status:
        return [i for i in issues if i.get("status") == status]
    return issues

def get_issue_details(issue_id: str, project_id: str = PROJECT_ID_DEFAULT):
    """
    Get full issue with description.
    """
    url = f"{API_BASE}/api/projects/{project_id}/issues/{issue_id}"
    response = requests.get(url, headers=_get_headers())
    response.raise_for_status()
    return response.json()

def create_issue(title: str, description: str, project_id: str = PROJECT_ID_DEFAULT, priority: str = "medium"):
    """
    Create new task/issue.
    """
    url = f"{API_BASE}/api/projects/{project_id}/issues"
    payload = {
        "title": title,
        "description": description,
        "priority": priority
    }
    response = requests.post(url, json=payload, headers=_get_headers())
    response.raise_for_status()
    return response.json()

def update_issue_status(issue_id: str, status: str, project_id: str = PROJECT_ID_DEFAULT, **kwargs):
    """
    Update issue status/priority.
    """
    url = f"{API_BASE}/api/projects/{project_id}/issues/{issue_id}"
    
    # Fetch current state first because PUT replaces the object
    current_issue = get_issue_details(project_id, issue_id)
    
    update_payload = {
        "title": current_issue["title"],
        "description": current_issue.get("description", ""),
        "status": status,
        "priority": current_issue.get("priority", "medium")
    }
    update_payload.update(kwargs)
    
    response = requests.put(url, json=update_payload, headers=_get_headers())
    response.raise_for_status()
    return response.json()

def get_project_info(project_id: str = PROJECT_ID_DEFAULT):
    """
    Get project metadata.
    """
    url = f"{API_BASE}/api/projects/{project_id}"
    response = requests.get(url, headers=_get_headers())
    response.raise_for_status()
    return response.json()
