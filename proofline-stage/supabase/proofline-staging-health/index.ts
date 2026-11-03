import postgres from "npm:postgres@3.4.7";

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'"
};

function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "GET") return reply(405, { error: "method_not_allowed" });
  if (new URL(req.url).pathname.split("/").pop() !== "health") return reply(404, { error: "not_found" });

  const url = Deno.env.get("SUPABASE_DB_URL");
  if (!url) return reply(503, { state: "sealed", database: "unavailable" });
  // One connection per request, no prepared statements for pooled sessions.
  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 1 });
  try {
    const rows = await sql`
      SELECT
        EXISTS (
          SELECT 1 FROM pg_trigger
          WHERE tgname = 'proofline_custody_append_guard'
            AND tgrelid = 'proofline_private.custody_events'::regclass
            AND tgenabled = 'O'
        ) AS integrity_guard,
        EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'proofline_review_reference_required'
            AND conrelid = 'proofline_private.custody_events'::regclass
        ) AS review_guard,
        (SELECT NOT rolcanlogin FROM pg_roles
         WHERE rolname = 'proofline_stage_login') AS stage_login_disabled
    `;
    const ready = rows.length === 1 &&
      rows[0].integrity_guard === true &&
      rows[0].review_guard === true &&
      rows[0].stage_login_disabled === true;
    return reply(ready ? 200 : 503, {
      service: "proofline-private-staging-diagnostic",
      state: ready ? "sealed_controls_verified" : "sealed_controls_failed",
      customer_intake: "disabled",
      evidence_write_api: "disabled"
    });
  } catch {
    return reply(503, { state: "sealed", database: "unavailable", customer_intake: "disabled" });
  } finally {
    await sql.end({ timeout: 2 }).catch(() => {});
  }
});
