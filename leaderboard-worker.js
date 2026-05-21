// 5-5-5 Perfect Club Leaderboard Worker
const BANNED_WORDS = ["fuck", "shit", "cunt", "dick", "cock", "bitch", "arse", "ass", "fag", "slut", "twat", "wank", "piss", "bastard"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400", // Cache preflight response for 24 hours
};

function containsProfanity(name) {
  const lower = name.toLowerCase();
  return BANNED_WORDS.some(word => lower.includes(word));
}

export default {
  async fetch(request, env) {
    // 1. Handle CORS preflight requests immediately
    if (request.method === "OPTIONS") {
      return new Response(null, { 
        status: 204, 
        headers: corsHeaders 
      });
    }

    try {
      const url = new URL(request.url);

      // GET /scores — return all leaderboard entries
      if (request.method === "GET" && url.pathname === "/scores") {
        // Safe check to make sure KV is actually bound
        if (!env.LEADERBOARD) {
          throw new Error("KV namespace 'LEADERBOARD' is not bound correctly in wrangler.toml");
        }

        const data = await env.LEADERBOARD.get("entries");
        const entries = data ? JSON.parse(data) : [];
        return new Response(JSON.stringify(entries), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // POST /submit — submit a new perfect score
      if (request.method === "POST" && url.pathname === "/submit") {
        if (!env.LEADERBOARD) {
          throw new Error("KV namespace 'LEADERBOARD' is not bound correctly in wrangler.toml");
        }

        let body;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { name, gameMode, time } = body;

        // Validate name
        if (!name || typeof name !== "string") {
          return new Response(JSON.stringify({ error: "Name is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (name.trim().length === 0 || name.trim().length > 10) {
          return new Response(JSON.stringify({ error: "Name must be 1-10 characters" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (containsProfanity(name)) {
          return new Response(JSON.stringify({ error: "Name contains disallowed words" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!gameMode || !time) {
          return new Response(JSON.stringify({ error: "Missing fields" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Build new entry
        const newEntry = {
          name: name.trim().slice(0, 10),
          gameMode,
          time: parseFloat(time).toFixed(2),
          date: new Date().toLocaleDateString("en-GB"),
        };

        // Load existing entries and append
        const data = await env.LEADERBOARD.get("entries");
        const entries = data ? JSON.parse(data) : [];
        entries.push(newEntry);

        // Sort by time ascending (fastest first)
        entries.sort((a, b) => parseFloat(a.time) - parseFloat(b.time));

        // Keep only top 100 entries
        const trimmed = entries.slice(0, 100);

        await env.LEADERBOARD.put("entries", JSON.stringify(trimmed));

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 404 Fallback
      return new Response(JSON.stringify({ error: "Not found" }), { 
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });

    } catch (err) {
      // If ANYTHING crashes, catch it and return it with CORS headers so your browser can read it
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};