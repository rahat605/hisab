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
    const { username, password } = await req.json();
    if (typeof username !== "string" || typeof password !== "string" ||
        username.trim().length < 1 || password.length < 1) {
      return new Response(JSON.stringify({ error: "Username and password are required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The service-role key is used only inside this server-side function, never in the browser.
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, username, active")
      .ilike("username", username.trim())
      .maybeSingle();

    // Use a generic response to avoid revealing whether a username exists.
    if (profileError || !profile || !profile.active) {
      return new Response(JSON.stringify({ error: "Invalid username or password." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(profile.id);
    const email = userData.user?.email;
    if (userError || !email) {
      return new Response(JSON.stringify({ error: "Account is not configured. Contact the admin." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate the password using Supabase Auth, not by reading/storing a plaintext password.
    const publicClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: signedIn, error: signInError } = await publicClient.auth.signInWithPassword({ email, password });
    if (signInError || !signedIn.session) {
      return new Response(JSON.stringify({ error: "Invalid username or password." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      access_token: signedIn.session.access_token,
      refresh_token: signedIn.session.refresh_token,
      expires_in: signedIn.session.expires_in,
      token_type: signedIn.session.token_type,
      user: { id: profile.id, username: profile.username },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ error: "Unable to sign in. Try again." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
