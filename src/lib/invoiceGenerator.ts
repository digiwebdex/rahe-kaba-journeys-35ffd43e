import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImg from "@/assets/logo.jpg";
import { getSignatureData, SignatureData } from "./pdfSignature";
import { generateTrackingQr, addQrToDoc, addPaymentWatermark, getWatermarkStatus } from "./pdfQrCode";

export interface CompanyInfo {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface InvoiceCustomer {
  full_name?: string | null;
  phone?: string | null;
  passport_number?: string | null;
  address?: string | null;
}

export interface InvoiceBooking {
  tracking_id: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number | null;
  num_travelers: number;
  created_at: string;
  status: string;
  packages?: { name: string; type?: string; duration_days?: number | null } | null;
}

export interface InvoicePayment {
  id: string;
  amount: number;
  installment_number: number | null;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
  booking_id: string;
}

const fmt = (n: number) => `BDT ${n.toLocaleString()}`;
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function loadLogoBase64(): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg"));
    };
    img.onerror = () => resolve("");
    img.src = logoImg;
  });
}

function addHeader(doc: jsPDF, company: CompanyInfo, logoBase64: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  if (logoBase64) {
    try { doc.addImage(logoBase64, "JPEG", 14, 10, 20, 20); } catch { /* skip logo */ }
  }

  const textX = logoBase64 ? 38 : 14;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(company.name || "RAHE KABA", textX, 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Hajj & Umrah Services", textX, 26);

  const contactParts: string[] = [];
  if (company.phone) contactParts.push(`Phone: ${company.phone}`);
  if (company.email) contactParts.push(`Email: ${company.email}`);
  if (contactParts.length) doc.text(contactParts.join("  |  "), textX, 31);
  if (company.address) doc.text(company.address, textX, 36);

  // Gold accent line
  doc.setDrawColor(198, 165, 92);
  doc.setLineWidth(0.8);
  doc.line(14, 40, pageWidth - 14, 40);
  doc.setLineWidth(0.2);

  return 46;
}

function addSignatureSection(doc: jsPDF, y: number, sig: SignatureData) {
  const pageWidth = doc.internal.pageSize.getWidth();
  y += 20;

  // Left signature
  doc.setDrawColor(180);
  doc.line(14, y, 80, y);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Customer Signature", 14, y + 5);

  // Right side: stamp + signature image + line + name + designation
  const rightCenter = pageWidth - 47;

  if (sig.stamp_base64) {
    try { doc.addImage(sig.stamp_base64, "PNG", rightCenter - 15, y - 30, 30, 30); } catch { /* skip */ }
  }
  if (sig.signature_base64) {
    try { doc.addImage(sig.signature_base64, "PNG", rightCenter - 20, y - 18, 40, 16); } catch { /* skip */ }
  }

  doc.line(pageWidth - 80, y, pageWidth - 14, y);
  
  if (sig.authorized_name) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(sig.authorized_name, rightCenter, y + 5, { align: "center" });
  } else {
    doc.text("Authorized Signature", pageWidth - 80, y + 5);
  }

  if (sig.designation) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(sig.designation, rightCenter, y + 10, { align: "center" });
  } else {
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text("Company Seal", rightCenter, y + 10, { align: "center" });
  }

  return y + 16;
}

function addFooter(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(150);
  doc.text("This is a computer-generated document. For queries, contact: +880 1601-505050 | rahekaba.info@gmail.com", pageWidth / 2, pageHeight - 10, { align: "center" });
  doc.setTextColor(0);
}

