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

  if (body && body.hp) {
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
  }

  const person = String(body?.person || "").trim().slice(0, 80);
  const title = String(body?.title || "").trim().slice(0, 140);
  const place = body?.place ? String(body.place).trim().slice(0, 120) : null;
  const country = String(body?.country || "").trim().slice(0, 80);
  const lat = Number(body?.lat);
  const lon = Number(body?.lon);
  const partner = body?.partner ? String(body.partner).trim().slice(0, 120) : null;
  const volunteers = body?.volunteers !== "" && body?.volunteers != null ? Math.max(0, Math.min(100000, parseInt(body.volunteers, 10) || 0)) : null;
  const reached = body?.reached !== "" && body?.reached != null ? Math.max(0, Math.min(10000000, parseInt(body.reached, 10) || 0)) : null;
  const result = body?.result ? String(body.result).trim().slice(0, 1200) : null;

  if (!person || !title || !country || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return new Response(JSON.stringify({ error: "Name, what you built, and a valid country are required." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const db = getDatabase();
  await db.sql`CREATE TABLE IF NOT EXISTS pins (id SERIAL PRIMARY KEY, person TEXT NOT NULL, title TEXT NOT NULL, place TEXT, country TEXT NOT NULL, lat DOUBLE PRECISION NOT NULL, lon DOUBLE PRECISION NOT NULL, partner TEXT, volunteers INTEGER, reached INTEGER, result TEXT, status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW())`;
  await db.sql`
    INSERT INTO pins (person, title, place, country, lat, lon, partner, volunteers, reached, result, status)
    VALUES (${person}, ${title}, ${place}, ${country}, ${lat}, ${lon}, ${partner}, ${volunteers}, ${reached}, ${result}, 'pending')
  `;

  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
};

export const config: Config = { path: "/api/pins/submit" };
