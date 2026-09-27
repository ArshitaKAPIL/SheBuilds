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
  await db.sql`CREATE TABLE IF NOT EXISTS comments (id SERIAL PRIMARY KEY, name TEXT NOT NULL, field TEXT, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW())`;
  await db.sql`CREATE TABLE IF NOT EXISTS pins (id SERIAL PRIMARY KEY, person TEXT NOT NULL, title TEXT NOT NULL, place TEXT, country TEXT NOT NULL, lat DOUBLE PRECISION NOT NULL, lon DOUBLE PRECISION NOT NULL, partner TEXT, volunteers INTEGER, reached INTEGER, result TEXT, status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW())`;
  const comments = await db.sql`SELECT * FROM comments ORDER BY created_at DESC LIMIT 300`;
  const pins = await db.sql`SELECT * FROM pins ORDER BY created_at DESC LIMIT 300`;

  return new Response(JSON.stringify({ comments, pins }), {
    headers: { "content-type": "application/json" },
  });
};

export const config: Config = { path: "/api/admin/data" };
