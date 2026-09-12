---
name: geeks2code
description: Complete operating context for the Geeks2Code hackathon (GeeksforGeeks Campus Body MIET, 12–21 Sep 2026) — official rules, timeline, submission mechanics, judging criteria, the three Wayzyy problem statements, the chosen build (AI Trip Concierge), an inventory of the team's reusable TravelBuddy codebase, the plagiarism-rule risk model, and the full winning strategy including PPT structure and build plan. Use whenever the user asks about Geeks2Code, the Wayzyy special track, Round 1 PPT, the AI Trip Concierge project, team 404, or anything about winning this hackathon.
---

# Geeks2Code — Operating Context & Winning Strategy

Sources: Unstop listing, three official WhatsApp groups (Geeks2Code announcements, Participants Group 1 & 2), the Wayzyy problem-statement doc, and the team's own travelbuddy codebase. Organiser statements are quoted verbatim where they carry a rule.

---

## 1. Hard facts

| Item                       | Value                                                                  |
| -------------------------- | ---------------------------------------------------------------------- |
| Event                      | Geeks2Code, by GeeksforGeeks Campus Body MIET                          |
| Mode                       | Completely virtual / online                                            |
| Hackathon window           | **12 – 21 September 2026**                                             |
| Registration               | Closed 10 Sep 2026 (extended from 8 Sep)                               |
| **Round 1 — PPT**          | **12 – 14 Sep 2026**, submit on **Unstop team dashboard**              |
| Round 2 — Online Mentoring | 17 – 18 Sep 2026                                                       |
| Round 3 — Grand Finale     | 21 Sep 2026 _(Unstop timeline; prose elsewhere says 20 Sep — confirm)_ |
| File format                | **PDF or PPTX**                                                        |
| Template / slide limit     | **None.** Free layout. GFG logo optional.                              |
| Video submission in R1     | **No** — organiser answered "No" directly                              |
| Team size                  | 2–6 members                                                            |
| Hardware / IoT projects    | **Not eligible this edition**                                          |
| Hiring partner             | **Wayzyy** — the PPI is _with Wayzyy_                                  |
| Mentorship                 | From a GSoC contributor (AOSSIE-linked)                                |

**Prizes:** Winner / 1st Runner-Up / 2nd Runner-Up each get a **Pre-Placement Interview with Wayzyy** + swags + e-certificates. Participation certificate for all. Released within 7 days of event end.

**Organiser quote on hiring:** _"It is a mandatory task given by our hiring partner Wayzyy… If our hiring partner liked your project then he'll directly hire you from this hackathon."_

**Watch for:** on 12 Sep the organisers said a **second submission platform** would be added alongside Unstop, link TBD. Monitor the announcement group.

**Mandatory task (historical):** every member had to star GitHub repo(s) + submit a Google Form, deadline 8 Sep, now closed. Organisers said of those who missed it: _"We will set up threshold according to it… You don't need to worry about it."_ Verify the team completed it; it is not re-openable.

---

## 2. The rules that decide outcomes

Four organiser FAQ answers carry real weight. Treat them as binding.

| Rule                          | Verbatim                                                                                                                                                                                   | Consequence                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| **Required PPT sections**     | "Problem Statement · Proposed Solution · Innovation & Uniqueness (USP) · Technology Stack & Technical Approach · Implementation Plan · Expected Impact"                                    | All six must appear as identifiable sections. Missing one is a free deduction.                |
| **No conceptual submissions** | _"Can we submit a conceptual project? **No.** Submissions must demonstrate real technical implementation and a practical execution plan — purely conceptual presentations will not pass."_ | The deck must contain evidence of working code. Architecture diagrams alone are not enough.   |
| **Evaluation criteria**       | "innovation, problem relevance, technical feasibility, potential impact, and presentation clarity"                                                                                         | Five axes for R1. (The broader Unstop list adds functionality, scalability, UX, demo for R3.) |
| **Plagiarism**                | _"Plagiarism, copying existing projects, or **submitting previously built work as new will result in immediate disqualification**."_                                                       | See §6. This is the single largest risk to this team.                                         |

