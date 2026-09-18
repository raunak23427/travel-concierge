import { expect, test } from "@playwright/test";

const weatherNotice = {
  id: "weather-demo",
  tripId: "goa-demo",
  kind: "alert" as const,
  title: "Weather outlook for Arrive at Goa Airport",
  message:
    "Partly cloudy, 28°C, 8% rain chance, wind 0 km/h. Forecast for 08:15.",
  createdAt: new Date().toISOString(),
  day: 1,
  read: false,
  weather: {
    heading: "Weather when you arrive in Goa",
    severity: "advisory" as const,
    condition: "Partly cloudy",
    temperature: 32,
    feelsLike: 35,
    rainProbability: 8,
    windSpeed: 12,
    uvIndex: 8,
    summary: "You arrive at 08:15. Expect partly cloudy skies; a little preparation will help keep your plans comfortable.",
    insights: [
      {
        activity: "Arrive at Goa Airport",
        time: "08:15",
        impact: "good" as const,
        message: "Comfortable conditions are expected.",
      },
    ],
    recommendations: ["Carry sunscreen", "Keep water with you"],
    why: "This alert is timed for Arrive at Goa Airport at 08:15.",
  },
};

test("a notification opens its details and hands context to the travel assistant", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (route) => route.fulfill({ json: null }));
  await page.addInitScript((notice) => {
    localStorage.setItem("travelbuddy:demo-mode", "true");
    localStorage.setItem(
      "tb:travel:v1:guest",
      JSON.stringify({
        version: 1,
        reminders: true,
        trip: {
          id: "goa-demo",
          name: "Goa escape",
          destination: "Goa",
          country: "India",
          startDate: "2027-01-20",
          endDate: "2027-01-22",
          timeZone: "Asia/Kolkata",
          travelers: 2,
          image: "/goa/beaches-of-goa.jpg",
          days: [
            {
              day: 1,
              title: "Arrival and the coast",
              items: [
                {
                  time: "08:15",
                  activity: "Arrive at Goa Airport",
                  description: "Airport arrival",
                  type: "transfer",
                  cost: 0,
                },
              ],
            },
          ],
          flights: [],
          hotel: null,
          transfers: [],
        },
        notifications: [notice],
      }),
    );
  }, weatherNotice);

  await page.goto("/notifications");
  await page
    .getByRole("button", { name: `Open details for ${weatherNotice.weather.heading}` })
    .click();
  await expect(
    page.getByRole("dialog", { name: weatherNotice.weather.heading }),
  ).toBeVisible();
  await expect(page.getByText("32°C · feels 35°", { exact: true })).toBeVisible();
  await expect(page.getByText("Carry sunscreen", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Discuss with Travel Assistant", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Travel Assistant", exact: true }),
  ).toBeVisible();
  await expect(page.getByPlaceholder("Ask about Goa...")).toHaveValue(
    /Help me plan around this weather alert/,
  );
});
