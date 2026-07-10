# Acceptance Check Manifest — FRED-211
Remodel tab3 into the family design language (Variant A, pinned header).
Story: `FREDdocs/.stories/FRED-211.md` · Visual spec: `ITPM/agent-memory/FRED-211-prototype.html` (Variant A only).

> VERIFIER VERDICT (independent re-verification, 2026-07-07): **APPROVED** — all 8 ACs pass.
> Statuses below are the verifier's own, gated on independent evidence (fred211-v-*.png +
> headless rect/scroll measurements + byte-diffs), not on the builder's self-marking.
> Scope note: working tree carries FRED-206..210 + ai-chat/passkey; only tab3.page.{html,ts,scss}
> + scripts/subset-icons.mjs (the FRED-211 line) belong to this story. subset-icons.mjs also
> carries FRED-207/208 icon lines — attributed to those stories, not re-judged here.

## AC-1: Gradient header with avatar + wordmark preserved verbatim
- Type: ui-acceptance
- Check: Family gradient on ion-header; pigAvatarSrc image + badge + goToMyProfile untouched; .header-branding Montserrat Black Italic styling + mfu-active + onFredLogoClick byte-preserved (diff); name/greeting bindings intact.
- Evidence: Gradient in SCSS is token-identical to prototype lines 63-66 (radial catches + linear #081c4e→#16309b→#2563EB). Avatar block (html 4-15) byte-unchanged: `<img [src]="pigAvatarSrc">`, avatar-badge-wrap+goToMyProfile(), profileActionRequired$ badge — all intact; runtime probe shows real image `assets/images/pig-range-1.svg` (NOT emoji). `.header-branding` block **byte-identical** to develop incl. full `.mfu-active` sub-block (strict `diff` = empty). name="My Account"/greeting="Hi, Firstname" bindings unchanged. Avatar ring 2px#dbdfe7→2.5px white is per approved prototype line 72 (A/C says "white ring"), pig image itself untouched. fred211-v-top.png.
- Status: pass

## AC-2: Glass freedom strip
- Type: ui-acceptance
- Check: Three glass tiles (translucent/hairline/blur) with unchanged freedomStatsService bindings + loading dashes.
- Evidence: Tile SCSS matches prototype tokens exactly — rgba(255,255,255,.11) fill, 1px rgba(255,255,255,.2) border, radius 14, backdrop-filter blur(10px) (+ -webkit- prefix). Template bindings `freedomStatsService.isLoading() ? '—' : ...stats().X` unchanged. Runtime: tiles render populated values 2069 / 79 / $1.80M (not stuck on '—'). fred211-v-top.png.
- Status: pass

## AC-3: Pinned-header scroll
- Type: ui-acceptance
- Check: Headless — scroll sheet to bottom: header/strip bounding rects unchanged; sheet rounded top fixed; content clips beneath it; appTabBarScroll bound to the actual scrolling element (tab-bar hide still fires).
- Evidence: Independent headless measurement (fred211-verify.js): header rect BEFORE {top:0,bottom:186,height:186} == AFTER {top:0,bottom:186,height:186} IDENTICAL; **freedom-strip** rect BEFORE {top:78,bottom:146,height:68} == AFTER IDENTICAL; .sheet-scroll top 186==186 (rounded top FIXED). scrollTop:273, scrollHeight:931 > clientHeight:658, atBottom:true, contentClips:true. Directive runtime proof: scrolling the plain .sheet-scroll div to mid (120px) sets `.ftb--compact` = true (tab bar SHRANK — directive's @HostListener('scroll') fires on the div, NOT a no-op); at bottom it restores (atBottom rule). Note: overscroll-behavior-y = auto (not contain), but ion-header sits OUTSIDE ion-content (scrollY=false) with no scrollable ancestor to chain to, so iOS bounce cannot drag the page — real-device momentum feel stays needs-manual-QA. fred211-v-top.png / fred211-v-scrolled.png.
- Status: pass

## AC-4: Row anatomy + preserved actions
- Type: ui-acceptance
- Check: Icon tiles + Manrope labels + chevrons per prototype; settingSections/badges/onSettingClick handlers unchanged (diff on TS actions).
- Evidence: .srow/.srow-tile/.srow-label/.srow-chevron SCSS matches prototype lines 96-106 (36px radius-10 #eef4ff tile, blue 19px glyph, Manrope 15px/700 label, #c3cbd9 chevron, #f1f5f9 divider). TS diff changed ONLY `icon:` strings; every `action:`, `title:`, `subtitle:`, `type:` preserved; onSettingClick switch (all cases) + goToMyProfile()/onFredLogoClick() byte-unchanged. setting-badge markup preserved. Runtime: 11 rows render. fred211-v-top.png.
- Status: pass

## AC-5: Icons in subset (no ligature text)
- Type: static
- Check: New Material Symbols names added to DYNAMIC_ICONS; `npm run subset-icons` output lists them; no icon renders as raw text in headless capture.
- Evidence: FRED-211 line adds pie_chart, credit_card, verified_user, description, group, help, mail, menu_book (schedule/payments/account_balance already covered). `npm run subset-icons` output lists all 12 tab3 glyphs (grep count = 12) and is idempotent (woff2 shasum identical across two runs: 5c95042...). Runtime: all 11 srow glyphs + chevrons render at 19px/18px — zero ligature-text (longest text 15 chars, none oversized). fred211-v-top.png / fred211-v-scrolled.png.
- Status: pass

## AC-6: Zone labels + footer placement
- Type: ui-acceptance
- Check: Section headers use family zone-label treatment; footer inside the scrolling sheet.
- Evidence: .zone-label SCSS matches prototype lines 108-111 (11px/800/uppercase/.08em/#6b7280); :not(:first-child) margin-top:22px equals prototype's first-child:0 pattern. Footer .footer-content lives inside .sheet-inner → .sheet-scroll; runtime scrolled capture shows "© 2026 FREDvested LLC · v1.0.0 (Beta)" at the bottom of the scroller. fred211-v-scrolled.png.
- Status: pass

## AC-7: Behavior preservation / scope
- Type: static
- Check: No service/data changes; no other tab files in this story's diff; safe-area handling intact.
- Evidence: FRED-211 diff touches only tab3.page.{html,ts,scss} + subset-icons.mjs (tab3 line). No service/other-tab file modified for this story. .safe-area-top preserved on .custom-profile-header (global.scss:532 applies padding-top: env(safe-area-inset-top) !important — identical to develop). --fred-tabbar-clearance preserved on .sheet-inner (scss:243). Light-only (no prefers-color-scheme in tab3.scss).
- Status: pass

## AC-8: Quality gates
- Type: build + ui-acceptance
- Check: ng build --configuration dev AOT-clean (zero new warnings on story files); lint clean; replaced styles pruned; no TODOs; force-light/Manrope/palette conformance.
- Evidence: `ng build --configuration dev` exit 0, "Application bundle generation complete"; zero tab3 warnings (the 5 TS-998113 warnings are pre-existing unrelated pages: ChangeEmail/MyProfile/SecuritySettings/RecurringInvestments/SellWithdraw). `ng lint` — zero tab3 findings (4 pre-existing no-empty-lifecycle-method errors in unrelated files). Old classes pruned (grep of content-scroll/scroll-inner/header-overlap/sections-card/group-header/setting-item/etc. in tab3 files = empty). Manrope (7 refs) + #2563EB/#0f172a/#6b7280 palette; ion-content --background #2563EB matches gradient bottom. No TODOs.
- Status: pass
