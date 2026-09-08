# 📮 App-3 → GLOBAL biblioteka — publish kontrakti

> App-3'ga (Forge) beriladigan aniq topshiriq. App-3 komponenti App-2'ning global «Компоненты»да avtomат
> ko'rinishi uchun App-3 SHU endpoint'ga publish qilishi kerak. Manba: `GLOBAL_LIBRARY_REJA.md` · `APP3_CONTRACT §10.3`.

## 1. Bir gapda
App-3 «Convert to Component» → `ComponentLibraryItem` yasaydi. Uni **qo'lda JSON eksport o'rniga** to'g'ridan-to'g'ri
**bir Edge Function'ga publish** qiladi → §10.3 gate o'tса serverga tushadi → **App-2 avtomat oladi** (barcha usta ko'radi).

## 2. Endpoint
```
POST  {SUPABASE_URL}/functions/v1/publish-library-item
Headers:
  Authorization: Bearer <ustaning Supabase JWT>       ← usta shu Supabase auth bilan login bo'lgan bo'lishi shart
  Content-Type: application/json
Body:
  { "kind": "component", "name": "<nom>", "payload": <ComponentLibraryItem> }
Javob:
  200 → { "ok": true, "id": "<uuid>" }
  4xx → { "ok": false, "code": "<gate-kod>", "reason": "<sabab>" }   ← hech qachon yalang'och boolean
```

## 3. App-3 nima ta'minlaydi
1. **Bir xil Supabase loyiha** — App-3 SHU `SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` bilan ishlasin (auth + endpoint mos bo'lsin). (Loyiha bitta — App-2 bilan umumiy.)
2. **Usta auth** — App-3'da usta Supabase auth bilan login (JWT). Publish shu token bilan.
3. **§10.3 profile-swap bosqichi (5-qadam)** — bu **App-3'niki** (profil almashса ham komponent sinmasligi). Hozir Edge Function'da **stub = pass**. App-3:
   - (a) o'z profile-swap tekshiruvini **client-side** qilib, o'tса publish qilsin (tavsiya v1), YOKI
   - (b) tekshiruv logikasini bersin — biz Edge Function'ga qo'shamiz.
4. **Payload = `ComponentLibraryItem`** aynan `engine/contracts/design.ts` shakli (schemaVersion:1 · requiredSlots · root · pos+thicknessAxis). Bu allaqachon tayyor (`forge-library (1).json` shu shakl).

## 4. Server nima tekshiradi (§10.3, Edge Function)
- **schema** — kind='component' · schemaVersion=1 (noma'lum → RAD, taxmin yo'q) · root bor.
- **slot** — requiredSlots massiv.
- **decomposition/invariant** — App-2 client-pre-check (previewParts/solveFull) publish'dan OLDIN; App-3 ham o'z tomonida pre-check qilса yaxshi.
- **profile-swap** — App-3 (yuqorida).
- **ad-integrity** — N/A (bozor yo'q, DB_37 §3.6).

## 5. App-3 nima kutadi bizdan (biz beramiz)
- Deploy bo'lganda: aniq `SUPABASE_URL` + `functions/v1/publish-library-item` manzili.
- `ComponentGateFailure` kodlar ro'yxati (schema/slot/decomposition/invariant/profile-swap/ad-integrity).
- Test: bitta `ComponentLibraryItem`ni publish → App-2'da 🌐 «Компоненты»да ko'rinishini birga tasdiqlaymiz.

## 6. Natija
App-3 publish qilса → App-2 usta bibliotekasida **[avatar] muallif · sana** bilan komponent chiqadi → tap → studioga
(aniq 3D + real kesim). Qo'lda `forge-library.json` KERAK EMAS.
