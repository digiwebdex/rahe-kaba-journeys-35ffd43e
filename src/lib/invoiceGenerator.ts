import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImg from "@/assets/logo-nobg.png";
import { getSignatureData, SignatureData } from "./pdfSignature";
import { generateTrackingQr, addQrToDoc, addPaymentWatermark, getWatermarkStatus } from "./pdfQrCode";
import { supabase } from "@/integrations/supabase/client";

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
  id?: string;
  tracking_id: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number | null;
  discount?: number;
  num_travelers: number;
  created_at: string;
  status: string;
  booking_type?: string;
  moallem_id?: string | null;
  packages?: { name: string; type?: string; duration_days?: number | null; start_date?: string | null } | null;
  selling_price_per_person?: number | null;
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

export interface BookingMember {
  full_name: string;
  passport_number?: string | null;
  selling_price: number;
  discount: number;
  final_price: number;
  packages?: { name: string } | null;
  package_id?: string | null;
}

// ── Helpers ──
const fmt = (n: number) => `BDT ${n.toLocaleString()}`;
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const GOLD = { r: 198, g: 165, b: 92 };
const DARK = { r: 40, g: 46, b: 56 };
const LIGHT_BG = { r: 250, g: 249, b: 247 };

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

// ── Fetch booking members ──
async function fetchBookingMembers(bookingId: string): Promise<BookingMember[]> {
  const { data } = await supabase
    .from("booking_members")
    .select("full_name, passport_number, selling_price, discount, final_price, package_id")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });
  if (!data || data.length === 0) return [];

  // Get package names for members
  const packageIds = [...new Set(data.filter(m => m.package_id).map(m => m.package_id!))];
  let packageMap: Record<string, string> = {};
  if (packageIds.length > 0) {
    const { data: pkgs } = await supabase.from("packages").select("id, name").in("id", packageIds);
    if (pkgs) pkgs.forEach(p => { packageMap[p.id] = p.name; });
  }

  return data.map(m => ({
    ...m,
    packages: m.package_id ? { name: packageMap[m.package_id] || "N/A" } : null,
  }));
}

// ── Fetch moallem name ──
async function fetchMoallemName(moallemId: string): Promise<string> {
  const { data } = await supabase.from("moallems").select("name").eq("id", moallemId).maybeSingle();
  return data?.name || "N/A";
}

// ═══════════════════════════════════════════════════════════════
// SHARED LAYOUT FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function addHeader(doc: jsPDF, company: CompanyInfo, logoBase64: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top gold accent bar
  doc.setFillColor(GOLD.r, GOLD.g, GOLD.b);
  doc.rect(0, 0, pageWidth, 3, "F");

  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", 14, 10, 16, 16); } catch { /* skip */ }
  }

  const textX = logoBase64 ? 40 : 14;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(DARK.r, DARK.g, DARK.b);
  doc.text(company.name || "RAHE KABA", textX, 18);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Hajj & Umrah Services", textX, 23);

  const contactParts: string[] = [];
  if (company.phone) contactParts.push(`Tel: ${company.phone}`);
  if (company.email) contactParts.push(`Email: ${company.email}`);
  if (contactParts.length) doc.text(contactParts.join("  |  "), textX, 28);
  if (company.address) {
    const addr = company.address.length > 70 ? company.address.substring(0, 70) + "..." : company.address;
    doc.text(addr, textX, 33);
  }

  // Gold accent line
  doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
  doc.setLineWidth(0.8);
  doc.line(14, 38, pageWidth - 14, 38);
  doc.setLineWidth(0.2);
  doc.setTextColor(0);

  return 44;
}