export async function generateInvoice(
  booking: InvoiceBooking,
  customer: InvoiceCustomer,
  payments: InvoicePayment[],
  company: CompanyInfo
) {
  const doc = new jsPDF();
  const [logoBase64, sig, qrDataUrl] = await Promise.all([loadLogoBase64(), getSignatureData(), generateTrackingQr(booking.tracking_id)]);
  let y = addHeader(doc, company, logoBase64);
  const pageWidth = doc.internal.pageSize.getWidth();

  // QR verification stamp top-right
  addQrToDoc(doc, qrDataUrl, { x: pageWidth - 44, y: 8, size: 26 });

  // Payment watermark
  addPaymentWatermark(doc, getWatermarkStatus(Number(booking.paid_amount), Number(booking.due_amount || 0)));

  // Invoice title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", 14, y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice #: ${booking.tracking_id}`, 14, y + 6);
  doc.text(`Date: ${fmtDate(new Date().toISOString())}`, pageWidth - 14 - 60, y + 6);
  y += 14;

  // Customer details
  doc.setDrawColor(230);
  doc.setFillColor(248, 248, 248);
  doc.rect(14, y, pageWidth - 28, 24, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", 18, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Name: ${customer.full_name || "N/A"}`, 18, y + 12);
  doc.text(`Phone: ${customer.phone || "N/A"}`, 100, y + 12);
  doc.text(`Passport: ${customer.passport_number || "N/A"}`, 18, y + 18);
  doc.text(`Address: ${customer.address || "N/A"}`, 100, y + 18);
  y += 30;

  // Package details
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Package Details", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const pkg = booking.packages;
  doc.text(`Package: ${pkg?.name || "N/A"}  |  Type: ${pkg?.type || "N/A"}  |  Duration: ${pkg?.duration_days ? pkg.duration_days + " Days" : "N/A"}  |  Travelers: ${booking.num_travelers}`, 14, y);
  y += 4;
  doc.text(`Total Amount: ${fmt(Number(booking.total_amount))}`, 14, y);
  y += 8;

  // Payment schedule table
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT SCHEDULE", 14, y);
  y += 4;

  const sorted = [...payments].sort((a, b) => (a.installment_number || 0) - (b.installment_number || 0));

  autoTable(doc, {
    startY: y,
    head: [["#", "Amount", "Due Date", "Status", "Paid Date", "Method"]],
    body: sorted.map((p) => [
      p.installment_number || "—",
      fmt(Number(p.amount)),
      fmtDate(p.due_date),
      p.status.charAt(0).toUpperCase() + p.status.slice(1),
      fmtDate(p.paid_at),
      p.payment_method || "—",
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [40, 46, 56] },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable?.finalY || y + 20;
  y += 8;

  // Summary
  const totalPaid = Number(booking.paid_amount);
  const totalDue = Number(booking.due_amount || 0);
  const totalAmount = Number(booking.total_amount);

  doc.setFillColor(40, 46, 56);
  doc.rect(14, y, pageWidth - 28, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Total: ${fmt(totalAmount)}`, 18, y + 7);
  doc.text(`Paid: ${fmt(totalPaid)}`, 80, y + 7);
  doc.text(`Due: ${fmt(totalDue)}`, 140, y + 7);
  doc.setTextColor(0, 0, 0);
  y += 24;

  // Signature
  y = addSignatureSection(doc, y, sig);
  addFooter(doc);

  doc.save(`Booking-${booking.tracking_id}.pdf`);
}

export async function generateReceipt(
  payment: InvoicePayment,
  booking: InvoiceBooking,
  customer: InvoiceCustomer,
  company: CompanyInfo,
  allPayments?: InvoicePayment[]
) {
  const doc = new jsPDF();
  const [logoBase64, sig, qrDataUrl] = await Promise.all([loadLogoBase64(), getSignatureData(), generateTrackingQr(booking.tracking_id)]);
  let y = addHeader(doc, company, logoBase64);
  const pageWidth = doc.internal.pageSize.getWidth();

  // QR verification stamp top-right
  addQrToDoc(doc, qrDataUrl, { x: pageWidth - 44, y: 8, size: 26 });

  // Payment watermark (receipt is always for a completed payment)
  addPaymentWatermark(doc, "paid");

  // Receipt title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT RECEIPT", 14, y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const receiptNum = `${booking.tracking_id}-${payment.installment_number || "P"}`;
  doc.text(`Receipt #: ${receiptNum}`, 14, y + 6);
  doc.text(`Date: ${fmtDate(payment.paid_at || new Date().toISOString())}`, pageWidth - 14 - 60, y + 6);
  y += 14;

  // Customer
  doc.setFillColor(248, 248, 248);
  doc.rect(14, y, pageWidth - 28, 18, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Received From:", 18, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(`${customer.full_name || "N/A"}  |  Phone: ${customer.phone || "N/A"}`, 18, y + 12);
  y += 24;

  // Payment details
  autoTable(doc, {
    startY: y,
    head: [["Description", "Details"]],
    body: [
      ["Booking ID", booking.tracking_id],
      ["Package", booking.packages?.name || "N/A"],
      ["Installment #", String(payment.installment_number || "—")],
      ["Amount Paid", fmt(Number(payment.amount))],
      ["Payment Date", fmtDate(payment.paid_at)],
      ["Payment Method", payment.payment_method || "Manual"],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [40, 46, 56] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable?.finalY || y + 40;
  y += 8;

  // Running balance
  const paidPayments = (allPayments || []).filter((p) => p.status === "completed");
  const totalPaidSoFar = paidPayments.reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Number(booking.total_amount) - totalPaidSoFar;

  doc.setFillColor(40, 46, 56);
  doc.rect(14, y, pageWidth - 28, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Paid So Far: ${fmt(totalPaidSoFar)}`, 18, y + 7);
  doc.text(`Remaining Due: ${fmt(Math.max(0, remaining))}`, 120, y + 7);
  doc.setTextColor(0, 0, 0);
  y += 24;

  // Signature
  y = addSignatureSection(doc, y, sig);
  addFooter(doc);

  doc.save(`Receipt-${receiptNum}.pdf`);
}

// ── Commission Receipt ──
export interface CommissionReceiptData {
  moallemName: string;
  moallemPhone?: string | null;
  bookingTrackingId: string;
  packageName: string;
  numTravelers: number;
  commissionPerPerson: number;
  totalCommission: number;
  commissionPaid: number;
  commissionDue: number;
  paymentAmount: number;
  paymentDate: string;
  paymentMethod: string;
  notes?: string | null;
}

export async function generateCommissionReceipt(
  data: CommissionReceiptData,
  company: CompanyInfo
) {
  const doc = new jsPDF();
  const [logoBase64, sig, qrDataUrl] = await Promise.all([loadLogoBase64(), getSignatureData(), generateTrackingQr(data.bookingTrackingId)]);
  let y = addHeader(doc, company, logoBase64);
  const pageWidth = doc.internal.pageSize.getWidth();

  // QR verification stamp top-right
  addQrToDoc(doc, qrDataUrl, { x: pageWidth - 44, y: 8, size: 26 });

  // Commission watermark
  addPaymentWatermark(doc, getWatermarkStatus(data.commissionPaid, data.commissionDue));

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("COMMISSION PAYMENT RECEIPT", 14, y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${fmtDate(data.paymentDate)}`, pageWidth - 14 - 60, y + 6);
  y += 14;

  // Moallem info
  doc.setFillColor(248, 248, 248);
  doc.rect(14, y, pageWidth - 28, 18, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Paid To (Moallem):", 18, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.moallemName}  |  Phone: ${data.moallemPhone || "N/A"}`, 18, y + 12);
  y += 24;

  autoTable(doc, {
    startY: y,
    head: [["Description", "Details"]],
    body: [
      ["Booking ID", data.bookingTrackingId],
      ["Package", data.packageName],
      ["Travelers", String(data.numTravelers)],
      ["Commission/Person", fmt(data.commissionPerPerson)],
      ["Total Commission", fmt(data.totalCommission)],
      ["Amount Paid Now", fmt(data.paymentAmount)],
      ["Payment Method", data.paymentMethod || "Cash"],
      ["Total Paid So Far", fmt(data.commissionPaid)],
      ["Commission Due", fmt(data.commissionDue)],
      ...(data.notes ? [["Notes", data.notes]] : []),
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [40, 46, 56] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 } },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable?.finalY || y + 40;
  y += 8;

  doc.setFillColor(40, 46, 56);
  doc.rect(14, y, pageWidth - 28, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Paid: ${fmt(data.paymentAmount)}`, 18, y + 9);
  doc.text(`Remaining Due: ${fmt(Math.max(0, data.commissionDue))}`, 120, y + 9);
  doc.setTextColor(0, 0, 0);
  y += 20;

  y = addSignatureSection(doc, y, sig);
  addFooter(doc);

  doc.save(`Commission_Receipt_${data.bookingTrackingId}.pdf`);
}
