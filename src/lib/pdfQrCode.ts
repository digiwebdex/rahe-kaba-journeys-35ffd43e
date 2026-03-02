import QRCode from "qrcode";
import jsPDF from "jspdf";

const TRACKING_BASE_URL = "https://rahe-kaba-journeys.lovable.app/track";

/**
 * Generate a QR code data URL for a booking tracking ID.
 */
export async function generateTrackingQr(trackingId: string): Promise<string> {
  const url = `${TRACKING_BASE_URL}?id=${encodeURIComponent(trackingId)}`;
  return QRCode.toDataURL(url, {
    width: 200,
    margin: 1,
    color: { dark: "#282E38", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
  });
}

/**
 * Add QR verification stamp to a jsPDF document.
 * Includes QR code, checkmark badge, "Verified Booking" and "Scan to Verify" text.
 */
export function addQrToDoc(
  doc: jsPDF,
  qrDataUrl: string,
  options?: { x?: number; y?: number; size?: number }
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const size = options?.size ?? 28;
  const x = options?.x ?? pageWidth - 14 - size;
  const y = options?.y ?? 10;

  try {
    // Draw stamp border (rounded rect)
    const stampPadding = 3;
    const stampW = size + stampPadding * 2;
    const stampH = size + 18;
    const stampX = x - stampPadding;
    const stampY = y - stampPadding;

    doc.setDrawColor(40, 46, 56);
    doc.setLineWidth(0.4);
    doc.roundedRect(stampX, stampY, stampW, stampH, 2, 2, "S");

    // "Verified Booking" header with checkmark
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(34, 120, 60);
    const headerX = x + size / 2;
    doc.text("✓ Verified Booking", headerX, y - 0.5, { align: "center" });

    // QR image
    doc.addImage(qrDataUrl, "PNG", x, y + 2, size, size);

    // "Scan to Verify" footer
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Scan to verify booking authenticity", headerX, y + size + 5.5, { align: "center" });

    doc.setTextColor(0);
  } catch {
    /* QR generation failed silently */
  }
}

/**
 * Payment status watermark types.
 */
export type WatermarkStatus = "paid" | "partial" | "due";

/**
 * Determine watermark status from payment amounts.
 */
export function getWatermarkStatus(paidAmount: number, dueAmount: number): WatermarkStatus {
  if (dueAmount <= 0) return "paid";
  if (paidAmount > 0 && dueAmount > 0) return "partial";
  return "due";
}

/**
 * Add a large diagonal payment status watermark to the PDF background.
 * Call this AFTER header but BEFORE content for proper layering.
 */
export function addPaymentWatermark(doc: jsPDF, status: WatermarkStatus) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const config: Record<WatermarkStatus, { text: string; r: number; g: number; b: number }> = {
    paid: { text: "PAID", r: 34, g: 139, b: 34 },
    partial: { text: "PARTIAL", r: 210, g: 140, b: 20 },
    due: { text: "DUE", r: 200, g: 40, b: 40 },
  };

  const { text, r, g, b } = config[status];

  // Save current state
  const prevR = (doc as any).__textColor?.r ?? 0;
  const prevG = (doc as any).__textColor?.g ?? 0;
  const prevB = (doc as any).__textColor?.b ?? 0;

  doc.saveGraphicsState();

  // Set transparency via GState
  const gState = new (doc as any).GState({ opacity: 0.08 });
  doc.setGState(gState);

  doc.setTextColor(r, g, b);
  doc.setFontSize(72);
  doc.setFont("helvetica", "bold");

  // Center + rotate
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;

  doc.text(text, centerX, centerY, {
    align: "center",
    angle: 35,
  });

  doc.restoreGraphicsState();
  doc.setTextColor(0);
}
