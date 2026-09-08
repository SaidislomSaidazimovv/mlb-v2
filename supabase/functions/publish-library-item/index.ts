// Edge Function · publish-library-item — the §10.3 publish gate for the global library.
//
// A master (App-2 OR App-3) POSTs a block/component here with their auth token. The gate runs the
// server-authoritative checks, then inserts with the service_role. It NEVER auto-fixes — a rejection
// returns { code, reason } (a ComponentGateFailure), never a bare boolean.
//
// §10.3 (APP3_CONTRACT §10): schema → slot → decomposition → invariant → profile-swap → ad-integrity.
//   • schema / slot           — validated here (kind, name, payload shape, schemaVersion, requiredSlots).
//   • decomposition / invariant — the App-2 CLIENT runs the engine pre-check (previewParts / solveFull)
//     BEFORE calling this, so the master sees the reason instantly; the deep engine gate is a v2 (bundling
//     the engine for Deno). Here we re-check the cheap structural invariants so a forged payload can't slip.
//   • profile-swap            — App-3's rule (stub: pass in v1; APP3_HANDOFF_GLOBAL asks App-3 for it).
//   • ad-integrity            — DB_37 §3.6; no marketplace yet → N/A (pass).
//
// Deploy: supabase functions deploy publish-library-item
// Secrets it needs (set once): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (server-only, never shipped to a client).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  // supabase-js's functions.invoke sends apikey + x-client-info too — they MUST be allowed or the browser
  // preflight fails with "Failed to send a request to the Edge Function".
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const fail = (code: string, reason: string, status = 400) =>
  new Response(JSON.stringify({ ok: false, code, reason }), { status, headers: { ...cors, "content-type": "application/json" } });
const ok = (id: string) =>
  new Response(JSON.stringify({ ok: true, id }), { status: 200, headers: { ...cors, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail("method", "POST only", 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  // 1) AUTH — who is publishing (from the caller's JWT)
  const asUser = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await asUser.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return fail("auth", "Требуется вход (не авторизован)", 401);

  // 2) BODY
  let body: { kind?: string; name?: string; payload?: unknown };
  try { body = await req.json(); } catch { return fail("schema", "Тело запроса — не JSON"); }
  const { kind, name, payload } = body;

  // 3) §10.3 · schema
  if (kind !== "block" && kind !== "component") return fail("schema", "kind должен быть 'block' или 'component'");
  if (!name || typeof name !== "string") return fail("schema", "Пустое имя");
  if (!payload || typeof payload !== "object") return fail("schema", "Отсутствует payload");

  // 3b) component-specific: schemaVersion known + requiredSlots present (§10.3 schema+slot)
  if (kind === "component") {
    const c = payload as Record<string, unknown>;
    if (c.schemaVersion !== 1) return fail("schema", "Неизвестная версия компонента (schemaVersion ≠ 1) — отклонено, не угадываем");
    if (!Array.isArray(c.requiredSlots)) return fail("slot", "У компонента нет requiredSlots");
    if (!c.root || typeof c.root !== "object") return fail("decomposition", "У компонента нет root (нечего раскроить)");
    // §10.1 — ONLY App-3 publishes components. A ComponentLibraryItem has root ≠ cabinet; root.kind=cabinet
    // is a BLOCK (App-2's DesignBlock), never a component. This makes the wrong shape impossible server-side,
    // so App-2 can never publish a component even via a forged call.
    if ((c.root as { kind?: string }).kind === "cabinet") return fail("schema", "root.kind=cabinet — это блок (App-2), не компонент (§10.1). Компоненты публикует только App-3.");
  }
  // §10.1 — a block is App-2's Cabinet: base/tall/upper + w/h. Reject a component-shaped payload sent as a block.
  if (kind === "block") {
    const c = payload as Record<string, unknown>;
    if (c.schemaVersion !== undefined || c.root !== undefined) return fail("schema", "Похоже на компонент (schemaVersion/root), а не на блок App-2 (§10.1).");
  }

  // 4) §10.3 · profile-swap (App-3 rule) — STUB v1: pass. See APP3_HANDOFF_GLOBAL.md.
  // 5) §10.3 · ad-integrity (DB_37 §3.6) — no marketplace → N/A, pass.

  // 6) author_name snapshot (from the profile)
  const admin = createClient(url, service);
  const { data: prof } = await admin.from("profiles").select("name").eq("id", user.id).maybeSingle();
  const authorName = (prof?.name as string) || (user.email ?? "").split("@")[0] || "Мастер";

  // 7) INSERT (service_role — the gate has passed)
  const { data, error } = await admin.from("global_library").insert({
    kind, author: user.id, author_name: authorName, name, payload, gate_passed: true,
  }).select("id").single();
  if (error) return fail("insert", `Ошибка сервера: ${error.message}`, 500);

  return ok(data.id as string);
});
