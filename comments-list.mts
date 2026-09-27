import type { Context, Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";

export default async (req: Request, context: Context) => {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
  const db = getDatabase();
  const rows = await db.sql`
    SELECT id, name, field, body, created_at
    FROM comments
    WHERE status = 'approved'
    ORDER BY created_at DESC
    LIMIT 200
  `;
  return new Response(JSON.stringify({ comments: rows }), {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=30" },
  });
};

export const config: Config = { path: "/api/comments" };
