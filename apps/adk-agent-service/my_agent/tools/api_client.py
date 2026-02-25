import os
import re
import requests
from dotenv import load_dotenv
from google.adk.tools import ToolContext

load_dotenv()

API_BASE = os.getenv("API_BASE_URL", "http://localhost:8787")
AGENT_SERVICE_SECRET = os.getenv("AGENT_SERVICE_SECRET", "").strip()
REQUEST_TIMEOUT_SECONDS = float(os.getenv("API_TIMEOUT_SECONDS", "20"))
UUID_REGEX = re.compile(
    r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b"
)
AMBIGUOUS_DOC_REFERENCES = {
    "this document",
    "that document",
    "the document",
    "this doc",
    "that doc",
    "the doc",
    "doc",
    "document",
}


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


def _extract_error_message(response: requests.Response) -> str:
    try:
        payload = response.json()
        if isinstance(payload, dict):
            for key in ("error", "message", "detail"):
                value = payload.get(key)
                if value:
                    return str(value)
    except ValueError:
        pass

    text = response.text.strip()
    if text:
        return text
    return response.reason or f"HTTP {response.status_code}"


def _extract_uuid(value: str) -> str | None:
    if not value:
        return None
    match = UUID_REGEX.search(value)
    if not match:
        return None
    return match.group(0).lower()


def _normalize_text(value: str) -> str:
    return " ".join(value.strip().lower().split())


def _safe_list_project_docs(project_id: str, user_id: str) -> list[dict]:
    try:
        url = f"{API_BASE}/api/projects/{project_id}/docs"
        response = requests.get(
            url, headers=_get_headers(user_id), timeout=REQUEST_TIMEOUT_SECONDS
        )
        if not response.ok:
            return []
        payload = response.json()
        if isinstance(payload, list):
            return [doc for doc in payload if isinstance(doc, dict)]
    except (requests.RequestException, ValueError):
        return []
    return []


def _remember_docs_in_state(docs: list[dict], tool_context: ToolContext):
    slim_docs = []
    for doc in docs:
        doc_id = doc.get("id")
        title = doc.get("title")
        if doc_id:
            slim_docs.append({"id": str(doc_id), "title": str(title or "")})

    if slim_docs:
        tool_context.state["last_listed_docs"] = slim_docs
        if len(slim_docs) == 1:
            tool_context.state["last_doc_id"] = slim_docs[0]["id"]


def _build_doc_candidates(
    doc_id: str, docs: list[dict], tool_context: ToolContext
) -> list[str]:
    candidates: list[str] = []
    seen: set[str] = set()

    def add(candidate: str | None):
        if not candidate:
            return
        normalized = str(candidate).strip()
        if not normalized or normalized in seen:
            return
        seen.add(normalized)
        candidates.append(normalized)

    requested = str(doc_id or "").strip()
    requested_norm = _normalize_text(requested)
    doc_ids = {str(doc.get("id")) for doc in docs if doc.get("id")}
    extracted_uuid = _extract_uuid(requested)

    # Keep the raw value only when docs are unavailable or it is a known ID.
    if requested and (not doc_ids or requested in doc_ids):
        add(requested)

    # Same rule for extracted UUID values from free-form inputs.
    if extracted_uuid and (not doc_ids or extracted_uuid in doc_ids):
        add(extracted_uuid)

    # Resolve title-based references.
    if requested_norm:
        exact_title_matches = [
            str(doc.get("id"))
            for doc in docs
            if _normalize_text(str(doc.get("title", ""))) == requested_norm
            and doc.get("id")
        ]
        for match in exact_title_matches:
            add(match)

        if not exact_title_matches:
            contains_matches = [
                str(doc.get("id"))
                for doc in docs
                if requested_norm in _normalize_text(str(doc.get("title", "")))
                and doc.get("id")
            ]
            if len(contains_matches) == 1:
                add(contains_matches[0])

    # Resolve conversational references from session state.
    last_doc_id = tool_context.state.get("last_doc_id")
    if requested_norm in AMBIGUOUS_DOC_REFERENCES:
        add(str(last_doc_id) if last_doc_id else None)

    last_listed_docs = tool_context.state.get("last_listed_docs")
    if isinstance(last_listed_docs, list):
        for entry in last_listed_docs:
            if isinstance(entry, dict):
                remembered_id = entry.get("id")
                remembered_title = _normalize_text(str(entry.get("title", "")))
                if requested_norm and remembered_title == requested_norm and remembered_id:
                    add(str(remembered_id))

    # If the requested ID is not present and there is only one doc, prefer that.
    if len(doc_ids) == 1:
        add(next(iter(doc_ids)))

    # If we have a remembered doc and it still exists, try it as fallback.
    if last_doc_id and str(last_doc_id) in doc_ids:
        add(str(last_doc_id))

    return candidates


