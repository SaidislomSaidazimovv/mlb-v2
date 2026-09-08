import type { ComponentLibraryItem } from "../contract/design";
import { PUBLISH_ENDPOINT, SUPABASE_ANON_KEY } from "../config";

export interface PublishResult {
  ok: boolean;
  id?: string;
  code?: string;
  reason?: string;
}

export interface PublishOptions {
  token?: string | null;
  fetchFn?: typeof fetch;
}

export async function publishToGlobal(item: ComponentLibraryItem, name: string, opts: PublishOptions = {}): Promise<PublishResult> {
  const token = opts.token ?? null;
  if (!token) return { ok: false, code: "auth", reason: "Войдите в приложении" };
  const f = opts.fetchFn ?? fetch;
  try {
    const res = await f(PUBLISH_ENDPOINT, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ kind: "component", name, payload: item })
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string; code?: string; reason?: string };
    if (res.ok && json.ok) return { ok: true, id: json.id };
    return { ok: false, code: json.code ?? String(res.status), reason: json.reason ?? "Ошибка публикации" };
  } catch (err) {
    return { ok: false, code: "network", reason: (err as Error).message };
  }
}
