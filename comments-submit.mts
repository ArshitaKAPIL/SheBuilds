import type { Context, Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Honeypot: bots fill every field, real users never see or fill this one.
  if (body && body.hp) {
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
  }

  const name = String(body?.name || "").trim().slice(0, 80);
  const field = body?.field ? String(body.field).trim().slice(0, 80) : null;
  const text = String(body?.text || "").trim().slice(0, 1200);

  if (!name || !text) {
    return new Response(JSON.stringify({ error: "A name and comment are required." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const db = getDatabase();
  await db.sql`CREATE TABLE IF NOT EXISTS comments (id SERIAL PRIMARY KEY, name TEXT NOT NULL, field TEXT, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW())`;
  await db.sql`
    INSERT INTO comments (name, field, body, status)
    VALUES (${name}, ${field}, ${text}, 'pending')
  `;

  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
};

export const config: Config = { path: "/api/comments/submit" };
