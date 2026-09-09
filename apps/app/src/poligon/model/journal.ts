// H3 — bitta undo-journal (sheet-op + rule-edit birga). Sof funksiyalar (54§0).
// ASOS: 51 H3 ("undo operatsiya-donaligida, part-donaligida emas; rule-edit'lar sheet-edit'lar bilan BIR
//   JOURNALда operatsiya bo'lishi kerak — aks holda ikki app orasida undo noto'g'ri interleave bo'ladi")
//   + 48 L0 (har op nomlangan atomik tranzaksiya). Journal — (sheet, rules) holatlar timeline'i; kursor
//   joriy holatда; undo/redo kursorni suradi. Ikkala TUR ham BIR timeline'ga yoziladi → interleaving to'g'ri.
// O'ylab topilgan hech narsa yo'q.

export type JournalKind = "sheet" | "rule";
export interface JournalState<S, R> { sheet: S; rules: R; }
export interface JournalStep<S, R> { kind: JournalKind; label: string; state: JournalState<S, R>; }
export interface Journal<S, R> { history: JournalStep<S, R>[]; cursor: number; }

/** Boshlang'ich journal — bitta holat (cursor 0). */
export function initJournal<S, R>(sheet: S, rules: R): Journal<S, R> {
  return { history: [{ kind: "sheet", label: "init", state: { sheet, rules } }], cursor: 0 };
}

/** Operatsiya yozish (sheet YOKI rule — BIR timeline). Redo-quyrug'i kesiladi (yangi shox). */
export function record<S, R>(j: Journal<S, R>, kind: JournalKind, label: string, state: JournalState<S, R>): Journal<S, R> {
  const history = j.history.slice(0, j.cursor + 1);
  history.push({ kind, label, state });
  return { history, cursor: history.length - 1 };
}

export function current<S, R>(j: Journal<S, R>): JournalState<S, R> {
  return j.history[j.cursor]!.state;
}

/** Undo — operatsiya-donaligida (sheet yoki rule, farqi yo'q; bitta ketma-ketlik). */
export function undo<S, R>(j: Journal<S, R>): Journal<S, R> {
  return j.cursor > 0 ? { ...j, cursor: j.cursor - 1 } : j;
}
export function redo<S, R>(j: Journal<S, R>): Journal<S, R> {
  return j.cursor < j.history.length - 1 ? { ...j, cursor: j.cursor + 1 } : j;
}
export const canUndo = <S, R>(j: Journal<S, R>): boolean => j.cursor > 0;
export const canRedo = <S, R>(j: Journal<S, R>): boolean => j.cursor < j.history.length - 1;
