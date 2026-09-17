# Homepage and Notifications

## Architecture

Web-based: Next.js 15 App Router, React 19, TypeScript, CSS Modules, and the existing Lucide icon library. Both screens inherit the application's Raleway typography, yellow primary color, pale background, white surfaces, rounded controls, and floating bottom navigation. Layouts expand into two columns on desktop and stack on phones.

The homepage is `/`, notifications are `/notifications`, and the existing discovery/planning flow is preserved at `/plan`. `TravelProvider`, inside the existing session provider, owns one active trip, the notification inbox, reminder preference, unread count, and connection status. The existing travel assistant is reused with a launcher that clears the bottom navigation.

## Screen Code

- Homepage: `src/components/travel/HomeScreen.tsx`, mounted by `src/app/page.tsx`.
- Notifications: `src/components/travel/NotificationsScreen.tsx`, mounted by `src/app/notifications/page.tsx`.
- Shared theme and responsive layout: `src/components/travel/travel.module.css`.
- Header, navigation, assistant: `src/components/travel/TravelShell.tsx`.
- Trip and activity dialogs: `src/components/travel/TripEditors.tsx`.
- State, subscriptions, read actions: `src/components/travel/TravelProvider.tsx`.
- Validation, date helpers, reminder scheduling: `src/lib/trip-updates.ts`.
- Legacy planner integration: `src/components/travel/PlannerBridge.tsx`.

The homepage displays the trip's name, destination, dates, travelers, every itinerary day, activities, must-do experiences, flights, stay, and transfers when supplied. Blank days stay visible. Editing trip details and adding or rescheduling activities generates immediate schedule-change notifications. Opening a notification links to its relevant itinerary day and marks it read. Filtering and mark-all-read actions do not delete notifications.

## How Updates Work

Local reminders run every 15 seconds while the app is mounted, and immediately when it returns to the foreground. An activity is eligible between 30 minutes before its scheduled local time and its start time. Only valid 24-hour `HH:mm` times with a known trip date are scheduled. Calendar comparisons use the trip's IANA time zone, not the device's time zone. Invalid times such as `Morning` are displayed but not scheduled. Notification IDs prevent repeats within the retained inbox, including replays after reload. Daylight-saving repeated wall-clock times are treated as one activity occurrence.

Trip edits update shared React state immediately. Local storage persists trip data, the latest 500 notifications, read flags, and preferences per signed-in email, with a separate guest namespace. Storage events update other tabs. Concurrent writes are best-effort local-storage writes, not transactional multi-device synchronization. Storage failures retain the current tab's usable state and show an error.

When `NEXT_PUBLIC_NOTIFICATION_STREAM_URL` is set, the provider opens a native `EventSource` connection. It accepts only same-origin paths and uses the browser's existing session cookies. The browser retries dropped connections, while the screen displays connecting, connected, reconnecting, and offline states. Subscriptions and timers are cleaned up when their scope changes or the provider unmounts.

The configured server must send unnamed SSE messages, each containing one JSON notification:

```text
id: notification-unique-id
data: {"id":"notification-unique-id","tripId":"your-saved-trip-id","kind":"alert","title":"Ferry departure changed","message":"Your ferry now departs at 14:30.","createdAt":"2026-09-17T08:00:00Z","day":2,"read":false}

```

`kind` is `reminder`, `change`, or `alert`; `day` is optional. IDs must be stable across retries and unique across events. `tripId` must match the active trip's ID. Malformed payloads are rejected, events for other trips are ignored, and duplicate events preserve existing read state. The optional live feed delivers notifications only: your backend's itinerary API must separately supply authoritative itinerary changes through `saveTrip` if it also changes scheduled activities.

## Setup and Integration

1. In `travelbuddy/travel-buddy`, run `npm install` and `npm run dev`. Open `http://localhost:3000` (or the port printed by Next). No notification service is needed for trip editing or on-device reminders.
2. Create a trip on the homepage, or finish an itinerary in `/plan`. Generated planner itineraries are imported automatically. The bridge records its source snapshot so reopening an unchanged planner does not overwrite homepage edits. Legacy guest session data is migrated only into the guest scope. Non-India planner itineraries default to UTC until the destination time zone is edited.
3. For server updates, supply an authenticated same-origin SSE endpoint and set `NEXT_PUBLIC_NOTIFICATION_STREAM_URL=/api/notifications/stream` in `.env.local`; restart development or rebuild production. This repository does not currently include that service. Do not set this variable until the endpoint exists.
4. The server must authorize the signed-in user's trip access before streaming, persist notification history, replay missed events using `Last-Event-ID`, send heartbeat comments, and disable response/proxy buffering. Use `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, and `X-Accel-Buffering: no` where supported. On a fresh connection, replay retained unread history as well as live events; the client handles duplicates. Use your application's canonical trip IDs when connecting the existing planner to the server.
5. Production deployment also needs a durable trip/read-state API for cross-device access. This frontend stores read state on the device. Browser storage scoping is not a server authorization boundary. The existing planner still has its pre-existing demo authentication and fallback behavior, so the overall application is not deployment-ready until real authentication, backend configuration, and dependency findings are addressed.
6. Closed-app push delivery is not implemented. It requires a service worker with Web Push/FCM and server-side scheduling; the on-device scheduler cannot run while the app is closed. Live flight, weather, or booking information requires actual provider integrations. No synthetic alerts are presented as live data.
7. The existing travel assistant still requires the Express chatbot endpoint configured through `NEXT_PUBLIC_API_URL`.

## Verification

```sh
npm run typecheck
npx playwright install chromium
npm run test:travel
npm run build
```

Tests start an isolated development server on port 3100 with its own `.next-test` output directory and mocked session/SSE endpoints. Keep port 3100 free. The tests cover reminder time-zone boundaries, midnight and DST handling, validation, duplicates, read persistence, trip editing, live SSE payloads, trip isolation, cross-tab delivery, corrupt storage, mobile/desktop layout, image loading, and assistant navigation. Screenshots and failure traces are written to `test-results/`.
