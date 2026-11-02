import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !serviceKey || !anonKey) {
      return json({ error: "Server environment is not configured." }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Sign in as an admin first." }, 401);
    }
    const callerClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: callerData, error: callerError } = await callerClient.auth.getUser(authHeader.slice(7));
    if (callerError || !callerData.user) {
      return json({ error: "Your session is invalid. Please sign in again." }, 401);
    }

    const adminClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from("profiles")
      .select("id,role,active")
      .eq("id", callerData.user.id)
      .maybeSingle();
    if (callerProfileError || !callerProfile?.active || callerProfile.role !== "admin") {
      return json({ error: "Only an active admin can update household accounts." }, 403);
    }

    const body = await req.json();
    const id = typeof body.id === "string" ? body.id : "";
    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const rent = Number(body.rent ?? 0);
    const role = body.role === "admin" ? "admin" : body.role === "member" ? "member" : "";

    if (!id || !fullName || !username || !role) {
      return json({ error: "Member ID, full name, user ID, and role are required." }, 400);
    }
    if (password && password.length < 6) {
      return json({ error: "Password must be at least 6 characters." }, 400);
    }
    if (!Number.isFinite(rent) || rent < 0) {
      return json({ error: "Monthly rent must be a valid non-negative amount." }, 400);
    }
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
      return json({ error: "User ID must be 3–32 characters and may contain letters, numbers, dot, underscore, or hyphen." }, 400);
    }

    const { data: existingProfile, error: existingProfileError } = await adminClient
      .from("profiles")
      .select("id,full_name,username,rent,role")
      .eq("id", id)
      .maybeSingle();
    if (existingProfileError) return json({ error: "Could not load the member profile." }, 500);
    if (!existingProfile) return json({ error: "Member account was not found." }, 404);

    const { data: existingUsername, error: usernameError } = await adminClient
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .neq("id", id)
      .maybeSingle();
    if (usernameError) return json({ error: "Could not validate the User ID." }, 500);
    if (existingUsername) return json({ error: "This User ID is already in use." }, 409);

    const updatedProfile = { full_name: fullName, username, rent, role };
    const { error: profileUpdateError } = await adminClient
      .from("profiles")
      .update(updatedProfile)
      .eq("id", id);
    if (profileUpdateError) return json({ error: `Could not update member profile: ${profileUpdateError.message}` }, 400);

    if (password) {
      const { error: passwordUpdateError } = await adminClient.auth.admin.updateUserById(id, { password });
      if (passwordUpdateError) {
        const { error: rollbackError } = await adminClient
          .from("profiles")
          .update({
            full_name: existingProfile.full_name,
            username: existingProfile.username,
            rent: existingProfile.rent,
            role: existingProfile.role,
          })
          .eq("id", id);
        if (rollbackError) {
          console.error("Could not roll back member profile after password update failed:", rollbackError);
          return json({ error: `Password update failed and profile rollback also failed: ${rollbackError.message}` }, 500);
        }
        return json({ error: `Could not update password: ${passwordUpdateError.message}` }, 400);
      }
    }

    return json({ ok: true });
  } catch (error) {
    console.error("Admin member update failed:", error);
    return json({ error: error instanceof Error ? error.message : "Unable to update member." }, 400);
  }
});
