export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { env } = await import("cloudflare:workers");
  const key = new URL(request.url).searchParams.get("key");
  if (!key || key.includes("..") || !env.BUCKET) return new Response("Not found", { status: 404 });
  const object = await env.BUCKET.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers(); object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "private, max-age=3600");
  headers.set("ETag", object.httpEtag);
  return new Response(object.body, { headers });
}