**Prototype slides:** optional, but organiser said _"if it adds value to your idea, do it!!"_ — combined with the no-conceptual rule, **include them**.

**Problem statement freedom:** _"You are completely free to choose your own problem statement… Working on the provided Unstop/Wayzyy problem statements is entirely optional."_ Choosing the Wayzyy track costs nothing in main-prize eligibility and is the only route to Wayzyy hiring consideration.

---

## 3. The Wayzyy special track

⚠️ **Naming discrepancy — resolved.** Organisers label the track _"Hiring & TalentTech — recruitment, talent discovery, hiring."_ The **actual three problem statements published on Unstop are not about recruitment at all** — they are marketplace/travel problems for Wayzyy's homestay business. The organiser label is a copy-paste error. Trust the problem-statement document, not the label.

Found on Unstop under **Themes/Domains → Special Problem Statement**. Only three exist.

### PS1 — Trust & Discovery Layer for Local Rentals

Guests booking informal/local rentals have no reliable way to verify host legitimacy or judge neighbourhood fit before booking.
Build: host verification module (ID/doc upload, face match, doc authenticity heuristics → "Verified Host" badge) · scam/fraud detector on listing text/price/review patterns · "neighbourhood vibe" generator (review text + mock local data → short AI summary) · trust score UI on listing cards.
_Judging hook (their words): "directly pluggable into a real listing page — strong 'could ship tomorrow' story."_

### PS2 — AI Trip Concierge (post-booking agent) ← **CHOSEN**

**Problem:** _"Booking platforms end their relationship with the guest at checkout — there's no continuity into the actual trip, which is where loyalty and upsell opportunity live."_
Build:

- **Itinerary generator** — booked property location + dates → day-by-day plan (beaches, food, activities) from static Goa data + LLM generation
- **Proactive notification agent** — scheduled/cron job messaging the guest with context-aware nudges: weather-based plan changes, "check-in tomorrow, here's parking info," local event alerts
- **Conversational interface** — WhatsApp/Telegram bot; guest asks _"what's a good place for dinner near me tonight"_ and gets a real answer
- **Local recommendation dataset** — curated JSON of restaurants, activities, transport tagged by area

_Tech angle: LLM agent + tool-calling, scheduling/cron, messaging integration, lightweight local knowledge base._
_Judging hook: "demoable live via a chat interface — very visual, good for a 5-min pitch."_

### PS3 — Host Growth Toolkit

Small hosts can't compete with algorithmic pricing, pro photography, marketing reach.
Build: dynamic pricing suggester (season, local events, competitor prices, occupancy) · auto-listing generator (raw photos + facts → AI description, title, weak-photo flags) · WhatsApp booking assistant for hosts · simple host dashboard.
_Judging hook: "strong marketing narrative… plus real technical depth."_

---

## 4. Wayzyy — who you're pitching

Full detail lives in the separate `wayzyy` skill. The facts that matter for this deck:

| Fact               | Value                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------- |
| What they are      | India-native homestay/villa marketplace, **Goa first**, pre-launch                       |
| Model              | Hosts buy **prepaid credit packs**, not per-booking commission                           |
| Effective host fee | **~2%** vs ~15–18% on Airbnb/Booking/MMT                                                 |
| Scale today        | **50+ hosts, 500+ properties, ZERO guests** — supply is solved, demand is the bottleneck |
| Verification       | Aadhaar + DigiLocker, both sides, 100%                                                   |
| Payments           | UPI-native, 24-hour payouts                                                              |
| App                | **iOS/Android "in the works" — web only today.** React Native is their stack.            |
| Contact            | hello@wayzyy.com · hosts/partnerships: akshaykumar.sharma@wayzyy.com                     |

### The three numbers that make the pitch land

1. **The CAC ceiling.** Airbnb FY2024: $81.78bn GBV, $2.1bn sales & marketing = **2.57% of GBV spent on marketing alone**. Wayzyy's _entire gross revenue_ is 2.0% of booking value. **Wayzyy cannot buy demand — not "shouldn't", cannot.** Every rupee of growth must come from a channel that is free, organic, or funded by someone else.

