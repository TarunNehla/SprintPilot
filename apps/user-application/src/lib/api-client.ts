
import { authClient } from "./auth-client";
import type { 
  Project, CreateProjectInput, 
  Document, UpdateDocInput, DocumentWithContent,
  Issue, CreateIssueInput, UpdateIssueInput, IssueWithDescription 
} from "@repo/data-ops/zod-schema/projects";
import type { RagQueryRequest, RagQueryResponse } from "@repo/data-ops/zod-schema/rag";

// Aliases to match previous usage
type RagQueryInput = RagQueryRequest;
type RagResponse = RagQueryResponse;

const BASE_URL = import.meta.env.VITE_DATA_SERVICE_URL || "https://project-copilot-data-service.tarundhillon14330.workers.dev";

async function getAuthToken(): Promise<string | null> {
    const session = await authClient.getSession();
    // Assuming the session object has a token or we use the cookie directly.
    // If better-auth uses cookies, we might not need to set the header manually if credentials='include'
    // But checking the API tests, it expects "Authorization: Bearer <token>"
    // We will try to get the token from the session if available, otherwise rely on cookie.
    // Re-checking auth-client, it is the standard client.
    // For now, let's assume valid session acts as auth or we might need to adjust based on specific better-auth config.
    // IF we need the token string explicitly, usually `session.data?.session.token` or similar.
    return session?.data?.session?.token || null;
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  
  const headers = {
    // Only set JSON content-type if body is NOT FormData
    ...(!(options.body instanceof FormData) && { "Content-Type": "application/json" }),
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  // Handle empty responses
  if (response.status === 204) {
      return {} as T;
  }

  try {
      return await response.json();
  } catch (e) {
      // If JSON parse fails, return the text if expecting something else?
      // For now assume JSON.
      console.warn("Failed to parse JSON response", e);
      return {} as T;
  }
}

export const api = {
  // Projects
  getProjects: () => apiFetch<Project[]>("/api/projects"),
  getProject: (id: string) => apiFetch<Project>(`/api/projects/${id}`),
  createProject: (data: CreateProjectInput) => 
    apiFetch<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Documents
  getProjectDocs: (projectId: string) => 
    apiFetch<Document[]>(`/api/projects/${projectId}/docs`),
  
  createDoc: (projectId: string, data: { file: File; title?: string; docType?: string }) => {
    const formData = new FormData();
    formData.append("file", data.file);
    if (data.title) formData.append("title", data.title);
    if (data.docType) formData.append("docType", data.docType);

    return apiFetch<Document>(`/api/projects/${projectId}/docs`, {
      method: "POST",
      body: formData,
      // NOTE: When using FormData, let the browser set the Content-Type header with the boundary
      // The apiFetch wrapper sets Content-Type to application/json by default, so we need to override it
      headers: {
          // Explicitly removing it so browser sets it
      } as any
    });
  },

  getDoc: (projectId: string, docId: string) =>
    apiFetch<DocumentWithContent>(`/api/projects/${projectId}/docs/${docId}`),

  updateDoc: (projectId: string, docId: string, data: UpdateDocInput) =>
    apiFetch<Document>(`/api/projects/${projectId}/docs/${docId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Issues
  getProjectIssues: (projectId: string) =>
    apiFetch<Issue[]>(`/api/projects/${projectId}/issues`),

  createIssue: (projectId: string, data: CreateIssueInput) =>
    apiFetch<Issue>(`/api/projects/${projectId}/issues`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getIssue: (projectId: string, issueId: string) =>
    apiFetch<IssueWithDescription>(`/api/projects/${projectId}/issues/${issueId}`),

  updateIssue: (projectId: string, issueId: string, data: UpdateIssueInput) =>
    apiFetch<Issue>(`/api/projects/${projectId}/issues/${issueId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Search
  search: (data: RagQueryInput) =>
    apiFetch<RagResponse>("/api/rag/query", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
