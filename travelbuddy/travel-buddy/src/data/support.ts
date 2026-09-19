/**
 * How a guest reaches a human.
 *
 * Kept in one place because the support bot, any future contact screen and
 * the footer should never disagree about a phone number.
 *
 * TODO(team): replace these with Wayzyy's real channels before launch. They
 * are clearly marked rather than invented-and-forgotten, because a support
 * bot confidently reading out a wrong number is worse than one that says it
 * does not have it.
 */

export const SUPPORT = {
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@wayzyy.com",
  phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "",
  whatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "",
  hours: process.env.NEXT_PUBLIC_SUPPORT_HOURS || "9am – 9pm IST, every day",
  site: "https://wayzyy.com",
};

/** Only the channels that are actually configured. */
export function supportChannels(): {
  label: string;
  value: string;
  href: string;
}[] {
  const out: { label: string; value: string; href: string }[] = [];
  if (SUPPORT.email)
    out.push({
      label: "Email",
      value: SUPPORT.email,
      href: `mailto:${SUPPORT.email}`,
    });
  if (SUPPORT.phone)
    out.push({
      label: "Phone",
      value: SUPPORT.phone,
      href: `tel:${SUPPORT.phone.replace(/\s/g, "")}`,
    });
  if (SUPPORT.whatsapp)
    out.push({
      label: "WhatsApp",
      value: SUPPORT.whatsapp,
      href: `https://wa.me/${SUPPORT.whatsapp.replace(/[^0-9]/g, "")}`,
    });
  return out;
}

/** The brief the model works to. Narrow on purpose. */
export function supportBrief(): string {
  const channels = supportChannels()
    .map((c) => `${c.label}: ${c.value}`)
    .join("\n");

  return `You are Wayzyy Support inside the TravelBuddy app.

You are NOT a travel guide and NOT a trip planner. The app already plans the
trip, and the Telegram guide answers questions during it. Your job is
narrower and you should stay inside it.

You help with:
- how the app works — planning, swiping, editing a plan, the PDF, dark mode
- bookings, payments, refunds and cancellations
- account and sign-in trouble
- connecting the Telegram guide, notifications, sharing a plan with others
- anything going wrong, and how to reach a human

You do NOT:
- recommend restaurants, beaches, clubs or activities
- build, rewrite or suggest changes to an itinerary
- estimate travel times or prices

If asked for any of that, say briefly that the planner and the in-trip guide
handle it, point them at the Plan tab or the Telegram guide, and stop. Do not
answer it anyway "just this once".

Keep replies to two or three sentences. No lists unless the answer is genuinely
a sequence of steps.

When someone is stuck, frustrated, out of pocket, or asking for something you
cannot do, give them the contact details rather than apologising repeatedly:

${channels || "Email: support@wayzyy.com"}
Support hours: ${SUPPORT.hours}

Never invent an order number, refund amount, policy or timeline. If you do not
know, say so and hand over to support.`;
}
