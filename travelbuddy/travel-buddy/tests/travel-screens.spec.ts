import { expect, test, type Page } from "@playwright/test";
import { generateItinerary } from "../src/data/itineraryMock";

async function createTrip(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Create a trip", exact: true })
    .click();
  await page
    .getByLabel("Trip name", { exact: true })
    .fill("A little coastal escape");
  await page.getByLabel("Destination", { exact: true }).fill("Goa");
  await page.getByLabel("Country", { exact: true }).fill("India");
  await page.getByLabel("Start date", { exact: true }).fill("2027-01-20");
  await page.getByLabel("End date", { exact: true }).fill("2027-01-22");
  await page.getByLabel("Travelers", { exact: true }).fill("2");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create trip", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A little coastal escape", exact: true }),
  ).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: null }),
  );
  await page.route("**/api/notifications/stream", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: ": heartbeat\n\n",
    }),
  );
});

test("the existing planner stays reachable and links back home", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Plan", exact: true }).click();
  await expect(page).toHaveURL(/\/plan$/);
  await page.getByRole("link", { name: "Back to trip homepage", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My trip", exact: true })).toBeVisible();
});

test("legacy full itineraries render without leaking into another account", async ({ page }, info) => {
  const itinerary = { ...generateItinerary("goa", 45000), image: "/goa/beaches-of-goa.jpg" };
  await page.addInitScript((itinerary) => {
    sessionStorage.setItem("demo_hackathon_state", JSON.stringify({ itinerary, sessionId: "legacy-test", sessionData: { checkIn: "2027-01-20", checkOut: "2027-01-24", travelers: 2 } }));
  }, itinerary);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Trip to Goa", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Departure", exact: true })).toBeVisible();
  await expect(page.getByText("Taj Holiday Village Resort", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Flights", exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("full-itinerary.png"), fullPage: true });
  await page.unroute("**/api/auth/session");
  await page.route("**/api/auth/session", route => route.fulfill({ json: { user: { email: "other@example.test", name: "Other traveler" }, expires: "2099-01-01T00:00:00Z" } }));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Where are we off to?", exact: true })).toBeVisible();
});

test("create, edit, persist, notify, and navigate across screen sizes", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await createTrip(page);
  await page
    .getByRole("button", { name: "Add activity to day 1", exact: true })
    .click();
  await page.getByLabel("Activity", { exact: true }).fill("Candolim Beach");
  await page.getByLabel("Local time", { exact: true }).fill("11:00");
  await page
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption("relax");
  await page
    .getByLabel("Details", { exact: true })
    .fill("A slow morning by the sea.");
  await page
    .getByRole("button", { name: "Save activity", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Candolim Beach", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit Candolim Beach, day 1", exact: true })
    .click();
  await page.getByLabel("Local time", { exact: true }).fill("11:30");
  await page
    .getByRole("button", { name: "Save activity", exact: true })
    .click();
  await page.reload();
  await expect(page.getByText("11:30", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your itinerary", exact: true }),
  ).toBeVisible();
  const hero = page.getByRole("img", { name: "Goa, India", exact: true });
  await expect(hero).toBeVisible();
  expect(
    await hero.evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(0);
  await page.screenshot({
    path: info.outputPath("homepage.png"),
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Notifications, 3 unread", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Notifications", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Candolim Beach updated to 11:30 on day 1 (2027-01-20).", {
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("notifications.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Unread", exact: true }).click();
  await page
    .getByRole("button", { name: "Mark all as read", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "All caught up", exact: true }),
  ).toBeVisible();
  await page.getByRole("switch").uncheck();
  await page.reload();
  await expect(page.getByRole("switch")).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "Mark all as read", exact: true }),
  ).toBeDisabled();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const nav = await page
      .getByRole("navigation", { name: "Main navigation", exact: true })
      .boundingBox();
    const assistant = await page
      .getByRole("button", { name: "Open travel assistant", exact: true })
      .boundingBox();
    expect(
      nav &&
        assistant &&
        (nav.x + nav.width <= assistant.x ||
          assistant.y + assistant.height <= nav.y),
    ).toBeTruthy();
  }
  await page
    .getByRole("button", { name: "Open travel assistant", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Travel Assistant", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close travel assistant", exact: true })
    .click();
  expect(errors).toEqual([]);
});

test("live SSE deliveries are filtered, deduplicated, and readable", async ({
  page,
}) => {
  await createTrip(page);
  const tripId = await page.evaluate(
    () => JSON.parse(localStorage.getItem("tb:travel:v1:guest")!).trip.id,
  );
  const event = {
    id: "provider-1",
    tripId,
    kind: "alert",
    title: "Ferry departure changed",
    message: "Your ferry now departs at 14:30.",
    createdAt: new Date().toISOString(),
    day: 2,
    read: false,
  };
  await page.unroute("**/api/notifications/stream");
  await page.route("**/api/notifications/stream", (route) =>
    route.fulfill({
      contentType: "text/event-stream",
      body: [event, event, { ...event, id: "foreign", tripId: "someone-else" }]
        .map((n) => `id: ${n.id}\ndata: ${JSON.stringify(n)}\n\n`)
        .join(""),
    }),
  );
  await page.reload();
  await page.getByRole("link", { name: "Updates", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: event.title, exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Alerts", exact: true }).click();
  await page.getByRole("link", { name: "View day 2", exact: true }).click();
  await expect(page).toHaveURL(/#day-2$/);
  await page.getByRole("link", { name: "Updates", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: `Mark ${event.title} as read`,
      exact: true,
    }),
  ).toBeDisabled();
});

test("another tab receives changes and malformed storage has a recovery state", async ({
  page,
  context,
}) => {
  await createTrip(page);
  const second = await context.newPage();
  await second.route("**/api/auth/session", (route) =>
    route.fulfill({ json: null }),
  );
  await second.route("**/api/notifications/stream", (route) =>
    route.fulfill({ contentType: "text/event-stream", body: ": ok\n\n" }),
  );
  await second.goto("/notifications");
  await page
    .getByRole("button", { name: "Edit trip details", exact: true })
    .click();
  await page.getByLabel("Trip name", { exact: true }).fill("Our Goa holiday");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    second.getByText("Details for Our Goa holiday have changed.", {
      exact: true,
    }),
  ).toBeVisible();
  await second.close();
  await page.evaluate(() =>
    localStorage.setItem("tb:travel:v1:guest", "invalid json"),
  );
  await page.reload();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Saved trip data could not be loaded",
  );
});
