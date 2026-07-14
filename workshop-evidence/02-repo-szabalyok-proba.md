# 02 — Repo-szabályok: sikeres és negatív próba

- **Dátum:** 2026-07-14
- **Cél:** bizonyítani, hogy a repo kapui nem csak deklaráltak, hanem
  **ténylegesen elkapják** a szabálysértő munkát (2. modul kimenete,
  utólag pótolva).
- **Szabályrendszer:** `AGENTS.md` (1–6. szabály, a 6. a TDD-munkarend),
  `DESIGN-GUIDELINE.md`, kapuk: `npm run typecheck && npm run lint && npm run test`
  lokálisan, plusz `.github/workflows/ci.yml` (typecheck → lint → test → build)
  minden main-pushra és minden PR-re.

---

## 1. Pozitív próba (main, `86f87cd`)

| Kapu | Parancs | Eredmény | Exit kód |
|---|---|---|---|
| Típusellenőrzés | `npm run typecheck` | zöld | 0 |
| Lint | `npm run lint` | zöld | 0 |
| Teszt | `npm run test` | 1 passed, 37 todo | 0 |

A 37 todo a spec GWT-forgatókönyveinek scaffoldja — a teszt-kimenet mutatja a
még nyitott spec-lefedettséget, de nem bukik.

## 2. Negatív próba (branch: `probe/negative-gate-check`, `58a5ea5`)

Szándékos szabálysértések, külön branchen (a main-t soha nem törtük el):

1. **Típussértés** — `src/lib/utils.ts`:
   `export const probeViolation: number = "this is not a number"`
2. **Hibás tesztelvárás** — `src/lib/utils.test.ts`:
   a `cn` smoke-teszt elvárása szándékosan rossz értékre írva.

| Kapu | Eredmény | Exit kód | Elkapta? |
|---|---|---|---|
| `npm run typecheck` | `error TS2322: Type 'string' is not assignable to type 'number'` | 2 | ✅ |
| `npm run test` | `AssertionError: expected 'a c' to be 'a b c'` — 1 failed | 1 | ✅ |
| `npm run lint` | zöld | 0 | ❌ (nem az ő dolga) |

**Távoli kapu:** a próbához PR nyílt
([#1](https://github.com/maflaec-hoba/rallytrack/pull/1), draft, "do not
merge"). PR-check eredmények:

| Check | Eredmény | Értelmezés |
|---|---|---|
| CI `checks` (typecheck→lint→test→build) | **fail** ❌ | a merge gépileg blokkolt — a kapu működik |
| Vercel preview deploy | pass | **nem kapu**: a `next.config.ts` szándékosan `ignoreBuildErrors: true`-val fut (a típusellenőrzés a CI dedikált lépése, nem a buildé), és a Vercel tesztet sem futtat — a preview szállítási csatorna, a védelem a CI-check |

## 3. Következtetések (a kapuk határai)

- A typecheck és a teszt kapu **mechanikusan** fogja a típushibát és a
  spec-sértő viselkedést — ehhez kell, hogy a GWT-forgatókönyvek élesített
  tesztként létezzenek (AGENTS.md 6. szabály, TDD).
- A lint a fenti két hibatípusra **vakon zöld** — a lint stílus/szabály-kapu,
  nem korrektség-kapu. Tanulság: "zöld a lint" önmagában semmit nem mond a
  helyességről.
- Amit **egyik gépi kapu sem fog**: nem-mechanikus szabálysértés (pl. új
  library engedély nélkül, DESIGN-GUIDELINE-sértő UI, spec-től eltérő scope).
  Ezekre a 4. modul **független review-ja (RUG)** a védelem — a gépi kapu és
  az emberi/review kapu együtt alkot rendszert.

## 4. Takarítás

A próba-branch és a PR nyitva marad evidence-ként ("do not merge" jelöléssel);
a main érintetlen, a pozitív próba a friss main-en zölden fut.