def _fetch_doc_by_id(project_id: str, user_id: str, doc_id: str):
    url = f"{API_BASE}/api/projects/{project_id}/docs/{doc_id}"
    try:
        response = requests.get(
            url, headers=_get_headers(user_id), timeout=REQUEST_TIMEOUT_SECONDS
        )
    except requests.RequestException as exc:
        return None, {"status": None, "error": f"Request failed: {exc}"}

    if response.ok:
        try:
            return response.json(), None
        except ValueError:
            return None, {"status": response.status_code, "error": "Invalid JSON response"}

    return None, {"status": response.status_code, "error": _extract_error_message(response)}


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

    response = requests.post(
        url, json=payload, headers=_get_headers(user_id), timeout=REQUEST_TIMEOUT_SECONDS
    )
    response.raise_for_status()
    return response.json()


def list_project_docs(tool_context: ToolContext):
    """
    Get all docs metadata (no content).
    """
    project_id, user_id = _get_ctx(tool_context)
    url = f"{API_BASE}/api/projects/{project_id}/docs"
    response = requests.get(url, headers=_get_headers(user_id), timeout=REQUEST_TIMEOUT_SECONDS)
    response.raise_for_status()
    docs = response.json()
    if isinstance(docs, list):
        _remember_docs_in_state(docs, tool_context)
    return docs


def get_doc_content(doc_id: str, tool_context: ToolContext):
    """
    Read full document content.
    """
    project_id, user_id = _get_ctx(tool_context)
    docs = _safe_list_project_docs(project_id, user_id)
    if docs:
        _remember_docs_in_state(docs, tool_context)

    candidates = _build_doc_candidates(doc_id, docs, tool_context)
    requested_doc_id = str(doc_id or "").strip()
    attempted_ids: list[str] = []
    final_error = None

    for candidate in candidates:
        attempted_ids.append(candidate)
        doc_payload, error = _fetch_doc_by_id(project_id, user_id, candidate)
        if doc_payload is not None:
            resolved_id = str(doc_payload.get("id") or candidate)
            tool_context.state["last_doc_id"] = resolved_id
            return doc_payload

        final_error = error
        # Continue trying alternates for 404 only.
        if not error or error.get("status") != 404:
            break

    available_docs = [
        {"id": str(doc.get("id")), "title": str(doc.get("title", ""))}
        for doc in docs
        if doc.get("id")
    ][:10]

    return {
        "error": "Document not found for this project.",
        "requestedDocId": requested_doc_id,
        "attemptedDocIds": attempted_ids,
        "availableDocs": available_docs,
        "hint": "Use list_project_docs() and pass an exact doc id to get_doc_content().",
        "details": final_error,
    }


def list_issues(tool_context: ToolContext, status=None):
    """
    Get all issues (filter by status if needed).
    """
    project_id, user_id = _get_ctx(tool_context)
    url = f"{API_BASE}/api/projects/{project_id}/issues"
    response = requests.get(url, headers=_get_headers(user_id), timeout=REQUEST_TIMEOUT_SECONDS)
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
    response = requests.get(url, headers=_get_headers(user_id), timeout=REQUEST_TIMEOUT_SECONDS)
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
    response = requests.post(
        url, json=payload, headers=_get_headers(user_id), timeout=REQUEST_TIMEOUT_SECONDS
    )
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

    response = requests.put(
        url, json=update_payload, headers=_get_headers(user_id), timeout=REQUEST_TIMEOUT_SECONDS
    )
    response.raise_for_status()
    return response.json()


def get_project_info(tool_context: ToolContext):
    """
    Get project metadata.
    """
    project_id, user_id = _get_ctx(tool_context)
    url = f"{API_BASE}/api/projects/{project_id}"
    response = requests.get(url, headers=_get_headers(user_id), timeout=REQUEST_TIMEOUT_SECONDS)
    response.raise_for_status()
    return response.json()
