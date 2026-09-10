// B — parity PDF + HTML (screenshot manbasi) hosil bo'lishi testi.
import { describe, it, expect } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { buildParityPdf } from "./pdf";
import { buildParityHtml } from "./html";
import { FURNITURES } from "./furnitures";

const ROOT = "F:/Main and Private/mebelchi-v2/docs/parity";

describe("parity deliverable", () => {
  it("10 mebel PDF (%PDF, >1KB) → docs/parity/parity.pdf", () => {
    const bytes = buildParityPdf(FURNITURES);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!, bytes[4]!)).toBe("%PDF-");
    mkdirSync(ROOT, { recursive: true });
    writeFileSync(`${ROOT}/parity.pdf`, bytes);
  });

  it("HTML (screenshot manbasi) → docs/parity/parity.html", () => {
    const html = buildParityHtml(FURNITURES);
    expect(html).toContain("<svg");
    expect(html.match(/class="card"/g)?.length).toBe(FURNITURES.length);
    writeFileSync(`${ROOT}/parity.html`, html);
  });
});
