import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImg from "@/assets/logo-nobg.png";
import { CompanyInfo } from "./invoiceGenerator";
import { getSignatureData, SignatureData } from "./pdfSignature";
import { generateTrackingQr, addQrToDoc, addPaymentWatermark, getWatermarkStatus } from "./pdfQrCode";

const fmt = (n: number) => `BDT ${n.toLocaleString()}`;
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

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
    try { doc.addImage(logoBase64, "PNG", 14, 12, 16, 16); } catch { /* skip */ }
  }
  const textX = logoBase64 ? 38 : 14;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(company.name || "RAHE KABA Tours & Travels", textX, 20);
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

function addSignatureAndFooter(doc: jsPDF, sig: SignatureData) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = pageHeight - 40;
  const rightCenter = pageWidth - 47;

  // Stamp & signature images
  if (sig.stamp_base64) {
    try { doc.addImage(sig.stamp_base64, "PNG", rightCenter - 18, y - 46, 36, 36); } catch { /* skip */ }
  }
  if (sig.signature_base64) {
    try { doc.addImage(sig.signature_base64, "PNG", rightCenter - 14, y - 16, 28, 12); } catch { /* skip */ }
  }

  doc.setDrawColor(180);
  doc.line(14, y, 80, y);
  doc.line(pageWidth - 80, y, pageWidth - 14, y);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Customer Signature", 14, y + 5);

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

  doc.setTextColor(150);
  doc.text("This is a computer-generated document. For queries: +880 1601-505050 | rahekaba.info@gmail.com", pageWidth / 2, pageHeight - 10, { align: "center" });
  doc.setTextColor(0);
}

// ── Moallem Profile PDF ──
export interface MoallemPdfData {
  name: string;
  phone?: string | null;
  address?: string | null;
  nid_number?: string | null;
  contract_date?: string | null;
  status: string;
  notes?: string | null;
  bookings: { tracking_id: string; guest_name: string; package_name: string; total: number; paid: number; due: number; status: string; date: string }[];
  moallemPayments: { amount: number; date: string; method: string; notes?: string | null }[];
  commissionPayments: { amount: number; date: string; method: string; notes?: string | null }[];
  summary: { totalBookings: number; totalTravelers: number; totalAmount: number; totalPaid: number; totalDue: number; totalDeposit: number; totalCommission: number; commissionPaid: number; commissionDue: number };
}

