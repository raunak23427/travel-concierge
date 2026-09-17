import { expect, test } from "@playwright/test";
import {
  addNotices,
  dayDate,
  dueReminders,
  emptyTravelState,
  isNotice,
  isTrip,
  parseTravelState,
  validDate,
  type SavedTrip,
} from "../src/lib/trip-updates";

const sampleTrip: SavedTrip = {
  id: "test-goa",
  name: "A little coastal escape",
  destination: "Goa",
  country: "India",
  startDate: "2026-09-17",
  endDate: "2026-09-19",
  timeZone: "Asia/Kolkata",
  travelers: 2,
  image: "/goa/beaches-of-goa.jpg",
  flights: [],
  hotel: null,
  transfers: [],
  days: [
    {
      day: 1,
      title: "Arrival & beach time",
      items: [
        {
          time: "11:00",
          activity: "Candolim Beach",
          description: "A slow morning by the sea.",
          cost: 0,
          type: "relax",
        },
      ],
    },
  ],
};

test("reminders use the destination time zone with 30 and 5 minute alerts", () => {
  const thirtyMinuteReminder = dueReminders(
    sampleTrip,
    new Date("2026-09-17T05:00:00Z"),
  );
  expect(thirtyMinuteReminder).toHaveLength(1);
  expect(thirtyMinuteReminder[0].title).toContain("Get ready in 30 minutes");
  expect(
    dueReminders(sampleTrip, new Date("2026-09-17T05:25:00Z")),
  ).toHaveLength(1);
  expect(
    dueReminders(sampleTrip, new Date("2026-09-17T05:24:00Z")),
  ).toHaveLength(0);
  expect(
    dueReminders(sampleTrip, new Date("2026-09-17T05:41:00Z")),
  ).toHaveLength(0);
});
test("calendar rollover works across a year and leap day", () => {
  expect(dayDate("2026-12-31", 2)).toBe("2027-01-01");
  expect(dayDate("2028-02-28", 2)).toBe("2028-02-29");
  expect(validDate("2026-02-30")).toBe(false);
  expect(dueReminders({ ...sampleTrip, startDate: "" }, new Date())).toEqual(
    [],
  );
});
test("midnight reminders include the next day and ignore unparseable times", () => {
  const trip = {
    ...sampleTrip,
    days: [
      {
        day: 2,
        title: "Early start",
        items: [
          { ...sampleTrip.days[0].items[0], time: "00:10" },
          { ...sampleTrip.days[0].items[0], time: "Morning" },
        ],
      },
    ],
  };
  expect(dueReminders(trip, new Date("2026-09-17T18:35:00Z"))).toHaveLength(1);
});
test("duplicate deliveries retain read state and isolate trips", () => {
  const notices = dueReminders(sampleTrip, new Date("2026-09-17T05:25:00Z"));
  const first = addNotices(
    { ...emptyTravelState(), trip: sampleTrip },
    notices,
  );
  first.notifications[0].read = true;
  const result = addNotices(first, [
    ...notices,
    { ...notices[0], id: "foreign", tripId: "another-trip" },
  ]);
  expect(result.notifications).toHaveLength(1);
  expect(result.notifications[0].read).toBe(true);
});
test("malformed storage and incoming events are rejected", () => {
  expect(isTrip(sampleTrip)).toBe(true);
  expect(isTrip({ ...sampleTrip, days: [{ day: 1, items: null }] })).toBe(
    false,
  );
  expect(isTrip({ ...sampleTrip, timeZone: "Not/AZone" })).toBe(false);
  expect(isNotice({ id: "x", kind: "alert" })).toBe(false);
  expect(() => parseTravelState('{"version":2}')).toThrow();
  expect(parseTravelState(null)).toEqual(emptyTravelState());
});
test("reminder behavior respects daylight saving offset changes", () => {
  const trip = {
    ...sampleTrip,
    timeZone: "Europe/Paris",
    startDate: "2026-10-25",
    days: [
      {
        day: 1,
        title: "Morning",
        items: [{ ...sampleTrip.days[0].items[0], time: "09:00" }],
      },
    ],
  };
  expect(dueReminders(trip, new Date("2026-10-25T07:55:00Z"))).toHaveLength(1);
  expect(dueReminders(trip, new Date("2026-10-25T06:30:00Z"))).toHaveLength(0);
});
