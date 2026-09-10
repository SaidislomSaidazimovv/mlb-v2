// B — parity PDF + HTML (screenshot manbasi): 10 BUTUN OSHXONA.
import { describe, it, expect } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { buildParityPdf } from "./pdf";
import { buildParityHtml } from "./html";
import { KITCHENS } from "./kitchens";

const ROOT = "F:/Main and Private/mebelchi-v2/docs/parity";

describe("parity deliverable (10 oshxona)", () => {
  it("PDF (%PDF, >1KB) → docs/parity/parity.pdf", () => {
    const bytes = buildParityPdf(KITCHENS);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!, bytes[4]!)).toBe("%PDF-");
    mkdirSync(ROOT, { recursive: true });
    writeFileSync(`${ROOT}/parity.pdf`, bytes);
  });

  it("HTML → docs/parity/parity.html (10 karta)", () => {
    const html = buildParityHtml(KITCHENS);
    expect(html).toContain("<svg");
    expect(html.match(/class="card"/g)?.length).toBe(KITCHENS.length);
    writeFileSync(`${ROOT}/parity.html`, html);
  });
});