export async function generateMoallemPdf(data: MoallemPdfData, company: CompanyInfo) {
  const doc = new jsPDF();
  // Use first booking tracking_id for QR if available
  const firstTrackingId = data.bookings[0]?.tracking_id;
  const [logoBase64, sig, qrDataUrl] = await Promise.all([
    loadLogoBase64(),
    getSignatureData(),
    firstTrackingId ? generateTrackingQr(firstTrackingId) : Promise.resolve(""),
  ]);
  let y = addHeader(doc, company, logoBase64);
  const pw = doc.internal.pageSize.getWidth();


  if (qrDataUrl) addQrToDoc(doc, qrDataUrl, { size: 16, trackingId: firstTrackingId, position: "top" });

  // Watermark based on moallem summary
  addPaymentWatermark(doc, getWatermarkStatus(data.summary.totalPaid, data.summary.totalDue));

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("MOALLEM PROFILE REPORT", 14, y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${fmtDate(new Date().toISOString())}`, pw - 14 - 60, y + 6);
  y += 14;

  doc.setFillColor(248, 248, 248);
  doc.rect(14, y, pw - 28, 24, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(data.name, 18, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Phone: ${data.phone || "N/A"} | NID: ${data.nid_number || "N/A"}`, 18, y + 12);
  doc.text(`Address: ${data.address || "N/A"} | Status: ${data.status}`, 18, y + 18);
  y += 30;

  doc.setFillColor(40, 46, 56);
  doc.rect(14, y, pw - 28, 18, "F");
  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Bookings: ${data.summary.totalBookings}`, 18, y + 7);
  doc.text(`Total: ${fmt(data.summary.totalAmount)}`, 60, y + 7);
  doc.text(`Paid: ${fmt(data.summary.totalPaid)}`, 110, y + 7);
  doc.text(`Due: ${fmt(data.summary.totalDue)}`, 155, y + 7);
  doc.text(`Deposit: ${fmt(data.summary.totalDeposit)}`, 18, y + 14);
  doc.text(`Commission: ${fmt(data.summary.totalCommission)}`, 70, y + 14);
  doc.text(`Comm. Due: ${fmt(data.summary.commissionDue)}`, 130, y + 14);
  doc.setTextColor(0);
  y += 24;

  if (data.bookings.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("BOOKINGS", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Tracking ID", "Guest", "Package", "Total", "Paid", "Due", "Status"]],
      body: data.bookings.map(b => [b.tracking_id, b.guest_name, b.package_name, fmt(b.total), fmt(b.paid), fmt(b.due), b.status]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [40, 46, 56] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable?.finalY + 8 || y + 20;
  }

  if (data.moallemPayments.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("MOALLEM PAYMENTS (DEPOSITS)", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Amount", "Date", "Method", "Notes"]],
      body: data.moallemPayments.map(p => [fmt(p.amount), fmtDate(p.date), p.method, p.notes || "—"]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [60, 70, 85] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable?.finalY + 8 || y + 20;
  }

  if (data.commissionPayments.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("COMMISSION PAYMENTS", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Amount", "Date", "Method", "Notes"]],
      body: data.commissionPayments.map(p => [fmt(p.amount), fmtDate(p.date), p.method, p.notes || "—"]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [60, 70, 85] },
      margin: { left: 14, right: 14 },
    });
  }

  addSignatureAndFooter(doc, sig);
  doc.save(`Moallem-${data.name.replace(/\s+/g, "_")}.pdf`);
}

// ── Supplier Agent Profile PDF ──
export interface SupplierPdfData {
  agent_name: string;
  company_name?: string | null;
  phone?: string | null;
  address?: string | null;
  status: string;
  notes?: string | null;
  bookings: { tracking_id: string; guest_name: string; package_name: string; total: number; cost: number; paid_to_supplier: number; supplier_due: number; status: string }[];
  agentPayments: { amount: number; date: string; method: string; notes?: string | null }[];
  summary: { totalBookings: number; totalTravelers: number; contractedHajji: number; totalPaid: number; totalDue: number };
}

export async function generateSupplierPdf(data: SupplierPdfData, company: CompanyInfo) {
  const doc = new jsPDF();
  const firstTrackingId = data.bookings[0]?.tracking_id;
  const [logoBase64, sig, qrDataUrl] = await Promise.all([
    loadLogoBase64(),
    getSignatureData(),
    firstTrackingId ? generateTrackingQr(firstTrackingId) : Promise.resolve(""),
  ]);
  let y = addHeader(doc, company, logoBase64);
  const pw = doc.internal.pageSize.getWidth();


  if (qrDataUrl) addQrToDoc(doc, qrDataUrl, { size: 16, trackingId: firstTrackingId, position: "top" });

  // Watermark based on supplier summary
  addPaymentWatermark(doc, getWatermarkStatus(data.summary.totalPaid, data.summary.totalDue));

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("SUPPLIER AGENT REPORT", 14, y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${fmtDate(new Date().toISOString())}`, pw - 14 - 60, y + 6);
  y += 14;

  doc.setFillColor(248, 248, 248);
  doc.rect(14, y, pw - 28, 18, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(data.agent_name, 18, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Company: ${data.company_name || "N/A"} | Phone: ${data.phone || "N/A"} | Status: ${data.status}`, 18, y + 12);
  y += 24;

  doc.setFillColor(40, 46, 56);
  doc.rect(14, y, pw - 28, 12, "F");
  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Contracted Hajji: ${data.summary.contractedHajji} | Paid: ${fmt(data.summary.totalPaid)} | Due: ${fmt(data.summary.totalDue)}`, 18, y + 8);
  doc.setTextColor(0);
  y += 18;

  if (data.bookings.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("BOOKINGS", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Tracking ID", "Guest", "Package", "Total", "Cost", "Paid", "Due", "Status"]],
      body: data.bookings.map(b => [b.tracking_id, b.guest_name, b.package_name, fmt(b.total), fmt(b.cost), fmt(b.paid_to_supplier), fmt(b.supplier_due), b.status]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [40, 46, 56] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable?.finalY + 8 || y + 20;
  }

  if (data.agentPayments.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENTS TO SUPPLIER", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Amount", "Date", "Method", "Notes"]],
      body: data.agentPayments.map(p => [fmt(p.amount), fmtDate(p.date), p.method, p.notes || "—"]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [60, 70, 85] },
      margin: { left: 14, right: 14 },
    });
  }

  addSignatureAndFooter(doc, sig);
  doc.save(`Supplier-${data.agent_name.replace(/\s+/g, "_")}.pdf`);
}

