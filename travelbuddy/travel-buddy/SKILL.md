# TravelBuddy — project context

Working notes for anyone (human or model) picking this up cold. Written
2026-09-19.

---

## What this is

A Goa AI trip concierge for the Geeks2Code 2026 hackathon, Wayzyy special
track, Team AlphaForge. The pitch: a booking ends at checkout, and everything
after — where to eat, what's worth the drive, what happens when it rains — is
left to the guest. This app covers that part.

- **Live:** https://travel-concierge-pi.vercel.app
- **Repo:** https://github.com/raunak23427/travel-concierge
- **App code:** `travelbuddy/travel-buddy/` (Next.js 15, React 19, Tailwind v4)
- **Android:** signed TWA APK, `app.wayzyy.travelbuddy`

The repo also holds `travelbuddy/server/` — a Node/Express + Gemini backend
with a 7-tool agent. **It is not deployed.** `NEXT_PUBLIC_API_URL` is unset in
production, so `src/lib/api.ts` falls back to `localhost:5002` and every call
silently degrades to the local Goa knowledge base. Do not claim the agent is
live.

---

## The flow

1. **Onboarding** (4 steps) — stay area via OpenStreetMap pin + Nominatim
   search, dates, four-way budget split, transport modes.
2. **Swipe** — 7 vibes, 7 activities, 7 food cards. Real photography from
   Wikimedia Commons (51 images in `public/goa/`). Pure-veg selection filters
   the deck. All-left swipes trigger a split-screen duel.
3. **Shortlist → itinerary** — day-by-day plan, costed, editable, with a
   Replace action offering real Goa alternatives.
4. **Accept & Confirm** → confirmed page with Travel Cash and a PDF download.
5. **Plan tab** — the full editable itinerary plus archived plans.
6. **Telegram guide** — nudges and Q&A, shareable to travel companions.

---

## Architecture worth knowing

**State lives in the browser.** `TravelProvider` persists to
`tb:travel:v1:<email|guest>`. The planner writes `tb:planner:<email>`.
Plan history is `tb:plans:history`. There is no user database.

**The one server-side store** is for the bot: trip snapshots, invite tokens
and chat bindings, in `src/lib/store.ts`. It uses Upstash Redis over REST and
**falls back to an in-process Map when unconfigured, which is the current
state.** Measured on production: 15 sequential reads of the same trip returned
8 hits and 7 misses. Links die when traffic moves to another lambda. This is
the single biggest outstanding problem and it needs
`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.

**One assistant, two surfaces.** `src/lib/assistant.ts` holds the Groq call and
the prompt; the in-app chat and the Telegram bot both call `ask()`. Transport
sits behind a `Notifier` interface in `src/lib/telegram.ts`, so WhatsApp can be
added as a second adapter.

**Routing is real.** TomTom Routing behind `/api/routing`, OSRM as fallback,
Nominatim for geocoding, ~40 hand-verified Goa coordinates in
`src/lib/goa-geo.ts`.

**Scheduling** runs from GitHub Actions (`.github/workflows/`), not Vercel
Cron, whose Hobby tier is daily-only. Every send is claimed with `SET NX`
first. The workflow is not wired up yet — the secrets live on a different
repo than the workflow.

---

## Hard-won lessons

These cost real time. Do not relearn them.

**Tailwind v4 layering.** An unlayered rule beats a layered one whatever the
specificity. An unlayered `* { margin: 0 }` silently killed every margin
utility in the app. Resets belong in `@layer base`.

**React serialises inline styles as `rgb()`, not hex.** `background: #FF6B1A`
comes back out of the DOM as `rgb(255, 107, 26)`. Every `[style*="#HEX"]` rule
matched nothing for two rounds before this was caught. Match both spellings.

**Tailwind arbitrary values cannot contain spaces.**
`shadow-[0_8px_24px_rgba(255,107,26,0.35)]` is valid;
`rgba(255, 107, 26, 0.35)` inside the same brackets is a dead class.

**Screenshots lie about contrast.** Light grey on a mid-orange gradient reads
as dark at half scale. Measure computed colour and relative luminance instead
of trusting your eyes.

**StrictMode double-invokes state updaters.** An impure `setCards` updater
consumed two swipe cards per gesture.

**Verify features actually fire.** The first demand-pricing model moved prices
2% when it was meant to move 20 and never crossed its own alert threshold — it
would have shipped looking complete and done nothing.

---

## Configuration

Set on Vercel production. Secrets are never committed; `.env.local` is
gitignored and `.env.local.example` documents every key.

| Key                                 | Purpose                                         | State            |
| ----------------------------------- | ----------------------------------------------- | ---------------- |
| `GROQ_API_KEY`                      | assistant (`openai/gpt-oss-120b`)               | set              |
| `TOMTOM_API_KEY`                    | routing proxy                                   | set              |
| `GOOGLE_CLIENT_ID` / `_SECRET`      | OAuth                                           | set              |
| `AUTH_URL` / `AUTH_SECRET`          | NextAuth — `AUTH_URL` must be the stable domain | set              |
| `TELEGRAM_BOT_TOKEN`                | @wayzyy_goa_bot                                 | set              |
| `TELEGRAM_WEBHOOK_SECRET`           | rejects forged updates                          | set              |
| `NEXT_PUBLIC_TELEGRAM_BOT`          | deep links — **build-time, needs redeploy**     | set              |
| `CRON_SECRET`                       | notification sweep                              | set              |
| `NEXT_PUBLIC_APP_URL`               | webhook + invite URLs                           | set              |
| `HF_TOKEN`                          | photo analysis                                  | added this round |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | durable store                                   | **missing**      |

Every key in this project has been pasted in plaintext at some point and all
should be rotated before the repo goes public.

---

## Deploying

Auto-deploy is **not** connected — pushing to GitHub does nothing. The repo
owner (`raunak23427`) has to authorise the Vercel GitHub App. Until then:

```bash
cd travelbuddy/travel-buddy && npx vercel --prod --yes --scope rays-projects-6f560386
```

The `--scope` flag is required; without it the CLI returns "Not authorized".

**A deploy kills every live Telegram link** while storage is in-memory. Never
redeploy during a demo.

---

## Known gaps

- Durable storage missing — the bot forgets everything on cold start.
- The notification scheduler is manual (one `curl` against `/api/cron/notify`).
- The Gemini 7-tool agent is not connected to production.
- The deck says Gemini / WhatsApp / React Native / MongoDB. Reality is Groq /
  Telegram / Next.js / no database.
- `ConfirmedItinerary.tsx` is dead code; the Plan tab is `HomeScreen`'s
  `PlanItineraryView`.
- Previous-plans markup exists twice (Plan tab and Profile) and will drift.

---

## This round (2026-09-19)

Five items requested:

1. **This file.**
2. **Soften the orange in light mode.** `#FF6B1A` is right on dark and glares
   on a pale background. Light mode gets a softer shade via a theme-scoped
   override, so the two hexes stay in one place rather than being sprinkled
   through 45 files again.
3. **Sponsored badge on restaurants** in the itinerary — driven by a partner
   list, so it marks actual partners rather than badging every meal.
4. **Photo preference feature.** Currently posts to the undeployed Node
   backend, so it does nothing in production. Replacing that with a Hugging
   Face image model behind a Next route. Also: remove the stray profile button
   that opens `ProfileEditor` (an artefact of the older build), and switch the
   camera frame from landscape to portrait.
5. **Chatbot becomes support, not a guide.** It currently plans and advises
   like a second concierge. It should answer help questions and hand over
   Wayzyy's contact details, leaving trip guidance to the itinerary and the
   Telegram bot.
