# FRED-206 — tab1 preload — localStorage snapshot fallback (Phase 2)

## Before (from backlog.md)
> ## FRED-206 — 💤 tab1 preload — localStorage snapshot fallback
> Follow-up to FRED-205 (Phase 2). Add a per-user localStorage snapshot so even a slow cold launch never shows a spinner. Synchronous `peekSnapshot()` before load; cover gate fresh-first with snapshot fallback + "Updating…/as of" marker; purge on logout (FRED-199 ordering); `firstApply` flag prevents MFU double-pop.

## After (structured ticket)

**Summary:** Add a per-user localStorage snapshot of the portfolio view-model so even a slow or offline cold launch paints tab1 instantly (no spinner), then silently revalidates. Builds on FRED-205: the component hydrates synchronously from the snapshot before the network load, the cover-gate falls back to the snapshot instead of the spinner when fresh data misses the cap, and a subtle "Updating…/as of <time>" marker signals staleness. Frontend-only. **Depends on FRED-205.**

**Systems / files involved** (all under `frontend/src/app/`):
- `services/portfolio-store.service.ts` — add `peekSnapshot()` (synchronous read) and `persistSnapshot(vm)`. Per-user key `fred.portfolioDash.v1.<userId>`, full view-model (strip only `recentTransactions`; recompute `chartData` from `history` on hydrate to avoid double-storing), `userId`-equality validation, try/catch quota/private-mode guard — mirroring `freedom-stats.service.ts` snapshot mechanics but at the service layer (CONTEXT.md: services own state).
- `components/portfolio-dashboard/portfolio-dashboard.component.ts` — `ngOnInit` does a synchronous `peekSnapshot()` **before** `loadPortfolioData()`; on hit set `dashboard`/`performanceData`/`freedomLabel`/`selectedPeriod`, recompute chart, `generateBackgroundIcons()`, `loading = false`. Guard `loading = true` and the error toast on `!this.dashboard`. Persist a fresh snapshot on each successful load. `firstApply` flag so a post-hydrate silent revalidate doesn't re-pop the MFU modal. Track `snapshotAsOf`.
- `components/portfolio-dashboard/portfolio-dashboard.component.html` — mandatory, subtle staleness affordance bound to `snapshotAsOf` ("Updating…" while revalidating / "as of <time>" if revalidation fails offline).
- `app.component.ts` — cover-gate becomes fresh-first: hold for fresh up to the cap, else lift onto the snapshot (never the spinner when a snapshot exists).
- `utils/jwt-token.utils.ts` — in `clearJwtData()`, remove `fred.portfolioDash.v1.<userId>` **before** `userId` is removed (FRED-199 ordering).

**Doc references:**
- `./FREDdocs/FRED_UI_STYLE_GUIDE.md` — styling the staleness marker (Manrope, muted, light-mode only; no dark mode).
- `./FREDdocs/AUTHENTICATION_AND_JWT.md` — `clearJwtData()` / `JwtTokenUtils`; logout purge ordering.
- In-repo precedent: `freedom-stats.service.ts` (`freedom_stats_snapshot_<userId>` localStorage snapshot for cold-launch paint).
- Approved plan: `.claude/plans/we-want-to-add-ancient-cook.md` (Phase 2).

**Acceptance Criteria:**
1. `PortfolioStoreService` gains `peekSnapshot()` (synchronous) and `persistSnapshot(vm)` using key `fred.portfolioDash.v1.<userId>`, storing the full view-model with `recentTransactions` stripped, validating `snapshot.userId === current userId` and a present `dashboard.summary`, wrapped in try/catch (quota / private-mode safe).
2. On tab1 mount with a valid snapshot, `ngOnInit` hydrates **synchronously** before any network call — `dashboard`, `performanceData`, `freedomLabel`, `selectedPeriod` set, `chartData` recomputed from history, `loading = false` in the same change-detection tick — so the ready block renders on the first frame.
3. Background revalidation is silent: `loading` is set true only when `!this.dashboard`, and `error`/the error toast surface only when `!this.dashboard`, so a failed revalidate never erases displayed snapshot data.
4. Every successful load persists a fresh snapshot; on a normal network the fresh data silently replaces the snapshot within ~1s.
5. Cover-gate is fresh-first: for `/tabs/tab1`, hold for fresh up to the cap; if the cap fires and a snapshot exists, lift onto the snapshot (never the spinner).
6. A mandatory, subtle staleness affordance bound to `snapshotAsOf` shows "Updating…" while revalidating and "as of <time>" if revalidation fails offline; styled per the FRED design system (Manrope, muted, light-mode only).
7. `clearJwtData()` removes `fred.portfolioDash.v1.<userId>` **before** `userId` is removed; logging out user A then logging in as user B never surfaces A's numbers.
8. `firstApply` ensures a post-hydrate silent revalidate does not re-trigger the Monthly Freedom Update modal.
9. Cold launch on a throttled/offline network **with** a prior snapshot shows the snapshot instantly with the marker and **no** spinner; **without** a snapshot, behavior is unchanged from FRED-205.
10. Versioned key `v1` + `peekSnapshot` field-validation, with the "bump `v1` when `PortfolioDashboardData` shape changes" rule documented next to the key. `ng build` (plain or `--configuration dev`) / lint / existing specs pass; no new debt.

**Edge cases / open questions:**
- Empty ($0) portfolio: persisted/painted as $0 (valid), chart empty state, freedom badge hidden — not gated on equity>0.
- Corrupt/oversized snapshot: `peekSnapshot` try/catch → null → falls through to FRED-205 behavior; `persistSnapshot` swallows quota errors.
- Large ALL-period history: mitigated by stripping `recentTransactions` and recomputing chart on hydrate (history not double-stored); cap length if still large.
- Privacy: full view-model (equity, positions, history) persisted plaintext — same class as the existing `freedom_stats` snapshot + JWT (Andy approved full view-model).

**Time estimate:** `1-3hr` (S)
**Label:** `[code]`
