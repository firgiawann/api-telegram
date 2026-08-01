// ============================================================
// GET /api/claims — export data klaim untuk analisa
// Admin only (Authorization: Bearer <ADMIN_SECRET>)
//
// Format:
//   ?format=json  (default) → array JSON
//   ?format=csv   → file CSV siap dibuka di Excel/Google Sheets
//   ?limit=100    → maksimal baris (default 100, maks 1000)
// ============================================================
import { dbClaims, dbClaimCount } from "./_lib/db.js";

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!process.env.ADMIN_SECRET || token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const limit = Math.min(Math.max(Number(req.query?.limit) || 100, 1), 1000);
    const claims = await dbClaims(limit);
    const total = await dbClaimCount();

    const format = req.query?.format === "csv" ? "csv" : "json";

    if (format === "csv") {
      const cols = [
        "id", "created_at", "name", "email", "ip", "location",
        "org", "device", "platform", "user_agent", "stock_at_claim",
      ];
      const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const header = cols.join(",");
      const rows = claims.map((c) => cols.map((col) => esc(c[col])).join(","));
      const csv = [header, ...rows].join("\r\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="canva-claims-${new Date().toISOString().slice(0, 10)}.csv"`
      );
      return res.status(200).send(csv);
    }

    return res.status(200).json({ ok: true, total, limit, claims });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
