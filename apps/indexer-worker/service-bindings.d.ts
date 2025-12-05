interface Env extends Cloudflare.Env {
  STORAGE: R2Bucket;
  DATABASE_URL: string;
  AI: Ai;
}
