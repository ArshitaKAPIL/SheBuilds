import type { Context, Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const key = req.headers.get("x-admin-key");
  const adminKey = Netlify.env.get("ADMIN_KEY");
  if (!adminKey || !key || key !== adminKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const { kind, id, action } = body || {};
  if (!["comment", "pin"].includes(kind) || !["approve", "reject"].includes(action) || !id) {
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const status = action === "approve" ? "approved" : "rejected";
  const db = getDatabase();
  await db.sql`CREATE TABLE IF NOT EXISTS comments (id SERIAL PRIMARY KEY, name TEXT NOT NULL, field TEXT, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW())`;
  await db.sql`CREATE TABLE IF NOT EXISTS pins (id SERIAL PRIMARY KEY, person TEXT NOT NULL, title TEXT NOT NULL, place TEXT, country TEXT NOT NULL, lat DOUBLE PRECISION NOT NULL, lon DOUBLE PRECISION NOT NULL, partner TEXT, volunteers INTEGER, reached INTEGER, result TEXT, status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW())`;
  if (kind === "comment") {
    await db.sql`UPDATE comments SET status = ${status} WHERE id = ${id}`;
  } else {
    await db.sql`UPDATE pins SET status = ${status} WHERE id = ${id}`;
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
};

export const config: Config = { path: "/api/admin/moderate" };
