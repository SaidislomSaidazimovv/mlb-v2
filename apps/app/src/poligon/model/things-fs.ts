/// <reference types="node" />
// 52§2 — haqiqiy fs Thing loader (FAQAT Node). ASOS: 52§2 folder-per-Thing:
//   <dir>/<kind>/<slug>/def.json (majburiy) · diagram.svg (52§2 majburiy) · examples/ (52§2 publish uchun).
//   Bu Node-only I/O qatlami (project-fs kabi) — poligon/index.ts brauzerga EKSPORT QILMAYDI; validatsiya
//   (canPublish/buildIndex) sof `things.ts` da. fs-walk emas — folder o'qiladi, keyin namespaced index (52§10).
// O'ylab topilgan hech narsa yo'q.

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Thing, ThingDef } from "./things.ts";

/** 52§2: <dir>/<kind>/<slug>/ papkalaridan Thing[] o'qish. def.json yo'q papka o'tkaziladi. */
export function loadThings(dir: string): Thing[] {
  const out: Thing[] = [];
  if (!existsSync(dir)) return out;
  for (const kind of readdirSync(dir)) {
    const kindDir = join(dir, kind);
    if (!statSync(kindDir).isDirectory()) continue;
    for (const slug of readdirSync(kindDir)) {
      const thingDir = join(kindDir, slug);
      if (!statSync(thingDir).isDirectory()) continue;
      const defPath = join(thingDir, "def.json");
      if (!existsSync(defPath)) continue;
      const def = JSON.parse(readFileSync(defPath, "utf8")) as ThingDef;
      const hasDiagram = existsSync(join(thingDir, "diagram.svg")); // 52§2 diagram majburiy (canPublish tekshiradi)
      const examplesDir = join(thingDir, "examples");
      const hasExamples = existsSync(examplesDir) && statSync(examplesDir).isDirectory() && readdirSync(examplesDir).length > 0;
      out.push({ def, hasDiagram, hasExamples });
    }
  }
  return out;
}
