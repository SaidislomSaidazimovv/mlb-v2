import { describe, it, expect } from "vitest";
import { publishToGlobal } from "./global";
import type { ComponentLibraryItem } from "../contract/design";

const item = { componentId: "c1", version: 1, name: "Demo" } as unknown as ComponentLibraryItem;

const mkFetch = (status: number, body: unknown): typeof fetch =>
  (async () => ({ ok: status >= 200 && status < 300, status, json: async () => body })) as unknown as typeof fetch;

describe("publishToGlobal", () => {
  it("token yo'q → auth xato, fetch chaqirilmaydi", async () => {
    let called = false;
    const f = (async () => {called = true;return { ok: true, status: 200, json: async () => ({}) };}) as unknown as typeof fetch;
    const r = await publishToGlobal(item, "Demo", { token: null, fetchFn: f });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("auth");
    expect(called).toBe(false);
  });

  it("200 ok → id qaytaradi", async () => {
    const r = await publishToGlobal(item, "Demo", { token: "jwt", fetchFn: mkFetch(200, { ok: true, id: "uuid-1" }) });
    expect(r.ok).toBe(true);
    expect(r.id).toBe("uuid-1");
  });

  it("4xx → code+reason qaytaradi", async () => {
    const r = await publishToGlobal(item, "Demo", { token: "jwt", fetchFn: mkFetch(403, { ok: false, code: "slot", reason: "нет слотов" }) });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("slot");
    expect(r.reason).toBe("нет слотов");
  });

  it("kind/name/payload + Bearer to'g'ri yuboriladi", async () => {
    let captured: { url?: unknown; init?: RequestInit } = {};
    const f = (async (url: unknown, init: RequestInit) => {captured = { url, init };return { ok: true, status: 200, json: async () => ({ ok: true, id: "z" }) };}) as unknown as typeof fetch;
    await publishToGlobal(item, "MyComp", { token: "JWT123", fetchFn: f });
    const body = JSON.parse(captured.init!.body as string);
    expect(body.kind).toBe("component");
    expect(body.name).toBe("MyComp");
    expect(body.payload.componentId).toBe("c1");
    const headers = captured.init!.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer JWT123");
  });
});
