import type { Context, Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";

export default async (req: Request, context: Context) => {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });

  const url = new URL(req.url);
  const key = req.headers.get("x-admin-key") || url.searchParams.get("key");
  const adminKey = Netlify.env.get("ADMIN_KEY");

  if (!adminKey || !key || key !== adminKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const db = getDatabase();
  const comments = await db.sql`SELECT * FROM comments ORDER BY created_at DESC LIMIT 300`;
  const pins = await db.sql`SELECT * FROM pins ORDER BY created_at DESC LIMIT 300`;

  return new Response(JSON.stringify({ comments, pins }), {
    headers: { "content-type": "application/json" },
  });
};

export const config: Config = { path: "/api/admin/data" };
