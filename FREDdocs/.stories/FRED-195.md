# FRED-195 — Equity-range pig avatar for profile & MFU

## Before (from backlog.md)
> in the directory PersonalTypeshit/FRED Logo, there are 5 pig directories with ranges each containing an svg. these svgs (the non-blackandwhiteversion) should be copied to an assets directory on the frontend of FRED, the ranges should be the range of the user's total equity, so when the user's total equity is within that range, the profile picture in the my profile link from tab 3 should display that svg and same with the actual profile picture within the my profile page. also, the mfu achievement that displays in the mfu should show this svg as well when that respective new bottom range of total equity has been achieved

## After

**Summary:** Copy the 5 non-B&W pig SVGs (one per total-equity dollar range: $0–1k, $1k–10k, $10k–100k, $100k–1m, $1m+) from `PersonalTypeshit/FRED Logo/FREDpig$*` (a sibling directory of the FRED repo — `PersonalTypeshit` contains both `FRED` and `FRED Logo`) into the frontend assets, then drive three avatars off the user's total-equity range: the profile picture on tab3's "My Profile" link, the avatar on the My Profile page, and the pig shown in the MFU achievement. The two **profile avatars use the user's LIVE total equity** (`summary.equity`); the **MFU achievement** reflects the equity tier achieved in that MFU. Done when each shows the SVG matching the right equity range. The new 5-range art **fully replaces** the current `pig-level-1..6.svg` set (old files deleted), mapping the backend `equityLevel` levels 5 & 6 → the single $1m+ pig.

### What already exists (important — this is a swap, not a greenfield build)
- Backend already computes the tier: `MonthlyFreedomUpdateService.calculateEquityLevel(equity)` → `MonthlyFreedomUpdateDTO.equityLevel` (int). Current thresholds: **L1** <$1k · **L2** $1k–10k · **L3** $10k–100k · **L4** $100k–1m · **L5** $1m–5m · **L6** ≥$5m.
- Frontend already renders pig art from that level in **two** of the three spots, via `assets/images/pig-level-${N}.svg` (N=1..6):
  - My Profile page: `app/pages/my-profile/my-profile.page.ts:70` `avatarSrc` getter (`equityLevel` loaded from most-recent MFU, my-profile.page.ts:257).
  - MFU achievement: `app/components/monthly-freedom-update/monthly-freedom-update.component.ts:161` `milestoneEquityPigSrc`, rendered at `…component.html:46` when `milestones[0].type !== 'DEFAULT'`.
- **tab3 "My Profile" link avatar is NOT wired** — it's a hardcoded placeholder: `app/tab3/tab3.page.html:7` → `<img src="https://ionicframework.com/docs/img/demos/avatar.svg" />`. (tab3 already loads live equity as `data.summary.equity`, ~tab3.page.ts:365.)

### The new assets (source → dest)
Non-B&W SVGs (the `pig$*.svg`, NOT `blackandwhiteversion.svg`):
| Range | Source | Suggested dest (URL-safe) |
|-------|--------|---------------------------|
| $0–1k | `FRED Logo/FREDpig$0-$1k/pig$0-$1k.svg` | `pig-range-1.svg` |
| $1k–10k | `FRED Logo/FREDpig$1k-$10k/pig$1k-$10k.svg` | `pig-range-2.svg` |
| $10k–100k | `FRED Logo/FREDpig$10k-$100k/pig$10k-$100k.svg` | `pig-range-3.svg` |
| $100k–1m | `FRED Logo/FREDpig$100k-$1m/pig$100k-$1m.svg` | `pig-range-4.svg` |
| $1m+ | `FRED Logo/FREDpig$1m+/pig$1m+.svg` | `pig-range-5.svg` |

Dest dir: `frontend/src/assets/images/`. ⚠️ Source filenames contain `$` and `+` — **must be renamed** to URL-safe names on copy (those chars break asset URLs).

