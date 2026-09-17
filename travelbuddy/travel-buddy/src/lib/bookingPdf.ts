import { jsPDF } from "jspdf";
import { TripItinerary } from "@/data/itineraryMock";
import type { PaymentSuccessDetails } from "@/components/itinerary/PaymentGateway";
import { deriveDurationLabel } from "@/lib/utils";

export interface BookingPdfInput {
  itinerary: TripItinerary;
  /**
   * Only present when the trip was actually paid for. Exporting the itinerary
   * on its own omits the billing section entirely rather than printing
   * placeholder transaction details that never happened.
   */
  payment?: PaymentSuccessDetails;
  bookedAt?: string;
}

const OFFICIAL_HotelAPI_LOGO_PATH = "/hotelApi-logo.png";

const COLORS = {
  ink: [18, 32, 56] as [number, number, number],
  muted: [99, 115, 129] as [number, number, number],
  border: [219, 229, 240] as [number, number, number],
  soft: [245, 248, 252] as [number, number, number],
  hotelApiBlue: [0, 78, 146] as [number, number, number],
  hotelApiBlueLight: [228, 241, 252] as [number, number, number],
  hotelApiBlueMid: [0, 132, 203] as [number, number, number],
  hotelApiOrange: [245, 130, 32] as [number, number, number],
  hotelApiOrangeLight: [255, 242, 230] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
};

function formatCurrency(value: number): string {
  return `INR ${Math.round(value || 0).toLocaleString("en-IN")}`;
}