function addInvoiceTitleBlock(
  doc: jsPDF, y: number, trackingId: string, invoiceDate: string,
  travelDate: string | null, paymentStatus: string, isFamily: boolean
): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Invoice title badge
  doc.setFillColor(DARK.r, DARK.g, DARK.b);
  doc.roundedRect(14, y, 55, 10, 2, 2, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255);
  doc.text(isFamily ? "FAMILY INVOICE" : "INVOICE", 16, y + 7);
  doc.setTextColor(0);

  // Status badge (right side)
  const statusColors: Record<string, { r: number; g: number; b: number }> = {
    completed: { r: 34, g: 139, b: 34 },
    pending: { r: 210, g: 140, b: 20 },
    confirmed: { r: 30, g: 100, b: 200 },
  };
  const sc = statusColors[paymentStatus] || statusColors.pending;
  const statusText = paymentStatus.toUpperCase();
  const statusW = doc.getTextWidth(statusText) * 0.6 + 10;
  doc.setFillColor(sc.r, sc.g, sc.b);
  doc.roundedRect(pageWidth - 14 - statusW, y, statusW, 10, 2, 2, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255);
  doc.text(statusText, pageWidth - 14 - statusW / 2, y + 7, { align: "center" });
  doc.setTextColor(0);

  y += 16;

  // Invoice meta
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  const leftMeta = [
    `Invoice No: ${trackingId}`,
    `Invoice Date: ${fmtDate(invoiceDate)}`,
  ];
  const rightMeta = [
    `Booking ID: ${trackingId}`,
    travelDate ? `Travel Date: ${fmtDate(travelDate)}` : "",
  ].filter(Boolean);

  leftMeta.forEach((t, i) => doc.text(t, 14, y + i * 5));
  rightMeta.forEach((t, i) => doc.text(t, pageWidth / 2 + 10, y + i * 5));
  doc.setTextColor(0);

  return y + Math.max(leftMeta.length, rightMeta.length) * 5 + 4;
}

function addCustomerSection(
  doc: jsPDF, y: number, customer: InvoiceCustomer, moallemName?: string | null, totalMembers?: number
): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Section header
  doc.setFillColor(LIGHT_BG.r, LIGHT_BG.g, LIGHT_BG.b);
  doc.setDrawColor(220);
  const boxH = moallemName || totalMembers ? 32 : 26;
  doc.rect(14, y, pageWidth - 28, boxH, "FD");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(DARK.r, DARK.g, DARK.b);
  doc.text("BILL TO", 18, y + 6);

  doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
  doc.setLineWidth(0.5);
  doc.line(18, y + 8, 40, y + 8);
  doc.setLineWidth(0.2);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50);

  const col1 = 18;
  const col2 = pageWidth / 2 + 5;
  let row = y + 14;

  doc.setFont("helvetica", "bold");
  doc.text("Name:", col1, row);
  doc.setFont("helvetica", "normal");
  doc.text(customer.full_name || "N/A", col1 + 18, row);

  doc.setFont("helvetica", "bold");
  doc.text("Phone:", col2, row);
  doc.setFont("helvetica", "normal");
  doc.text(customer.phone || "N/A", col2 + 18, row);

  row += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Passport:", col1, row);
  doc.setFont("helvetica", "normal");
  doc.text(customer.passport_number || "N/A", col1 + 18, row);

  doc.setFont("helvetica", "bold");
  doc.text("Address:", col2, row);
  doc.setFont("helvetica", "normal");
  const addr = customer.address || "N/A";
  doc.text(addr.length > 40 ? addr.substring(0, 40) + "..." : addr, col2 + 18, row);

  if (moallemName || totalMembers) {
    row += 6;
    if (moallemName) {
      doc.setFont("helvetica", "bold");
      doc.text("Moallem:", col1, row);
      doc.setFont("helvetica", "normal");
      doc.text(moallemName, col1 + 18, row);
    }
    if (totalMembers) {
      doc.setFont("helvetica", "bold");
      doc.text("Total Members:", col2, row);
      doc.setFont("helvetica", "normal");
      doc.text(String(totalMembers), col2 + 28, row);
    }
  }

  doc.setTextColor(0);
  return y + boxH + 6;
}

