import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth: extract user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch artist profile
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("artist_name, genre, location, bio, goals")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.artist_name) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context for Claude
    const genreStr =
      Array.isArray(profile.genre) && profile.genre.length
        ? profile.genre.join(", ")
        : null;

    const contextLines = [
      `Artist name: ${profile.artist_name}`,
      genreStr && `Genre: ${genreStr}`,
      profile.location && `Based in: ${profile.location}`,
      profile.bio && `Bio: ${profile.bio}`,
    ]
      .filter(Boolean)
      .join("\n");

    // Generate headline via Claude Haiku
    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
    });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 120,
      messages: [
        {
          role: "user",
          content: `You are a music industry publicist. Write ONE compelling EPK headline for the following artist.
The headline should be 1–2 sentences: engaging, press-ready, and specific to their sound and story.
Return only the headline text — no quotes, no preamble.

${contextLines}`,
        },
      ],
    });

    const headline =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";

    return new Response(JSON.stringify({ headline }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Failed to generate headline" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
