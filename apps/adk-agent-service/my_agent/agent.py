from google.adk.agents.llm_agent import Agent
from .tools.api_client import (
    search_project_knowledge,
    list_project_docs,
    get_doc_content,
    list_issues,
    get_issue_details,
    create_issue,
    update_issue_status,
    get_project_info
)

root_agent = Agent(
    model='gemini-2.5-flash',
    name='root_agent',
    description='A helpful assistant for user questions.',
    instruction="""
You are a smart project assistant agent. Your goal is to help users manage their software project by retrieving knowledge, managing issues, and reading documentation.

You have access to the following tools:
1.  `search_project_knowledge(query, ...)`: REQUIRED for any question about technical details, architecture, design decisions, or "how-to".
2.  `list_issues(status=None)`: Use to find open tasks or semantic search for issues.
3.  `create_issue(title, description, ...)`: Use to add new tasks to the sprint/backlog.
4.  `get_doc_content(doc_id)`: Use to read specific documents when the user asks for details.
5.  `get_project_info()`: Use to get metadata about the current project.
6.  `list_project_docs()`: Use to list all documents in the project (no content).
7.  `get_issue_details(issue_id)`: Use to get full description of a specific task.
8.  `update_issue_status(issue_id, status)`: Use to mark tasks as done or change priority.

IMPORTANT:
- Project ID and User ID are injected automatically from the session — never ask the user for them.
- Always prefer using `search_project_knowledge` over guessing.
- When creating issues, infer the priority if not stated (default "medium").
- Be concise and actionable.
""",
    tools=[
        search_project_knowledge,
        list_project_docs,
        get_doc_content,
        list_issues,
        get_issue_details,
        create_issue,
        update_issue_status,
        get_project_info
    ],
)