2. **Channel stickiness.** ~86% of guests who first book direct re-book direct; ~89% who first book Airbnb re-book Airbnb. **The first booking decides the lifetime relationship.**

3. **Host economics, their own numbers.** On ₹1,00,000 booking value: Airbnb @18% → host keeps ₹82,000. Wayzyy ₹2,200 pack → host keeps **₹97,800**.

### Why this reframes PS2

A post-booking concierge is not a "nice feature." Given (1) and (2), **retention is the only growth channel Wayzyy can afford.** The concierge is the mechanism that converts a one-time guest into a direct-repeat guest — and repeat guests are the only acquisition that costs Wayzyy nothing. That is the thesis. It turns a chatbot into a growth engine, and it is the difference between placing and winning.

Secondary angle: the in-trip window is exactly when **off-platform leakage** happens (host says "book direct next time"). A concierge that owns the in-trip relationship keeps the guest on Wayzyy's rails.

---

## 5. The existing codebase — `travelbuddy`

Built by this team for the **an earlier travel-tech hackathon** as "TravelBuddy" (Team 404 — Parsh Jain, Daksh Singh, Priyanshu Pandey, Anshul Kumar Singh, Anuraag Tandon). **This project has already been submitted elsewhere. It cannot be resubmitted.** See §6.

### Layout

```
travelbuddy/
├── server/                     Node + Express (port 5002)
│   ├── .env                    ⚠️ LIVE CREDENTIALS — see security note
│   └── src/
│       ├── index.js
│       ├── lib/
│       │   ├── geminiAuth.js       generateWithRetry() — Vertex/Gemini wrapper + retry
│       │   ├── geminiClient.js
│       │   ├── gemini.js           explanation generation, season/travel-style helpers
│       │   ├── scoring.js      508L  cosineSimilarity, updatePreferenceVector,
│       │   │                        rankDestinations, personalizeItinerary,
│       │   │                        generateRecommendationExplanation, budget pruning
│       │   ├── semanticVector.js 217L getTagEmbedding, getCardVector, sigmoidScale,
│       │   │                        updateUserVector, cosineSimilarityDense
│       │   ├── cardSelector.js
│       │   ├── geocoder.js
│       │   ├── cityCodeMap.js
│       │   └── hotelApi.js          1695L hotel/flight API client
│       ├── routes/
│       │   ├── itineraries.js  359L  ★ /generate-details — PARALLEL Gemini via
│       │   │                        Promise.all: logisticsPrompt ∥ plannerPrompt
│       │   ├── chatbot.js       51L  ★ /ask — single-turn Q&A, tight system prompt
│       │   ├── destination.js  593L
│       │   ├── swipe.js, session.js, cards.js, preferences.js,
│       │   └── calibration.js, auth.js, photo.js
│       ├── models/             Destination, Session, SwipeCard, User (Mongoose)
│       └── data/               destinations, europeanDestinations1-6, tagPools, swipeCards
└── travel-buddy/               Next.js 15 + React 19 + Tailwind + Framer Motion
    └── src/
        ├── app/                layout, page, providers, api/auth (OTP routes)
        ├── components/
        │   ├── discovery/      SwipeEngine, SwipeCard, CardDetail, ContextualDuel,
        │   │                   DestinationShortlist, PreferenceSummary, ProfileDrawer
        │   ├── itinerary/      ItineraryView, FullItineraryModal, CityMap,
        │   │                   TravelChatbot, PaymentGateway, BookingLoader,
        │   │                   HotelStreetViewModal, LocationStreetViewModal
        │   ├── auth/, onboarding/, profile/, ui/
        ├── lib/                api.ts, bookingPdf.ts, utils.ts
        └── store/, hooks/, data/
```

Deps: `@google/genai`, `express`, `mongoose`, `axios`, `bcryptjs`, `xml2js`, `node-fetch`.

### ⚠️ Security — act on this

