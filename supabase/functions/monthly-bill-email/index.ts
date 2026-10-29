import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return new Response(JSON.stringify({ error: "Missing Supabase secrets" }), { status: 500 });
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  // Compute previous complete month. Actual source-schema queries, member-specific
  // calculations, PDF rendering, Resend delivery, and run-log upsert must be mapped
  // before production; this endpoint intentionally refuses to send incorrect bills.
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()-1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  return new Response(JSON.stringify({
    status: "setup_required", bill_month: start.toISOString().slice(0,10),
    period_end: end.toISOString().slice(0,10),
    message: "Schedule scaffold is deployed; wire the app-specific accounting, PDF, and email steps before enabling delivery."
  }), { status: 501, headers: { "Content-Type": "application/json" } });
});
