import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { profile_id, event_type, link_id } = await req.json();

    if (!profile_id || !event_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Basic device detection from User-Agent
    const ua = req.headers.get("user-agent") ?? "";
    const device = /mobile|android|iphone|ipad/i.test(ua)
      ? "mobile"
      : "desktop";

    // Referrer
    const referrer = req.headers.get("referer") ?? null;

    // Country from Cloudflare header (available in Supabase edge runtime)
    const country = req.headers.get("cf-ipcountry") ?? null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await supabase.from("page_analytics").insert({
      profile_id,
      event_type,
      link_id: link_id ?? null,
      referrer,
      country,
      device,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    // Always return 200 — tracking must never break the user experience
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
