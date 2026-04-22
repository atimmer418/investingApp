---
name: FRED design system background color consistency
description: All redesigned onboarding components use #f8fafc background and cool-gray cards — flag deviations
type: feedback
---

The established FRED design system for onboarding components uses:
- Page background: `#f8fafc` (both `--xxx-bg` and `--ion-background-color`)
- Card/surface backgrounds: `#f1f5f9` (slate-100) or white
- These are cool-gray tones from the Tailwind slate palette

**Why:** Consistency across the onboarding flow (surveyinitial, fi-plan-results, authfinalize, linkplaid, kyc-verification, document-upload, investment-schedule) is important for a polished feel. Warm tones like `#f5f3ef` or pure `#ffffff` backgrounds break the visual continuity.

**How to apply:** When reviewing any new or redesigned onboarding component, check the `:host` CSS custom properties against the reference components. Flag any background color that doesn't match `#f8fafc` unless the user has explicitly requested a different treatment.