function addSectionTitle(doc: jsPDF, y: number, title: string): number {
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(DARK.r, DARK.g, DARK.b);
  doc.text(title, 14, y);
  doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
  doc.setLineWidth(0.4);
  doc.line(14, y + 1.5, 14 + doc.getTextWidth(title), y + 1.5);
  doc.setLineWidth(0.2);
  doc.setTextColor(0);
  return y + 5;
}

function addFinancialSummary(
  doc: jsPDF, y: number,
  grossAmount: number, discount: number, netTotal: number,
  paidAmount: number, dueAmount: number
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const boxX = pageWidth - 14 - 80;
  const boxW = 80;

  // Summary box
  doc.setDrawColor(220);
  doc.setFillColor(LIGHT_BG.r, LIGHT_BG.g, LIGHT_BG.b);
  doc.rect(boxX, y, boxW, 38, "FD");

  doc.setFontSize(8);
  const items = [
    { label: "Gross Amount:", value: fmt(grossAmount), bold: false },
    { label: "Discount:", value: `- ${fmt(discount)}`, bold: false },
    { label: "Net Total:", value: fmt(netTotal), bold: true },
    { label: "Paid Amount:", value: fmt(paidAmount), bold: false },
    { label: "Due Amount:", value: fmt(dueAmount), bold: true },
  ];

  let iy = y + 6;
  items.forEach((item, idx) => {
    doc.setFont("helvetica", item.bold ? "bold" : "normal");
    doc.setTextColor(item.bold ? DARK.r : 80, item.bold ? DARK.g : 80, item.bold ? DARK.b : 80);
    doc.text(item.label, boxX + 4, iy);
    doc.text(item.value, boxX + boxW - 4, iy, { align: "right" });
    if (idx === 2) {
      // Separator line before paid
      doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
      doc.setLineWidth(0.3);
      doc.line(boxX + 4, iy + 2, boxX + boxW - 4, iy + 2);
      doc.setLineWidth(0.2);
      iy += 3;
    }
    iy += 6;
  });

  // Due highlight bar
  if (dueAmount > 0) {
    doc.setFillColor(255, 240, 230);
    doc.setDrawColor(220, 120, 20);
    doc.roundedRect(boxX, y + 40, boxW, 8, 1, 1, "FD");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 80, 0);
    doc.text(`Outstanding Balance: ${fmt(dueAmount)}`, boxX + boxW / 2, y + 45, { align: "center" });
  }

  doc.setTextColor(0);
  return y + (dueAmount > 0 ? 52 : 42);
}

