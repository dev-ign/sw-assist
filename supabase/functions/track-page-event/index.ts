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
    const body = await req.json();
    const operation = body.operation as string | undefined;
    const profileId = body.profile_id as string | undefined;
    const linkId = body.link_id as string | undefined;

    if (!operation || !profileId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const ua = req.headers.get("user-agent") ?? "";
    const normalizedDevice = /iphone|ipad|ipod/i.test(ua)
      ? "ios"
      : /android/i.test(ua)
        ? "android"
        : "desktop";

    const referrer = req.headers.get("referer") ?? null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (operation === "create_visit") {
      const allowedSources = new Set([
        "tiktok",
        "instagram",
        "youtube",
        "direct",
      ]);
      const source = allowedSources.has(body.source) ? body.source : "direct";

      const { data, error } = await supabase
        .from("visits")
        .insert({
          profile_id: profileId,
          link_id: linkId ?? null,
          source,
          device: normalizedDevice,
          referrer,
          preferred_platform: body.preferred_platform ?? null,
          visitor_token: body.visitor_token ?? null,
        })
        .select("id")
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ ok: true, visit_id: data.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (operation === "track_event") {
      const visitId = body.visit_id as string | undefined;
      const eventType = body.event_type as string | undefined;

      if (!visitId || !eventType) {
        return new Response(
          JSON.stringify({ error: "Missing required event fields" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      await supabase.from("events").insert({
        visit_id: visitId,
        profile_id: profileId,
        link_id: linkId ?? null,
        event_type: eventType,
        metadata: body.metadata ?? null,
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid operation" }), {
      status: 400,
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
