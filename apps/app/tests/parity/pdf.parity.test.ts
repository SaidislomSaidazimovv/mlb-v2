// B — parity PDF hosil bo'lishi + faylga yozilishi testi.
import { describe, it, expect } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { buildParityPdf } from "./pdf";
import { FURNITURES } from "./furnitures";

describe("parity PDF", () => {
  it("10 mebel uchun haqiqiy PDF hosil qiladi (%PDF header, >1KB) + docs/parity/parity.pdf ga yozadi", () => {
    const bytes = buildParityPdf(FURNITURES);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!, bytes[4]!)).toBe("%PDF-");
    mkdirSync("F:/Main and Private/mebelchi-v2/docs/parity", { recursive: true });
    writeFileSync("F:/Main and Private/mebelchi-v2/docs/parity/parity.pdf", bytes);
  });
});
