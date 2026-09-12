# Sarathi

**In-trip AI concierge for Wayzyy homestay guests in Goa.**

> "The trip doesn't end at checkout. It starts there."

Built for **Geeks2Code 2026** (GeeksforGeeks Campus Body, MIET) — Wayzyy Special Track,
Problem Statement 2: _AI Trip Concierge_. Team 404.

---

## The thesis

Wayzyy cannot buy demand. Airbnb spends **2.57% of gross booking value** on marketing
alone; Wayzyy's _entire revenue_ is **2.0%** of booking value. It can never outbid for
a guest, so the only growth it can afford is **keeping the guests it already has** —
and that relationship is won during the trip, not at checkout.

Sarathi is a tool-calling agent that lives on a guest's phone through their stay:
it knows the booking, watches the weather, and rewrites the plan before anyone has
to ask.

## What's real

|                         |                                                                                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agent loop**          | Multi-step tool-calling against Gemini 2.5 Flash, with retry/backoff                                                                                             |
| **7 tools**             | `get_booking_context`, `get_weather`, `find_nearby`, `get_itinerary`, `reschedule_day`, `notify_host`, `get_local_events`                                        |
| **Knowledge base**      | 14 curated Goa places + 3 events, tagged by area, price band, monsoon safety — every recommendation resolves to real data, never invented                        |
| **Proactive scheduler** | 3 triggers (`pre_checkin`, `weather_reroute`, `checkout_prep`) with an idempotent send log — it messages first                                                   |
| **Web demo**            | A consumer-facing app UI (`web/index.html`) — publishable as a standalone Claude Artifact using the `sample` runtime capability for live tool-calling in-browser |

**Not built:** WhatsApp Cloud API delivery, a cron driver, a hosted datastore. The
prototype runs the agent in Node (CLI demos) or in-browser (web demo). See
`research/06-prototype-evidence.md` for the exact verified state.

## Structure

```
sarathi/
├── src/              agent.js (tool-calling loop) · tools.js (7 tool impls) · scheduler.js
├── kb/                goa.json (knowledge base) · bookings.json · weather.json
├── demo/              chat.js · proactive.js · tools.js — runnable CLI demos
├── web/               index.html — the consumer-facing demo app
├── deck/              Round 1 pitch deck (pptx + pdf)
├── research/          Hackathon rules, Wayzyy business context, prototype evidence —
│                      the source pack used to draft the pitch
├── travelbuddy/       Prior work — see below
└── .claude/skills/    Working notes on hackathon strategy and Wayzyy's business
```

## Prior work — declared, not concealed

`travelbuddy/` is an earlier travel-planning project by the same team, built for a
different hackathon. It contains real, working infrastructure Sarathi's agent-loop
pattern draws on: a parallel two-thread LLM generation technique and tag-vector
ranking utilities.

**New in Sarathi, not present in the prior project:** the tool-calling agent loop,
the proactive scheduler, the Goa knowledge base, and the consumer app surface.

This declaration exists specifically because the hackathon's rules treat submitting
prior work as new work as an immediate-disqualification offence. Reusing your own
infrastructure and saying so is not that — concealing it would be.

## Running it

```bash
npm install
node demo/tools.js       # deterministic tool layer, no LLM
node demo/proactive.js   # the scheduler + weather-reroute scenario
node demo/chat.js        # the live agent loop (needs GEMINI_API_KEY in .env)
```

Copy `.env.example` (if present) to `.env` and fill in a real Gemini API key before
running `demo/chat.js`. Never commit `.env`.

## Team 404

Parsh Jain · Daksh Singh · Priyanshu Pandey · Anshul Kumar Singh · Anuraag Tandon