`server/.env` contains **live** `MONGODB_URI`, `HOTEL_API_USERNAME`, `HOTEL_API_PASSWORD`, `VERTEX_API_KEY`, `VERTEX_PROJECT_ID`. The zip has been moved between machines. **Rotate all of these**, and make sure `.env` is gitignored in the new repo before the first push. A leaked key in a public submission repo is its own disqualification-grade embarrassment.

---

## 6. The plagiarism rule — risk model

The rule is unusually hard: _"submitting previously built work as new **will result in immediate disqualification**."_ Not "may." TravelBuddy was submitted to that earlier hackathon. Treat this as the top project risk and manage it deliberately.

| Asset                                                                                                                    | Risk                  | Ruling                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gemini wrapper (`geminiAuth.js`, retry logic), Express scaffolding, Mongoose setup, Tailwind config, deployment pipeline | **Safe**              | Library-level infrastructure. Nobody calls this plagiarism. Reuse freely.                                                                                                                    |
| Parallel-prompt architecture (`Promise.all` over two specialised prompts)                                                | **Medium**            | Reuse the _technique_, reimplement for the new context. The prompts must be new anyway — post-booking single-property Goa ≠ pre-booking multi-destination Europe. Don't copy-paste the file. |
| `scoring.js` / `semanticVector.js` ranking + explainability                                                              | **Medium**            | Genuinely useful for ranking Goa recommendations. Port the functions you need, cite them in the README as your own prior work.                                                               |
| Swipe engine, destination discovery UI, `ContextualDuel`, `PreferenceSummary`, hotel-API client                                | **High — do not use** | These _are_ TravelBuddy's identity. Reusing them makes the submission look like a reskin.                                                                                                    |
| The TravelBuddy repo itself, `finalRoundPPT.pptx`, old-project branding                                                          | **Disqualifying**     | Never submit.                                                                                                                                                                                |

### Mitigation — do all four

1. **Fresh repository, fresh commit history.** Do not submit `travelbuddy`. New repo, new name.
2. **Build the new core genuinely new.** WhatsApp/Telegram integration, the tool-calling agent loop, the proactive scheduler, and the Goa knowledge base do not exist in TravelBuddy. That is the majority of this product, and it is honest new work.
3. **Declare prior art in the deck and README.** One line on the tech slide: _"Builds on our own prior work on LLM itinerary generation (TravelBuddy, an earlier travel-tech hackathon). New in this project: conversational agent with tool-calling, proactive scheduling agent, Goa-grounded knowledge base, WhatsApp delivery."_ Declared reuse reads as credibility; concealed reuse is what gets teams disqualified.
4. **Never present TravelBuddy screenshots as this project's prototype.**

---

## 7. The build — AI Trip Concierge

**Working name:** pick something non-TravelBuddy. _Sahay_, _Concierge_, _Waypoint_, _Trailhead_ — anything that isn't a travel-discovery brand.

**One-line thesis:**

> Wayzyy can't afford to buy guests, so the only growth it can afford is keeping the ones it has — and that relationship is won during the trip, not at checkout.

### Architecture — four components

**1. Agent core (the differentiator).** Not a RAG chatbot — a **tool-calling agent**. Most competing teams will ship a Q&A bot over a vector store. Ship an agent with a real tool surface:

| Tool                                  | Purpose                                         |
| ------------------------------------- | ----------------------------------------------- |
| `get_booking_context()`               | property, area, dates, party size, host contact |
| `find_nearby(category, time, budget)` | grounded lookup against the Goa KB              |
| `get_weather(date)`                   | live forecast                                   |
| `reschedule_day(day, reason)`         | rewrite the itinerary, return a diff            |
| `notify_host(message)`                | route a guest request to the host               |
| `get_local_events(date_range)`        | festivals, markets, silent-disco nights         |

The agent loop + tool schemas are new code. This is what makes it an _agent_ and not a chatbot, and it is the single most defensible technical claim in the deck.

**2. Proactive notification agent (the moat).** A scheduler that wakes on its own and decides whether to message. Almost nobody will build this properly — most teams will demo a reactive bot only. Triggers:

- T-24h before check-in → parking, directions, host contact, key handover
- Morning-of, weather-conditioned → _"Monsoon warning for Dudhsagar today. I've moved the falls to Day 3 and put Fontainhas walking tour in its place. Confirm?"_
- Mid-trip → local event alert, dinner nudge at 6pm
- T-2h before checkout → checkout steps, cab booking, review prompt

**The weather-triggered itinerary rewrite is the demo moment.** It proves agency, grounding, and real-world usefulness in one screen. Build the demo around it.

**3. Goa-grounded knowledge base.** Curated JSON: restaurants, beaches, activities, transport — each tagged by area (North/South, beach proximity), price band, timing, monsoon-safe flag. Grounding the agent in a real dataset is your anti-hallucination story, and judges reward it. Reuse the tag-vector + explainability pattern from `scoring.js` to rank and to answer _"why this one?"_.

**4. Itinerary generator.** Property location + dates → day-by-day plan. Reimplement the parallel-prompt technique for this context (logistics thread ∥ activities thread). New prompts, new domain.

**Delivery:** WhatsApp Cloud API — free sandbox, 1,000 service conversations/month, customer-initiated conversations free inside the 24h window, ~₹0.115 per utility template message in India. Telegram is an acceptable faster fallback for the demo; say which and why.

### Metrics to claim (with mechanism, not vibes)

- **Repeat-booking rate lift** — the headline. Tie to the 86/89% stickiness data.
- **Upsell attach rate** — activities/transport booked through the concierge
- **Support deflection** — % of guest questions resolved without the host
- **Response latency** — p50/p99 of the agent loop
- **Cost per guest-trip** — LLM tokens + WhatsApp messages; a real number here is rare and impressive

---

## 8. Round 1 PPT — structure

Due **14 Sep, 11:59 PM IST**. No template, no slide limit, PDF or PPTX. All six required sections must be identifiable. ~12–14 slides.

| #   | Slide                             | Content                                                                                                                                                     |
| --- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Title                             | Product name, one-line thesis, Team 404, **track: Wayzyy Special PS — AI Trip Concierge**                                                                   |
| 2   | **Problem Statement** ✓           | Quote their line: _"Booking platforms end their relationship with the guest at checkout."_ Then sharpen it for Wayzyy: 500 properties, zero guests.         |
| 3   | The arithmetic                    | Airbnb 2.57% of GBV on marketing vs Wayzyy's entire 2.0% revenue → **they cannot buy demand.** This slide is why you win.                                   |
| 4   | Insight                           | 86/89% channel stickiness → the first booking decides the lifetime relationship → retention is the only affordable growth → **the trip is where it's won.** |
| 5   | **Proposed Solution** ✓           | One diagram: Agent core + Proactive scheduler + Goa KB + Itinerary engine, delivered over WhatsApp                                                          |
| 6   | **Innovation / USP** ✓            | Agent with tool-calling, not a chatbot. Proactive, not reactive. Grounded, not hallucinated. Name the tool surface explicitly.                              |
| 7   | The demo moment                   | The weather-triggered itinerary rewrite, as a mocked-up WhatsApp thread. Make it feel real.                                                                 |
| 8   | **Technology Stack & Approach** ✓ | Architecture diagram, agent loop, tool schemas, KB structure, parallel-prompt generation, WhatsApp Cloud API. **+ the prior-art declaration line.**         |
| 9   | Prototype evidence                | Screenshots of anything actually running. Required in spirit by the no-conceptual rule.                                                                     |
| 10  | **Expected Impact** ✓             | Repeat-rate lift, upsell attach, support deflection, latency, cost/trip. Tie to ₹97,800 vs ₹82,000 host economics.                                          |
| 11  | **Implementation Plan** ✓         | What's built, what ships by 21 Sep, what's explicitly out of scope                                                                                          |
| 12  | Feasibility & scale               | WhatsApp free tier math, LLM cost per trip, what breaks at 10k guests                                                                                       |
| 13  | Team                              | 5 members + _"shipped TravelBuddy at that earlier hackathon"_ as credential                                                                                      |