function addPaymentHistoryTable(doc: jsPDF, y: number, payments: InvoicePayment[]): number {
  y = addSectionTitle(doc, y, "PAYMENT HISTORY");

  const completed = payments
    .filter(p => p.status === "completed")
    .sort((a, b) => new Date(a.paid_at || 0).getTime() - new Date(b.paid_at || 0).getTime());
  const pending = payments
    .filter(p => p.status === "pending")
    .sort((a, b) => new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime());

  if (completed.length === 0 && pending.length === 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(130);
    doc.text("No payments recorded yet.", 14, y + 4);
    doc.setTextColor(0);
    return y + 10;
  }

  const totalPaid = completed.reduce((s, p) => s + Number(p.amount), 0);

  const bodyRows = [
    ...completed.map((p, i) => [
      String(i + 1),
      fmtDate(p.paid_at),
      (p.payment_method || "Manual").charAt(0).toUpperCase() + (p.payment_method || "manual").slice(1),
      Number(p.amount).toLocaleString(),
      "Paid",
    ]),
    ...pending.map((p, i) => [
      String(completed.length + i + 1),
      p.due_date ? fmtDate(p.due_date) + " (Due)" : "—",
      "—",
      Number(p.amount).toLocaleString(),
      "Pending",
    ]),
  ];

  autoTable(doc, {
    startY: y,
    head: [["#", "Date", "Method", "Amount (BDT)", "Status"]],
    body: bodyRows,
    foot: completed.length > 0 ? [["", "", "Total Paid", totalPaid.toLocaleString(), ""]] : undefined,
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: {
      fillColor: [DARK.r, DARK.g, DARK.b],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
    },
    footStyles: {
      fillColor: [LIGHT_BG.r, LIGHT_BG.g, LIGHT_BG.b],
      textColor: [DARK.r, DARK.g, DARK.b],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [LIGHT_BG.r, LIGHT_BG.g, LIGHT_BG.b] },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      3: { halign: "right", fontStyle: "bold" },
      4: { cellWidth: 18, halign: "center" },
    },
    didParseCell: (data: any) => {
      if (data.section === "body" && data.column.index === 4) {
        if (data.cell.raw === "Paid") {
          data.cell.styles.textColor = [34, 139, 34];
          data.cell.styles.fontStyle = "bold";
        } else if (data.cell.raw === "Pending") {
          data.cell.styles.textColor = [210, 140, 20];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  return ((doc as any).lastAutoTable?.finalY || y + 20) + 6;
}

function addSignatureSection(doc: jsPDF, y: number, sig: SignatureData): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Calculate how much space we need for signature (stamp + sig + line + text)
  const sigBlockHeight = 50; // total height needed for signature block
  const footerHeight = 20; // space for footer bar

  // If not enough space, compress spacing but NEVER add a new page
  const availableSpace = pageHeight - footerHeight - y;
  const gap = Math.max(4, Math.min(14, availableSpace - sigBlockHeight));

  y += gap;

  // Ensure signature fits - clamp y so it stays on page
  const maxY = pageHeight - footerHeight - 12;
  if (y > maxY) y = maxY;

  // Left: Customer signature
  doc.setDrawColor(180);
  doc.line(14, y, 80, y);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Customer Signature", 14, y + 5);

  // Right: Authorized signature
  const rightCenter = pageWidth - 47;

  if (sig.stamp_base64) {
    try { doc.addImage(sig.stamp_base64, "PNG", rightCenter - 14, y - 30, 28, 28); } catch { /* skip */ }
  }
  if (sig.signature_base64) {
    try { doc.addImage(sig.signature_base64, "PNG", rightCenter - 12, y - 12, 24, 10); } catch { /* skip */ }
  }

  doc.setDrawColor(180);
  doc.line(pageWidth - 80, y, pageWidth - 14, y);

  if (sig.authorized_name) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(DARK.r, DARK.g, DARK.b);
    doc.text(sig.authorized_name, rightCenter, y + 5, { align: "center" });
  } else {
    doc.setFontSize(7);
    doc.text("Authorized Signature", pageWidth - 80, y + 5);
  }

  if (sig.designation) {
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(sig.designation, rightCenter, y + 10, { align: "center" });
  }

  doc.setTextColor(0);
  return y + 14;
}

function addFooter(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Bottom gold bar
  doc.setFillColor(GOLD.r, GOLD.g, GOLD.b);
  doc.rect(0, pageHeight - 16, pageWidth, 16, "F");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255);
  doc.text("Thank you for choosing RAHE KABA Tours & Travels!", pageWidth / 2, pageHeight - 10, { align: "center" });

  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.text("This is a computer-generated document. For queries: +880 1601-505050 | rahekaba.info@gmail.com", pageWidth / 2, pageHeight - 5, { align: "center" });

  doc.setTextColor(0);
}

// ═══════════════════════════════════════════════════════════════
// INDIVIDUAL INVOICE
// ═══════════════════════════════════════════════════════════════

async function generateIndividualInvoice(
  doc: jsPDF, booking: InvoiceBooking, customer: InvoiceCustomer,
  payments: InvoicePayment[], logoBase64: string, sig: SignatureData,
  qrDataUrl: string, moallemName: string | null
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = addHeader(doc, { name: "RAHE KABA", phone: "+880 1601-505050", email: "rahekaba.info@gmail.com", address: "Dailorbagh Palli Bidyut Adjacent, Sonargaon Thana Road, Narayanganj-Dhaka" } as CompanyInfo, logoBase64);


  // QR verification stamp (small, right side)
  addQrToDoc(doc, qrDataUrl, { size: 16, trackingId: booking.tracking_id, position: "top" });


  // Payment watermark
  addPaymentWatermark(doc, getWatermarkStatus(Number(booking.paid_amount), Number(booking.due_amount || 0)));

  // Invoice title block
  y = addInvoiceTitleBlock(doc, y, booking.tracking_id, new Date().toISOString(), booking.packages?.start_date || null, booking.status, false);

  // Customer section
  y = addCustomerSection(doc, y, customer, moallemName);

  // Service table
  y = addSectionTitle(doc, y, "SERVICE DETAILS");

  const unitPrice = Number(booking.selling_price_per_person || 0) || Math.round(Number(booking.total_amount) / booking.num_travelers);
  const discount = Number(booking.discount || 0);
  const grossAmount = unitPrice * booking.num_travelers;

  autoTable(doc, {
    startY: y,
    head: [["Description", "Package", "Qty", "Unit Price (BDT)", "Discount (BDT)", "Total (BDT)"]],
    body: [
      [
        `${booking.packages?.type || "Hajj"} Service`,
        booking.packages?.name || "N/A",
        String(booking.num_travelers),
        unitPrice.toLocaleString(),
        discount.toLocaleString(),
        Number(booking.total_amount).toLocaleString(),
      ],
    ],
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: {
      fillColor: [DARK.r, DARK.g, DARK.b],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 45 },
      2: { halign: "center", cellWidth: 15 },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });

  y = ((doc as any).lastAutoTable?.finalY || y + 20) + 6;

  // Financial summary (right-aligned)
  const netTotal = Number(booking.total_amount);
  y = addFinancialSummary(doc, y, grossAmount, discount, netTotal, Number(booking.paid_amount), Number(booking.due_amount || 0));

  // Payment history (below summary, full width)
  y = addPaymentHistoryTable(doc, y, payments);

  // Signature
  y = addSignatureSection(doc, y, sig);

  addFooter(doc);
}

// ═══════════════════════════════════════════════════════════════
// FAMILY INVOICE
// ═══════════════════════════════════════════════════════════════

async function generateFamilyInvoice(
  doc: jsPDF, booking: InvoiceBooking, customer: InvoiceCustomer,
  payments: InvoicePayment[], members: BookingMember[],
  logoBase64: string, sig: SignatureData, qrDataUrl: string, moallemName: string | null
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = addHeader(doc, { name: "RAHE KABA", phone: "+880 1601-505050", email: "rahekaba.info@gmail.com", address: "Dailorbagh Palli Bidyut Adjacent, Sonargaon Thana Road, Narayanganj-Dhaka" } as CompanyInfo, logoBase64);


  addQrToDoc(doc, qrDataUrl, { size: 16, trackingId: booking.tracking_id, position: "top" });
  addPaymentWatermark(doc, getWatermarkStatus(Number(booking.paid_amount), Number(booking.due_amount || 0)));

  y = addInvoiceTitleBlock(doc, y, booking.tracking_id, new Date().toISOString(), booking.packages?.start_date || null, booking.status, true);

  y = addCustomerSection(doc, y, customer, moallemName, members.length || booking.num_travelers);

  // Members table
  y = addSectionTitle(doc, y, "FAMILY MEMBERS");

  const totalGross = members.reduce((s, m) => s + Number(m.selling_price), 0) || Number(booking.total_amount) + Number(booking.discount || 0);
  const totalDiscount = members.reduce((s, m) => s + Number(m.discount), 0) || Number(booking.discount || 0);
  const totalFinal = members.reduce((s, m) => s + Number(m.final_price), 0) || Number(booking.total_amount);

  autoTable(doc, {
    startY: y,
    head: [["SL", "Name", "Passport", "Package", "Price (BDT)", "Discount (BDT)", "Final (BDT)"]],
    body: [
      ...members.map((m, i) => [
        String(i + 1),
        m.full_name,
        m.passport_number || "—",
        m.packages?.name || booking.packages?.name || "N/A",
        Number(m.selling_price).toLocaleString(),
        Number(m.discount).toLocaleString(),
        Number(m.final_price).toLocaleString(),
      ]),
    ],
    foot: [[
      "", "", "", "TOTAL",
      totalGross.toLocaleString(),
      totalDiscount.toLocaleString(),
      totalFinal.toLocaleString(),
    ]],
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: {
      fillColor: [DARK.r, DARK.g, DARK.b],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
    },
    footStyles: {
      fillColor: [LIGHT_BG.r, LIGHT_BG.g, LIGHT_BG.b],
      textColor: [DARK.r, DARK.g, DARK.b],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [LIGHT_BG.r, LIGHT_BG.g, LIGHT_BG.b] },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });

  y = ((doc as any).lastAutoTable?.finalY || y + 20) + 6;

  // Financial summary
  y = addFinancialSummary(doc, y, totalGross, totalDiscount, totalFinal, Number(booking.paid_amount), Number(booking.due_amount || 0));

  // Payment history (below summary, full width)
  y = addPaymentHistoryTable(doc, y, payments);

  // Signature
  y = addSignatureSection(doc, y, sig);

  addFooter(doc);
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

export async function generateInvoice(
  booking: InvoiceBooking,
  customer: InvoiceCustomer,
  payments: InvoicePayment[],
  company: CompanyInfo
) {
  const doc = new jsPDF();
  const [logoBase64, sig, qrDataUrl] = await Promise.all([
    loadLogoBase64(),
    getSignatureData(),
    generateTrackingQr(booking.tracking_id),
  ]);

  // Fetch moallem name if linked
  let moallemName: string | null = null;
  if (booking.moallem_id) {
    moallemName = await fetchMoallemName(booking.moallem_id);
  }

  const isFamily = booking.booking_type === "family";

  if (isFamily && booking.id) {
    const members = await fetchBookingMembers(booking.id);
    if (members.length > 0) {
      await generateFamilyInvoice(doc, booking, customer, payments, members, logoBase64, sig, qrDataUrl, moallemName);
    } else {
      await generateIndividualInvoice(doc, booking, customer, payments, logoBase64, sig, qrDataUrl, moallemName);
    }
  } else {
    await generateIndividualInvoice(doc, booking, customer, payments, logoBase64, sig, qrDataUrl, moallemName);
  }

  doc.save(`Invoice-${booking.tracking_id}.pdf`);
}

// ═══════════════════════════════════════════════════════════════
// RECEIPT (kept compatible)
// ═══════════════════════════════════════════════════════════════

export async function generateReceipt(
  payment: InvoicePayment,
  booking: InvoiceBooking,
  customer: InvoiceCustomer,
  company: CompanyInfo,
  allPayments?: InvoicePayment[]
) {
  const doc = new jsPDF();
  const [logoBase64, sig, qrDataUrl] = await Promise.all([
    loadLogoBase64(),
    getSignatureData(),
    generateTrackingQr(booking.tracking_id),
  ]);
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = addHeader(doc, company, logoBase64);


  addQrToDoc(doc, qrDataUrl, { size: 16, trackingId: booking.tracking_id, position: "top" });
  addPaymentWatermark(doc, "paid");

  // Receipt title
  doc.setFillColor(DARK.r, DARK.g, DARK.b);
  doc.roundedRect(14, y, 65, 10, 2, 2, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255);
  doc.text("PAYMENT RECEIPT", 16, y + 7);
  doc.setTextColor(0);
  y += 16;

  const receiptNum = `${booking.tracking_id}-${payment.installment_number || "P"}`;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text(`Receipt #: ${receiptNum}`, 14, y);
  doc.text(`Date: ${fmtDate(payment.paid_at || new Date().toISOString())}`, pageWidth / 2 + 10, y);
  doc.setTextColor(0);
  y += 8;

  // Customer box
  y = addCustomerSection(doc, y, customer);

  // Payment details table
  autoTable(doc, {
    startY: y,
    head: [["Description", "Details"]],
    body: [
      ["Booking ID", booking.tracking_id],
      ["Package", booking.packages?.name || "N/A"],
      ["Installment #", String(payment.installment_number || "—")],
      ["Amount Paid", fmt(Number(payment.amount))],
      ["Payment Date", fmtDate(payment.paid_at)],
      ["Payment Method", (payment.payment_method || "Manual").charAt(0).toUpperCase() + (payment.payment_method || "manual").slice(1)],
    ],
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [DARK.r, DARK.g, DARK.b], textColor: [255, 255, 255], fontSize: 7.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
    margin: { left: 14, right: 14 },
    tableWidth: 120,
  });

  y = ((doc as any).lastAutoTable?.finalY || y + 40) + 8;

  // Running balance
  const paidPayments = (allPayments || []).filter(p => p.status === "completed");
  const totalPaidSoFar = paidPayments.reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Math.max(0, Number(booking.total_amount) - totalPaidSoFar);

  doc.setFillColor(DARK.r, DARK.g, DARK.b);
  doc.roundedRect(14, y, pageWidth - 28, 14, 2, 2, "F");
  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Paid: ${fmt(totalPaidSoFar)}`, 20, y + 9);
  doc.text(`Remaining Due: ${fmt(remaining)}`, pageWidth - 20, y + 9, { align: "right" });
  doc.setTextColor(0);
  y += 22;

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
  const [logoBase64, sig, qrDataUrl] = await Promise.all([
    loadLogoBase64(),
    getSignatureData(),
    generateTrackingQr(data.bookingTrackingId),
  ]);
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = addHeader(doc, company, logoBase64);


  addQrToDoc(doc, qrDataUrl, { size: 16, trackingId: data.bookingTrackingId, position: "top" });
  addPaymentWatermark(doc, getWatermarkStatus(data.commissionPaid, data.commissionDue));

  doc.setFillColor(DARK.r, DARK.g, DARK.b);
  doc.roundedRect(14, y, 90, 10, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255);
  doc.text("COMMISSION PAYMENT RECEIPT", 16, y + 7);
  doc.setTextColor(0);
  y += 16;

  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.text(`Date: ${fmtDate(data.paymentDate)}`, pageWidth - 60, y);
  doc.setTextColor(0);
  y += 8;

  // Moallem info box
  doc.setFillColor(LIGHT_BG.r, LIGHT_BG.g, LIGHT_BG.b);
  doc.setDrawColor(220);
  doc.rect(14, y, pageWidth - 28, 18, "FD");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("PAID TO (MOALLEM)", 18, y + 6);
  doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
  doc.setLineWidth(0.5);
  doc.line(18, y + 7.5, 60, y + 7.5);
  doc.setLineWidth(0.2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50);
  doc.text(`${data.moallemName}  |  Phone: ${data.moallemPhone || "N/A"}`, 18, y + 13);
  doc.setTextColor(0);
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
      ["Payment Method", (data.paymentMethod || "Cash").charAt(0).toUpperCase() + (data.paymentMethod || "cash").slice(1)],
      ["Total Paid So Far", fmt(data.commissionPaid)],
      ["Commission Due", fmt(data.commissionDue)],
      ...(data.notes ? [["Notes", data.notes]] : []),
    ],
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [DARK.r, DARK.g, DARK.b], textColor: [255, 255, 255], fontSize: 7.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 } },
    margin: { left: 14, right: 14 },
    tableWidth: 130,
  });

  y = ((doc as any).lastAutoTable?.finalY || y + 40) + 8;

  doc.setFillColor(DARK.r, DARK.g, DARK.b);
  doc.roundedRect(14, y, pageWidth - 28, 14, 2, 2, "F");
  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Paid: ${fmt(data.paymentAmount)}`, 20, y + 9);
  doc.text(`Remaining Due: ${fmt(Math.max(0, data.commissionDue))}`, pageWidth - 20, y + 9, { align: "right" });
  doc.setTextColor(0);
  y += 22;

  y = addSignatureSection(doc, y, sig);
  addFooter(doc);

  doc.save(`Commission_Receipt_${data.bookingTrackingId}.pdf`);
}