function formatEstimatedCurrency(value: number): string {
  return `Est. ${formatCurrency(value)}`;
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function downloadBookingConfirmationPdf({
  itinerary,
  payment,
  bookedAt,
}: BookingPdfInput): Promise<void> {
  return generateBookingPdf({ itinerary, payment, bookedAt });
}

async function imageUrlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function generateBookingPdf({
  itinerary,
  payment,
  bookedAt,
}: BookingPdfInput): Promise<void> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 32;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 14;
  let y = margin;

  const setTextColor = (c: [number, number, number]) =>
    doc.setTextColor(c[0], c[1], c[2]);

  const ensureSpace = (needed: number) => {
    if (y + needed <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  };

  const card = (
    x: number,
    yy: number,
    w: number,
    h: number,
    fill: [number, number, number],
    border = COLORS.border,
    radius = 10,
  ) => {
    doc.setFillColor(fill[0], fill[1], fill[2]);
    doc.setDrawColor(border[0], border[1], border[2]);
    doc.roundedRect(x, yy, w, h, radius, radius, "FD");
  };

  const wrappedHeight = (text: string, fontSize: number, width: number) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, width);
    return lines.length * (fontSize + 3);
  };

  const writeWrapped = (
    text: string,
    x: number,
    yy: number,
    width: number,
    fontSize = 11,
    bold = false,
    color: [number, number, number] = COLORS.ink,
  ) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    setTextColor(color);
    const lines = doc.splitTextToSize(text, width);
    doc.text(lines, x, yy);
    return lines.length * (fontSize + 3);
  };

  const sectionTitle = (title: string, subtitle?: string) => {
    ensureSpace(46);
    doc.setFillColor(COLORS.hotelApiBlue[0], COLORS.hotelApiBlue[1], COLORS.hotelApiBlue[2]);
    doc.roundedRect(margin, y - 11, 4, 18, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    setTextColor(COLORS.hotelApiBlue);
    doc.text(title, margin + 10, y);
    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      setTextColor(COLORS.muted);
      doc.text(subtitle, margin + 10, y + 14);
      y += 30;
    } else {
      y += 22;
    }
    doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
    doc.line(margin + 10, y - 5, pageWidth - margin, y - 5);
  };

  const hotelApiLogoDataUrl = await imageUrlToDataUrl(OFFICIAL_HotelAPI_LOGO_PATH);

  const keyValue = (label: string, value: string, x: number, yy: number, w: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setTextColor(COLORS.muted);
    doc.text(label, x, yy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setTextColor(COLORS.ink);
    const lines = doc.splitTextToSize(value, w);
    doc.text(lines, x, yy + 13);
    return 13 + lines.length * 14;
  };

  const durationLabel = deriveDurationLabel(
    Array.isArray(itinerary.days) ? itinerary.days : [],
    itinerary.duration || "",
  );
  const bookedAtValue = bookedAt || payment?.paidAt || new Date().toISOString();
  const bookingRef = `TB-${new Date(bookedAtValue).getTime().toString().slice(-8)}`;

  ensureSpace(166);
  card(margin, y, contentWidth, 150, COLORS.hotelApiBlueLight, COLORS.border, 14);
  card(margin, y, contentWidth, 10, COLORS.hotelApiBlue, COLORS.hotelApiBlue, 8);

  // Official the hotel API provider logo, left-aligned in header.
  if (hotelApiLogoDataUrl) {
    card(margin + 12, y + 14, 116, 34, [255, 255, 255], COLORS.border, 8);
    doc.addImage(hotelApiLogoDataUrl, "PNG", margin + 20, y + 19, 98, 24);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  setTextColor(COLORS.ink);
  doc.text("Travel Itinerary", margin + 14, y + 66);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setTextColor(COLORS.muted);
  doc.text("Your personalized travel plan", margin + 14, y + 82);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setTextColor(COLORS.hotelApiOrange);
  doc.text("TravelBuddy", margin + 14, y + 98);

  card(margin + 14, y + 102, contentWidth - 28, 34, [255, 255, 255], COLORS.border, 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  setTextColor(COLORS.hotelApiBlue);
  doc.text(`${itinerary.destination}, ${itinerary.country}`, margin + 24, y + 122);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setTextColor(COLORS.muted);
  doc.text(`Duration: ${durationLabel}`, margin + 220, y + 122);

  const metaX = margin + contentWidth * 0.56;
  keyValue("Booking Reference", bookingRef, metaX, y + 24, contentWidth * 0.38);
  keyValue("Generated Date & Time", formatDateTime(new Date().toISOString()), metaX, y + 54, contentWidth * 0.38);
  keyValue("Confirmation Timestamp", formatDateTime(bookedAtValue), metaX, y + 84, contentWidth * 0.38);

  y += 168;

  sectionTitle("1. Trip Overview", "Snapshot of your planned journey");
  ensureSpace(94);
  card(margin, y, contentWidth, 82, COLORS.soft, COLORS.border, 12);
  card(margin, y, 8, 82, COLORS.hotelApiBlueMid, COLORS.hotelApiBlueMid, 8);

  const colW = (contentWidth - 24) / 3;
  const colY = y + 16;
  keyValue("Destination", itinerary.destination, margin + 10, colY, colW - 6);
  keyValue("Duration", durationLabel, margin + 10 + colW + 8, colY, colW - 6);
  keyValue("Estimated Total Trip Cost", formatEstimatedCurrency(itinerary.totalCost || 0), margin + 10 + (colW + 8) * 2, colY, colW - 6);
  y += 98;

  sectionTitle("2. Itinerary", "Day-by-day timeline · All prices are estimates");

  const days = itinerary.days || [];
  days.forEach((day) => {
    const headingHeight = 28;
    const itemBlocks = (day.items || []).map((item) => {
      const descH = wrappedHeight(item.description || "", 9, contentWidth - 124);
      return Math.max(36, 16 + descH);
    });
    const itemsHeight = itemBlocks.reduce((s, h) => s + h, 0);
    const cardHeight = headingHeight + itemsHeight + 18;

    ensureSpace(cardHeight + 10);
    card(margin, y, contentWidth, cardHeight, [255, 255, 255], COLORS.border, 12);

    doc.setFillColor(COLORS.hotelApiBlueMid[0], COLORS.hotelApiBlueMid[1], COLORS.hotelApiBlueMid[2]);
    doc.roundedRect(margin + 12, y + 10, 56, 18, 9, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`DAY ${day.day}`, margin + 26, y + 22.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    setTextColor(COLORS.ink);
    doc.text(day.title || `Day ${day.day}`, margin + 78, y + 23);

    let rowY = y + 40;
    const timelineX = margin + 28;
    const lineTop = rowY - 2;
    const lineBottom = y + cardHeight - 12;
    doc.setDrawColor(COLORS.hotelApiBlueLight[0], COLORS.hotelApiBlueLight[1], COLORS.hotelApiBlueLight[2]);
    doc.line(timelineX, lineTop, timelineX, lineBottom);

    (day.items || []).forEach((item, idx) => {
      const blockH = itemBlocks[idx];
      const markerY = rowY + 8;
      doc.setFillColor(COLORS.hotelApiOrange[0], COLORS.hotelApiOrange[1], COLORS.hotelApiOrange[2]);
      doc.circle(timelineX, markerY, 3.5, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      setTextColor(COLORS.ink);
      doc.text(`${item.time || "--:--"}  ${item.activity || "Activity"}`, margin + 42, rowY + 4);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setTextColor(COLORS.muted);
      const desc = doc.splitTextToSize(item.description || "", contentWidth - 124);
      doc.text(desc, margin + 42, rowY + 18);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setTextColor(COLORS.ink);
      if (item.cost > 0) {
        doc.text(formatEstimatedCurrency(item.cost), margin + contentWidth - 88, rowY + 4, {
          align: "right",
        });
      }

      rowY += blockH;
    });

    y += cardHeight + 10;
  });

  if (payment) {
    sectionTitle("3. Payment Information", "Estimated price breakdown and transaction details");
    ensureSpace(220);

    card(margin, y, contentWidth, 210, [255, 255, 255], COLORS.border, 12);

    const rows = [
      ["Estimated Trip Cost", formatCurrency(payment.billingSummary.tripCost)],
      ["Estimated Convenience Fee", formatCurrency(payment.billingSummary.convenienceFee)],
      ["Estimated Taxes (GST)", formatCurrency(payment.billingSummary.gst)],
      ["Estimated Discounts", `- ${formatCurrency(payment.billingSummary.travelCashDiscount)}`],
      ["Estimated Final Amount", formatCurrency(payment.billingSummary.totalPaid)],
    ];

    let rowY = y + 20;
    rows.forEach(([label, value], idx) => {
      const isFinal = idx === rows.length - 1;
      if (isFinal) {
        card(margin + 14, rowY - 11, contentWidth - 28, 26, COLORS.hotelApiOrangeLight, COLORS.border, 7);
      }
      doc.setFont("helvetica", isFinal ? "bold" : "normal");
      doc.setFontSize(isFinal ? 11 : 10);
      setTextColor(isFinal ? COLORS.hotelApiBlue : COLORS.muted);
      doc.text(label, margin + 20, rowY + 3);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(isFinal ? 11 : 10);
      setTextColor(isFinal ? COLORS.hotelApiOrange : COLORS.ink);
      doc.text(value, margin + contentWidth - 20, rowY + 3, { align: "right" });

      rowY += 28;
    });

    doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
    doc.line(margin + 14, rowY - 6, margin + contentWidth - 14, rowY - 6);

    keyValue("Payment Method", payment.paymentMethod, margin + 20, rowY + 8, contentWidth - 40);
    keyValue("Transaction ID", payment.transactionId || "N/A", margin + 20, rowY + 42, contentWidth - 40);
    keyValue("Date and Time of Payment", formatDateTime(payment.paidAt), margin + 20, rowY + 76, contentWidth - 40);

    y += 224;
  }


  ensureSpace(44);
  card(margin, y, contentWidth, 34, COLORS.soft, COLORS.border, 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setTextColor(COLORS.muted);
  doc.text(
    "This is a system-generated TravelBuddy travel itinerary document. All prices are estimates and may vary.",
    margin + 12,
    y + 21,
  );

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setTextColor(COLORS.muted);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 12, {
      align: "right",
    });
  }

  const safeDestination = (itinerary.destination || "trip")
    .replace(/\s+/g, "-")
    .toLowerCase();
  doc.save(`travelbuddy-booking-confirmation-${safeDestination}.pdf`);
}