// ── Customer Profile PDF ──
export interface CustomerPdfData {
  full_name: string;
  phone?: string | null;
  email?: string | null;
  passport_number?: string | null;
  nid_number?: string | null;
  address?: string | null;
  date_of_birth?: string | null;
  emergency_contact?: string | null;
  bookings: { tracking_id: string; package_name: string; total: number; paid: number; due: number; status: string; date: string }[];
  payments: { amount: number; date: string; method: string; status: string; installment: number | null; tracking_id: string }[];
  summary: { totalBookings: number; totalAmount: number; totalPaid: number; totalDue: number; totalExpenses: number; profit: number };
}

export async function generateCustomerPdf(data: CustomerPdfData, company: CompanyInfo) {
  const doc = new jsPDF();
  const firstTrackingId = data.bookings[0]?.tracking_id;
  const [logoBase64, sig, qrDataUrl] = await Promise.all([
    loadLogoBase64(),
    getSignatureData(),
    firstTrackingId ? generateTrackingQr(firstTrackingId) : Promise.resolve(""),
  ]);
  let y = addHeader(doc, company, logoBase64);
  const pw = doc.internal.pageSize.getWidth();


  if (qrDataUrl) addQrToDoc(doc, qrDataUrl, { size: 16, trackingId: firstTrackingId, position: "top" });

  // Watermark based on customer summary
  addPaymentWatermark(doc, getWatermarkStatus(data.summary.totalPaid, data.summary.totalDue));

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("CUSTOMER PROFILE REPORT", 14, y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${fmtDate(new Date().toISOString())}`, pw - 14 - 60, y + 6);
  y += 14;

  doc.setFillColor(248, 248, 248);
  doc.rect(14, y, pw - 28, 24, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(data.full_name || "N/A", 18, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Phone: ${data.phone || "N/A"} | Email: ${data.email || "N/A"}`, 18, y + 12);
  doc.text(`Passport: ${data.passport_number || "N/A"} | NID: ${data.nid_number || "N/A"} | Address: ${data.address || "N/A"}`, 18, y + 18);
  y += 30;

  doc.setFillColor(40, 46, 56);
  doc.rect(14, y, pw - 28, 12, "F");
  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Bookings: ${data.summary.totalBookings} | Total: ${fmt(data.summary.totalAmount)} | Paid: ${fmt(data.summary.totalPaid)} | Due: ${fmt(data.summary.totalDue)} | Profit: ${fmt(data.summary.profit)}`, 18, y + 8);
  doc.setTextColor(0);
  y += 18;

  if (data.bookings.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("BOOKINGS", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Tracking ID", "Package", "Date", "Total", "Paid", "Due", "Status"]],
      body: data.bookings.map(b => [b.tracking_id, b.package_name, fmtDate(b.date), fmt(b.total), fmt(b.paid), fmt(b.due), b.status]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [40, 46, 56] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable?.finalY + 8 || y + 20;
  }

  if (data.payments.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT HISTORY", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["#", "Booking", "Amount", "Date", "Method", "Status"]],
      body: data.payments.map(p => [p.installment || "—", p.tracking_id, fmt(p.amount), fmtDate(p.date), p.method || "—", p.status]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [60, 70, 85] },
      margin: { left: 14, right: 14 },
    });
  }

  addSignatureAndFooter(doc, sig);
  doc.save(`Customer-${(data.full_name || "Unknown").replace(/\s+/g, "_")}.pdf`);
}

// ── Get company info from CMS ──
export async function getCompanyInfoForPdf(): Promise<CompanyInfo> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: cms } = await supabase.from("site_content" as any).select("content").eq("section_key", "contact").maybeSingle();
  const c = (cms as any)?.content || {};
  return {
    name: "RAHE KABA Tours & Travels",
    phone: c.phone || "+880 1601-505050",
    email: c.email || "rahekaba.info@gmail.com",
    address: "Dailorbagh Palli Bidyut Adjacent, Sonargaon Thana Road, Narayanganj-Dhaka",
  };
}
