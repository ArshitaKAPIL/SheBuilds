import type { Context, Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";

export default async (req: Request, context: Context) => {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
  const db = getDatabase();
  await db.sql`CREATE TABLE IF NOT EXISTS pins (id SERIAL PRIMARY KEY, person TEXT NOT NULL, title TEXT NOT NULL, place TEXT, country TEXT NOT NULL, lat DOUBLE PRECISION NOT NULL, lon DOUBLE PRECISION NOT NULL, partner TEXT, volunteers INTEGER, reached INTEGER, result TEXT, status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW())`;
  const rows = await db.sql`
    SELECT id, person, title, place, country, lat, lon, partner, volunteers, reached, result, created_at
    FROM pins
    WHERE status = 'approved'
    ORDER BY created_at ASC
    LIMIT 500
  `;
  return new Response(JSON.stringify({ pins: rows }), {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=30" },
  });
};

export const config: Config = { path: "/api/pins" };
