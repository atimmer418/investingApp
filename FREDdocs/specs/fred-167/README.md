# FRED-167 — Redesign "Ask FRED" like Cloudflare's Ask AI

## ⚑ For any agent building this (remote itpm planning run OR local session)

**Open the three PNGs in [`./reference/`](./reference/) before you design or generate mockups.** They are the source of truth for the target look. The goal is to adopt Cloudflare Ask AI's **layout + interaction pattern** in FRED's own brand — *not* to copy Cloudflare's orange/cloud branding or its content.

- `reference/01-empty-state.png` — landing / empty state
- `reference/02-reasoning-state.png` — in-progress / reasoning state
- `reference/03-answer-state.png` — answer state

---

## Where the code lives

| Thing | Path |
| --- | --- |
| Component | `frontend/src/app/pages/ai-chat/ai-chat.page.{ts,html,scss}` |
| Route | `/tabs/chat` (registered in `frontend/src/app/tabs/tabs.routes.ts`) |
| Data / streaming | `frontend/src/app/services/chat.service.ts` — `streamChat()`, `getDailySuggestions()`, session history |
| FRED mascot avatar | `frontend/src/assets/icon/pfp.png` |

---

## The three reference screens (what they show)

### 1. Empty / landing state — `reference/01-empty-state.png`
- Top: a full-width pill bar — "Need more help?" on the left, a "Support" button on the right.
- Centered soft cloud illustration → bold time-based greeting **"Good evening."** → muted subtitle "What are we doing today?".
- A vertical stack of ~5 **suggestion cards**, each = left icon in a rounded tile + bold title + muted subtitle (e.g. "Deploy a Worker / Help me get started").
- Subtle dotted-grid background.
- Bottom composer: large rounded input "What can we help you with?", an "Ask" pill (pencil) bottom-left, a sliders icon + circular send button bottom-right.

### 2. Reasoning / in-progress state — `reference/02-reasoning-state.png`
- User message bubble, top-right, gray + rounded ("Show me my domain settings").
- A collapsible **"hide reasoning"** block (chevron + left vertical rule) showing the model's muted chain-of-thought text.
- A **"Returning results…"** loading line with a small animated cloud, italic + muted.

### 3. Answer state — `reference/03-answer-state.png`
- User bubble top-right; a collapsed **"see reasoning"** affordance above the answer.
- A large answer card (rounded, subtle border) containing: an intro paragraph with **bold** emphasis, a **data table** (Domain / Status / Created / Original Registrar), a paragraph with inline **code chips**, and a **bulleted list of follow-up actions**.
- Below the card: a **feedback row** — thumbs-up, thumbs-down, copy, and a "Support" link with a help icon.
- Same bottom composer as the empty state.

---

## Current implementation (what "Ask FRED" is today)

- Header `ion-toolbar` titled **"Ask FRED"** + a hamburger opening a right-side **"History"** slide-out menu (past sessions, "+" new chat).
- **Empty/new chat:** an assistant greeting *bubble* ("Hello! I'm FRED…") plus suggestion **chips** ("Try asking about…"), shown while `messages.length <= 1`. Suggestions come from `ChatService.getDailySuggestions()` → `[LLM, Popular, Personalized]`. The first-time tour hooks the "What's your story FRED?" chip (tour step 4).
- **Messages:** user + assistant bubbles; assistant shows the FRED avatar (`assets/icon/pfp.png`). `formatMessage()` does *basic* bold/italic/line-break via `innerHTML` — **no tables, no markdown library.**
- **Loading:** a 3-dot typing-indicator bubble while `streamChat()` streams.
- **Streaming:** `ChatService.streamChat()` emits `{ token }` / `{ done, title }`. **No reasoning channel exists.**
- **Failed messages:** inline retry button.
- **Composer:** footer `ion-textarea` "Message FRED…" + arrow-up-circle send.

---

## Gap analysis (reference vs. today)

| Reference element | Today | Type |
| --- | --- | --- |
| Time-based greeting + centered hero empty state | Greeting bubble | **Restyle** |
| Suggestion **cards** (icon + title + subtitle) | `ion-chip`s | **Restyle** |
| Composer (rounded input, Ask pill, send) | textarea + arrow | **Restyle** |
| Message / answer **card** look | basic bubbles | **Restyle** |
| "Returning results…" loading w/ hero | 3-dot typing | **Restyle** |
| Reasoning disclosure ("see/hide reasoning") | none | **New capability** — needs backend to emit reasoning |
| Rich answers (tables, inline code chips) | bold/italic only | **New capability** — needs a markdown renderer |
| Answer feedback row (👍/👎/copy) | none | **New capability** |

---

## Brand translation (Cloudflare → FRED)

- Cloudflare **orange** → FRED **blue `#2563EB`** for accents; `#111827` for dark text/CTAs.
- Cloudflare **cloud illustration** → FRED **mascot** (`assets/icon/pfp.png`) or a FRED-styled hero.
- Inter/system font → **Manrope**.
- Keep **light mode** (FRED is light-only for now — see the design-system memory).
- Suggestion-card **content** must be FRED's investing prompts (from `getDailySuggestions()`), not Cloudflare's dev tasks. Only the *structure* is borrowed.
- Dotted-grid background is optional — keep subtle or drop for FRED's cleaner style.

---

## Open questions — confirm with Andy before/while building

1. **Brand fidelity:** adopt the pattern in FRED's brand (assumed default) vs. literally mimic Cloudflare's orange/cloud?
2. **Reasoning state scope:** does the chat backend expose model reasoning to stream? If not, screen 2's reasoning disclosure is **out of scope** until the backend adds it. (Today `streamChat()` only yields tokens.)
3. **Rich-answer scope:** is table / markdown rendering in scope (adds a markdown-renderer dependency), or keep the current basic formatting for now?
4. **Feedback row scope:** ship the 👍/👎/copy row in this story, or split to a follow-up?
5. **History drawer:** keep the existing right-side "History" slide-out, or replace it with the reference's top "Need more help? / Support" bar?

---

## Suggested scope split

- **Core (restyle, achievable now):** empty-state hero + time greeting + suggestion cards, composer, message/answer card styling, loading state. These are pure UI over existing behavior.
- **Stretch (new capability — decide per open questions):** reasoning disclosure, rich answer rendering, feedback row.