### Files / systems involved
- New assets in `frontend/src/assets/images/` (+ retire old `pig-level-1..6.svg` once unused).
- `app/tab3/tab3.page.html` (avatar img) + `app/tab3/tab3.page.ts` (add equity→svg getter; live equity already available).
- `app/pages/my-profile/my-profile.page.ts` (`avatarSrc` getter).
- `app/components/monthly-freedom-update/monthly-freedom-update.component.ts` (`milestoneEquityPigSrc`).
- A single shared helper (e.g., a util or small service) mapping total-equity → range SVG, used by all three spots — don't duplicate threshold logic.
- Backend `MonthlyFreedomUpdateService.calculateEquityLevel` / `MonthlyFreedomUpdateDTO.equityLevel` — reused as-is (no change needed if frontend maps L5+L6 → $1m+); optional simplification to 5 levels.

### Doc references
- `FREDdocs/PROGRESS_TRACKING_SYSTEM.md` — userProgress context (if avatar gating ties to progress).
- `.claude/CONTEXT.md` — frontend conventions; test 3 (unhappy path: zero/null equity must not break the image).
- Related prior work: FRED-129 (pig art at MFU milestones), FRED-131 (five Fred faces for equity ranges).

### Acceptance Criteria
1. The 5 non-B&W pig SVGs are copied into `frontend/src/assets/images/` with **URL-safe filenames** (source names contain `$`/`+` and are sanitized), and the range→file mapping is documented.
2. A **single shared helper** maps a total-equity value → one of the 5 range SVGs ($0–1k, $1k–10k, $10k–100k, $100k–1m, $1m+). The existing backend `equityLevel` L5 & L6 both map to the $1m+ pig. No duplicated threshold logic across the three spots.
3. The tab3 "My Profile" link avatar (`tab3.page.html`, currently the Ionic placeholder) shows the pig SVG for the user's **live** total-equity range (`summary.equity`).
4. The My Profile page avatar shows the same range pig driven by **live** total equity (`summary.equity`), replacing the old `pig-level-${level}.svg` that read the stale MFU `equityLevel`.
5. The MFU achievement shows the range pig for the equity tier achieved in that MFU (MFU-derived), replacing `pig-level-${validLevel}.svg`, when a non-DEFAULT milestone is achieved.
6. The two profile avatars are consistent for the same user (both off live equity); zero/null/empty equity falls back to the $0–1k pig — no broken `<img>`.
7. The old `pig-level-1..6.svg` assets are **deleted entirely** (full replacement); frontend compiles cleanly with no broken image references and no remaining references to the old files.

### Edge cases / Open Questions
- **Live equity (RESOLVED — Andy):** the two profile avatars (tab3 link + My Profile page) use the user's **live** total equity (`summary.equity`), not the stale most-recent-MFU `equityLevel`. tab3 already loads it; my-profile needs to load live equity too. The **MFU achievement stays MFU-derived** (it celebrates that period's tier).
- **Replace old art (RESOLVED — Andy):** the new 5-range SVGs **fully replace** `pig-level-1..6.svg`; delete the old files.
- **6 levels → 5 ranges (resolved default):** backend `equityLevel` L5 ($1m–5m) & L6 (≥$5m) both map to the single $1m+ pig (no backend change). The new art only has 5 ranges, so this is the only sensible mapping unless a 6th SVG is supplied later.
- **Source location:** SVGs live in `PersonalTypeshit/FRED Logo/FREDpig$*/pig$*.svg` — a **sibling** of the FRED repo (NOT inside `FRED/`). `PersonalTypeshit` contains both `FRED` and `FRED Logo`.
- **Asset naming convention** to settle on copy: `pig-range-N.svg` vs `pig-equity-0-1k.svg` (minor).
- SVGs should be checked for size/viewBox so they render cleanly inside `ion-avatar` (circular crop) without distortion.

### Estimate & label
- **Estimate:** `1-3hr` (asset copy + one shared mapping helper + wiring three spots; backend untouched if L5/L6 collapse is accepted — live-equity option for my-profile adds a little).
- **Label:** `[code]`
