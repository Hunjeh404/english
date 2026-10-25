import { env } from 'cloudflare:workers';
export function bindings() {
  if (!env.DB || !env.BUCKET) throw new Error('저장 서버를 준비 중입니다. 잠시 후 다시 시도해 주세요.');
  return { db: env.DB, bucket: env.BUCKET };
}
export function mutationGuard(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: '허용되지 않은 요청입니다.' }, { status: 403 });
  return null;
}
export function fail(error: unknown, status = 400) {
  console.error('reading-api', error instanceof Error ? error.name : 'request failed');
  return Response.json({ error: error instanceof Error ? error.message : '요청을 처리하지 못했습니다.' }, { status });
}
export const validId = (id: string) => /^[a-f0-9-]{36}$/i.test(id);
export async function getPassage(db: D1Database, id: string) {
  return db.prepare('SELECT p.*, (SELECT count(*) FROM completions c WHERE c.passage_id=p.id) completed FROM passages p WHERE p.id=? AND p.deleted_at IS NULL').bind(id).first();
}
