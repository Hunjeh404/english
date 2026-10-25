declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}

declare module "*?worker" { const WorkerFactory: { new(): Worker }; export default WorkerFactory; }
