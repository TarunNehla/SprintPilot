interface ExampleWorkflowParmas {
  dataToPassIn;
}

interface Env extends Cloudflare.Env {
  STORAGE: R2Bucket;
  DATABASE_URL: string;
  DOC_INDEXING_QUEUE: Queue;
  AI: Ai;
}
