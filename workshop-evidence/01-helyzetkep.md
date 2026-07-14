# 01 — Helyzetkép (repó-diagnózis)

- **Dátum:** 2026-07-14
- **Munkakönyvtár:** `C:\Work\ai-workshop\participant-repo`
- **Branch:** `main` (tiszta working tree)
- **Baseline commit:** `53fd993 chore: baseline participant workspace from workshop starter`
- **Hatókör:** csak diagnózis — **kódmódosítás nem történt**.

---

## 1. Mit néztem meg (evidence-bázis)

| Terület | Forrás | Megállapítás |
|---|---|---|
| Eszközlánc | `node -v`, `npm -v`, `git --version` | Node 25.8.1, npm 11.11.0, git 2.53.0 — mind megvan |
| Függőségek | `node_modules/` + `package-lock.json` | telepítve, lockfile szerint |
| Kapuk | `npm run typecheck && lint && test` | **mind zöld** (1 teszt: `cn` smoke) |
| CI | `.github/workflows/ci.yml` | typecheck → lint → test → build minden push/PR-en (Node 22) |
| App-váz | `src/app/`, `src/components/ui/`, `src/lib/` | minimál starter (page/layout/globals + button/card + `cn`) |
| Build-konfig | `next.config.ts`, `tsconfig.json`, `components.json` | Next 16.2.10, React 19.2.4, shadcn `base-nova`, strict TS |
| MCP | `.mcp.json`, `.claude/settings.local.json`, `/mcp` | linear/neon/vercel **belépve**; github MCP tiltva (OAuth-inkompatibilis) |
| GitHub CLI | `gh auth status` | belépve (`maflaec-hoba`), scope: `repo, workflow, read:org, gist` |
| Vercel CLI | `vercel whoami` | CLI 56.1.0 telepítve, de **nincs bejelentkezve** (device-login indul) |

---

## 2. Ami megvan és zöld

- Működő, konvencionális Next.js App Router váz, mind a négy gépi kapu (typecheck/lint/test/build) bekötve lokálisan és CI-ben.
- Három MCP-szerver (Linear, Neon, Vercel) OAuth-tal él; a GitHub tudatosan `gh` CLI-n megy.
- A házirend-fájlok (`AGENTS.md`, `CLAUDE.md`, `DESIGN-GUIDELINE.md`) a helyükön vannak vázként.

---

## 3. Hiányzó információk (legalább három)

> Ezek nem hibák — a nap folyamán töltődnek fel. De **most hiányzó tények**, amelyek nélkül a lánc egyes szakaszai nem indíthatók.

1. **Nincs git remote / írható saját repó.**
   `git remote -v` üres. Nem tudni, melyik GitHub-repó a saját, írható célod, hová pushol az agent, és **hol futnak a PR-kapuk**. A CI workflow készen áll, de távoli repó nélkül nincs mit védenie. → *Hiányzó tény: a cél-remote URL-je + push-jogosultság megerősítése.*

2. **Nincs Vercel-projekt összekötés (és nincs bejelentkezés).**
   `.vercel/project.json` hiányzik, a `vercel whoami` login-flow-t indít. Nem ismert a **cél scope (team/personal)** és a **projekt**, ahová a preview-deploy megy. → *Hiányzó tény: Vercel-fiók + scope + projektnév.*

3. **Nincs jóváhagyott spec-csomag (`docs/spec/`).**
   A `docs/` könyvtár nem létezik; a KK-Regisztráció munkadarab öt fájlos csomagja (constitution / spec / given-when-then / plan / tasks) még nincs megírva. A `DESIGN-GUIDELINE.md` explicit erre a `docs/spec/`-re hivatkozik előfeltételként. → *Hiányzó tény: mi a WHAT, gépi elfogadási kritériumokkal.*

4. **A `DESIGN-GUIDELINE.md` token-szekciói üresek.**
   Brand & tone, Colors, Typography, Layout, Components, Don'ts — mind üres placeholder. A dizájn HOGYAN-ja még nyitott döntés. → *Hiányzó tény: márka/szín/tipó tokenek.*

5. **Az `AGENTS.md` még csak starter, nem működési szerződés.**
   Nincs benne mission, kanonikus mérnöki standard, spec-kapu, RUG-orkesztráció — a README szerint épp ez a nap első feladata. → *Hiányzó tény: a repó operating contractja.*

6. **Nincs Linear issue/projekt referencia.**
   Az MCP él, de az „issue = spec" munkaállapothoz nincs megnevezett team/projekt/issue. → *Hiányzó tény: melyik Linear team és projekt viszi a munkadarabot.*

> Megjegyzés: a **Neon `DATABASE_URL`** hiánya (`.env` nincs) **szándékos** — a README szerint az adatbázis-blokk később kerül be, ezért nem sorolom valódi hiányként.

---

## 4. Döntési határ: modell / agent / ember

| Réteg | Mit tehet | Mit **nem** tehet | Példa itt |
|---|---|---|---|
| **Modell** (LLM önmagában) | Szöveget/kódot generál, alternatívákat javasol, mintát ismer fel a kontextusból. Nincs oldalhatása, nem perzisztál. | Nem fér fájlhoz/toolhoz, nem futtat, nem dönt scope-ról. | Megfogalmazza a spec-tervezetet vagy egy komponens-variánst — de nem írja ki. |
| **Agent** (Claude Code + toolok/MCP) | Fájlt olvas/ír, parancsot futtat, kapukat futtat, MCP-n olvas/ír — **a jóváhagyott scope-on belül**; végrehajt, verifikál, jelent. | Nem lép ki a jóváhagyott scope-ból; nem tesz **irreverzibilis vagy kifelé mutató** lépést engedély nélkül (prod deploy, secret-kezelés, remote push, külső publikálás, adatmódosítás). | Létrehozza ezt az evidence-fájlt, lefuttatja a kapukat — de a `vercel login`/`vercel link` és a `git push` az ember jóváhagyásához kötött. |
| **Ember** | Scope- és irányjóváhagyás, gate-ek elfogadása, irreverzibilis/külső hatások engedélyezése, spec és dizájn elfogadása. | — (a végső felelős) | Eldönti a cél-repót, belép a Vercelbe, elfogadja a spec-csomagot és a dizájnt. |

**A határ egy mondatban:** ami kifelé publikál, pénzbe kerül vagy nehezen visszavonható → **ember dönt**; ami belül, a jóváhagyott scope-on visszafordítható → **agent végrehajt**; a puszta szöveg-/kódjavaslat → **modell**.

---

## 5. A következő emberi döntés

**Döntsd el és hagyd jóvá a saját, írható GitHub-remote-ot — és engedélyezd az első push-t.**

Ez a lánc jelenlegi szűk keresztmetszete: távoli repó nélkül a bekötött PR-kapuknak (CI) nincs hol futniuk, és a Vercel preview-deploy sem köthető be. Konkrétan:

- Melyik GitHub-repó legyen a célod (meglévő üres repó URL-je, vagy hozzon-e létre újat az agent a `gh` CLI-vel a `maflaec-hoba` fiók alatt)?
- Engedélyezed-e a `git remote add` + első `git push` lépést a jóváhagyás után?

*(Ezt követő, kapcsolódó emberi lépés: `vercel login` + a scope/projekt kiválasztása — mindkettő interaktív, ezért a te kezedben marad.)*

---

*Ez a fájl evidence-pillanatkép a diagnózis időpontjában. Kódot nem módosított.*
