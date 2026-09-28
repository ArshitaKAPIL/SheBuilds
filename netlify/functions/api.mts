import type { Context, Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

async function setup(db: any) {
  await db.sql`CREATE TABLE IF NOT EXISTS comments (id SERIAL PRIMARY KEY, name TEXT NOT NULL, field TEXT, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW())`;
  await db.sql`CREATE TABLE IF NOT EXISTS pins (id SERIAL PRIMARY KEY, person TEXT NOT NULL, title TEXT NOT NULL, place TEXT, country TEXT NOT NULL, lat DOUBLE PRECISION NOT NULL, lon DOUBLE PRECISION NOT NULL, partner TEXT, volunteers INTEGER, reached INTEGER, result TEXT, status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW())`;
}

function isAdmin(req: Request) {
  const url = new URL(req.url);
  const key = req.headers.get("x-admin-key") || url.searchParams.get("key");
  const adminKey = Netlify.env.get("ADMIN_KEY");
  return !!adminKey && !!key && key === adminKey;
}

export default async (req: Request, context: Context) => {
  const path = new URL(req.url).pathname.replace(/\/+$/, "");
  const method = req.method;
  const db = getDatabase();
  await setup(db);

  // ---- Public: list approved comments
  if (path === "/api/comments" && method === "GET") {
    const rows = await db.sql`SELECT id, name, field, body, created_at FROM comments WHERE status = 'approved' ORDER BY created_at DESC LIMIT 200`;
    return json({ comments: rows });
  }

  // ---- Public: submit a comment (held for review)
  if (path === "/api/comments/submit" && method === "POST") {
    let b: any;
    try { b = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    if (b && b.hp) return json({ ok: true });
    const name = String(b?.name || "").trim().slice(0, 80);
    const field = b?.field ? String(b.field).trim().slice(0, 80) : null;
    const text = String(b?.text || "").trim().slice(0, 1200);
    if (!name || !text) return json({ error: "A name and comment are required." }, 400);
    await db.sql`INSERT INTO comments (name, field, body, status) VALUES (${name}, ${field}, ${text}, 'pending')`;
    return json({ ok: true });
  }

  // ---- Public: list approved map pins
  if (path === "/api/pins" && method === "GET") {
    const rows = await db.sql`SELECT id, person, title, place, country, lat, lon, partner, volunteers, reached, result, created_at FROM pins WHERE status = 'approved' ORDER BY created_at ASC LIMIT 500`;
    return json({ pins: rows });
  }

  // ---- Public: submit a map pin (held for review)
  if (path === "/api/pins/submit" && method === "POST") {
    let b: any;
    try { b = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    if (b && b.hp) return json({ ok: true });
    const person = String(b?.person || "").trim().slice(0, 80);
    const title = String(b?.title || "").trim().slice(0, 140);
    const place = b?.place ? String(b.place).trim().slice(0, 120) : null;
    const country = String(b?.country || "").trim().slice(0, 80);
    const lat = Number(b?.lat);
    const lon = Number(b?.lon);
    const partner = b?.partner ? String(b.partner).trim().slice(0, 120) : null;
    const volunteers = b?.volunteers !== "" && b?.volunteers != null ? Math.max(0, Math.min(100000, parseInt(b.volunteers, 10) || 0)) : null;
    const reached = b?.reached !== "" && b?.reached != null ? Math.max(0, Math.min(10000000, parseInt(b.reached, 10) || 0)) : null;
    const result = b?.result ? String(b.result).trim().slice(0, 1200) : null;
    if (!person || !title || !country || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return json({ error: "Name, what you built, and a valid country are required." }, 400);
    }
    await db.sql`INSERT INTO pins (person, title, place, country, lat, lon, partner, volunteers, reached, result, status) VALUES (${person}, ${title}, ${place}, ${country}, ${lat}, ${lon}, ${partner}, ${volunteers}, ${reached}, ${result}, 'pending')`;
    return json({ ok: true });
  }

  // ---- Admin: everything, for the review page
  if (path === "/api/admin/data" && method === "GET") {
    if (!isAdmin(req)) return json({ error: "Unauthorized" }, 401);
    const comments = await db.sql`SELECT * FROM comments ORDER BY created_at DESC LIMIT 300`;
    const pins = await db.sql`SELECT * FROM pins ORDER BY created_at DESC LIMIT 300`;
    return json({ comments, pins });
  }

  // ---- Admin: approve or reject
  if (path === "/api/admin/moderate" && method === "POST") {
    if (!isAdmin(req)) return json({ error: "Unauthorized" }, 401);
    let b: any;
    try { b = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    const { kind, id, action } = b || {};
    if (!["comment", "pin"].includes(kind) || !["approve", "reject"].includes(action) || !id) return json({ error: "Bad request" }, 400);
    const status = action === "approve" ? "approved" : "rejected";
    if (kind === "comment") await db.sql`UPDATE comments SET status = ${status} WHERE id = ${id}`;
    else await db.sql`UPDATE pins SET status = ${status} WHERE id = ${id}`;
    return json({ ok: true });
  }

  return json({ error: "Not found" }, 404);
};

export const config: Config = { path: "/api/*" };