**Design:** your TravelBuddy deck (FINAL-1.pdf) was genuinely well-designed — clean type, strong diagrams, good use of whitespace. Reuse the _visual system_, not the content.

---

## 9. Execution plan

| Window        | Work                                                                                                                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **12–13 Sep** | Lock scope. New repo + rotate leaked keys. Stand up the smallest possible working slice: Telegram/WhatsApp echo → agent loop with 2 tools (`find_nearby`, `get_weather`) → grounded answer. Screenshot it. |
| **13–14 Sep** | Build the deck. Slides 3, 4, 6, 7 are the differentiators — spend the time there.                                                                                                                          |
| **14 Sep**    | **Submit on Unstop.** Not in the final hour. Watch the announcement group for the second submission platform.                                                                                              |
| 15–16 Sep     | Proactive scheduler. Goa KB expansion. Itinerary generator.                                                                                                                                                |
| **17–18 Sep** | **Mentoring.** Go in with a specific question — _"should we optimise for repeat-booking rate or in-trip upsell attach?"_ — not "what do you think?" Visibly apply the feedback in R3; judges reward it.    |
| 19–20 Sep     | Full tool surface. Weather-triggered rewrite working end-to-end. Rehearse the demo 5×.                                                                                                                     |
| 20 Sep        | Freeze. Record a backup demo video + seed local data. **Never demo live against a third-party API alone.**                                                                                                 |
| **21 Sep**    | Grand Finale — demo, technical explanation, Q&A                                                                                                                                                            |

---

## 10. Q&A preparation

| Likely question                                              | Answer                                                                                                                                                                                                                      |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _"How is this different from ChatGPT with a travel prompt?"_ | Tool-calling against a grounded Goa KB + booking context, and it initiates contact. A chatbot waits; an agent acts. Show the weather-rewrite.                                                                               |
| _"Isn't this just your earlier project?"_                        | Different problem (post-booking vs pre-booking), different surface (WhatsApp vs web swipe), different core (agent loop + scheduler, neither of which existed). We reused our own infrastructure and declared it on slide 8. |
| _"What stops the LLM hallucinating a restaurant?"_           | Every recommendation resolves through `find_nearby` against the curated KB. The model composes; it doesn't invent.                                                                                                          |
| _"WhatsApp API costs?"_                                      | Free sandbox, 1,000 service conversations/mo; guest-initiated is free inside 24h; ₹0.115/utility template in India. Per-trip cost model on slide 12.                                                                        |
| _"Why would Wayzyy build this over a booking feature?"_      | Because they can't buy demand — 2.57% vs 2.0%. Retention is the only channel they can afford, and 89% stickiness means the first trip decides the lifetime.                                                                 |
| _"Does this scale beyond Goa?"_                              | The KB is the only Goa-specific layer; agent, scheduler, and generator are geography-agnostic. New city = new dataset.                                                                                                      |

---

## 11. Open items

- [ ] Confirm Round 3 date — Unstop timeline says 21 Sep, prose says 20 Sep
- [ ] Watch announcement group for the **second submission platform** link
- [ ] Confirm every team member completed the mandatory GitHub-star task (closed 8 Sep)
- [ ] **Rotate the credentials in `server/.env`**
- [ ] Decide WhatsApp Cloud API vs Telegram for the demo (Telegram is faster to stand up; WhatsApp is what Wayzyy actually needs)
- [ ] Pick the product name

---

## 12. Key contacts

| Role                      | Contact                                               |
| ------------------------- | ----------------------------------------------------- |
| Organiser support         | gfg@miet.ac.in                                        |
| Announcements group       | WhatsApp "Geeks2Code" community                       |
| Technical/Unstop glitches | admin "Muneer Ali" (via group DM)                     |
| Non-tech queries          | admins Ditya, Shaurya Pratap, Gaurika Dogra, Sarthika |
| Wayzyy general            | hello@wayzyy.com                                      |
