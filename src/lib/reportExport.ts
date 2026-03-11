import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import logoImg from "@/assets/logo-nobg.png";
import QRCode from "qrcode";
import { getSignatureData, SignatureData } from "./pdfSignature";
import { registerBengaliFont, bengaliCellHook } from "./pdfFontLoader";

// ── Brand Constants ──
const GOLD = { r: 198, g: 165, b: 92 };
const DARK = { r: 40, g: 46, b: 56 };
const COMPANY_URL = "https://rahe-kaba-journeys.lovable.app";
const COMPANY = {
  name: "RAHE KABA Tours & Travels",
  tagline: "Hajj & Umrah Services",
  phone: "+880 1601-505050",
  email: "rahekaba.info@gmail.com",
  address: "Dailorbagh Palli Bidyut Adjacent, Sonargaon Thana Road, Narayanganj-Dhaka",
};

// ── Interfaces ──
interface ReportData {
  title: string;
  columns: string[];
  rows: (string | number)[][];
  summary?: string[];
}

const buildSafeFileName = (title: string, ext: "pdf" | "xlsx") => {
  const base = title
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${base || "report"}.${ext}`;
};

export interface HajjiReportData {
  title: string;
  customers: {
    name: string;
    phone: string;
    passport: string;
    bookings: number;
    travelers: number;
    revenue: number;
    due: number;
    expenses: number;
    profit: number;
    bookingDetails: {
      trackingId: string;
      packageName: string;
      date: string;
      total: number;
      paid: number;
      due: number;
      status: string;
    }[];
  }[];
}

// ── Helpers ──
let cachedLogoBase64: string | null = null;

async function loadLogoBase64(): Promise<string | null> {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const response = await fetch(logoImg);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogoBase64 = reader.result as string;
        resolve(cachedLogoBase64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function generateCompanyQr(): Promise<string> {
  try {
    return await QRCode.toDataURL(COMPANY_URL, {
      width: 200, margin: 1,
      color: { dark: "#282E38", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    });
  } catch { return ""; }
}

// ── Company Pad Header (matches invoice format) ──
function addCompanyHeader(doc: jsPDF, logoBase64: string | null, qrDataUrl: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top gold accent bar
  doc.setFillColor(GOLD.r, GOLD.g, GOLD.b);
  doc.rect(0, 0, pageWidth, 3, "F");

  // Logo
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", 14, 10, 16, 16); } catch { /* skip */ }
  }

  // QR code top-right
  if (qrDataUrl) {
    try { doc.addImage(qrDataUrl, "PNG", pageWidth - 30, 10, 16, 16); } catch { /* skip */ }
  }

  const textX = logoBase64 ? 40 : 14;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(DARK.r, DARK.g, DARK.b);
  doc.text(COMPANY.name, textX, 18);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(COMPANY.tagline, textX, 23);
  doc.text(`Tel: ${COMPANY.phone}  |  Email: ${COMPANY.email}`, textX, 28);
  doc.text(COMPANY.address, textX, 33);

  // Gold accent line
  doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
  doc.setLineWidth(0.8);
  doc.line(14, 38, pageWidth - 14, 38);
  doc.setLineWidth(0.2);
  doc.setTextColor(0);

  return 44;
}

// ── Company Pad Footer (matches invoice format) ──
function addCompanyFooter(doc: jsPDF, sig: SignatureData) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Signature section
  const sigY = pageHeight - 42;
  const rightCenter = pageWidth - 47;

  if (sig.stamp_base64) {
    try { doc.addImage(sig.stamp_base64, "PNG", rightCenter - 14, sigY - 18, 28, 28); } catch { /* skip */ }
  }
  if (sig.signature_base64) {
    try { doc.addImage(sig.signature_base64, "PNG", rightCenter - 12, sigY + 2, 24, 10); } catch { /* skip */ }
  }

  // Signature lines
  doc.setDrawColor(180);
  doc.line(pageWidth - 80, sigY + 14, pageWidth - 14, sigY + 14);

  if (sig.authorized_name) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(DARK.r, DARK.g, DARK.b);
    doc.text(sig.authorized_name, rightCenter, sigY + 19, { align: "center" });
  } else {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Authorized Signature", pageWidth - 80, sigY + 19);
  }

  if (sig.designation) {
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(sig.designation, rightCenter, sigY + 24, { align: "center" });
  }

  // Bottom gold bar
  doc.setFillColor(GOLD.r, GOLD.g, GOLD.b);
  doc.rect(0, pageHeight - 16, pageWidth, 16, "F");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255);
  doc.text("RAHE KABA Tours & Travels — Hajj & Umrah Services", pageWidth / 2, pageHeight - 10, { align: "center" });

  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Tel: ${COMPANY.phone}  |  Email: ${COMPANY.email}  |  ${COMPANY.address}`, pageWidth / 2, pageHeight - 5, { align: "center" });
  doc.setTextColor(0);
}

