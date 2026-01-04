interface ExampleWorkflowParmas {
  dataToPassIn;
}

interface Env extends Cloudflare.Env {
  STORAGE: R2Bucket;
  DATABASE_URL: string;
  DOC_INDEXING_QUEUE: Queue;
  AI: Ai;
  AGENT_SERVICE_URL: string;
  AGENT_SERVICE_SECRET: string;
}
