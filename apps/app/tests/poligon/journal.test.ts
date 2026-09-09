// H3 — bitta undo-journal (sheet-op + rule-edit birga) testlari.
import { test } from "node:test";
import assert from "node:assert/strict";
import { initJournal, record, current, undo, redo, canUndo, canRedo } from "../../src/poligon/model/journal.ts";

// soddalashtirilgan holat: sheet=raqam, rules=string[]
test("H3: sheet-op + rule-edit BIR journalда — undo operatsiya-donaligida, interleaving to'g'ri", () => {
  let j = initJournal(0, [] as string[]);
  j = record(j, "sheet", "addLine", { sheet: 1, rules: [] });          // sheet op
  j = record(j, "rule", "setColour", { sheet: 1, rules: ["colour=oq"] }); // rule edit (BIR journal)
  assert.deepEqual(current(j), { sheet: 1, rules: ["colour=oq"] });

  j = undo(j); // rule-edit'ni bekor → sheet op holatiga (interleaving to'g'ri)
  assert.deepEqual(current(j), { sheet: 1, rules: [] });
  j = undo(j); // sheet-op'ni bekor → init
  assert.deepEqual(current(j), { sheet: 0, rules: [] });
  assert.ok(!canUndo(j));

  j = redo(j); // qayta sheet-op
  assert.deepEqual(current(j), { sheet: 1, rules: [] });
  assert.ok(canRedo(j));
});

test("H3: undo'dan keyin yangi op redo-quyrug'ini kesadi (yangi shox)", () => {
  let j = initJournal(0, [] as string[]);
  j = record(j, "sheet", "a", { sheet: 1, rules: [] });
  j = record(j, "sheet", "b", { sheet: 2, rules: [] });
  j = undo(j); // → sheet 1
  j = record(j, "rule", "c", { sheet: 1, rules: ["x"] }); // yangi shox — "b" redo yo'qoladi
  assert.deepEqual(current(j), { sheet: 1, rules: ["x"] });
  assert.ok(!canRedo(j), "b redo-quyrug'i kesildi");
});
