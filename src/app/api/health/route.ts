import { connection } from "next/server";

/** Liveness probe for Render's health check. Rendered per request so it reflects the running instance. */
export async function GET() {
  await connection();
  return Response.json({ status: "ok", uptimeS: Math.round(process.uptime()) }, { headers: { "Cache-Control": "no-store" } });
}
