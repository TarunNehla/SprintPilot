/**
 * R2 Storage Helper Functions
 * Key structure: projects/{projectId}/{type}s/{id}/v1.json
 */

export interface DocContent {
  title: string;
  content: string;
  type: string;
}

export interface IssueDescription {
  title: string;
  description: string;
}

/**
 * Build R2 key for document content
 */
export function buildDocKey(projectId: string, docId: string): string {
  return `projects/${projectId}/docs/${docId}/v1.json`;
}

/**
 * Build R2 key for issue description
 */
export function buildIssueKey(projectId: string, issueId: string): string {
  return `projects/${projectId}/issues/${issueId}/description.json`;
}

/**
 * Store document content in R2
 */
export async function putDocContent(
  bucket: R2Bucket,
  projectId: string,
  docId: string,
  content: DocContent
): Promise<string> {
  const key = buildDocKey(projectId, docId);
  await bucket.put(key, JSON.stringify(content), {
    httpMetadata: {
      contentType: "application/json",
    },
  });
  return key;
}

/**
 * Retrieve document content from R2
 */
export async function getDocContent(
  bucket: R2Bucket,
  projectId: string,
  docId: string
): Promise<DocContent | null> {
  const key = buildDocKey(projectId, docId);
  const object = await bucket.get(key);

  if (!object) {
    return null;
  }

  const text = await object.text();
  return JSON.parse(text) as DocContent;
}

/**
 * Store issue description in R2
 */
export async function putIssueDescription(
  bucket: R2Bucket,
  projectId: string,
  issueId: string,
  data: IssueDescription
): Promise<string> {
  const key = buildIssueKey(projectId, issueId);
  await bucket.put(key, JSON.stringify(data), {
    httpMetadata: {
      contentType: "application/json",
    },
  });
  return key;
}

/**
 * Retrieve issue description from R2
 */
export async function getIssueDescription(
  bucket: R2Bucket,
  projectId: string,
  issueId: string
): Promise<IssueDescription | null> {
  const key = buildIssueKey(projectId, issueId);
  const object = await bucket.get(key);

  if (!object) {
    return null;
  }

  const text = await object.text();
  return JSON.parse(text) as IssueDescription;
}

/**
 * Delete object from R2
 */
export async function deleteObject(bucket: R2Bucket, key: string): Promise<void> {
  await bucket.delete(key);
}

/**
 * List objects in R2 with optional prefix
 */
export async function listObjects(
  bucket: R2Bucket,
  prefix?: string
): Promise<string[]> {
  const listed = await bucket.list({ prefix });
  return listed.objects.map(obj => obj.key);
}
