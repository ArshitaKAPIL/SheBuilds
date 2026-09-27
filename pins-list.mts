import type { Context, Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";

export default async (req: Request, context: Context) => {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
  const db = getDatabase();
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
