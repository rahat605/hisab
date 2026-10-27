import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  try {
    const { username } = await req.json();
    if (typeof username !== "string" || !username.trim()) {
      return new Response(JSON.stringify({ error: "Username is required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: profile } = await adminClient.from("profiles")
      .select("id,active").ilike("username", username.trim()).maybeSingle();

    // Generic success response avoids disclosing whether the username exists.
    if (profile?.active) {
      const { data: userData } = await adminClient.auth.admin.getUserById(profile.id);
      const email = userData.user?.email;
      if (email) {
        const publicClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
        await publicClient.auth.resetPasswordForEmail(email, {
          redirectTo: Deno.env.get("PASSWORD_RESET_REDIRECT_URL") || undefined,
        });
      }
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
