import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !serviceKey || !anonKey) return json({ error: "Server environment is not configured." }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Sign in as an admin first." }, 401);
    const accessToken = authHeader.slice(7);

    const callerClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: callerData, error: callerError } = await callerClient.auth.getUser(accessToken);
    if (callerError || !callerData.user) return json({ error: "Your session is invalid. Please sign in again." }, 401);

    const adminClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: callerProfile, error: profileError } = await adminClient
      .from("profiles").select("id, role, active").eq("id", callerData.user.id).maybeSingle();
    if (profileError || !callerProfile?.active || callerProfile.role !== "admin") {
      return json({ error: "Only an active admin can create household accounts." }, 403);
    }

    const body = await req.json();
    const full_name = typeof body.full_name === "string" ? body.full_name.trim() : "";
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const rent = Number(body.rent ?? 0);
    const role = body.role === "admin" ? "admin" : "member";

    if (!full_name || !username || !email || !password) return json({ error: "Full name, user ID, email, and password are required." }, 400);
    if (password.length < 6) return json({ error: "Password must be at least 6 characters." }, 400);
    if (!Number.isFinite(rent) || rent < 0) return json({ error: "Monthly rent must be a valid non-negative amount." }, 400);
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) return json({ error: "User ID must be 3–32 characters and may contain letters, numbers, dot, underscore, or hyphen." }, 400);

    const { data: existingUsername, error: usernameCheckError } = await adminClient
      .from("profiles").select("id").ilike("username", username).maybeSingle();
    if (usernameCheckError) return json({ error: "Could not validate the User ID." }, 500);
    if (existingUsername) return json({ error: "This User ID is already in use." }, 409);

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, username },
    });
    if (createError || !created.user) {
      const message = createError?.message || "Could not create the authentication account.";
      return json({ error: message.includes("already been registered") ? "This email address is already registered." : message }, 400);
    }

    const { error: insertError } = await adminClient.from("profiles").insert({
      id: created.user.id,
      full_name,
      username,
      role,
      active: true,
      rent,
    });
    if (insertError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return json({ error: insertError.code === "23505" ? "This User ID is already in use." : "Account was created but profile setup failed; the temporary account was rolled back. " + insertError.message }, 400);
    }

    return json({ ok: true, user: { id: created.user.id, full_name, username, email, role, rent, active: true } }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to create member." }, 400);
  }
});
