/// <reference types="node" />
// Persist — fs I/O qatlami (FAQAT Node). ASOS: 54§0 "engine sof, I/O T8/T9 dan tashqarida yo'q" — shu
// sababli fs SOF `project.ts` dan AJRATILGAN va poligon/index.ts uni brauzerga EKSPORT QILMAYDI.
// Faqat Node kontekstida (test, server, CLI) import qilinadi. (Brauzer app tsconfig types allowlist'i
// node'ni avtomatik olmaydi — bu fayl brauzer bundle'iga umuman kirmagani uchun reference bilan ochamiz.)
import { writeFileSync, readFileSync } from "node:fs";
import type { Project } from "./project.ts";
import { serializeProject, parseProject } from "./project.ts";

export function saveProject(path: string, p: Project): void { writeFileSync(path, serializeProject(p), "utf8"); }
export function loadProject(path: string): Project { return parseProject(readFileSync(path, "utf8")); }
