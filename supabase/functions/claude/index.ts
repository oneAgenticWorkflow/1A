// Admin-only proxy to the Anthropic API. The API key lives in a Supabase secret, never in the website.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return json({ error: "Not signed in" }, 401);
  const { data: prof } = await sb.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
  if (prof?.role !== "admin") return json({ error: "Admins only" }, 403);

  let body: { prompt?: string; tier?: string };
  try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }
  const prompt = String(body.prompt ?? "");
  if (!prompt || prompt.length > 250_000) return json({ error: "Prompt missing or too long" }, 400);

  const model = body.tier === "complex"
    ? (Deno.env.get("CLAUDE_MODEL_COMPLEX") ?? "claude-opus-5-5")
    : (Deno.env.get("CLAUDE_MODEL_DEFAULT") ?? "claude-sonnet-5-5");

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, max_tokens: 8000, messages: [{ role: "user", content: prompt }] }),
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) return json({ error: out?.error?.message ?? `Anthropic returned ${r.status}` }, r.status === 429 ? 429 : 502);
  const text = (out.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
  return json({ text });
});
