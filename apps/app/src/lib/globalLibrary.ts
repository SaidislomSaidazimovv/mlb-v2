// Global library client — publish/fetch shared blocks + components, and real avatar upload.
// Server side: `supabase/migrations/*_global_library.sql` (table + RLS + avatars bucket) and the
// `publish-library-item` Edge Function (the §10.3 gate). All calls degrade gracefully when Supabase
// isn't configured or the master isn't signed in (the 🌐 section then shows an empty/"войдите" state).

import { supabase, isSupabaseConfigured } from "./supabase";
import type { Cabinet } from "../model/cabinet";
import type { ComponentLibraryItem } from "../../../../engine/index.js";

export interface GlobalItem {
  id: string;
  kind: "block" | "component";
  author: string;
  author_name: string;
  name: string;
  payload: unknown; // Cabinet (block) | ComponentLibraryItem (component)
  created_at: string;
  avatar_url?: string; // joined from the author's profile (see fetchGlobal)
}

/** A publish result — the §10.3 gate's verdict. `ok:false` always carries a reason, never a bare boolean. */
export type PublishResult = { ok: true; id: string } | { ok: false; code: string; reason: string };

/** Publish a block or component to the global library through the §10.3 gate Edge Function. */
export async function publishToGlobal(kind: "block" | "component", name: string, payload: Cabinet | ComponentLibraryItem): Promise<PublishResult> {
  if (!isSupabaseConfigured || !supabase) return { ok: false, code: "config", reason: "Сервер не настроен" };
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) return { ok: false, code: "auth", reason: "Войдите, чтобы опубликовать" };
  try {
    const { data, error } = await supabase.functions.invoke("publish-library-item", {
      body: { kind, name, payload },
    });
    if (error) {
      // the Edge Function returns { ok:false, code, reason } with a 4xx — surface it, not a generic error
      const ctx = (error as { context?: { body?: unknown } }).context?.body;
      const parsed = typeof ctx === "string" ? safeJson(ctx) : ctx;
      if (parsed && typeof parsed === "object" && "reason" in parsed) return parsed as PublishResult;
      return { ok: false, code: "network", reason: error.message };
    }
    return data as PublishResult;
  } catch (e) {
    return { ok: false, code: "network", reason: e instanceof Error ? e.message : "Ошибка сети" };
  }
}

/** Fetch every published item of a kind (newest first), each with its author's avatar. */
async function fetchGlobal(kind: "block" | "component"): Promise<GlobalItem[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from("global_library")
    .select("id, kind, author, author_name, name, payload, created_at")
    .eq("kind", kind)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  const items = data as GlobalItem[];
  // join the authors' avatars in one round-trip (profiles is RLS-own-read, so this returns only avatars
  // the viewer is allowed to see; a missing avatar falls back to initials in the card)
  const authors = [...new Set(items.map((i) => i.author))];
  if (authors.length) {
    const { data: profs } = await supabase.from("profiles").select("id, avatar_url").in("id", authors);
    const byId = new Map((profs ?? []).map((p) => [p.id as string, p.avatar_url as string]));
    for (const it of items) it.avatar_url = byId.get(it.author) || undefined;
  }
  return items;
}

export const fetchGlobalBlocks = () => fetchGlobal("block");
export const fetchGlobalComponents = () => fetchGlobal("component");

/** Delete one of MY published items (RLS enforces author-only). */
export async function deleteGlobal(id: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { error } = await supabase.from("global_library").delete().eq("id", id);
  return !error;
}

/** Upload a real avatar photo → Storage `avatars/{uid}/…` → save its public URL on the profile. */
export async function uploadAvatar(file: File): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return null;
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${uid}/avatar.${ext}`; // one photo per master; RLS lets a master write only into their own uid folder
  const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
  if (up.error) return null;
  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = `${pub.publicUrl}?v=${Date.now()}`; // cache-bust so a re-upload shows immediately
  await supabase.from("profiles").update({ avatar_url: url }).eq("id", uid);
  return url;
}

/** Initials + a stable colour from a name — the avatar fallback when there's no photo. */
export function initialsAvatar(name: string): { text: string; color: string } {
  const t = (name || "?").trim();
  const text = (t.split(/\s+/).map((w) => w[0]).join("").slice(0, 2) || "?").toUpperCase();
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
  return { text, color: `hsl(${h % 360} 55% 45%)` };
}

function safeJson(s: string): unknown { try { return JSON.parse(s); } catch { return null; } }