// ── Report Title Block ──
function addReportTitle(doc: jsPDF, y: number, title: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title badge
  doc.setFillColor(DARK.r, DARK.g, DARK.b);
  const titleW = Math.min(doc.getTextWidth(title) * 0.65 + 16, pageWidth - 28);
  doc.roundedRect(14, y, titleW, 10, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255);
  doc.text(title.toUpperCase(), 18, y + 7);
  doc.setTextColor(0);

  // Date on right
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`, pageWidth - 14, y + 7, { align: "right" });
  doc.setTextColor(0);

  return y + 16;
}

// ═══════════════════════════════════════════════════════════════
// EXPORT PDF (Standard Reports)
// ═══════════════════════════════════════════════════════════════

export async function exportPDF({ title, columns, rows, summary }: ReportData) {
  const [logoBase64, qrDataUrl, sig] = await Promise.all([
    loadLogoBase64(), generateCompanyQr(), getSignatureData(),
  ]);
  const doc = new jsPDF();
  await registerBengaliFont(doc);

  let y = addCompanyHeader(doc, logoBase64, qrDataUrl);
  y = addReportTitle(doc, y, title);

  const fmtCell = (val: string | number) =>
    typeof val === "number" ? `BDT ${val.toLocaleString("en-IN")}` : val;

  const formattedRows = rows.map(row => row.map(fmtCell));

  autoTable(doc, {
    head: [columns],
    body: formattedRows,
    startY: y,
    styles: { fontSize: 7.5, cellPadding: 2.5, font: "NotoSansBengali" },
    headStyles: { fillColor: [DARK.r, DARK.g, DARK.b], font: "NotoSansBengali", fontStyle: "bold", fontSize: 7.5 },
    alternateRowStyles: { fillColor: [250, 249, 247] },
    margin: { left: 14, right: 14 },
    didDrawCell: bengaliCellHook,
  });

  y = (doc as any).lastAutoTable?.finalY + 8 || 50;

  // Summary footer
  if (summary && summary.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 70) { doc.addPage(); y = 20; }
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(DARK.r, DARK.g, DARK.b);
    doc.rect(14, y, pageWidth - 28, 8 * summary.length + 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    summary.forEach((line, i) => {
      doc.text(line, 18, y + 7 + i * 8);
    });
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
  }

  addCompanyFooter(doc, sig);
  doc.save(buildSafeFileName(title, "pdf"));
}

// ═══════════════════════════════════════════════════════════════
// EXPORT HAJJI PDF (Detailed Customer Reports)
// ═══════════════════════════════════════════════════════════════

export async function exportHajjiPDF({ title, customers }: HajjiReportData) {
  const [logoBase64, qrDataUrl, sig] = await Promise.all([
    loadLogoBase64(), generateCompanyQr(), getSignatureData(),
  ]);
  const doc = new jsPDF({ orientation: "landscape" });
  await registerBengaliFont(doc);
  const pageWidth = doc.internal.pageSize.getWidth();

  let y = addCompanyHeader(doc, logoBase64, qrDataUrl);
  y = addReportTitle(doc, y, title);

  const fmt = (n: number) => `BDT ${n.toLocaleString()}`;

  customers.forEach((c, idx) => {
    if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(DARK.r, DARK.g, DARK.b);
    doc.rect(14, y, pageWidth - 28, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`${idx + 1}. ${c.name}`, 18, y + 7);
    doc.text(`Phone: ${c.phone} | Passport: ${c.passport}`, 120, y + 7);
    doc.setTextColor(0, 0, 0);
    y += 14;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Bookings: ${c.bookings} | Travelers: ${c.travelers} | Revenue: ${fmt(c.revenue)} | Due: ${fmt(c.due)} | Expenses: ${fmt(c.expenses)} | Profit: ${fmt(c.profit)}`, 18, y);
    y += 6;

    if (c.bookingDetails.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Tracking ID", "Package", "Date", "Total", "Paid", "Due", "Status"]],
        body: c.bookingDetails.map((b) => [
          b.trackingId, b.packageName, b.date,
          fmt(b.total), fmt(b.paid), fmt(b.due),
          b.status.charAt(0).toUpperCase() + b.status.slice(1),
        ]),
        styles: { fontSize: 7, font: "NotoSansBengali" },
        headStyles: { fillColor: [60, 70, 85] },
        alternateRowStyles: { fillColor: [250, 249, 247] },
        margin: { left: 18, right: 18 },
        theme: "grid",
        didDrawCell: bengaliCellHook,
      });
      y = (doc as any).lastAutoTable?.finalY + 10 || y + 30;
    } else {
      y += 6;
    }
  });

  if (y > doc.internal.pageSize.getHeight() - 50) {
    doc.addPage();
    y = 20;
  }
  const totals = customers.reduce(
    (acc, c) => ({
      bookings: acc.bookings + c.bookings, travelers: acc.travelers + c.travelers,
      revenue: acc.revenue + c.revenue, due: acc.due + c.due,
      expenses: acc.expenses + c.expenses, profit: acc.profit + c.profit,
    }),
    { bookings: 0, travelers: 0, revenue: 0, due: 0, expenses: 0, profit: 0 }
  );

  doc.setFillColor(DARK.r, DARK.g, DARK.b);
  doc.rect(14, y, pageWidth - 28, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Grand Total — Customers: ${customers.length} | Bookings: ${totals.bookings} | Travelers: ${totals.travelers} | Revenue: ${fmt(totals.revenue)} | Due: ${fmt(totals.due)} | Profit: ${fmt(totals.profit)}`, 18, y + 8);
  doc.setTextColor(0, 0, 0);

  addCompanyFooter(doc, sig);
  doc.save(buildSafeFileName(title, "pdf"));
}

// ═══════════════════════════════════════════════════════════════
// EXCEL EXPORTS (unchanged)
// ═══════════════════════════════════════════════════════════════

export function exportHajjiExcel({ title, customers }: HajjiReportData) {
  const rows: (string | number)[][] = [];
  rows.push(["Customer", "Phone", "Passport", "Bookings", "Travelers", "Revenue", "Due", "Expenses", "Profit"]);
  customers.forEach((c) => {
    rows.push([c.name, c.phone, c.passport, c.bookings, c.travelers, c.revenue, c.due, c.expenses, c.profit]);
  });
  rows.push([]);
  rows.push(["=== BOOKING DETAILS ==="]);
  rows.push([]);
  customers.forEach((c) => {
    rows.push([`Customer: ${c.name} (${c.phone})`]);
    rows.push(["Tracking ID", "Package", "Date", "Total", "Paid", "Due", "Status"]);
    c.bookingDetails.forEach((b) => {
      rows.push([b.trackingId, b.packageName, b.date, b.total, b.paid, b.due, b.status]);
    });
    rows.push([]);
  });
  rows.push([]);
  rows.push(["Rahe Kaba Tours & Travels"]);
  rows.push(["Phone: +880 1601-505050 | Email: rahekaba.info@gmail.com"]);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
  XLSX.writeFile(wb, buildSafeFileName(title, "xlsx"));
}

export function exportExcel({ title, columns, rows, summary }: ReportData) {
  const wsData = [columns, ...rows];
  if (summary && summary.length > 0) {
    wsData.push([]);
    summary.forEach(line => wsData.push([line]));
  }
  wsData.push([]);
  wsData.push(["Rahe Kaba Tours & Travels"]);
  wsData.push(["Phone: +880 1601-505050 | Email: rahekaba.info@gmail.com"]);
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
  XLSX.writeFile(wb, buildSafeFileName(title, "xlsx"));
}
